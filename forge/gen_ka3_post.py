#!/usr/bin/env python3
"""Phase L3 整理（GPT-memo3）: 「描き込み追加」ではなく【引き算】でノイズを抑える。
- kaGrass2 のベース草地(0-7)を静かに: コントラスト↓・彩度↓・フレーム間の平均輝度を揃える(継ぎ目/市松を消す)。
- kaPaddy2 の水面(0-3)の稲のコントラストを少し下げる（パターン模様化を防ぐ）。
proc_wa / gen_ka2_post の後に1回。冪等でないので再実行は proc_wa からやり直すこと。
"""
import os
import numpy as np
from PIL import Image

A = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets")
T = 128


def _frames(im):
    return im.width // T


def calm_grass(name, frames, contrast=0.62, sat=0.82):
    """ベース草地を静かに: 各フレームをコントラスト↓・彩度↓し、全フレームの平均色を揃える。"""
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im, dtype=np.float32).copy()
    n = _frames(im)
    means = []
    sel = [f for f in frames if f < n]
    for fi in sel:
        t = a[:, fi * T:fi * T + T, :3]
        means.append(t.reshape(-1, 3).mean(axis=0))
    gmean = np.mean(means, axis=0)  # 全フレーム共通の目標平均色
    for fi in sel:
        x0 = fi * T
        t = a[:, x0:x0 + T, :3]
        m = t.reshape(-1, 3).mean(axis=0)
        # コントラスト圧縮（フレーム平均基準）
        t = m + (t - m) * contrast
        # 彩度↓（輝度へ寄せる）
        lum = (t[..., 0] * 0.299 + t[..., 1] * 0.587 + t[..., 2] * 0.114)[..., None]
        t = lum + (t - lum) * sat
        # 平均色を全フレーム共通へ（市松/継ぎ目を消す）
        t = t + (gmean - m)
        a[:, x0:x0 + T, :3] = np.clip(t, 0, 255)
    a[..., 3] = 255
    Image.fromarray(a.astype(np.uint8), "RGBA").save(p)
    print(f"{name}: calm grass frames {sel} (contrast={contrast} sat={sat}) -> mean {gmean.round(1)}")


def calm_rice(name, frames, contrast=0.78):
    """水面の稲（緑の縦列）のコントラストを下げ、水田をパターン模様化させない。"""
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im, dtype=np.float32).copy()
    n = _frames(im)
    for fi in [f for f in frames if f < n]:
        x0 = fi * T
        t = a[:, x0:x0 + T, :3]
        m = t.reshape(-1, 3).mean(axis=0)
        a[:, x0:x0 + T, :3] = np.clip(m + (t - m) * contrast, 0, 255)
    a[..., 3] = 255
    Image.fromarray(a.astype(np.uint8), "RGBA").save(p)
    print(f"{name}: calm rice frames (contrast={contrast})")


if __name__ == "__main__":
    calm_grass("tile_ka_grass2.png", list(range(8)), contrast=0.60, sat=0.80)
    calm_rice("tile_ka_paddy2.png", [0, 1, 2, 3], contrast=0.80)
    print("done")
