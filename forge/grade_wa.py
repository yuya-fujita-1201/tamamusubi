#!/usr/bin/env python3
"""和風カラーグレーディング（ユーザーFB 2026-06-13: 「緑が明るすぎる。色彩をもっと和風に」）。

生成済みの背景素材（タイル・木・プロップ）の緑を「抹茶・苔色」側へ寄せる:
  - 緑域(H 55-170°): 彩度 -28% / 明度 -5% / 色相を黄緑側へ -17°（matcha化）
  - その他: 彩度 -8%（全体の調和。朱・水色のアクセントは残す）
ミト本体・狐火・FXは対象外（キャラは鮮やかに残して背景から立たせる）。

使い方: python3 forge/grade_wa.py [--strength 1.0]
元に戻す: 各 *_pregrade.png バックアップから復元、または proc_wa.py / proc_phase0.py を再実行。
"""
import os, sys, json
import numpy as np
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(GAME, "public", "assets")

# グレーディング対象（背景系のみ）
TARGETS = [
    "tile_grass_wa.png", "tile_path_wa.png", "tile_forest_wa.png",
    "tile_water_edge_wa.png", "tile_detail_wa.png", "tile_wa_cliff.png", "tile_wa_stairs.png",
    "tile_wa_ishigaki.png", "tile_wa_kasaishi.png", "tile_wa_stairs2.png", "tile_wa_ishigaki2.png",
    "obj_matsu.png", "obj_goshinboku.png", "obj_bamboo.png", "obj_suisha.png",
    "obj_sign_wa.png", "obj_tsuzura.png", "obj_tuft_wa.png",
    "obj_tree_blossom.png", "obj_torii.png",
    "obj_minka_a.png", "obj_minka_b.png", "obj_hokora.png", "obj_hibiiwa.png",
]

def _argf(flag, default):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            return float(sys.argv[i + 1])
    return default


K = _argf("--strength", 1.0)

# ファイル別の強度倍率（ユーザーFB: 草原がまだ若干明るい → 草系のみ強め）
# 2026-06-13 第3ラウンド: 進行不可の木は輪郭線が目立つ → 緑系の木を強め(1.4)に抹茶寄せして線を馴染ませる。
# 桜(tree_blossom)は桃色主体なので緑グレードの影響が小さく、控えめ(1.1)に留める。
K_OVERRIDE = {
    "tile_grass_wa.png": 1.35,
    "tile_detail_wa.png": 1.2,
    "obj_tuft_wa.png": 1.2,
    # 石材系: 灰緑の石目が暗化しすぎないよう控えめに
    "tile_wa_ishigaki.png": 0.5,
    "tile_wa_ishigaki2.png": 0.35,
    "tile_wa_kasaishi.png": 0.4,
    "tile_wa_stairs2.png": 0.5,
    "obj_matsu.png": 1.4,        # 和松（tree_pine）
    "obj_goshinboku.png": 1.4,   # 御神木（tree_oak）
    "obj_bamboo.png": 1.4,       # 竹
    "obj_tree_blossom.png": 1.1, # 桜（桃色主体・控えめ）
}

def grade(img, k):
    arr = np.asarray(img.convert("RGBA"), dtype=np.float32)
    rgb = arr[..., :3] / 255.0
    a = arr[..., 3:]
    mx = rgb.max(axis=-1); mn = rgb.min(axis=-1)
    v = mx
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # hue 計算（度）
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.zeros_like(mx)
    m = (mx == r); h = np.where(m, (g - b) / d % 6, h)
    m = (mx == g); h = np.where(m, (b - r) / d + 2, h)
    m = (mx == b); h = np.where(m, (r - g) / d + 4, h)
    h = h * 60.0
    green = (h >= 55) & (h <= 170) & (sat > 0.15)
    # 緑域: 彩度↓ 明度↓ 色相→黄緑
    sat2 = np.where(green, sat * (1 - 0.28 * k), sat * (1 - 0.08 * k))
    v2 = np.where(green, v * (1 - 0.05 * k), v)
    h2 = np.where(green, h - 17.0 * k, h)
    h2 = np.clip(h2, 0, 360) / 60.0
    # HSV -> RGB
    c = v2 * sat2
    x = c * (1 - np.abs(h2 % 2 - 1))
    mmod = v2 - c
    z = np.zeros_like(c)
    cond = [(h2 < 1), (h2 < 2), (h2 < 3), (h2 < 4), (h2 < 5), (h2 >= 5)]
    rr = np.select(cond, [c, x, z, z, x, c])
    gg = np.select(cond, [x, c, c, x, z, z])
    bb = np.select(cond, [z, z, x, c, c, x])
    out = np.stack([rr + mmod, gg + mmod, bb + mmod], axis=-1)
    out = np.clip(out * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(np.concatenate([out, a.astype(np.uint8)], axis=-1), "RGBA")

for name in TARGETS:
    p = os.path.join(ASSETS, name)
    if not os.path.exists(p):
        print(f"SKIP {name}")
        continue
    backup = p.replace(".png", "_pregrade.png")
    src = backup if os.path.exists(backup) else p   # 再実行時は常に原本から
    img = Image.open(src)
    if not os.path.exists(backup):
        img.save(backup)
    k = K * K_OVERRIDE.get(name, 1.0)
    grade(img, k).save(p)
    print(f"graded {name} (K={k:.2f})")
print("done")
