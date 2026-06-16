#!/usr/bin/env python3
"""Render a dumped MapData JSON into full-map QA preview images.

This is intentionally simple: it mirrors the field draw order enough for
checker SEAM/NOISE validation and map-level visual inspection.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TILE = 16


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensure_dump(map_id: str) -> Path:
    dump = ROOT / "checker" / "_dump" / f"{map_id}.json"
    if dump.exists():
        return dump
    subprocess.run(
        ["npx", "vitest", "run", "--config", "checker/checker.vitest.config.ts"],
        cwd=ROOT,
        env={**__import__("os").environ, "CHECK_MAP": map_id},
        check=True,
    )
    return dump


def parse_tilesets() -> dict[str, str]:
    src = (ROOT / "src" / "field" / "tileset.ts").read_text(encoding="utf-8")
    out: dict[str, str] = {}
    for m in re.finditer(r'\{\s*key:\s*"([^"]+)",\s*sheet:\s*"([^"]+)"', src):
        out[m.group(1)] = m.group(2)
    return out


def frame_image(assetmap: dict, sheet: str, frame: int, cache: dict[tuple[str, int, int, int], Image.Image],
                out_w: int, out_h: int) -> Image.Image | None:
    meta = assetmap.get(sheet)
    if not meta:
        return None
    key = (sheet, frame, out_w, out_h)
    if key in cache:
        return cache[key]
    img = Image.open(ROOT / "public" / "assets" / meta["file"]).convert("RGBA")
    cols = int(meta.get("cols", 1))
    fw = int(meta["frameW"])
    fh = int(meta["frameH"])
    sx = (frame % cols) * fw
    sy = (frame // cols) * fh
    crop = img.crop((sx, sy, sx + fw, sy + fh))
    if crop.size != (out_w, out_h):
        crop = crop.resize((out_w, out_h), Image.Resampling.LANCZOS)
    cache[key] = crop
    return crop


def draw_tile_layer(canvas: Image.Image, layer: list[str], dump: dict, key_to_sheet: dict[str, str],
                    assetmap: dict, cache: dict):
    w = dump["w"]
    for i, cell in enumerate(layer):
        if not cell:
            continue
        key, frame_s = cell.rsplit(":", 1)
        sheet = key_to_sheet.get(key)
        if not sheet:
            continue
        tile = frame_image(assetmap, sheet, int(frame_s), cache, TILE, TILE)
        if tile:
            canvas.alpha_composite(tile, ((i % w) * TILE, (i // w) * TILE))


def draw_decals(canvas: Image.Image, dump: dict, assetmap: dict, cache: dict):
    for d in dump.get("decals", []):
        sheet = d.get("sheet") or "tile.grass_detail"
        tile = frame_image(assetmap, sheet, int(d.get("frame", 0)), cache, TILE, TILE)
        if tile:
            canvas.alpha_composite(tile, (round(d["x"] * TILE), round(d["y"] * TILE)))


def draw_props(canvas: Image.Image, dump: dict, assetmap: dict, cache: dict, ysort: bool):
    # プロップ座標は MapBuilder が 16px/tile の世界座標(tx*16)で格納する。
    # 地面/デカールは TILE px/tile で描くので、プロップも TILE/16 でスケールしないと
    # --tile 48/64 等で位置がズレる（既定 --tile 16 では s=1 で従来どおり）。
    s = TILE / 16.0
    props = [p for p in dump.get("props", []) if bool(p.get("ysort", True)) is ysort]
    props.sort(key=lambda p: p.get("y", 0))
    for p in props:
        w = max(1, round(p["w"] * s))
        h = max(1, round(p["h"] * s))
        sprite = frame_image(assetmap, p["sheet"], int(p.get("frame", 0)), cache, w, h)
        if not sprite:
            continue
        x = round(p["x"] * s - w / 2)
        y = round(p["y"] * s - h)
        canvas.alpha_composite(sprite, (x, y))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--map", default="tanada")
    ap.add_argument("--out-dir")
    ap.add_argument("--tile", type=int, default=16,
                    help="1タイルあたりpx(既定16=低解像度プレビュー。実パーツは128px。--tile 64/128で高精細評価)")
    args = ap.parse_args()
    global TILE
    TILE = args.tile

    dump_path = ensure_dump(args.map)
    dump = load_json(dump_path)
    assetmap = load_json(ROOT / "src" / "data" / "assetmap.json")
    key_to_sheet = parse_tilesets()
    cache: dict = {}

    canvas = Image.new("RGBA", (dump["w"] * TILE, dump["h"] * TILE), dump.get("outsideColor", "#000000"))
    draw_tile_layer(canvas, dump["ground"], dump, key_to_sheet, assetmap, cache)
    draw_tile_layer(canvas, dump["deco"], dump, key_to_sheet, assetmap, cache)
    draw_props(canvas, dump, assetmap, cache, ysort=False)
    draw_decals(canvas, dump, assetmap, cache)
    draw_props(canvas, dump, assetmap, cache, ysort=True)
    draw_tile_layer(canvas, dump["overhead"], dump, key_to_sheet, assetmap, cache)

    out_dir = Path(args.out_dir) if args.out_dir else ROOT / "checker" / "out" / dump["id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    screenshot = out_dir / "screenshot.png"
    small = out_dir / "screenshot_25percent.png"
    gray = out_dir / "grayscale_check.png"
    canvas.convert("RGB").save(screenshot)
    canvas.resize((max(1, canvas.width // 4), max(1, canvas.height // 4)), Image.Resampling.LANCZOS).convert("RGB").save(small)
    canvas.convert("L").convert("RGB").save(gray)
    print(screenshot)
    print(small)
    print(gray)


if __name__ == "__main__":
    main()
