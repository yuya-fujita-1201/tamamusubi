"""128pxグリッド境界チェック（画像解析）。

スクリーンショットの 1タイル間隔の縦横ライン上で、明度差が周辺の平均勾配より突出していれば
『タイル境界が見えている』と判定する。可視シームの割合が閾値を超えたら WARNING。
スクショ未指定時は INFO でスキップ。
"""
import common
from common import Finding, WARNING, INFO, AXIS_SEAM

CODE = "SEAM"
NAME = "グリッド境界チェック(画像)"


def _luma(img):
    import numpy as np
    rgb = img[..., :3].astype("float32")
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def run(ctx):
    if ctx.image is None:
        return [Finding(INFO, "SEAM_NO_IMAGE", "スクショ未指定: 128pxグリッド境界チェックをスキップ",
                        axis=AXIS_SEAM,
                        suggestion="--screenshot <png> を渡すと境界の明度差を検出する。")]
    import numpy as np
    ppt = ctx.img_px_per_tile()
    if not ppt or ppt < 4:
        return [Finding(INFO, "SEAM_SMALL", f"px/tile={ppt} が小さくグリッド検出不可", axis=AXIS_SEAM)]

    # 注: 本エンジンは 1論理タイル(16px)=アセット1フレーム(128px) を SS=8 倍で原寸描画する
    # （constants.ts: CANVAS_W=LOGICAL_W*8）。つまり「128pxグリッド」は8論理タイル毎ではなく
    # 全タイル境界に現れるので、ここでは全タイル境界(k*ppt)を検査する。ppt はスクショ実測の
    # 1タイルあたりpx（全体俯瞰スクショ前提。ビューポート部分撮影時は --px-per-tile で渡す）。
    L = _luma(ctx.image)
    H, W = L.shape
    thr = float(ctx.threshold("gridSeamDeltaLumaWarn", 14.0))
    frac_warn = float(ctx.threshold("gridSeamFracWarn", 0.18))

    # 縦シーム
    vgrad = np.abs(L[:, 1:] - L[:, :-1])           # (H, W-1) 各列境界の勾配
    base_v = float(vgrad.mean())
    vis_v = []
    nseam_v = 0
    for k in range(1, ctx.w):
        c = int(round(k * ppt))
        if c <= 0 or c >= W:
            continue
        nseam_v += 1
        delta = float(vgrad[:, c - 1].mean())
        if delta > max(thr, 1.6 * base_v):
            vis_v.append((k, delta))

    # 横シーム
    hgrad = np.abs(L[1:, :] - L[:-1, :])
    base_h = float(hgrad.mean())
    vis_h = []
    nseam_h = 0
    for k in range(1, ctx.h):
        r = int(round(k * ppt))
        if r <= 0 or r >= H:
            continue
        nseam_h += 1
        delta = float(hgrad[r - 1, :].mean())
        if delta > max(thr, 1.6 * base_h):
            vis_h.append((k, delta))

    total = nseam_v + nseam_h
    visible = len(vis_v) + len(vis_h)
    if total == 0:
        return []
    frac = visible / total
    cells = [[k, ctx.h // 2] for k, _ in vis_v[:20]] + [[ctx.w // 2, k] for k, _ in vis_h[:20]]
    sev = WARNING if frac > frac_warn else INFO
    return [Finding(
        sev, "SEAM_VISIBLE",
        f"可視タイル境界 {visible}/{total} ({frac*100:.0f}%)",
        detail=f"縦{len(vis_v)} 横{len(vis_h)} の境界線で明度差がベースライン({(base_v+base_h)/2:.1f})比1.6倍超。128pxグリッドが見えている。",
        cells=cells, axis=AXIS_SEAM,
        suggestion="該当境界に kaEdgeOverlay / obj.curve_overlay を重ねて輪郭を崩す。autotile の縁フレームが効いているか確認。")]
