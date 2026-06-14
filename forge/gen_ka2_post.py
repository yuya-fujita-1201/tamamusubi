#!/usr/bin/env python3
"""Phase L3 仕上げ: kaPaddy2 / kaRiver2 の「水」ピクセルだけを選択的に発光する青緑へ。
お手本(018)の鏡面水田＝明るく青みがかった反射。proc_wa の後に1回流す（gen_proc_de と同系の後加工）。
水(青み画素=B>R)だけを対象にするので、畦(緑)や石は変えない＝水と緑の色相差が開く。冪等性: 強めに当てると
反復で過剰になるため、再実行する場合は proc_wa からやり直すこと。"""
import os
import numpy as np
from PIL import Image

A = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets")
T = 128


def pop_water(name, frames, bright=1.10, cyan=0.16, contrast=1.10):
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im, dtype=np.float32).copy()
    n = im.width // T
    for fi in frames:
        if fi >= n:
            continue
        x0 = fi * T
        tile = a[:, x0:x0 + T, :]
        r, g, bl = tile[..., 0], tile[..., 1], tile[..., 2]
        # 水マスク: 青が赤より優勢（畦の緑・石の灰を除外）。0..1 の連続マスク。
        m = np.clip((bl - r) / 40.0, 0.0, 1.0)
        # 明度UP＋シアン寄せ（G,B を少し持ち上げ）＋コントラスト（中央0.5基準）
        for ci, boost in ((0, 1.0), (1, 1.0 + cyan * 0.5), (2, 1.0 + cyan)):
            ch = tile[..., ci]
            lifted = np.clip(((ch / 255.0 - 0.5) * contrast + 0.5) * 255.0 * bright * boost, 0, 255)
            tile[..., ci] = ch * (1 - m) + lifted * m
        a[:, x0:x0 + T, :3] = tile[..., :3]
    a[..., 3] = 255
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").save(p)
    print(f"{name}: water-pop frames {frames} (bright={bright} cyan={cyan})")


if __name__ == "__main__":
    # center(0-3) と辺(4-7)の水部分も対象（辺は畦が緑なので水だけ反応）
    pop_water("tile_ka_paddy2.png", list(range(16)), bright=1.12, cyan=0.18, contrast=1.12)
    pop_water("tile_ka_river2.png", list(range(16)), bright=1.10, cyan=0.16, contrast=1.10)
    print("done")
