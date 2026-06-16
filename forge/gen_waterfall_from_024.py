#!/usr/bin/env python3
"""024 の参考タイルから「1マス分の棚田の滝」タイルを作る。

重要: 024 サンプルは元から **湧出口＋落水筋＋着水の泡を 1 枚の 128px タイルに収めた
1マス滝** である（ユーザー指摘「タイル1マス分で表現していたはず」）。
よって 3 タイル高のスプライトに分解してはならない。024 を素直に 1 タイル化する。

出力: public/assets/tile_ka_waterfall.png 128x128 RGBA（不透明・横シームレス）
  上=石垣の縁を越える白い湧出口 / 中=白青の落水筋 / 下=着水の泡。
  棚田の石垣の「切り欠き」セルに 1 マスだけ置き、上=水田 / 下=滝壺 と接続させる。
  川幅の広い滝には横に並べる（横シームレス）。
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "ZZ-HCP-logs/024/ChatGPT Image 2026年6月16日 22_51_26のコピー.png"
OUT_TILE = ROOT / "public/assets/tile_ka_waterfall.png"
QA = ROOT / "forge/_backup_waterfall_024"
W = 128


def seamless_x(a: np.ndarray, m: int = 20) -> np.ndarray:
    a = a.copy(); Wd = a.shape[1]
    for i in range(m):
        t = 0.5 * (1.0 - i / m)
        l = a[:, i].copy(); r = a[:, Wd - 1 - i].copy()
        a[:, i] = l * (1 - t) + r * t
        a[:, Wd - 1 - i] = r * (1 - t) + l * t
    return a


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGB")
    # 024 は四辺に暗枠（実測コンテンツ箱 x[2:128] y[3:126]）。内側だけを 128x128 に。
    im = im.crop((2, 3, 128, 126)).resize((W, W), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)

    # 軽く整える（024 の繊細さを保つ）＋わずかに明るく軽い色調へ
    a = np.asarray(
        Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.4))
    ).astype(np.float32)
    lum = a.mean(axis=2, keepdims=True)
    a = a * 0.92 + lum * 0.08          # 彩度 -8%
    a = np.clip(a * 1.04 + 4.0, 0, 255)  # 明度 +4%

    # 横だけシームレス化（縦は 上=湧出口 / 下=泡 の向きがあるので保持）
    a = seamless_x(a, m=20)

    rgba = np.dstack([a, np.full((W, W), 255.0, np.float32)]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT_TILE)

    # QA: 横3連で「川幅滝」の継ぎ目確認＋単体
    t = Image.open(OUT_TILE)
    strip = Image.new("RGBA", (W * 3, W), (40, 74, 44, 255))
    for k in range(3):
        strip.alpha_composite(t, (k * W, 0))
    strip.save(QA / "_qa_tile_x3.png")
    print("wrote", OUT_TILE.name, "(1マス滝・横シームレス)")
    print("QA:", (QA / "_qa_tile_x3.png").name)


if __name__ == "__main__":
    main()
