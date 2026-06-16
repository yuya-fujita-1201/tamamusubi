#!/usr/bin/env python3
"""kaPaddy2「棚田リアル化」用ポスト処理（120級・ZZ-HCP-logs/021でユーザーが棚田リアル化を選択）。

新raw（緑の植えた棚田＝稲列）を活かす。旧パイプライン(gen_ka2=cyan寄せ / gen_ka3=稲消し)は
「青い水鏡」志向だったので使わない。代わりに視覚QA(map-art-reviewer)の指摘に沿って:
  - 輝度Vを少し下げる（vmul）＝歩けない水田を、歩ける草地 kaGrassCalm より暗くし「背景<主役」を守る
    （現状は水田が草地より明るく主役/背景が逆転しかけ。ART_BIBLE §2-1）。
  - 稲の縦縞コントラストを僅かに抑える（contrast<1）＝25%縮小でのスペックル化耐性。彩度は維持。
proc_wa.py --only tile.ka_paddy2 の後に1回。冪等でないので再実行は proc_wa からやり直す。

使い方: python3 forge/gen_paddy_rice_post.py [--vmul 0.90] [--contrast 0.85]
"""
import os, sys
import numpy as np
from PIL import Image

A = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets")
T = 128


def _argf(flag, d):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            return float(sys.argv[i + 1])
    return d


def rice_settle(name, vmul=0.90, contrast=0.85):
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im, dtype=np.float32).copy()
    n = im.width // T
    for fi in range(n):
        x0 = fi * T
        t = a[:, x0:x0 + T, :3]
        # 縦縞コントラストを平均基準で僅かに抑える（彩度は保つ＝RGB一様スケールでなく平均差の縮小）
        m = t.reshape(-1, 3).mean(axis=0)
        t = m + (t - m) * contrast
        # 輝度ダウン（草地より暗く）
        t = t * vmul
        a[:, x0:x0 + T, :3] = np.clip(t, 0, 255)
    a[..., 3] = 255
    Image.fromarray(a.astype(np.uint8), "RGBA").save(p)
    print(f"{name}: rice-settle vmul={vmul} contrast={contrast} frames={n}")


if __name__ == "__main__":
    rice_settle("tile_ka_paddy2.png",
                vmul=_argf("--vmul", 0.90),
                contrast=_argf("--contrast", 0.85))
