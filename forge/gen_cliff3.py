#!/usr/bin/env python3
"""高台の石垣を「不透明・3D角つき」で手続き合成する（お手本=ZZ-HCP-logs/009 準拠）。
ユーザーFB(2026-06-14 011): AIオートタイルの角が破綻(緑余白/反転/断絶)するため、
良質な既存玉石テクスチャ(tile_wa_ishigaki の不透明フレーム)＋面取り笠石を組んで
完全不透明な石垣セットを作る。前面=高い壁、N/W/E=細い面取り縁、角=立体的に巻く。

出力: public/assets/tile_wa_cliff3.png (16フレーム横ストリップ, 128px, 不透明)
      public/assets/tile_wa_stairs3.png (stairs2を不透明化)
assetmap.json に tile.wa_cliff3_set / tile.wa_stairs3_set を追記。

16フレーム (map placement と一致させる):
 0 rim_N   1 rim_W   2 rim_E   3 rim_NW  4 rim_NE
 5 cap_h(前面上の笠石) 6 wall 7 wall2 8 base(base_lower=下端を下段草に馴染ませ) 9 base2
 10 cap_SW(前左角) 11 cap_SE 12 wall_L 13 wall_R 14 base_L 15 base_R
"""
import os, json
from PIL import Image, ImageDraw, ImageChops, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.dirname(ROOT)
A = os.path.join(GAME, "public", "assets")
MAP = os.path.join(GAME, "src", "data", "assetmap.json")
S = 8  # SS（128px = 16論理×8）

ishi = Image.open(f"{A}/tile_wa_ishigaki2.png").convert("RGBA")  # 2026-06-14: 丸い玉石に再生成した新テクスチャ
gU = Image.open(f"{A}/tile_grass_upper.png").convert("RGBA")
gL = Image.open(f"{A}/tile_grass_lower.png").convert("RGBA")

def fr(im, i): return im.crop((i*128, 0, i*128+128, 128)).copy()

grassU = fr(gU, 0)
grassL = fr(gL, 0)

def enhance_cobble(img):
    """玉石を立体的に: コントラスト強調＋上方光AO（下を暗く＝光が上から）。"""
    a = img.split()[3] if img.mode == "RGBA" else Image.new("L", (128, 128), 255)
    rgb = img.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.18)
    rgb = ImageEnhance.Color(rgb).enhance(1.05)
    grad = Image.new("L", (1, 128))
    for y in range(128):
        grad.putpixel((0, y), max(0, min(255, int(255 * (1.0 - 0.15 * (y / 127))))))  # 上1.0→下0.85
    grad = grad.resize((128, 128))
    rgb = ImageChops.multiply(rgb, Image.merge("RGB", (grad, grad, grad)))
    out = rgb.convert("RGBA"); out.putalpha(a)
    return out

cap_src = enhance_cobble(fr(ishi, 1))    # 笠石+玉石（不透明・立体強調）
wall_a = enhance_cobble(fr(ishi, 5))     # 壁
wall_b = enhance_cobble(fr(ishi, 6))
base_a = enhance_cobble(fr(ishi, 12))    # 基部
base_b = enhance_cobble(fr(ishi, 13))

def flatten(img, bg):
    """imgのalphaをbg(不透明)に合成し完全不透明RGBAを返す"""
    out = bg.convert("RGBA").copy()
    out.alpha_composite(img)
    out.putalpha(255)
    return out

# 笠石テクスチャ帯（cap_src 上部の明るい切石部分）。縁(lip)に使う。
CAP_BAND = cap_src.crop((0, 0, 128, 40))  # 上40px=笠石帯
LW = 26  # 縁(lip)の幅（論理3.25タイル分相当の見栄え）。お手本の笠石は厚め。

def stone_strip(length, thickness):
    """笠石帯を thickness 厚で length 長に整形（横向き基準）"""
    strip = CAP_BAND.resize((128, thickness)).crop((0, 0, length, thickness))
    if length != 128:
        # タイル幅にリサイズ
        strip = CAP_BAND.resize((length, thickness))
    return strip

def bevel(draw, x0, y0, x1, y1, edge):
    """笠石帯の縁に面取り（plateau側=ハイライト, 外側=濃い影＝段差）を描いて立体感を出す。
       edge: 'N','S','W','E' = 外側がどの方角か。段差(ドロップ)を強めに。"""
    hl = (240, 238, 220, 230)        # 天端ハイライト
    sh = (52, 48, 38, 220)           # 外側の落ち影（段差の暗がり）
    sh2 = (84, 80, 64, 150)          # 影の二段目（やわらかく）
    if edge == "N":   # 上が外
        draw.line([(x0, y0), (x1, y0)], fill=sh, width=3)
        draw.line([(x0, y0+3), (x1, y0+3)], fill=sh2, width=2)
        draw.line([(x0, y1-1), (x1, y1-1)], fill=hl, width=2)
    elif edge == "S":
        draw.line([(x0, y1-1), (x1, y1-1)], fill=sh, width=3)
        draw.line([(x0, y0), (x1, y0)], fill=hl, width=2)
    elif edge == "W":
        draw.line([(x0, y0), (x0, y1)], fill=sh, width=3)
        draw.line([(x0+3, y0), (x0+3, y1)], fill=sh2, width=2)
        draw.line([(x1-1, y0), (x1-1, y1)], fill=hl, width=2)
    elif edge == "E":
        draw.line([(x1-1, y0), (x1-1, y1)], fill=sh, width=3)
        draw.line([(x1-4, y0), (x1-4, y1)], fill=sh2, width=2)
        draw.line([(x0, y0), (x0, y1)], fill=hl, width=2)

def rim(edge):
    """grassU + 外側edgeに面取り笠石lip。N/W/E用。"""
    img = grassU.copy()
    d = ImageDraw.Draw(img)
    if edge == "N":
        band = CAP_BAND.resize((128, LW))
        img.alpha_composite(band, (0, 0))
        bevel(d, 0, 0, 128, LW, "N")
    elif edge == "W":
        band = CAP_BAND.resize((128, LW)).rotate(90, expand=True)  # (LW,128)
        img.alpha_composite(band, (0, 0))
        bevel(d, 0, 0, LW, 128, "W")
    elif edge == "E":
        band = CAP_BAND.resize((128, LW)).rotate(-90, expand=True)
        img.alpha_composite(band, (128-LW, 0))
        bevel(d, 128-LW, 0, 128, 128, "E")
    img.putalpha(255)
    return img

def rim_corner(cy):
    """北の外角: 北の横帯＋(W|E)の縦帯。cy in {'W','E'} = 縦帯の側。
       ※本マップの上段外角は常に北側(NW/NE)なので横帯はN固定。"""
    img = grassU.copy()
    d = ImageDraw.Draw(img)
    # 横帯(N)
    bandH = CAP_BAND.resize((128, LW))
    img.alpha_composite(bandH, (0, 0))
    # 縦帯(W or E)
    if cy == "W":
        bandV = CAP_BAND.resize((128, LW)).rotate(90, expand=True)
        img.alpha_composite(bandV, (0, 0))
        bevel(d, 0, 0, LW, 128, "W")
    else:
        bandV = CAP_BAND.resize((128, LW)).rotate(-90, expand=True)
        img.alpha_composite(bandV, (128-LW, 0))
        bevel(d, 128-LW, 0, 128, 128, "E")
    bevel(d, 0, 0, 128, LW, "N")
    img.putalpha(255)
    return img

def edge_shadow(img, edge, w=6):
    """壁の左/右端に縦の影を足して角の立体感を出す"""
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(w):
        a = int(150 * (1 - i / w))
        if edge == "W":
            d.line([(i, 0), (i, 128)], fill=(20, 18, 14, a))
        else:
            d.line([(127-i, 0), (127-i, 128)], fill=(20, 18, 14, a))
    return img

def base_lower():
    """基部の下端の草を grass_lower トーンに寄せる（下段と馴染ませる）"""
    b = base_a.copy()
    # 下40pxに grass_lower を薄く重ねる
    gl = grassL.crop((0, 88, 128, 128))
    mask = Image.new("L", (128, 40), 0)
    md = ImageDraw.Draw(mask)
    for y in range(40):
        md.line([(0, y), (128, y)], fill=int(180 * (y/40)))
    b.paste(gl, (0, 88), mask)
    b.putalpha(255)
    return b

# ── 16フレーム組み立て ──
frames = [None]*16
frames[0] = rim("N")
frames[1] = rim("W")
frames[2] = rim("E")
frames[3] = rim_corner("W")
frames[4] = rim_corner("E")
frames[5] = flatten(cap_src, grassU)         # 前面上=笠石cap
frames[6] = flatten(wall_a, grassU)          # 壁
frames[7] = flatten(wall_b, grassU)
frames[8] = flatten(base_lower(), grassL)    # 基部
frames[9] = flatten(base_b, grassL)
# 前左角 cap_SW = cap + 左にWlip + 左端影
csw = flatten(cap_src, grassU)
bandV = CAP_BAND.resize((128, LW)).rotate(90, expand=True)
csw.alpha_composite(bandV, (0, 0))
csw = edge_shadow(csw.convert("RGBA"), "W", 5); csw.putalpha(255)
frames[10] = csw
cse = flatten(cap_src, grassU)
bandVe = CAP_BAND.resize((128, LW)).rotate(-90, expand=True)
cse.alpha_composite(bandVe, (128-LW, 0))
cse = edge_shadow(cse.convert("RGBA"), "E", 5); cse.putalpha(255)
frames[11] = cse
frames[12] = edge_shadow(flatten(wall_a, grassU), "W", 6)
frames[13] = edge_shadow(flatten(wall_b, grassU), "E", 6)
frames[14] = edge_shadow(flatten(base_lower(), grassL), "W", 6)
frames[15] = edge_shadow(flatten(base_b, grassL), "E", 6)
for f in frames: f.putalpha(255)

sheet = Image.new("RGBA", (128*16, 128), (0,0,0,0))
for i, f in enumerate(frames):
    sheet.paste(f, (i*128, 0))
sheet.save(f"{A}/tile_wa_cliff3.png")
print("wrote tile_wa_cliff3.png", sheet.size)

# stairs3 = stairs2 を不透明化（透明部=玉石色で埋める→緑透け防止。階段は壁で挟まれる）
st = Image.open(f"{A}/tile_wa_stairs2.png").convert("RGBA")
stone_bg = Image.new("RGBA", (128, 128), (96, 92, 80, 255))
st_out = Image.new("RGBA", (128*16, 128), (0,0,0,0))
for i in range(16):
    f = st.crop((i*128,0,i*128+128,128))
    o = stone_bg.copy(); o.alpha_composite(f); o.putalpha(255)
    st_out.paste(o, (i*128, 0))
st_out.save(f"{A}/tile_wa_stairs3.png")
print("wrote tile_wa_stairs3.png", st_out.size)

# assetmap 追記
m = json.load(open(MAP))
m["tile.wa_cliff3_set"] = {"cols":16,"file":"tile_wa_cliff3.png","frameH":128,"frameW":128,"frames":16}
m["tile.wa_stairs3_set"] = {"cols":16,"file":"tile_wa_stairs3.png","frameH":128,"frameW":128,"frames":16}
with open(MAP, "w") as f:
    json.dump(m, f, ensure_ascii=False, indent=2, sort_keys=True)
print("assetmap updated:", len(m), "keys")

# 確認用4x4グリッド
grid=Image.new("RGBA",(512,512),(30,30,40,255))
for i in range(16):
    grid.paste(frames[i],((i%4)*128,(i//4)*128))
grid.save("/tmp/cliff3_grid.png")
print("grid -> /tmp/cliff3_grid.png  row0:rimN/W/E/NW row1:NE/cap/wall/wall2 row2:base/base2/capSW/capSE row3:wallL/wallR/baseL/baseR")
