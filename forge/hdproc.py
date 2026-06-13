#!/usr/bin/env python3
"""ff-cp 専用 HD プロセッサ。

raw ImageGen PNG（高解像度・マゼンタ背景）を、用途別に最適なやり方で HD strip 化する:

  --mode tile    : 地形タイル。マゼンタ除去後、内容を fw×fh に「全面充填」(seam防止)。透過の隙間を作らない。
  --mode prop    : 透過プロップ(扉/木/看板)。bbox trim → 下端接地。下に下地タイルを敷く前提。
  --mode sprite  : キャラ/敵。bbox trim → 全フレーム共通スケールで fw×(fh-2*pad) に収め下端接地。
                   pad により頭が枠上端に接触せず「見切れ」しない。
  --mode fx      : エフェクト。中央配置（接地しない）。
  --mode bg      : 背景。マゼンタ除去せず全面リサイズ。

出力: OUT_DIR/o_strip.png （横一列 fw*frames × fh）
"""
import argparse, os
from PIL import Image


def is_bg(r, g, b):
    return r > 175 and b > 160 and g < 120


def chroma_key(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            po[x, y] = (0, 0, 0, 0) if (a == 0 or is_bg(r, g, b)) else (r, g, b, 255)
    return out


def despeckle(im):
    w, h = im.size
    px = im.load()
    res = im.copy(); pr = res.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 150 and b > 140 and g < 130 and (r - g) > 40 and (b - g) > 30:
                pr[x, y] = (0, 0, 0, 0)
    return res


def autotrim(im):
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw"); ap.add_argument("out_dir")
    ap.add_argument("--cols", type=int, default=1)
    ap.add_argument("--rows", type=int, default=1)
    ap.add_argument("--fw", type=int, required=True)
    ap.add_argument("--fh", type=int, required=True)
    ap.add_argument("--mode", default="sprite",
                    choices=["tile", "prop", "sprite", "fx", "bg", "attack",
                             "prop_large", "tileset", "tileset_overlay"])
    ap.add_argument("--pad", type=int, default=3)
    ap.add_argument("--mirror-right", action="store_true",
                    help="4x4歩行シートで右向き行を左向き行の水平反転で置換（サイズ統一）")
    args = ap.parse_args()
    fw, fh = args.fw, args.fh

    src = Image.open(args.raw)
    if args.mode == "bg":
        out = src.convert("RGB").resize((fw, fh), Image.BOX)
        os.makedirs(args.out_dir, exist_ok=True)
        out.save(os.path.join(args.out_dir, "o_strip.png"))
        print(f"ok bg -> {fw}x{fh}")
        return

    im = despeckle(chroma_key(src))
    W, H = im.size
    cw, ch = W // args.cols, H // args.rows
    cells = []
    for ry in range(args.rows):
        for cx in range(args.cols):
            cells.append(im.crop((cx * cw, ry * ch, (cx + 1) * cw, (ry + 1) * ch)))

    # ★4方向歩行(4x4)で --mirror-right 指定時: row2(右向き, cells 8-11)を
    # row1(左向き, cells 4-7)の水平反転で上書きする。
    # 理由: ImageGen は右向き行を他より小さく/別物に描きがち。左向きは安定して綺麗なので
    # それを反転して右向きに使えば、左右で完全に同じサイズ・同じ品質になる。
    if args.mirror_right and args.rows == 4 and args.cols == 4:
        for c in range(4):
            cells[8 + c] = cells[4 + c].transpose(Image.FLIP_LEFT_RIGHT)

    frames = []
    if args.mode == "tileset":
        # 遷移タイルセット: ImageGen は各タイルをマゼンタ余白付きで描くため、
        # マゼンタ除去後の内容bboxに切り詰めてから fw×fh に全面充填（溝＝グリッド線を消す）。
        # さらに四辺 5% をインセット（セル縁に焼き込まれた明暗ボーダーが縦横シームに出るのを防ぐ。
        # 道の暗い上端が横縞になる問題を Seiken-5.0 で実測し、左右のみ→四辺に拡大）。
        for c in cells:
            t = autotrim(c)
            if t.size[0] == 0 or t.size[1] == 0:
                t = c
            ix = max(1, round(t.size[0] * 0.08))
            iy = max(1, round(t.size[1] * 0.08))
            if t.size[0] > ix * 4 and t.size[1] > iy * 4:
                t = t.crop((ix, iy, t.size[0] - ix, t.size[1] - iy))
            frames.append(t.resize((fw, fh), Image.BOX))
    elif args.mode == "tileset_overlay":
        # 装飾オーバーレイ: 透過を保ったまま各セルを fw×fh にBOX縮小（疎な装飾なのでtrimしない）。
        for c in cells:
            frames.append(c.resize((fw, fh), Image.BOX))
    elif args.mode == "prop_large":
        # 家/木などの大型単一オブジェクト: 1枚を縦横比保持で fw×fh に収め、下端接地。
        # トリムして余白を詰め、はみ出しなく全体を描く（歪みなし）。
        t = autotrim(cells[0])
        sw, sh = t.size
        if sw == 0 or sh == 0:
            frames.append(Image.new("RGBA", (fw, fh), (0, 0, 0, 0)))
        else:
            s = min(fw / sw, fh / sh)
            nw, nh = max(1, round(sw * s)), max(1, round(sh * s))
            r = t.resize((nw, nh), Image.BOX)
            canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            canvas.alpha_composite(r, ((fw - nw) // 2, fh - nh))  # 横中央・下端接地
            frames.append(canvas)
    elif args.mode == "tile":
        # 全面充填: 内容bboxを fw×fh にストレッチ（隙間ゼロ）。背景の余白を切ってから引き伸ばす。
        # セル境界の白ギャップ/焼き込み縁を断つため四辺 8% インセット（水タイルの白帯対策。
        # 5% では帯が残ることを QA で実測）。
        for c in cells:
            t = autotrim(c)
            if t.size[0] == 0:
                t = c
            ix = max(1, round(t.size[0] * 0.08))
            iy = max(1, round(t.size[1] * 0.08))
            if t.size[0] > ix * 4 and t.size[1] > iy * 4:
                t = t.crop((ix, iy, t.size[0] - ix, t.size[1] - iy))
            frames.append(t.resize((fw, fh), Image.BOX))
    elif args.mode == "attack":
        # ★攻撃シート専用（Seiken-5.0 新設）:
        # 各フレームを個別正規化すると剣を掲げたポーズが潰れ、ポーズ演技（squash/stretch）が消える。
        # 代わりに「中央値の bbox 高さ＝体の高さ」とみなし、シート全体へ均一スケールを適用する。
        # 体は全フレーム同サイズ・剣を掲げたフレームだけ上に伸びる（セルは大きめに取る前提）。
        pad = args.pad
        target_body = fh * 0.69            # 96px セルなら体 ≈66px（歩行シート 72-2*3 と一致）
        trimmed = [autotrim(c) for c in cells]
        hs = sorted(t.size[1] for t in trimmed if t.size[1] > 0)
        ws = [t.size[0] for t in trimmed if t.size[0] > 0]
        med = hs[len(hs) // 2] if hs else 1
        scale = target_body / med
        # セルからはみ出すフレームがあればクランプ（見切れ防止が最優先）
        if hs:
            scale = min(scale, (fh - pad * 2) / max(hs), (fw - 2) / max(ws))
        for t in trimmed:
            sw, sh = t.size
            if sw == 0 or sh == 0:
                frames.append(Image.new("RGBA", (fw, fh), (0, 0, 0, 0))); continue
            nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
            r = t.resize((nw, nh), Image.BOX)
            canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            canvas.alpha_composite(r, ((fw - nw) // 2, max(0, fh - pad - nh)))
            frames.append(canvas)
    elif args.mode == "sprite":
        # ★キャラ専用: ImageGen は 4x4 グリッドを均一サイズに描かない（行ごとに大小バラバラ）。
        # そこで「各フレームを個別に目標高さへ正規化」して全フレームの表示高さを統一する。
        # これで歩行/方向転換で頭が上下動せず、枠への見切れも起きない（top が pad で揃う）。
        pad = args.pad
        target_h = fh - pad * 2          # 全フレーム共通の表示高さ
        max_w = fw - 2                    # 横は枠内に収める上限
        trimmed = [autotrim(c) for c in cells]
        for t in trimmed:
            sw, sh = t.size
            if sw == 0 or sh == 0:
                frames.append(Image.new("RGBA", (fw, fh), (0, 0, 0, 0))); continue
            s = target_h / sh            # 高さを target_h にぴったり合わせる（縮小）
            if sw * s > max_w:           # 幅が溢れる場合のみ幅基準にクランプ
                s = max_w / sw
            nw, nh = max(1, round(sw * s)), max(1, round(sh * s))
            r = t.resize((nw, nh), Image.BOX)
            canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            ox = (fw - nw) // 2          # 水平センタリング（左右ガタつき除去）
            oy = fh - pad - nh           # 下端接地
            canvas.alpha_composite(r, (ox, max(0, oy)))
            frames.append(canvas)
    else:
        # prop / fx: bbox trim → 全フレーム共通スケール（ポーズ・相対サイズ維持）。
        pad = args.pad if args.mode == "prop" else 0
        avail_h = fh - pad * 2
        avail_w = fw - pad * 2 if args.mode == "fx" else fw
        trimmed = [autotrim(c) for c in cells]
        maxw = max((t.size[0] for t in trimmed if t.size[0] > 0), default=1)
        maxh = max((t.size[1] for t in trimmed if t.size[1] > 0), default=1)
        scale = min(avail_w / maxw, avail_h / maxh)
        for t in trimmed:
            sw, sh = t.size
            if sw == 0 or sh == 0:
                frames.append(Image.new("RGBA", (fw, fh), (0, 0, 0, 0))); continue
            nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
            r = t.resize((nw, nh), Image.BOX)
            canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            ox = (fw - nw) // 2
            oy = (fh - pad - nh) if args.mode == "prop" else (fh - nh) // 2
            canvas.alpha_composite(r, (ox, max(0, oy)))
            frames.append(canvas)

    os.makedirs(args.out_dir, exist_ok=True)
    strip = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.alpha_composite(f, (i * fw, 0))
    strip.save(os.path.join(args.out_dir, "o_strip.png"))
    print(f"ok {args.mode}: {len(frames)} frames {fw}x{fh}")


if __name__ == "__main__":
    main()
