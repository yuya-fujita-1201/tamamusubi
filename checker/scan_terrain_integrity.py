#!/usr/bin/env python3
"""棚田マップの「地形としての整合性」を全面スキャンする決定論チェッカ。

map_art_linter は境界を平均するため微小な不整合を見逃す（HANDOFF §0.7）。
本スクリプトはセル単位で接続不整合を全数検出する:
  1) 滝(spillway/排水)が 上段水田→石垣切欠き→滝壺 と地形接続しているか（浮き検出）
  2) 歩行域の孤立成分
  3) 水田(水面)が歩行草地に直接ぶつかる縁（縁・土手・石垣なしの“浮いた水”）
  4) 川が岸/接地影なしで草地に接する箇所
  5) 装飾デカールが solid/forest 上に乗っている
出力 = 地形整合の問題リスト（座標つき）。
"""
from __future__ import annotations
import json
from pathlib import Path
from collections import deque, Counter

ROOT = Path(__file__).resolve().parents[1]
dump = json.load(open(ROOT / "checker/_dump/tanada.json"))
contract = json.load(open(ROOT / "checker/tile_contract.json"))
CAT = {k: (v.get("category") if isinstance(v, dict) else v)
       for k, v in contract.get("tiles", contract).items()}

W, H = dump["w"], dump["h"]
ground = dump["ground"]
col = dump["collision"]


def idx(x, y): return y * W + x
def inb(x, y): return 0 <= x < W and 0 <= y < H


def key_at(x, y):
    c = ground[idx(x, y)]
    return c.rsplit(":", 1)[0] if c else ""


def cat_at(x, y):
    return CAT.get(key_at(x, y), "?")


# カテゴリのざっくり分類
WATER = {"water_surface", "river"}
WALLS = {"retaining_wall", "earth_bank", "cliff"}
WALK_GROUND = {"ground_grass", "ground_tone", "path", "shrine_ground"}
BLOCK = {"forest_wall"}

issues = []


def add(sev, kind, x, y, msg):
    issues.append((sev, kind, x, y, msg))


# ── 1) 滝の地形接続（1マス滝タイル kaWaterfall の浮き検出） ──
wfalls = [(x, y) for y in range(H) for x in range(W) if key_at(x, y) == "kaWaterfall"]
print(f"# waterfall tiles (kaWaterfall): {len(wfalls)}")
# 縦に連続する滝タイルは1本の滝としてまとめ、最上段の上=水源 / 最下段の下=滝壺 を見る
visited = set()
for (x, y) in wfalls:
    if (x, y) in visited:
        continue
    # 同一列の連続滝を集約
    ys = [y]
    yy = y - 1
    while (x, yy) in set(wfalls):
        ys.append(yy); yy -= 1
    yy = y + 1
    while (x, yy) in set(wfalls):
        ys.append(yy); yy += 1
    for yy in ys:
        visited.add((x, yy))
    top, bot = min(ys), max(ys)
    above = cat_at(x, top - 1) if inb(x, top - 1) else "oob"
    below = cat_at(x, bot + 1) if inb(x, bot + 1) else "oob"
    src_ok = above in WATER
    basin_ok = below in WATER
    sev = "ERROR" if (not src_ok or not basin_ok) else "OK"
    if sev != "OK":
        add(sev, "WATERFALL_DISCONNECT", x, top,
            f"height={len(ys)}tile src_above={above}({src_ok}) basin_below={below}({basin_ok})")

# ── 2) 歩行域の孤立成分 ──
seen = [False] * (W * H)
comps = []
for s in range(W * H):
    if col[s] or seen[s]:
        continue
    q = deque([s]); seen[s] = True; cells = []
    while q:
        i = q.popleft(); cells.append(i)
        x, y = i % W, i // W
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if inb(nx, ny):
                j = idx(nx, ny)
                if not col[j] and not seen[j]:
                    seen[j] = True; q.append(j)
    comps.append(cells)
comps.sort(key=len, reverse=True)
print(f"# walkable components: {len(comps)} sizes={[len(c) for c in comps[:6]]}")
for c in comps[1:]:
    x, y = c[0] % W, c[0] // W
    add("ERROR", "ISOLATED_WALKABLE", x, y, f"size={len(c)} (例 {x},{y})")

# ── 3) 水田(水面)が歩行草地に直接接する縁（縁/土手/石垣/影なし＝浮いた水） ──
deco = dump.get("deco", [])
def has_shadow(x, y):
    if not deco: return False
    c = deco[idx(x, y)] if idx(x, y) < len(deco) else ""
    return bool(c) and CAT.get(c.rsplit(":", 1)[0], "") == "shadow"

bad_water_edges = []
for y in range(H):
    for x in range(W):
        if cat_at(x, y) not in WATER:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not inb(nx, ny):
                continue
            nc = cat_at(nx, ny)
            if nc in WALK_GROUND and not col[idx(nx, ny)]:
                # 草側に接地影があれば縁として処理済みとみなす
                if not has_shadow(nx, ny):
                    bad_water_edges.append((x, y, nx, ny))
print(f"# water-cells touching walkable w/o edge-shadow: {len(bad_water_edges)}")
# 代表だけ列挙（密集するので上位）
seen_water = set()
for x, y, nx, ny in bad_water_edges:
    if (x, y) in seen_water: continue
    seen_water.add((x, y))
for (x, y) in list(seen_water)[:30]:
    add("WARN", "WATER_EDGE_RAW", x, y, "水面が草に直接接触（縁/影なし）")

# ── 4) 装飾が solid/forest 上 ──
onbad = 0
for d in dump.get("decals", []):
    x, y = round(d["x"]), round(d["y"])
    if inb(x, y) and (col[idx(x, y)] or cat_at(x, y) == "forest_wall"):
        onbad += 1
print(f"# decals on solid/forest: {onbad}")

# ── サマリ ──
print("\n==== 地形整合スキャン結果 ====")
bykind = Counter(k for _, k, *_ in issues)
for k, n in bykind.most_common():
    print(f"  {k}: {n}")
print("\n---- WATERFALL_DISCONNECT 詳細 ----")
for sev, k, x, y, m in issues:
    if k == "WATERFALL_DISCONNECT":
        print(f"  [{sev}] ({x},{y}) {m}")
print("\n---- その他 ERROR ----")
for sev, k, x, y, m in issues:
    if sev == "ERROR" and k != "WATERFALL_DISCONNECT":
        print(f"  [{sev}] {k} ({x},{y}) {m}")
print(f"\n総ISSUE: {len(issues)}  (WATER_EDGE_RAW総数={len(seen_water)})")
