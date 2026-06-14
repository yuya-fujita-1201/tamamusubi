#!/usr/bin/env python3
"""高台の石垣を「不透明・連続立体陰影つき」で手続き合成する（お手本=ZZ-HCP-logs/014 準拠）。

== 2026-06-14 第3版（014 お手本反映）の狙い ==
旧版(第2版)は良質な玉石テクスチャ(tile_wa_ishigaki2)を各タイルに「同じグラデ(1.0→0.85)」で
反復適用していたため、5段積んでも“同じ石畳の反復”に見え、壁全体を貫く光が無く平坦だった。
014 のお手本を分析した結果、立体感の正体は次の4点:
  (1) 壁面全体を貫く【連続した縦グラデ】… 笠石直下=明るい → 基部=深い影、が一本の滑らかな勾配。
  (2) 【笠石(コーピング)】… 明るい天端ハイライト＋張り出しの硬い影ライン＋上段草が少し垂れる。
  (3) 【石ごとの3D】… 各石の上面ハイライト＋ジョイントの苔/暗がり（AO）。
  (4) 【基部の接地影】… 壁の足元に深い影が落ち、下段の暗い草へ繋がる。

→ 本スクリプトは、各壁コース(段)に【段ごとに異なる明度】を焼き込み、5段を積むと
   連続した一本のグラデになるよう合成する。笠石は専用フレームで天端＋張り出し影＋草垂れを描く。

出力: public/assets/tile_wa_cliff3.png  (21フレーム横ストリップ, 128px, 完全不透明)
      public/assets/tile_wa_stairs3.png (stairs2を不透明化)
assetmap.json に tile.wa_cliff3_set / tile.wa_stairs3_set を追記。

21フレーム (map placement = takadai.ts と一致):
  上段の縁(grassUpper上に笠石リップ):
    0 RIM_N   1 RIM_W   2 RIM_E   3 RIM_NW  4 RIM_NE
  前面の壁（中央列・横A/B変種で横反復を緩和。段ごとに明度が下がる=連続グラデ）:
    5 COPING_A 6 COPING_B   7 WUP_A 8 WUP_B   9 WMD_A 10 WMD_B
    11 WLO_A 12 WLO_B   13 WBASE_A 14 WBASE_B
  前面の壁（左右端の角列・縦影つき）:
    15 COPING_L 16 COPING_R   17 WALL_L 18 WALL_R   19 WBASE_L 20 WBASE_R
"""
import os, json, hashlib
from PIL import Image, ImageDraw, ImageChops, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.dirname(ROOT)
A = os.path.join(GAME, "public", "assets")
MAP = os.path.join(GAME, "src", "data", "assetmap.json")
T = 128  # SS=8 → 128px タイル

ishi = Image.open(f"{A}/tile_wa_ishigaki2.png").convert("RGBA")  # 丸い玉石（野面積み）16フレーム
gU = Image.open(f"{A}/tile_grass_upper.png").convert("RGBA")
gL = Image.open(f"{A}/tile_grass_lower.png").convert("RGBA")

def fr(im, i): return im.crop((i*T, 0, i*T+T, T)).copy()
grassU = fr(gU, 0)
grassL = fr(gL, 0)

# 石コースに使う玉石ソースフレーム（縦反復を避けるため段ごとに別フレームを引く）。
# ishigaki2 の壁帯らしいフレーム群（下段壁/基部）を再利用。
SRC = {
    "c0a": 5,  "c0b": 6,    # COPING 下地の石コース
    "wupa": 6, "wupb": 9,   # 壁上
    "wmda": 5, "wmdb": 10,  # 壁中
    "wloa": 9, "wlob": 13,  # 壁下
    "wba": 12, "wbb": 13,   # 基部
}

# ── 石の3D強調（お手本の“石ごとの丸み”を出す） ───────────────────────────
def enhance_cobble(src_frame):
    """玉石1フレームを“丸い塊（ボス）”として立体的に整える。RGB(不透明)で返す。
       手順: コントラスト＋アンシャープ → 目地を深く沈める(AO) → 控えめな苔 → 石の上面ハイライト。
       狙い(お手本=014): 各石が上面ハイライト＋目地の濃い影で半球状に浮き、目地は緑ではなく暗色で締まる。"""
    img = fr(ishi, src_frame).convert("RGB")
    img = ImageEnhance.Contrast(img).enhance(1.35)       # 石の陰影を深く（塊感）
    img = ImageEnhance.Color(img).enhance(1.10)
    img = img.filter(ImageFilter.UnsharpMask(radius=3, percent=120, threshold=2))  # 稜線を立てる
    lum = img.convert("L")
    # ① 目地（暗部=石の隙間）を更に暗く沈める＝AO強調で石が丸く浮く
    deep = lum.point(lambda v: 0 if v > 112 else int(min(255, (112 - v) * 2.2)))
    shade = Image.new("RGB", (T, T), (24, 22, 18))
    img = Image.composite(Image.blend(img, shade, 0.55), img, deep)
    # ② 目地にわずかな苔（緑）。泥っぽくならないよう控えめに。
    moss = Image.new("RGB", (T, T), (54, 74, 40))
    mossmask = lum.point(lambda v: 0 if v > 78 else int(min(255, (78 - v) * 1.3)))
    img = Image.composite(Image.blend(img, moss, 0.28), img, mossmask)
    # ③ 石の上面ハイライト（明部を更に持ち上げ＝丸み・お手本の白っぽい石頂部）
    bright = lum.point(lambda v: 0 if v < 150 else int(min(255, (v - 150) * 2.0)))
    hl = Image.new("RGB", (T, T), (236, 230, 208))
    img = Image.composite(Image.blend(img, hl, 0.38), img, bright)
    return img

def vgrad_multiply(img, top_mul, bot_mul, extra_bottom_shadow=0.0):
    """画像に縦方向の明度勾配(top_mul→bot_mul)を乗算し、段ごとの連続陰影を焼き込む。
       extra_bottom_shadow>0 で最下部にさらに接地影を足す（基部用）。RGB入力/出力。"""
    grad = Image.new("L", (1, T))
    for y in range(T):
        t = y / (T - 1)
        m = top_mul + (bot_mul - top_mul) * t
        if extra_bottom_shadow > 0:
            # 下端 ~22px に向けて急に暗く（接地影）
            be = max(0.0, (y - (T - 26)) / 26.0)
            m *= (1.0 - extra_bottom_shadow * be)
        grad.putpixel((0, y), max(0, min(255, int(255 * m))))
    grad = grad.resize((T, T))
    g3 = Image.merge("RGB", (grad, grad, grad))
    return ImageChops.multiply(img.convert("RGB"), g3)

def to_opaque(rgb):
    out = rgb.convert("RGBA"); out.putalpha(255); return out

# ── 連続グラデの明度設計（壁を一本の勾配に） ─────────────────────────────
# COPING(下地石)→WUP→WMD→WLO→WBASE が上から下へ滑らかに暗くなる。
# 各段の (top, bottom) 乗数を隣接段で一致させ“連続”にする。
# 範囲を広げ(1.04→0.40)、壁が一本の強い縦グラデになるよう設計（お手本=014 の立体感）。
L_COPING = (1.04, 0.99)   # 笠石直下の石コース（明るい）
L_WUP    = (0.99, 0.86)
L_WMD    = (0.86, 0.71)
L_WLO    = (0.71, 0.55)
L_WBASE  = (0.55, 0.40)   # 最暗＋接地影

def wall_course(src_frame, lo, hi, edge=None, base=False):
    """1コース分の壁石を生成（enhance→縦グラデ→不透明→任意で端影）。
       base=True は最下段: 接地影を強め、最下端に硬いコンタクトシャドウ線を足す。"""
    rgb = enhance_cobble(src_frame)
    rgb = vgrad_multiply(rgb, lo, hi, extra_bottom_shadow=(0.55 if base else 0.0))
    img = to_opaque(rgb)
    if base:
        d = ImageDraw.Draw(img, "RGBA")
        for i in range(4):  # 壁の足元＝地面と接する硬い影
            a = int(235 * (1 - i / 4))
            d.line([(0, T-1-i), (T, T-1-i)], fill=(10, 9, 7, a))
        img.putalpha(255)
    if edge:
        img = edge_shadow(img, edge, w=18)
    return img

def edge_shadow(img, edge, w=18):
    """壁の左/右端に縦の影（角の回り込み）を乗算で足す。"""
    img = img.convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(w):
        a = int(165 * (1 - i / w) ** 1.4)
        if edge == "W":
            d.line([(i, 0), (i, T)], fill=(14, 12, 9, a))
        else:
            d.line([(T-1-i, 0), (T-1-i, T)], fill=(14, 12, 9, a))
    img.putalpha(255)
    return img

# ── 左右の側面パーツ（お手本 p01-sokumen 準拠：うっすら石タイルが見える側面壁） ─────
#   ユーザーFB(016/p01): 正面壁だけだと平面的。左右の辺に「外=石の縦バンド/内=草地」の
#   側面パーツを置くと、高台が立体ブロックに見える。三角ウェッジ(旧案)は廃止。
#   石は前面壁と同じ玉石で 128px 解像度。側面=光が回り込まないのでやや影＝“うっすら”。
SIDE_STONE_W = 78  # 石バンドの幅(px)。広め＝側面のタイルがしっかり見える
SIDE_MOSS_W = 18   # 内側の苔生垣帯の幅
def side_face(side, base=False):
    """側面パーツ。side='W'(西辺): 外=左に石バンド/内=右に草。'E'(東辺): 鏡。
       お手本=016 の滑らかさに寄せ、(1)石は柔らかめ＆明るめで“タイルがうっすら見える”
       (2)石↔草の境界に苔の生垣帯を重ね有機的に繋ぐ (3)境界をぼかす。"""
    stone = enhance_cobble(SRC["wupa"])
    # 側面はやや影だがタイルが見える明るさ＋上→下の弱いグラデ（SW/SE角で前面と繋がる）
    stone = vgrad_multiply(stone, 0.92, 0.72, extra_bottom_shadow=(0.32 if base else 0.0))
    stone = to_opaque(stone)
    img = grassU.copy().convert("RGBA")     # ベース=plateau草（内側）
    sm = Image.new("L", (T, T), 0); smd = ImageDraw.Draw(sm)
    if side == "W":
        smd.rectangle([0, 0, SIDE_STONE_W, T], fill=255); bx = SIDE_STONE_W
    else:
        stone = stone.transpose(Image.FLIP_LEFT_RIGHT)
        smd.rectangle([T - SIDE_STONE_W, 0, T, T], fill=255); bx = T - SIDE_STONE_W
    sm = sm.filter(ImageFilter.GaussianBlur(4))  # 石↔草を滑らかに馴染ませる
    img.paste(stone, (0, 0), sm)
    # 石↔草の境界に苔の生垣帯（CAPBAND縦）＝有機的に繋ぐ
    capV = CAPBAND.resize((T, SIDE_MOSS_W)).rotate(-90 if side == "W" else 90, expand=True)
    img.alpha_composite(capV.convert("RGBA"), (bx - SIDE_MOSS_W // 2, 0))
    img = edge_shadow(img, side, 10)         # 外端(森側)に AO
    if base:                                  # SW/SE 角の足元＝接地影
        d = ImageDraw.Draw(img, "RGBA")
        for i in range(4):
            a = int(190 * (1 - i / 4)); d.line([(0, T-1-i), (T, T-1-i)], fill=(12, 11, 8, a))
        img.putalpha(255)
    return img

# ── 笠石(コーピング)フレーム ─────────────────────────────────────────────
# 構造(上→下): 草の垂れ(~8px) / 明るい笠石帯(~34px,天端HL) / 張り出しの硬い影(~7px) / 石コース
CAP_TOP = 6      # 草垂れ開始
CAP_H = 34       # 笠石帯の高さ
SHADOW_H = 8     # 張り出し影の高さ

def make_capband():
    """苔むした生垣コーピング帯（お手本=014/016 準拠）。
       旧版は明るいタン切石で硬く浮いていた（ユーザーFB「滑らかさが足りない」）。
       お手本は苔に覆われた緑灰の石＝有機的に辺・角を滑らかに巻く生垣。"""
    cap = fr(ishi, 1).convert("RGB")
    cap = ImageEnhance.Brightness(cap).enhance(1.06)
    moss = Image.new("RGB", (T, T), (94, 114, 66))  # 苔の緑灰
    cap = Image.blend(cap, moss, 0.52)
    cap = ImageEnhance.Color(cap).enhance(1.18)
    cap = ImageEnhance.Contrast(cap).enhance(1.05)
    return cap.crop((0, 0, T, CAP_H))

CAPBAND = make_capband()

def grass_fringe_mask(h):
    """草が縁から垂れる不規則マスク（下端がギザつく）。"""
    m = Image.new("L", (T, h), 0)
    d = ImageDraw.Draw(m)
    for x in range(T):
        hv = int(hashlib.md5(f"fr{x}".encode()).hexdigest()[:4], 16)
        drop = 2 + (hv % (h - 2))  # この列で草が垂れる高さ
        d.line([(x, 0), (x, drop)], fill=255)
    return m.filter(ImageFilter.GaussianBlur(0.6))

FRINGE_H = 14
GRASS_EDGE = grassU.crop((0, T-FRINGE_H, T, T)).copy()  # 草の下端を縁素材に
FRINGE_MASK = grass_fringe_mask(FRINGE_H)

def coping(variant, edge=None):
    """笠石フレーム＝草垂れ＋明笠石帯＋張り出し影＋明るい石コース。"""
    src = SRC["c0a" if variant == 0 else "c0b"]
    # 下地＝明るい石コース
    rgb = enhance_cobble(src)
    rgb = vgrad_multiply(rgb, L_COPING[0], L_COPING[1])
    img = to_opaque(rgb)
    d = ImageDraw.Draw(img, "RGBA")
    # 笠石帯（苔の生垣）
    img.paste(CAPBAND, (0, CAP_TOP))
    # 天端ハイライト＝崖の縁を読ませる柔らかい苔ライト（白ではなく明るい苔緑）
    d.line([(0, CAP_TOP), (T, CAP_TOP)], fill=(198, 214, 158, 200), width=3)
    d.line([(0, CAP_TOP+3), (T, CAP_TOP+3)], fill=(176, 196, 142, 110), width=2)
    # 張り出しの影（笠石が壁面に落とす＝厚み。やや柔らかく）
    sh_y = CAP_TOP + CAP_H
    for i in range(SHADOW_H + 2):
        a = int(195 * (1 - i / (SHADOW_H + 2)))
        d.line([(0, sh_y + i), (T, sh_y + i)], fill=(16, 14, 10, a))
    # 草の垂れ（笠石の上に草が少しかぶる）
    img.paste(GRASS_EDGE, (0, 0), FRINGE_MASK)
    img.putalpha(255)
    if edge:
        img = edge_shadow(img, edge, w=18)
    return img

# ── 上段の縁（grassUpper上の笠石リップ。N/W/E/角） ───────────────────────
LW = 24  # リップ（笠石縁）の幅
def rim_band(orient):
    """笠石帯をリップ向きに整形。orient: 'N'(横上) / 'W'(縦左) / 'E'(縦右)"""
    if orient == "N":
        return CAPBAND.resize((T, LW))
    elif orient == "W":
        return CAPBAND.resize((T, LW)).rotate(90, expand=True)   # (LW, T)
    else:
        return CAPBAND.resize((T, LW)).rotate(-90, expand=True)

def rim_bevel(d, edge):
    """リップの面取り（plateau側=ハイライト, 外側=段差影）。"""
    hl = (244, 240, 222, 220); sh = (40, 36, 28, 210); sh2 = (74, 70, 56, 130)
    if edge == "N":
        d.line([(0, 0), (T, 0)], fill=sh, width=3); d.line([(0, 3), (T, 3)], fill=sh2, width=2)
        d.line([(0, LW-1), (T, LW-1)], fill=hl, width=2)
    elif edge == "W":
        d.line([(0, 0), (0, T)], fill=sh, width=3); d.line([(3, 0), (3, T)], fill=sh2, width=2)
        d.line([(LW-1, 0), (LW-1, T)], fill=hl, width=2)
    elif edge == "E":
        d.line([(T-1, 0), (T-1, T)], fill=sh, width=3); d.line([(T-4, 0), (T-4, T)], fill=sh2, width=2)
        d.line([(T-LW, 0), (T-LW, T)], fill=hl, width=2)

def rim(edge):
    img = grassU.copy(); d = ImageDraw.Draw(img, "RGBA")
    if edge == "N":
        img.alpha_composite(rim_band("N").convert("RGBA"), (0, 0)); rim_bevel(d, "N")
    elif edge == "W":
        img.alpha_composite(rim_band("W").convert("RGBA"), (0, 0)); rim_bevel(d, "W")
    elif edge == "E":
        img.alpha_composite(rim_band("E").convert("RGBA"), (T-LW, 0)); rim_bevel(d, "E")
    img.putalpha(255); return img

def rim_corner(side):
    """北の外角(NW/NE)。横帯(N)＋縦帯(W|E)。side='W' or 'E'。"""
    img = grassU.copy(); d = ImageDraw.Draw(img, "RGBA")
    img.alpha_composite(rim_band("N").convert("RGBA"), (0, 0))
    if side == "W":
        img.alpha_composite(rim_band("W").convert("RGBA"), (0, 0)); rim_bevel(d, "W")
    else:
        img.alpha_composite(rim_band("E").convert("RGBA"), (T-LW, 0)); rim_bevel(d, "E")
    rim_bevel(d, "N")
    img.putalpha(255); return img

# side_face のコーナー（北の笠石帯を上に重ねる）。rim_band/rim_bevel はここまでに定義済。
def side_face_corner(side):
    img = side_face(side).convert("RGBA")
    img.alpha_composite(rim_band("N").convert("RGBA"), (0, 0))
    rim_bevel(ImageDraw.Draw(img, "RGBA"), "N")
    img.putalpha(255)
    return img

# ══════ 21フレーム組み立て（0-4 縁/側面 ＋ 5-14 前面 ＋ 15-20 前面角） ══════
frames = [None]*21
frames[0]  = rim("N")                  # 北の笠石（北面は奥＝コーピングのみ）
frames[1]  = side_face("W")            # 西辺の側面パーツ（石バンド＋草）
frames[2]  = side_face("E")            # 東辺
frames[3]  = side_face_corner("W")     # NW角（側面＋北笠石。直線辺と滑らかに接続）
frames[4]  = side_face_corner("E")     # NE角
# 中央列（A/B変種）
frames[5]  = coping(0)
frames[6]  = coping(1)
frames[7]  = wall_course(SRC["wupa"], *L_WUP)
frames[8]  = wall_course(SRC["wupb"], *L_WUP)
frames[9]  = wall_course(SRC["wmda"], *L_WMD)
frames[10] = wall_course(SRC["wmdb"], *L_WMD)
frames[11] = wall_course(SRC["wloa"], *L_WLO)
frames[12] = wall_course(SRC["wlob"], *L_WLO)
frames[13] = wall_course(SRC["wba"], *L_WBASE, base=True)
frames[14] = wall_course(SRC["wbb"], *L_WBASE, base=True)
# 左右端の角列（縦影つき）
frames[15] = coping(0, edge="W")
frames[16] = coping(1, edge="E")
# WALL_L/R は3段ぶん共用 → 中間明度(WMD)で1枚。端影で角を締める。
frames[17] = wall_course(SRC["wmda"], *L_WMD, edge="W")
frames[18] = wall_course(SRC["wmdb"], *L_WMD, edge="E")
frames[19] = wall_course(SRC["wba"], *L_WBASE, edge="W", base=True)
frames[20] = wall_course(SRC["wbb"], *L_WBASE, edge="E", base=True)
for f in frames:
    f.putalpha(255)

N = len(frames)
sheet = Image.new("RGBA", (T*N, T), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f, (i*T, 0))
sheet.save(f"{A}/tile_wa_cliff3.png")
print("wrote tile_wa_cliff3.png", sheet.size, f"({N} frames)")

# ── stairs3 = stairs2 を不透明化＋壁の光に馴染ませる ──
#   旧版は石段が壁より明るく浮いていた（批評）。全体を落とし、踏み面の段差影を強めて
#   壁の野面石と同じ光環境に統一する。
st = Image.open(f"{A}/tile_wa_stairs2.png").convert("RGBA")
stN = st.size[0] // T
stone_bg = Image.new("RGBA", (T, T), (84, 80, 70, 255))
st_out = Image.new("RGBA", (T*stN, T), (0, 0, 0, 0))
for i in range(stN):
    f = st.crop((i*T, 0, i*T+T, T))
    o = stone_bg.copy(); o.alpha_composite(f)
    rgb = o.convert("RGB")
    rgb = ImageEnhance.Brightness(rgb).enhance(0.82)   # 壁より明るく浮かないよう落とす
    rgb = ImageEnhance.Contrast(rgb).enhance(1.12)     # 段差の踏み面/蹴上げを締める
    o = rgb.convert("RGBA"); o.putalpha(255)
    st_out.paste(o, (i*T, 0))
st_out.save(f"{A}/tile_wa_stairs3.png")
print("wrote tile_wa_stairs3.png", st_out.size)

# ── assetmap 追記 ──
m = json.load(open(MAP))
m["tile.wa_cliff3_set"]  = {"cols": N,  "file": "tile_wa_cliff3.png",  "frameH": T, "frameW": T, "frames": N}
m["tile.wa_stairs3_set"] = {"cols": stN, "file": "tile_wa_stairs3.png", "frameH": T, "frameW": T, "frames": stN}
with open(MAP, "w") as f:
    json.dump(m, f, ensure_ascii=False, indent=2, sort_keys=True)
print("assetmap updated:", len(m), "keys ; cliff3 frames =", N)

# ── 確認用グリッド（5x5）──
cols = 5; rows = (N + cols - 1) // cols
grid = Image.new("RGBA", (T*cols, T*rows), (30, 30, 40, 255))
for i in range(N):
    grid.paste(frames[i], ((i % cols)*T, (i // cols)*T))
grid.save("/tmp/cliff3_grid.png")
print("grid -> /tmp/cliff3_grid.png")
