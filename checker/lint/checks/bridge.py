"""橋チェック。

橋床(role=bridge_deck)は:
  - 下/近傍に川(river) がある
  - 左右に橋台(obj.bridge_abutment) がある
  - 橋下影(obj.bridge_shadow) がある
  - 両端が道/歩行可で繋がっている
を満たすこと。単体で水の上に貼られた板に見えてはいけない。
"""
import common
from common import Finding, ERROR, WARNING, AXIS_WATER

CODE = "BRIDGE"
NAME = "橋チェック"


def run(ctx):
    out = []
    g = ctx.grammar.get("bridge", {})
    shadow_sheet = g.get("shadowProp", "obj.bridge_shadow")

    for p in ctx.props:
        if ctx.prop_role(p["sheet"]) != "bridge_deck":
            continue
        x, y = p["itx"], p["ity"]
        # 川が近傍にあるか（橋は川を渡す。橋セル自体は歩行可化され道になっている）
        river_near = any(ctx.ground_category(x + dx, y + dy) == "river"
                         for dx in range(-3, 4) for dy in (-1, 0, 1))
        # 左右に橋台
        ab_left = ctx.props_near(x - 3, y, radius=3, role="abutment")
        ab_right = ctx.props_near(x + 3, y, radius=3, role="abutment")
        ab_left = [a for a in ab_left if a["itx"] < x]
        ab_right = [a for a in ab_right if a["itx"] > x]
        # 橋下影
        shadow = ctx.props_near(x, y, radius=2, sheet=shadow_sheet)
        # 両端の道接続（左右に歩行可セル）
        left_path = any(not ctx.solid(x - dx, y) for dx in (2, 3, 4) if ctx.inb(x - dx, y))
        right_path = any(not ctx.solid(x + dx, y) for dx in (2, 3, 4) if ctx.inb(x + dx, y))

        if not river_near:
            out.append(Finding(
                ERROR, "BRIDGE_NO_RIVER", f"橋の下に川がない ({p['sheet']})",
                detail=f"({x},{y}) 近傍に river タイルが無く、何を渡る橋か読めない。",
                cells=[[x, y]], axis=AXIS_WATER,
                suggestion="橋床が跨ぐ位置に kaRiver3(低い谷) を通す。"))
        if not ab_left or not ab_right:
            out.append(Finding(
                ERROR, "BRIDGE_NO_ABUTMENT", f"橋台が片側/両側に無い ({p['sheet']})",
                detail=f"({x},{y}) 左橋台={'有' if ab_left else '無'} 右橋台={'有' if ab_right else '無'}。橋が岸に接続しない。",
                cells=[[x, y]], axis=AXIS_WATER,
                suggestion="橋床の左右の岸に obj.bridge_abutment を置いて接地させる。"))
        if not shadow:
            out.append(Finding(
                WARNING, "BRIDGE_NO_SHADOW", f"橋下の水影がない ({p['sheet']})",
                detail=f"({x},{y}) {shadow_sheet} が無く、橋が水面から浮いて見える。",
                cells=[[x, y]], axis=AXIS_WATER,
                suggestion="橋床の下層に obj.bridge_shadow を先に挿入する。"))
        if not (left_path and right_path):
            out.append(Finding(
                WARNING, "BRIDGE_NO_PATH", f"橋の両端が道に繋がっていない ({p['sheet']})",
                detail=f"({x},{y}) 左={'通行可' if left_path else '不可'} 右={'通行可' if right_path else '不可'}。",
                cells=[[x, y]], axis=AXIS_WATER,
                suggestion="橋の左右端に道(kaPath2)を接続し、橋上を歩行可にする。"))
    return out
