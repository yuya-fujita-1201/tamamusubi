#!/usr/bin/env python3
"""v2 証明スライス v2(修正版): ユーザー指示の棚田ルールを実装。

NG(前回): 高さを1マスごとに変え、縦壁が階段状にギザギザ → 不自然。Y軸偏重でX軸の繋がり崩壊。
正しいルール:
  - テラス面(田・川・平地)は完全に平地(高低差ゼロ)。
  - 高低差は各テラスの「南端の1本の綺麗な横線」だけ(階段状にしない・X軸で揃える)。
  - 水が落ちる段差には滝(spillway)を置く。
  - 田は畦(kaDote)で小basinに区切る=田の字(すべて同高=平地)。

実装: 高さは"横帯(テラス)ごとに一定" → 高さが落ちる辺は南向きの横方向だけ → 縦壁(ギザギザの元)が原理的に発生しない。
"""
import json, os

W, H = 40, 32
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# テラス(連続・上から高い): (y0, y1, surface)。隣接帯は必ず高さ1差。
BANDS = [(0, 6, "paddy"), (8, 14, "paddy"), (16, 22, "grass"), (24, 31, "river")]
WALL_ROWS = {BANDS[i][1] + 1 - 1: i for i in range(len(BANDS))}  # 各帯最終行 y1 に南壁(最下帯は後で除外)
WALL_ROWS = {BANDS[i][1]: i for i in range(len(BANDS) - 1)}       # 最下帯(river)には壁を置かない

GRASS, PADDY, RIVER, DOTE = "kaGrassCalm", "kaPaddy2", "kaRiver3", "kaDote"
WALL, SHADOW = "kaIshigaki", "waDropshadow"
# kaIshigaki 横壁: 南面=5 / 左端=10 / 右端=9
F_S, F_L, F_R = 5, 10, 9

ground = [""] * (W * H); deco = [""] * (W * H); overhead = [""] * (W * H); collision = [0] * (W * H)
def I(x, y): return y * W + x
def gf(x, y):
    h = (x * 374761393) ^ (y * 668265263); h = (h ^ (h >> 13)) & 0xffffffff; return h % 4

def cell_band(y):
    for i, (y0, y1, s) in enumerate(BANDS):
        if y0 <= y <= y1:
            return i
    return len(BANDS) - 1

def is_ridge(x, y, band):
    """畦は廃止(緑グリッドが"緑の田の道"に見えるため)。稲が生えた青い水の棚田ブロックを敷き詰める。"""
    return False

def paddy_frame(x, y):
    """薄い水色/濃い水色の2トーン変化。低周波パターンで大きめのムラを作る(チカチカ防止)。"""
    h = (x // 3 * 2654435761) ^ (y // 3 * 40503)
    h = (h ^ (h >> 11)) & 0xffffffff
    # frame2=最も青/明るい, frame0=やや明,  frame3=やや暗 を使い分け(全て水色系)
    return [2, 0, 2, 3][h % 4]

SPILL_X = {10, 29}  # 滝の列。ここは spillway プロップが壁を兼ねる(二重壁を避ける)。

for y in range(H):
    band = cell_band(y); y0, y1, s = BANDS[band]
    if y in WALL_ROWS:
        # 段差=南向きの1本の綺麗な横線。直線壁なので全セル frame5(直線南面)で統一し、
        # 笠石ラインを完全に水平に揃える。frame9/10(外角)は笠石が角でカーブして下がり高さがずれるため、
        # 実際に90度曲がる箇所でのみ使う(このスライスは曲がらないので使わない)。
        for x in range(W):
            ground[I(x, y)] = f"{WALL}:{F_S}"; collision[I(x, y)] = 1
            if y + 1 < H:
                deco[I(x, y + 1)] = f"{SHADOW}:1"
        continue
    for x in range(W):
        if s == "paddy":
            ground[I(x, y)] = f"{PADDY}:{paddy_frame(x, y)}"; collision[I(x, y)] = 1
        elif s == "river":
            ground[I(x, y)] = f"{RIVER}:{gf(x, y)}"; collision[I(x, y)] = 1
        else:
            ground[I(x, y)] = f"{GRASS}:{gf(x, y) % 8}"; collision[I(x, y)] = 0

# 滝口: 独立スプライト(obj.spillway)は石垣と質感が合わず出っ張るので不使用。
# 代わりに「石垣の切り欠き(kaRiver3 notch・壁行と同高=フラット)＋下へ落ちる水路」で構成。
# → 石垣のラインは両側で1本に通り、滝口だけ水が抜ける(出っ張らない)。テクスチャは全て既存タイルで一致。
props = []
for wy, bi in WALL_ROWS.items():
    if BANDS[bi][2] != "paddy":
        continue
    for sx in sorted(SPILL_X):
        # 石垣の壁(連続・線が通る)の上に、抽出した滝の水を重ねる(kaIshigakiと同テクスチャの石垣の上を水が落ちる)。
        props.append({"sheet": "obj.waterfall_water", "frame": 0,
                      "x": sx * 16 + 8, "y": (wy + 2) * 16, "w": 16, "h": 32,
                      "ysort": False, "solid": None, "shadow": False})
        # 滝壺の特別パーツ(kaRiver3)は廃止(隣と馴染まないため)。落ち先は下のテラスの素材そのまま=共通化。

dump = {
    "id": "slice_v2", "name": "v2証明スライス(棚田ルール修正)", "w": W, "h": H, "logicalTile": 16,
    "ground": ground, "deco": deco, "overhead": overhead, "collision": collision,
    "decals": [], "props": props, "warps": [], "npcs": [], "spawns": [],
    "outsideColor": "#2a4a20", "shadowAlpha": 1, "atmosphere": None,
}
json.dump(dump, open(os.path.join(ROOT, "checker", "_dump", "slice_v2.json"), "w"), ensure_ascii=False)
print(f"WROTE slice_v2.json ({W}x{H}) walls@rows={sorted(WALL_ROWS)} props={len(props)}")
