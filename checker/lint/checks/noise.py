"""ノイズチェック（画像解析）。

歩行可能エリアの高周波成分(局所の細かいざらつき)を計測し、閾値超過で WARNING。
草地ベース上の花・草むら・小石が多すぎる『ザラザラ』を検出する。
併せて 25% 縮小時の構造保持率を INFO で報告（地形が縮小に耐えるか）。
スクショ未指定時は INFO でスキップ。
"""
import common
from common import Finding, WARNING, INFO, AXIS_NOISE

CODE = "NOISE"
NAME = "ノイズチェック(画像)"


def _luma(img):
    import numpy as np
    rgb = img[..., :3].astype("float32")
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def _box3(a):
    import numpy as np
    p = np.pad(a, 1, mode="edge")
    s = (p[0:-2, 0:-2] + p[0:-2, 1:-1] + p[0:-2, 2:] +
         p[1:-1, 0:-2] + p[1:-1, 1:-1] + p[1:-1, 2:] +
         p[2:, 0:-2] + p[2:, 1:-1] + p[2:, 2:])
    return s / 9.0


def run(ctx):
    if ctx.image is None:
        return [Finding(INFO, "NOISE_NO_IMAGE", "スクショ未指定: ノイズ/縮小可読性チェックをスキップ",
                        axis=AXIS_NOISE)]
    import numpy as np
    ppt = ctx.img_px_per_tile()
    if not ppt or ppt < 4:
        return [Finding(INFO, "NOISE_SMALL", f"px/tile={ppt} が小さく解析不可", axis=AXIS_NOISE)]

    L = _luma(ctx.image)
    H, W = L.shape
    highfreq = np.abs(L - _box3(L)) / 255.0   # 0..1 局所ざらつき

    # 歩行可能タイルのマスク（タイル→画像ブロック）
    out = []
    walk_vals = []
    bg_vals = []
    for ty in range(ctx.h):
        y0, y1 = int(ty * ppt), int((ty + 1) * ppt)
        if y0 >= H:
            break
        for tx in range(ctx.w):
            x0, x1 = int(tx * ppt), int((tx + 1) * ppt)
            if x0 >= W:
                break
            block = highfreq[y0:y1, x0:x1]
            if block.size == 0:
                continue
            v = float(block.mean())
            if not ctx.solid(tx, ty):
                walk_vals.append(v)
            else:
                bg_vals.append(v)

    thr = float(ctx.threshold("noiseHighFreqStdWarn", 0.16))
    walk_noise = float(np.mean(walk_vals)) if walk_vals else 0.0
    bg_noise = float(np.mean(bg_vals)) if bg_vals else 0.0
    sev = WARNING if walk_noise > thr else INFO
    out.append(Finding(
        sev, "NOISE_WALKABLE",
        f"歩行域の高周波ノイズ {walk_noise:.3f}（閾値 {thr}、背景 {bg_noise:.3f}）",
        detail="歩行可能な草地が細かい模様でザラついていると地形が読みにくい。主役より背景が騒がしい状態。",
        axis=AXIS_NOISE,
        suggestion="草地ベースを kaGrassCalm 等の低コントラスト変種にし、花/小石/草むらを間引く。" if sev == WARNING else ""))

    # 25% 縮小の構造保持
    try:
        from PIL import Image
        small = Image.fromarray(ctx.image).resize((max(1, W // 4), max(1, H // 4)), Image.BILINEAR)
        Ls = _luma(np.asarray(small.convert("RGBA")))
        retain = float(Ls.std()) / max(1e-6, float(L.std()))
        out.append(Finding(
            INFO, "NOISE_DOWNSCALE",
            f"25%縮小の構造保持率 {retain*100:.0f}%",
            detail="縮小しても明暗コントラスト(=地形構造)がどれだけ残るかの目安。低いほど縮小で潰れる。",
            axis=AXIS_NOISE))
    except Exception:
        pass
    return out
