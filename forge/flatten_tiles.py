#!/usr/bin/env python3
"""タイルの継ぎ目（パッチワーク）低減。ユーザーFB(2026-06-13): 薄草/濃草の切替で四角い継ぎ目が目立つ。

地面の交換可能タイル群（tile_grass_wa など 4x4=16バリアント）について、各タイルの
平均色を全体平均へ寄せて「タイル間の明度・色の段差」を消す。微細なブレード模様の差異は残るため
テクスチャの変化は保たれるが、敷き詰めたときのグリッド（明暗の市松）が見えなくなる。

加算シフト方式（各画素に (global_mean - tile_mean) * strength を加算）。コントラスト/質感は保存。
strength=1.0 で平均完全一致。冪等（2回目はほぼ無変化）。元に戻すには grade_wa.py を再実行
（pregrade から再グレーディング）。

使い方: python3 forge/flatten_tiles.py [--strength 0.9]
"""
import os, sys
import numpy as np
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(GAME, "public", "assets")

# (ファイル, セルpx). 交換可能な地面タイルのみ。**横1行ストリップ専用**（assetmapの frames=cols=N）。
# 遷移オートタイル(path/forest/water)は端の草量がデザイン上変わるため対象外。
# 注: グリッド(複数行)レイアウトは非対応。対象は必ず frameH==画像高さ の横ストリップにすること。
TARGETS = [
    ("tile_grass_wa.png", 128),
]

def _argf(flag, default):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            return float(sys.argv[i + 1])
    return default


K = _argf("--strength", 0.9)


def flatten(path, cell):
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    rgb = arr[..., :3]
    a = arr[..., 3]
    opaque = a > 8
    gmean = rgb[opaque].reshape(-1, 3).mean(axis=0)
    # 横ストリップの全セルを走査（frameW=cell, 全幅=セル数×cell）
    out = rgb.copy()
    tiles_x = im.width // cell
    lums_before, lums_after = [], []
    for i in range(tiles_x):
        x0 = i * cell
        sl = rgb[:, x0:x0 + cell, :]
        m = sl.reshape(-1, 3).mean(axis=0)
        shift = (gmean - m) * K
        out[:, x0:x0 + cell, :] = np.clip(sl + shift, 0, 255)
        L = lambda v: 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]
        lums_before.append(L(m))
        lums_after.append(L(out[:, x0:x0 + cell, :].reshape(-1, 3).mean(axis=0)))
    res = np.concatenate([out, a[..., None]], axis=-1).astype(np.uint8)
    Image.fromarray(res, "RGBA").save(path)
    sb, sa = np.std(lums_before), np.std(lums_after)
    print(f"flattened {os.path.basename(path)} (K={K}): 輝度std {sb:.1f} -> {sa:.1f} "
          f"(範囲 {max(lums_before)-min(lums_before):.0f} -> {max(lums_after)-min(lums_after):.0f})")


for name, cell in TARGETS:
    p = os.path.join(ASSETS, name)
    if not os.path.exists(p):
        print(f"SKIP {name}")
        continue
    flatten(p, cell)
print("done")
