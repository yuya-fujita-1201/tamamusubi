"""map_art_linter 共有基盤。

全 check モジュールはここから Finding / Severity / Ctx を import する。
Ctx はマップダンプ(JSON)・Tile Contract・(任意)スクリーンショット・(任意)高さマップ を保持し、
タイル復号 / カテゴリ参照 / 隣接走査 / BFS 到達判定 などの共通ヘルパを提供する。
"""
from __future__ import annotations

import json
import math
import os
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

# ── Severity ─────────────────────────────────────────────
ERROR = "ERROR"
WARNING = "WARNING"
INFO = "INFO"
SEVERITY_ORDER = {ERROR: 0, WARNING: 1, INFO: 2}

# ── 10 評価軸（Tile Contract.scoreAxes と一致） ───────────
AXIS_STRUCTURE = "地形構造の読みやすさ"
AXIS_HEIGHT = "高低差の明確さ"
AXIS_WALKABLE = "歩行可能範囲の読みやすさ"
AXIS_SEAM = "タイル境界の目立たなさ"
AXIS_NOISE = "ノイズ量の適正さ"
AXIS_WATER = "水・滝・川の接続自然さ"
AXIS_CONTACT = "建物・オブジェクトの接地感"
AXIS_WORLD = "世界観の統一感"
AXIS_FOCUS = "主役と背景の優先順位"
AXIS_REUSE = "再利用可能なタイルマップとしての成立度"


@dataclass
class Finding:
    severity: str
    code: str
    title: str
    detail: str = ""
    cells: list = field(default_factory=list)   # [[x,y], ...] タイル座標（overlay 用）
    suggestion: str = ""
    axis: str = AXIS_STRUCTURE
    check: str = ""

    def to_dict(self):
        return {
            "severity": self.severity, "code": self.code, "title": self.title,
            "detail": self.detail, "cells": self.cells, "suggestion": self.suggestion,
            "axis": self.axis, "check": self.check,
        }


def _js_round(v):
    """JS の Math.round 互換（.5 は常に切り上げ）。Python の banker's rounding とのズレを防ぐ。"""
    return math.floor(float(v) + 0.5)


def parse_cell(s: str):
    """'kaPaddy2:3' -> ('kaPaddy2', 3) / '' -> (None, None)"""
    if not s:
        return None, None
    if ":" in s:
        k, f = s.rsplit(":", 1)
        try:
            return k, int(f)
        except ValueError:
            return k, 0
    return s, 0


class Ctx:
    def __init__(self, dump: dict, contract: dict,
                 image=None, px_per_tile: Optional[float] = None,
                 height: Optional[list] = None, config: Optional[dict] = None):
        self.dump = dump
        self.contract = contract
        self.tiles_contract = contract.get("tiles", {})
        self.props_contract = contract.get("props", {})
        self.grammar = contract.get("grammar", {})
        self.thresholds = dict(contract.get("thresholds", {}))
        if config:
            self.thresholds.update(config)

        self.id = dump["id"]
        self.name = dump.get("name", dump["id"])
        self.w = dump["w"]
        self.h = dump["h"]
        self.ground = dump["ground"]
        self.deco = dump["deco"]
        self.overhead = dump["overhead"]
        self.collision = dump["collision"]
        self.decals = dump.get("decals", [])
        self.warps = dump.get("warps", [])
        self.spawns = dump.get("spawns", [])
        self.props = dump.get("props", [])
        for p in self.props:
            p["itx"] = _js_round(p["tileX"] if "tileX" in p else p.get("x", 0) / 16)
            p["ity"] = _js_round(p["tileY"] if "tileY" in p else p.get("y", 0) / 16)

        self.image = image            # numpy RGBA (H,W,4) or None
        self.px_per_tile = px_per_tile
        self.height = height          # 2D list [h][w] of 0/1/2 or None

    # ── index helpers ────────────────────────────────────
    def idx(self, x, y):
        return y * self.w + x

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def cell(self, layer, x, y):
        if not self.inb(x, y):
            return None, None
        return parse_cell(layer[self.idx(x, y)])

    def ground_at(self, x, y):
        return self.cell(self.ground, x, y)

    def deco_at(self, x, y):
        return self.cell(self.deco, x, y)

    def solid(self, x, y):
        if not self.inb(x, y):
            return True
        return self.collision[self.idx(x, y)] != 0

    # ── contract lookups ─────────────────────────────────
    def tile_meta(self, key):
        return self.tiles_contract.get(key, {}) if key else {}

    def category(self, key):
        return self.tile_meta(key).get("category", "other" if key else None)

    def ground_category(self, x, y):
        k, _ = self.ground_at(x, y)
        return self.category(k)

    def has_deco_category(self, x, y, cat):
        k, _ = self.deco_at(x, y)
        return self.category(k) == cat

    def prop_meta(self, sheet):
        return self.props_contract.get(sheet, {})

    def prop_role(self, sheet):
        return self.prop_meta(sheet).get("role")

    def prop_category(self, sheet):
        return self.prop_meta(sheet).get("category", "other")

    # ── prop helpers ─────────────────────────────────────
    def props_by_role(self, role):
        return [p for p in self.props if self.prop_role(p["sheet"]) == role]

    def props_by_category(self, cat):
        return [p for p in self.props if self.prop_category(p["sheet"]) == cat]

    def props_by_sheet(self, sheet):
        return [p for p in self.props if p["sheet"] == sheet]

    def props_near(self, tx, ty, radius=2, sheet=None, role=None, category=None):
        out = []
        for p in self.props:
            if sheet and p["sheet"] != sheet:
                continue
            if role and self.prop_role(p["sheet"]) != role:
                continue
            if category and self.prop_category(p["sheet"]) != category:
                continue
            if abs(p["itx"] - tx) <= radius and abs(p["ity"] - ty) <= radius:
                out.append(p)
        return out

    # ── walkable / reachability ──────────────────────────
    def walkable_cells(self):
        return [(i % self.w, i // self.w) for i, c in enumerate(self.collision) if c == 0]

    def bfs_reach(self, seeds):
        seen = set()
        q = deque()
        for (x, y) in seeds:
            if self.inb(x, y) and not self.solid(x, y):
                seen.add((x, y))
                q.append((x, y))
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not self.inb(nx, ny) or self.solid(nx, ny):
                    continue
                if (nx, ny) not in seen:
                    seen.add((nx, ny))
                    q.append((nx, ny))
        return seen

    def spawn_seeds(self):
        """到達判定の起点 = プレイヤーが入場する地点。warp(マップ間接続)周辺のみ。
        spawns は敵出現点(SpawnDef.enemy)なので起点に含めない（孤立領域に敵がいるだけで
        到達可能扱いになるのを防ぐ）。warp が無いマップは画面下中央を仮の入場点とする。"""
        seeds = []
        for w in self.warps:
            seeds.append((w["x"], w["y"]))
            for dx, dy in ((0, -1), (0, 1), (1, 0), (-1, 0)):
                seeds.append((w["x"] + dx, w["y"] + dy))
        if not seeds:
            seeds.append((self.w // 2, self.h - 2))
        return seeds

    # ── image helpers ────────────────────────────────────
    def img_px_per_tile(self):
        if self.px_per_tile:
            return self.px_per_tile
        if self.image is not None:
            return self.image.shape[1] / self.w
        return None

    def threshold(self, key, default=None):
        return self.thresholds.get(key, default)


# ── 入出力ヘルパ ──────────────────────────────────────────
def project_root():
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_image(path):
    try:
        import numpy as np
        from PIL import Image
    except Exception:
        return None
    img = Image.open(path).convert("RGBA")
    return np.asarray(img)
