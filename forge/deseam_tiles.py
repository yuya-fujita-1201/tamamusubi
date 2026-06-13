#!/usr/bin/env python3
"""オートタイルの「敷き詰めグリッド継ぎ目」低減（ユーザーFB 2026-06-13: 池の水・森の境界の継ぎ目/色違い）。

対象は内部(center)フレームのみ。遷移(edge/corner)フレームは岸・境界の形が必要なので触らない。

- 水(tile_water_edge_wa): center {1,2,12,13,15} を **単一の自己シームレスタイル**で置換。
  AIタイルはコマ毎にリップルが自己完結するため隣接コピーで段差が出る。中央frameを平均→
  オフセット(np.roll半分)で端の継ぎ目を内側に移し、中央十字をフェザー → どう並べても継ぎ目が出ない
  穏やかな水面にする。pond内部のグリッドを解消。
- 森(tile_forest_wa): center {0,1,2,3,12,13} を平均色へトーン正規化（加算シフト）。樹冠の
  明暗差による市松グリッドを解消（質感は保持）。境界(edge)の草⇔樹冠の形はそのまま。

冪等。元に戻すには grade_wa.py を再実行（pregradeから再生成）。実行順: proc_wa -> grade_wa -> deseam_tiles -> flatten_tiles。
"""
import os, sys
import numpy as np
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(GAME, "public", "assets")
CELL = 128


def load(name):
    return Image.open(os.path.join(ASSETS, name)).convert("RGBA")


def frame(im, i):
    return np.asarray(im.crop((i * CELL, 0, (i + 1) * CELL, CELL)), dtype=np.float32)


def put(im, i, arr):
    im.paste(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA"), (i * CELL, 0))


def make_seamless(arr, band=18, strength=0.62):
    """端の継ぎ目を消す: 半分オフセットで端→中央へ継ぎ目を移し、中央十字をフェザー。"""
    h, w = arr.shape[:2]
    out = np.roll(np.roll(arr, h // 2, axis=0), w // 2, axis=1)
    cx, cy = w // 2, h // 2
    res = out.copy()
    # 縦継ぎ目(列cx付近)
    for d in range(-band, band + 1):
        x = cx + d
        t = (1 - abs(d) / (band + 1)) * strength
        target = (out[:, (cx - band - 1) % w] + out[:, (cx + band + 1) % w]) / 2
        res[:, x] = res[:, x] * (1 - t) + target * t
    out = res.copy()
    # 横継ぎ目(行cy付近)
    for d in range(-band, band + 1):
        y = cy + d
        t = (1 - abs(d) / (band + 1)) * strength
        target = (out[(cy - band - 1) % h, :] + out[(cy + band + 1) % h, :]) / 2
        res[y, :] = res[y, :] * (1 - t) + target * t
    return res


def deseam_water():
    name = "tile_water_edge_wa.png"
    centers = [1, 2, 12, 13, 15]
    im = load(name)
    base = np.mean([frame(im, i) for i in centers], axis=0)  # 平均で穏やかな水面
    seamless = make_seamless(base)
    for i in centers:
        put(im, i, seamless)
    im.save(os.path.join(ASSETS, name))
    print(f"deseam water: centers {centers} -> single seamless tile")


def flatten_centers(name, centers, strength=0.9):
    im = load(name)
    arrs = {i: frame(im, i) for i in centers}
    # 不透明画素のみで平均色
    allpx = np.concatenate([a[a[..., 3] > 8][:, :3] for a in arrs.values()], axis=0)
    gmean = allpx.mean(axis=0)
    lb, la = [], []
    for i, a in arrs.items():
        m = a[a[..., 3] > 8][:, :3].mean(axis=0)
        shift = (gmean - m) * strength
        a[..., :3] = np.clip(a[..., :3] + shift, 0, 255)
        put(im, i, a)
        L = lambda v: 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]
        lb.append(L(m)); la.append(L(a[a[..., 3] > 8][:, :3].mean(axis=0)))
    im.save(os.path.join(ASSETS, name))
    print(f"flatten {name} centers {centers}: 輝度std {np.std(lb):.1f} -> {np.std(la):.1f}")


if __name__ == "__main__":
    deseam_water()
    flatten_centers("tile_forest_wa.png", [0, 1, 2, 3, 12, 13])
    print("done")
