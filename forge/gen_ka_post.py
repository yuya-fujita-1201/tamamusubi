#!/usr/bin/env python3
"""Phase L2 後処理: 絵画調オートタイル(ka_grass/ka_paddy)の継ぎ目を解消する。
proc_wa.py の後に実行（高台の草・池の水で実証した deseam 手法と同じ）。

継ぎ目の3発生源と対策:
  ① タイル内シーム（縁が回り込まない）→ make_seamless（半分オフセットで端を中央へ移しフェザー）
  ② フレーム間シーム（センター変種が違う）→ センター(0-3)を1枚の自己シームレスタイルに統一
  ③ 畦エッジの密集 → 別途 tanada 側で棚田を厚くして内部セルを増やす
エッジ(4-7)/角(8-11)/accent(12-15)は遷移形状が要るので触らない。冪等。再生成は proc_wa からやり直す。
"""
import os
import numpy as np
from PIL import Image, ImageEnhance

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(GAME, "public", "assets")
T = 128


def make_seamless(arr, band=20, strength=0.66):
    """端の継ぎ目を消す: 半分オフセットで端→中央へ継ぎ目を移し、中央十字をフェザー。"""
    h, w = arr.shape[:2]
    out = np.roll(np.roll(arr, h // 2, axis=0), w // 2, axis=1)
    cx, cy = w // 2, h // 2
    res = out.copy()
    for d in range(-band, band + 1):  # 縦継ぎ目（列cx付近）
        x = cx + d
        t = (1 - abs(d) / (band + 1)) * strength
        target = (out[:, (cx - band - 1) % w] + out[:, (cx + band + 1) % w]) / 2
        res[:, x] = res[:, x] * (1 - t) + target * t
    out = res.copy()
    for d in range(-band, band + 1):  # 横継ぎ目（行cy付近）
        y = cy + d
        t = (1 - abs(d) / (band + 1)) * strength
        target = (out[(cy - band - 1) % h, :] + out[(cy + band + 1) % h, :]) / 2
        res[y, :] = res[y, :] * (1 - t) + target * t
    return res


def deseam_center(name, centers=(0, 1, 2, 3), src=None, band=20, strength=0.66):
    """センター変種を自己シームレス化し、全センターを同一の1枚に置換。
       src=None: 4変種を平均（穏やか・一様な面向き）。
       src=i:   フレームiを起点（映り込み等のディテールを残したい面向き。strengthを下げる）。"""
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    def fr(i): return np.asarray(im.crop((i * T, 0, i * T + T, T)), dtype=np.float32)
    base = fr(src) if src is not None else np.mean([fr(i) for i in centers], axis=0)
    base[..., 3] = 255  # 不透明維持
    seam = make_seamless(base, band=band, strength=strength)
    seam[..., 3] = 255
    for i in centers:
        im.paste(Image.fromarray(np.clip(seam, 0, 255).astype(np.uint8), "RGBA"), (i * T, 0))
    im.save(p)
    tag = f"src=f{src}" if src is not None else "avg"
    print(f"{name}: centers {centers} -> single seamless tile ({tag}, strength={strength})")


def flatten_center(name, centers=(0, 1, 2, 3), strength=0.9):
    """センター変種の平均色だけを揃えて市松を軽減（テクスチャは保持）。
       森など「樹冠の質感/陰影」が要る地形は、平均化(deseam)だと平坦になるのでこちらを使う。"""
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    def fr(i): return np.asarray(im.crop((i * T, 0, i * T + T, T)), dtype=np.float32)
    arrs = {i: fr(i) for i in centers}
    allpx = np.concatenate([a[a[..., 3] > 8][:, :3] for a in arrs.values()], axis=0)
    gmean = allpx.mean(axis=0)
    for i, a in arrs.items():
        m = a[a[..., 3] > 8][:, :3].mean(axis=0)
        a[..., :3] = np.clip(a[..., :3] + (gmean - m) * strength, 0, 255)
        a[..., 3] = 255
        im.paste(Image.fromarray(a.astype(np.uint8), "RGBA"), (i * T, 0))
    im.save(p)
    print(f"{name}: centers {centers} brightness-flattened（テクスチャ保持で市松軽減）")


def deepen(name, brightness=0.80, color=1.12, contrast=1.06):
    """全フレームを濃く・深い色に（森＝草地より暗い樹冠で境界を立てる）。"""
    p = os.path.join(A, name)
    im = Image.open(p).convert("RGBA")
    rgb = im.convert("RGB")
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness)
    rgb = ImageEnhance.Color(rgb).enhance(color)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    out = rgb.convert("RGBA"); out.putalpha(255)
    out.save(p)
    print(f"{name}: deepened (b={brightness} c={color})")


# 地形ごとの方式: deseam(単一シームレス) / flatten(輝度正規化・質感保持)
#   棚田は src=1(規則的な苗グリッド)を起点に strength を下げ、空の映り込み・稲列を残す。
DESEAM_CFG = {
    "tile_ka_grass.png": dict(),
    "tile_ka_paddy.png": dict(src=1, strength=0.48),  # 水鏡のディテールを残す
    "tile_ka_path.png":  dict(),
    "tile_ka_river.png": dict(),
}
FLATTEN = ["tile_ka_forest.png"]

if __name__ == "__main__":
    import sys
    names = sys.argv[1:] if len(sys.argv) > 1 else list(DESEAM_CFG) + FLATTEN
    for t in names:
        if not os.path.exists(os.path.join(A, t)):
            continue
        if t in FLATTEN:
            flatten_center(t)
            if t == "tile_ka_forest.png":
                deepen(t)  # 森は草地より暗い樹冠にして境界を立てる
        else:
            deseam_center(t, **DESEAM_CFG.get(t, {}))
    print("done")
