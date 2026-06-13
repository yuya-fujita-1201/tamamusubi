#!/usr/bin/env python3
"""ミトの高解像度32コマ strip 組立（玉結び Phase 0）。

方向別 raw（4列×2行=8コマ、down/left/up の3生成）を読み込み:
  1. マゼンタ除去 → despeckle → 各フレーム bbox トリム
  2. シートごとに「bbox高さの中央値」を基準に均一スケール（squash/stretch の演技を保存）
     → 全方向で体の表示高さを統一（方向間の等身差を吸収）
  3. 水平センタリング＋下端接地（bbox 下端＝接地足）で fw×fh セルへ
  4. right 行 = left 行の水平反転
  5. 32コマ strip（down8 / left8 / right8 / up8）を public/assets へ出力し assetmap.json を更新

使い方: python3 forge/build_mito.py [walk|idle|atk|all]
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
OUT = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")

# アニメ定義: (assetmapキー, 出力名, raw idベース, セルサイズ, 体の目標高さ, 水平整列)
# ユーザーFB(2026-06-13): 体格=聖剣5.0と同じ身長感（体高26論理px≈1.6タイル）・横攻撃のがっしり等身基準。
# SS=8 化に伴い実寸は 体高208px / 歩行セル240px / 攻撃セル320px（raw体高400px級から0.52倍縮小）。
# 水平整列 align:
#   "centroid" … 重心(質量中心)をセル中央へ。納刀した刀がコマ毎に少し位置/長さブレしても、
#                細い刀は質量が小さく重心をほぼ動かさないため、本体の左右ブレ＝ガタつきを抑える
#                （ユーザーFB「後ろ歩きで刀の位置が左右にブレる/歩行でガタガタ」対策・歩行/待機向け）
#   "bbox"     … bbox中央へ（従来）。攻撃/居合は刀が前方へ大きく伸びるので重心だと本体が後退してしまう。
#                伸びる刃は無視して足元基準で揃えたいので bbox 中央のまま。
ANIMS = {
    "walk": ("mito.walk", "mito_walk.png", "mito.walk8_{d}", 240, 208, "centroid"),
    "idle": ("mito.idle", "mito_idle.png", "mito.idle8_{d}", 240, 208, "centroid"),
    # 攻撃は剣が伸びるためセル320。体の中央値高さは歩行と同じ208に揃える（足元アンカーで体格一致）
    "atk":  ("mito.atk", "mito_atk.png", "mito.atk8_{d}", 320, 208, "bbox"),
    # 居合（納刀溜め→抜刀）。抜刀の一閃が伸びるので攻撃と同じセル320
    "iai":  ("mito.iai", "mito_iai.png", "mito.iai8_{d}", 320, 208, "bbox"),
}
DIRS = ["down", "left", "up"]  # right は left の鏡像


def is_bg(r, g, b):
    return r > 175 and b > 160 and g < 120


def chroma_key(im):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            po[x, y] = (0, 0, 0, 0) if (a == 0 or is_bg(r, g, b)) else (r, g, b, 255)
    return out


def despeckle(im):
    px = im.load()
    res = im.copy(); pr = res.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 150 and b > 140 and g < 130 and (r - g) > 40 and (b - g) > 30:
                pr[x, y] = (0, 0, 0, 0)
    return res


def remove_stray(cell, tag=""):
    """遊離ノイズ除去（ユーザーFB: 溜めモーション背後の「刀の切れ端」対策）。
    連結成分を数え、最大成分（本体）の bbox から 4px 超離れた成分を消す。
    刀・紙垂は必ず体と連結して描かれるため、離れた塊は隣セルからのはみ出し＝ゴミ。"""
    w, h = cell.size
    px = cell.load()
    label = [[0] * w for _ in range(h)]
    comps = []  # (area, x0, y0, x1, y1, id)
    nid = 0
    for sy in range(h):
        for sx in range(w):
            if label[sy][sx] or px[sx, sy][3] == 0:
                continue
            nid += 1
            stack = [(sx, sy)]
            label[sy][sx] = nid
            area = 0
            x0 = x1 = sx; y0 = y1 = sy
            while stack:
                x, y = stack.pop()
                area += 1
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not label[ny][nx] and px[nx, ny][3] != 0:
                        label[ny][nx] = nid
                        stack.append((nx, ny))
            comps.append((area, x0, y0, x1, y1, nid))
    if len(comps) <= 1:
        return cell
    comps.sort(reverse=True)
    _, mx0, my0, mx1, my1, mid = comps[0]
    drop = set()
    for area, x0, y0, x1, y1, cid in comps[1:]:
        # 本体bboxとの矩形距離
        dx = max(mx0 - x1, x0 - mx1, 0)
        dy = max(my0 - y1, y0 - my1, 0)
        if max(dx, dy) > 4:
            drop.add(cid)
            print(f"    stray removed {tag}: area={area} at ({x0},{y0})-({x1},{y1}) dist=({dx},{dy})")
    if drop:
        for sy in range(h):
            for sx in range(w):
                if label[sy][sx] in drop:
                    px[sx, sy] = (0, 0, 0, 0)
    return cell


def slice_frames(raw_path, tag=""):
    im = Image.open(raw_path)
    im = despeckle(chroma_key(im))
    W, H = im.size
    cw, ch = W / 4, H / 2
    frames = []
    for i in range(8):
        r, c = divmod(i, 4)
        cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        cell = remove_stray(cell, f"{tag}#{i+1}")
        bb = cell.getbbox()
        frames.append(cell.crop(bb) if bb else cell)
    return frames


def median(xs):
    s = sorted(xs)
    return s[len(s) // 2]


def centroid_x(im):
    """不透明画素の質量中心 x（フレーム左端基準）。アルファ重み付き。"""
    px = im.load()
    w, h = im.size
    sx = 0.0
    sw = 0.0
    for y in range(h):
        for x in range(w):
            a = px[x, y][3]
            if a:
                sx += x * a
                sw += a
    return sx / sw if sw else w / 2.0


def build(anim):
    key, outname, raw_tpl, cell, target_h, align = ANIMS[anim]
    rows = {}
    for d in DIRS:
        raw = os.path.join(ROOT, "assets", "raw", raw_tpl.format(d=d), "codex-imagegen.png")
        if not os.path.exists(raw):
            sys.exit(f"raw not found: {raw}")
        frames = slice_frames(raw, f"{anim}/{d}")
        med_h = median([f.size[1] for f in frames])
        scale = target_h / med_h
        scaled = []
        for f in frames:
            nw = max(1, round(f.size[0] * scale))
            nh = max(1, round(f.size[1] * scale))
            scaled.append(f.resize((nw, nh), Image.BOX))
        rows[d] = scaled
        print(f"  {anim}/{d}: raw med_h={med_h} scale={scale:.3f} heights={[f.size[1] for f in scaled]}")
    # right = left の鏡像
    rows["right"] = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in rows["left"]]

    strip = Image.new("RGBA", (cell * 32, cell), (0, 0, 0, 0))
    order = ["down", "left", "right", "up"]  # FACING_ROW 準拠
    pad_bottom = 4  # 接地影の余白
    issues = []
    for ri, d in enumerate(order):
        for fi, f in enumerate(rows[d]):
            idx = ri * 8 + fi
            fw, fh = f.size
            if fh > cell - 2:  # 高さがセルを超える場合は等比縮小
                f = f.resize((round(fw * (cell - 2) / fh), cell - 2), Image.BOX)
                fw, fh = f.size
            if fw > cell - 2:  # 幅がセルを超える場合も等比縮小（横長素材の描画欠け防止・QAレビュー）
                f = f.resize((cell - 2, round(fh * (cell - 2) / fw)), Image.BOX)
                fw, fh = f.size
            if align == "centroid":
                # 重心をセル中央へ（刀の突出に引きずられない安定アンカー）。
                cx = centroid_x(f)
                x = idx * cell + round(cell / 2 - cx)
                # セルからはみ出さないようにクランプ
                x = max(idx * cell, min(x, idx * cell + (cell - fw)))
            else:
                x = idx * cell + (cell - fw) // 2
            y = cell - pad_bottom - fh
            if y < 3:
                issues.append(f"{d}#{fi}: top={y}")
            strip.alpha_composite(f, (x, max(0, y)))
    out_path = os.path.join(OUT, outname)
    strip.save(out_path)

    am = json.load(open(MAP_OUT)) if os.path.exists(MAP_OUT) else {}
    am[key] = {"file": outname, "frameW": cell, "frameH": cell, "frames": 32, "cols": 32}
    json.dump(am, open(MAP_OUT, "w"), indent=2, ensure_ascii=False, sort_keys=True)
    print(f"  -> {out_path} ({strip.size[0]}x{strip.size[1]}) assetmap[{key}] updated")
    if issues:
        print(f"  !! 見切れ注意: {issues}")


targets = sys.argv[1:] or ["all"]
for t in (ANIMS.keys() if "all" in targets else targets):
    print(f"[build_mito] {t}")
    build(t)
print("[build_mito] done")
