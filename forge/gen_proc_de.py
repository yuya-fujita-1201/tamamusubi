#!/usr/bin/env python3
"""手続き生成スクリプト D/E
 D) tile.wa_dropshadow — 半透明暗色横帯（落ち影）の数パターン
 E) tile.grass_upper / tile.grass_lower — 草トーン変種
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")

# --- D: 落ち影タイル ---
# 128x128 x4 タイル（横ストリップ 512x128）
# パターン: 強さ 30, 60, 90%, 幅広（下から64px）
# 色: 暗緑〜暗褐 rgba

def make_dropshadow():
    W, H = 128, 128
    N = 4  # 4パターン
    out = Image.new("RGBA", (W * N, H), (0, 0, 0, 0))
    shadow_color = (14, 20, 14)  # neutral-dark（石垣の落ち影＝彩度を抑えた暗色）

    # パターン定義: (影帯の高さpx, alpha最大値, ぼかし半径)
    # 2026-06-14: 石垣の落ち影を強化（お手本=014）。壁の足元に深い接地影が落ちるよう
    #   濃く・広く・neutral-dark 寄りに。frame 3（最強）を takadai が使用。
    patterns = [
        (32, 150, 5),   # 細め・中程度
        (48, 190, 7),   # 標準
        (64, 215, 9),   # 広め
        (80, 235, 12),  # 最広・濃め（壁足元の主用途）
    ]
    for i, (band_h, alpha_max, blur_r) in enumerate(patterns):
        cell = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        arr = np.zeros((H, W, 4), dtype=np.float32)
        # 上端くっきり → 下端ぼかし (上から band_h px の帯)
        for y in range(H):
            if y < band_h:
                t = y / max(band_h - 1, 1)  # 0=上端 1=下端
                # 上端はくっきり, 下端は薄く（接地影は上端を濃く保つため減衰を緩く）
                a = alpha_max * (1.0 - t * 0.65)
                arr[y, :, 0] = shadow_color[0]
                arr[y, :, 1] = shadow_color[1]
                arr[y, :, 2] = shadow_color[2]
                arr[y, :, 3] = a
        cell_arr = arr.astype(np.uint8)
        cell_img = Image.fromarray(cell_arr, "RGBA")
        # ガウスぼかしで下端をさらにぼかす
        cell_img = cell_img.filter(ImageFilter.GaussianBlur(blur_r))
        out.paste(cell_img, (i * W, 0))

    path = os.path.join(ASSETS, "tile_wa_dropshadow.png")
    out.save(path)
    print(f"D: tile_wa_dropshadow.png saved ({W*N}x{H}, {N} patterns)")
    return path, N

# --- E: 草トーン変種 ---
def make_grass_tone(src_path, out_name, hue_shift, brightness_delta, sat_factor, description):
    """tile_grass_wa.png (512x512, 4x4 tiles) をベースにトーン調整して保存。"""
    img = Image.open(src_path).convert("RGBA")
    arr = np.asarray(img, dtype=np.float32)
    rgb = arr[..., :3] / 255.0
    a = arr[..., 3:]

    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    v = mx.copy()
    d = np.maximum(mx - mn, 1e-6)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = (mx == r); h = np.where(m, (g - b) / d % 6, h)
    m = (mx == g); h = np.where(m, (b - r) / d + 2, h)
    m = (mx == b); h = np.where(m, (r - g) / d + 4, h)
    h = h * 60.0

    # 色相シフト
    h2 = (h + hue_shift) % 360.0
    # 彩度調整
    sat2 = np.clip(sat * sat_factor, 0, 1)
    # 明度調整
    v2 = np.clip(v + brightness_delta, 0, 1)

    # HSV -> RGB
    h3 = h2 / 60.0
    c = v2 * sat2
    x = c * (1 - np.abs(h3 % 2 - 1))
    mmod = v2 - c
    z = np.zeros_like(c)
    cond = [(h3 < 1), (h3 < 2), (h3 < 3), (h3 < 4), (h3 < 5), (h3 >= 5)]
    rr = np.select(cond, [c, x, z, z, x, c])
    gg = np.select(cond, [x, c, c, x, z, z])
    bb = np.select(cond, [z, z, x, c, c, x])
    out_rgb = np.stack([rr + mmod, gg + mmod, bb + mmod], axis=-1)

    # フレーム間の平均輝度を揃えて市松（チェッカーボード）継ぎ目を解消する。
    #   下段草を暗く/寒色化すると 16 フレームの平均差が顕在化するため、各 128px フレームの
    #   平均輝度を全体平均へスケールで合わせる（フレーム内のディテールは保持）。
    fw = 128
    nf = out_rgb.shape[1] // fw
    if nf > 1 and out_rgb.shape[1] % fw == 0:
        lum = out_rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)  # (H, W)
        grand = float(lum.mean())
        for i in range(nf):
            sl = slice(i * fw, (i + 1) * fw)
            fm = float(lum[:, sl].mean())
            if fm > 1e-4:
                out_rgb[:, sl, :] *= (grand / fm)

    out_rgb = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)
    out_arr = np.concatenate([out_rgb, a.astype(np.uint8)], axis=-1)
    result = Image.fromarray(out_arr, "RGBA")
    path = os.path.join(ASSETS, out_name)
    result.save(path)
    H_img, W_img = out_arr.shape[:2]
    print(f"E: {out_name} saved ({W_img}x{H_img}) [{description}]")
    return path


def main():
    am = json.load(open(MAP_OUT)) if os.path.exists(MAP_OUT) else {}

    # --- D ---
    dropshadow_path, n_patterns = make_dropshadow()
    am["tile.wa_dropshadow"] = {
        "file": "tile_wa_dropshadow.png",
        "frameW": 128, "frameH": 128,
        "frames": n_patterns, "cols": n_patterns
    }

    # --- E ---
    grass_src_pregrade = os.path.join(ASSETS, "tile_grass_wa_pregrade.png")
    grass_src = os.path.join(ASSETS, "tile_grass_wa.png")
    # pregrade があればそちらをベースに（grade前の原本から作る）
    base = grass_src_pregrade if os.path.exists(grass_src_pregrade) else grass_src

    # 2026-06-14: 高低差が読めるよう上下段のトーン差を拡大（お手本=014）。
    #   上段=陽の当たる明るい草地 / 下段=崖の影に入る暗く寒色の草地。
    upper_path = make_grass_tone(
        base, "tile_grass_upper.png",
        hue_shift=+6,          # 黄緑寄り（暖色）
        brightness_delta=+0.08, # 明るく
        sat_factor=1.14,
        description="上段草・明るく暖色寄り"
    )
    am["tile.grass_upper"] = {
        "file": "tile_grass_upper.png",
        "frameW": 128, "frameH": 128,
        "frames": 16, "cols": 16
    }

    lower_path = make_grass_tone(
        base, "tile_grass_lower.png",
        hue_shift=-15,          # 青緑寄り（冷色）
        brightness_delta=-0.14, # 暗く（崖の影に入る）
        sat_factor=0.82,
        description="下段草・暗く青み寄り"
    )
    am["tile.grass_lower"] = {
        "file": "tile_grass_lower.png",
        "frameW": 128, "frameH": 128,
        "frames": 16, "cols": 16
    }

    json.dump(am, open(MAP_OUT, "w"), indent=2, ensure_ascii=False, sort_keys=True)
    print(f"\nassetmap updated: {MAP_OUT} ({len(am)} entries)")


if __name__ == "__main__":
    main()
