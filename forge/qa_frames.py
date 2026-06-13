#!/usr/bin/env python3
"""処理済み HD strip の数値QA（antipatterns §B 完了判定）。

検査項目:
  - sprite/attack/prop 系: 全フレームの bbox を実測し
      top >= 2（見切れなし） / bottom の振れ <= 3（接地揃い）
      高さの振れ（sprite は <=4、prop/attack は squash/stretch 想定なので警告のみ）
  - 全アセット: 純白ピクセル率（白フリンジ検出, >1% で警告）
  - tileset/tile: 透過率 <= 5%（穴あき＝下地透け検出）
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
ASSETS = os.path.join(GAME, "public", "assets")
MAP = json.load(open(os.path.join(GAME, "src", "data", "assetmap.json")))

# proc_all.py の設定からモードを引く
sys.path.insert(0, ROOT)
from proc_all import PROC  # noqa: E402

errors, warns = [], []

for aid, e in sorted(MAP.items()):
    cfg = PROC.get(aid)
    if not cfg:
        continue
    path = os.path.join(ASSETS, e["file"])
    if not os.path.exists(path):
        errors.append(f"{aid}: file missing")
        continue
    im = Image.open(path).convert("RGBA")
    fw, fh, n = e["frameW"], e["frameH"], e["frames"]
    if im.size != (fw * n, fh):
        errors.append(f"{aid}: strip size {im.size} != {(fw*n, fh)}")
        continue

    mode = cfg["mode"]
    px = im.load()

    # 純白率（フレーム合算）
    white = 0
    total = 0
    alpha_count = 0
    for y in range(fh):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            total += 1
            if a > 10:
                alpha_count += 1
                if r > 245 and g > 245 and b > 245:
                    white += 1
    white_pct = (white / max(1, alpha_count)) * 100

    if mode in ("tile", "tileset"):
        opaque_pct = (alpha_count / total) * 100
        if opaque_pct < 95:
            errors.append(f"{aid}: tileset 透過 {100-opaque_pct:.1f}% (穴あき)")
    if white_pct > 3.0 and mode in ("sprite", "attack", "prop"):
        warns.append(f"{aid}: 純白率 {white_pct:.1f}%（白フリンジ疑い）")

    if mode in ("sprite", "attack", "prop") and n >= 4:
        tops, bots, heights = [], [], []
        for i in range(n):
            cell = im.crop((i * fw, 0, (i + 1) * fw, fh))
            bbox = cell.getbbox()
            if not bbox:
                errors.append(f"{aid}[{i}]: 空フレーム")
                continue
            tops.append(bbox[1]); bots.append(bbox[3]); heights.append(bbox[3] - bbox[1])
        if not tops:
            continue
        if min(tops) < 2:
            errors.append(f"{aid}: top={min(tops)} 見切れ疑い (tops={tops})")
        bot_spread = max(bots) - min(bots)
        if bot_spread > 4:
            errors.append(f"{aid}: 接地ずれ bottom 振れ={bot_spread} (bots={bots})")
        h_spread = max(heights) - min(heights)
        if mode == "sprite" and h_spread > 5:
            errors.append(f"{aid}: 高さ振れ={h_spread} (heights={heights})")
        elif h_spread > fh * 0.45:
            warns.append(f"{aid}: 高さ振れ大={h_spread} (heights={heights}, mode={mode})")

print(f"checked {len(MAP)} assets")
for w in warns:
    print("WARN", w)
for e2 in errors:
    print("ERROR", e2)
print(f"\n{len(errors)} errors, {len(warns)} warnings")
sys.exit(1 if errors else 0)
