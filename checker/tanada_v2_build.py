#!/usr/bin/env python3
"""tanada v2 (全展開・第1版): スライスで確立した方式を全112x92に広げる。
方式: 高さは横帯(テラス)ごと一定=平地。段差は各帯南端の1本の横線(frame5)のみ=階段化しない。
      田は青い水ブロック。田の段差に田用の滝(白泡)。下の谷の川は平地で、H1→H0段差に川用の太い滝。
      中央に縦の参道(歩行)。神社高台は上中央。森で縁取り。
注: コーナーが要る"縦の川がテラスを貫く"表現は後回し(石垣四隅パーツ待ち)。川は下の谷(H0)に置く。
"""
import json, os
W, H = 112, 92
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GRASS, PADDY, RIVER, PATH = "kaGrassCalm", "kaPaddy2", "kaRiver3", "kaPath2"
WATERFALL = "kaWaterfall"   # 正方形・横シームレスな滝タイル(川幅ぶん敷き詰める)
FOREST, SHRINE_G, BAMBOO = "kaForest2", "kaShrineGround", "kaBamboo"
WALL, SHADOW = "kaIshigaki", "waDropshadow"
F_S = 5

ground = [""] * (W * H); deco = [""] * (W * H); overhead = [""] * (W * H); collision = [0] * (W * H)
def I(x, y): return y * W + x
def gf(x, y):
    h = (x * 374761393) ^ (y * 668265263); h = (h ^ (h >> 13)) & 0xffffffff; return h % 4
def paddy_frame(x, y):
    h = (x // 3 * 2654435761) ^ (y // 3 * 40503); h = (h ^ (h >> 11)) & 0xffffffff
    return [2, 0, 2, 3][h % 4]

WALL_Y = (19, 38, 56)
def height(y):
    if y < 19: return 3
    if y < 38: return 2
    if y < 56: return 1
    return 0

def is_forest(x, y):  return x < 6 or x >= W - 6 or y < 3
SH_X0, SH_X1, SH_Y0, SH_Y1 = 46, 65, 5, 15
def is_shrine(x, y):  return SH_X0 <= x <= SH_X1 and SH_Y0 <= y <= SH_Y1
def is_path(x, y):    return 53 <= x <= 58
RIV_X0, RIV_X1 = 88, 91   # 川は幅4マス
def is_riverfall(x, y): return RIV_X0 <= x <= RIV_X1 and y in (56, 57)  # 落ち口=滝タイルを敷き詰める
def is_river(x, y):     return RIV_X0 <= x <= RIV_X1 and y >= 58        # 滝壺から下=川(平地)

PADDY_SPILL = {19: (24, 40, 74, 90), 38: (20, 70, 100)}   # 田の滝(白泡細)位置
RIVER_FALL_X = list(range(RIV_X0, RIV_X1 + 1))             # H1→H0段差で川へ落ちる(太い滝)

props = []
for y in range(H):
    h = height(y)
    for x in range(W):
        if is_forest(x, y):
            t = BAMBOO if y < 3 else FOREST
            ground[I(x, y)] = f"{t}:{gf(x, y)}"; collision[I(x, y)] = 1
            continue
        if y in WALL_Y:
            # 段差行
            if is_path(x, y):
                ground[I(x, y)] = "waStairs:0"; collision[I(x, y)] = 0   # 参道の段差は石段で降ろす(整合)
                continue
            if y == 56 and RIV_X0 <= x <= RIV_X1:
                # H1→H0の落ち口: 滝タイル(正方形)を敷き詰める。壁は置かない。
                ground[I(x, y)] = f"{WATERFALL}:0"; collision[I(x, y)] = 1
                continue
            ground[I(x, y)] = f"{WALL}:{F_S}"; collision[I(x, y)] = 1
            if y + 1 < H: deco[I(x, y + 1)] = f"{SHADOW}:1"
            continue
        # 通常セル
        if is_shrine(x, y):
            ground[I(x, y)] = f"{SHRINE_G}:{gf(x, y)}"; collision[I(x, y)] = 0
        elif is_path(x, y):
            ground[I(x, y)] = f"{PATH}:{gf(x, y)}"; collision[I(x, y)] = 0
        elif is_riverfall(x, y):
            ground[I(x, y)] = f"{WATERFALL}:0"; collision[I(x, y)] = 1   # 落ち口の滝タイル(y57ぶん)
        elif is_river(x, y):
            ground[I(x, y)] = f"{RIVER}:{gf(x, y)}"; collision[I(x, y)] = 1
        elif h == 0:
            ground[I(x, y)] = f"{GRASS}:{gf(x, y) % 4}"; collision[I(x, y)] = 0   # 谷床=草(平地)
        else:
            ground[I(x, y)] = f"{PADDY}:{paddy_frame(x, y)}"; collision[I(x, y)] = 1  # テラス=青い棚田

# 田の滝(白泡・細) at paddy walls
for wy, xs in PADDY_SPILL.items():
    for sx in xs:
        if is_path(sx, wy) or is_forest(sx, wy): continue
        props.append({"sheet": "obj.waterfall_water", "frame": 0, "x": sx * 16 + 8, "y": (wy + 2) * 16,
                      "w": 16, "h": 32, "ysort": False, "solid": None, "shadow": False})
# 川の滝は obj スプライトでなく kaWaterfall タイル(正方形・横シームレス)を落ち口に敷き詰める方式に変更済み。
# (一枚絵スプライトは廃止。他タイルと同じ正方形マスで構成)
# 鳥居(参道の神社入口)
props.append({"sheet": "obj.torii", "frame": 0, "x": 55 * 16 + 8, "y": 17 * 16, "w": 56, "h": 48,
              "ysort": False, "solid": None, "shadow": False})

dump = {
    "id": "tanada_v2", "name": "棚田の谷 v2", "w": W, "h": H, "logicalTile": 16,
    "ground": ground, "deco": deco, "overhead": overhead, "collision": collision,
    "decals": [], "props": props, "warps": [], "npcs": [], "spawns": [],
    "outsideColor": "#2a4a20", "shadowAlpha": 1, "atmosphere": None,
}
json.dump(dump, open(os.path.join(ROOT, "checker", "_dump", "tanada_v2.json"), "w"), ensure_ascii=False)
print(f"WROTE tanada_v2.json ({W}x{H}) props={len(props)}")
