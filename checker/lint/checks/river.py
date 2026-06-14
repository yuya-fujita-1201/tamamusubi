"""川チェック。

川(category=river, role=river_lowvalley)は低地として見えること:
  - 岸(川セルに隣接する陸セル)に強い接地影(waDropshadow)がある → 川が地面を削って低く流れる谷感。
影が一定割合で欠けていると、川が地面に貼った青い帯に見える。
"""
import common
from common import Finding, WARNING, AXIS_WATER

CODE = "RIVER"
NAME = "川チェック"


def run(ctx):
    out = []
    shadow_family = ctx.contract.get("shadow", {}).get("family", "waDropshadow")
    river_cells = [(i % ctx.w, i // ctx.w) for i, s in enumerate(ctx.ground)
                   if ctx.category(common.parse_cell(s)[0]) == "river"]
    if not river_cells:
        return out
    river_set = set(river_cells)

    # 川セルが needsGroundShadow を要求する family を含むか
    wants_shadow = any(ctx.tile_meta(common.parse_cell(ctx.ground[ctx.idx(x, y)])[0]).get("needsGroundShadow")
                       for (x, y) in river_cells)
    if not wants_shadow:
        return out

    bank = []
    bare = []
    for (x, y) in river_cells:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not ctx.inb(nx, ny) or (nx, ny) in river_set:
                continue
            cat = ctx.ground_category(nx, ny)
            if cat in ("forest_wall", "retaining_wall", "cliff"):
                continue  # 壁が岸なら影不要
            bank.append((nx, ny))
            dk, _ = ctx.deco_at(nx, ny)
            if dk != shadow_family:
                bare.append([nx, ny])
    if bank:
        frac = len(bare) / len(bank)
        if frac > 0.5:
            out.append(Finding(
                WARNING, "RIVER_NO_BANK_SHADOW", "川岸の接地影が不足",
                detail=f"岸 {len(bank)} セル中 {len(bare)} セル({frac*100:.0f}%)に落ち影が無い。川が低い谷に見えず、地面に貼った帯に見える。",
                cells=bare, axis=AXIS_WATER,
                suggestion="川セルに隣接する陸セルの deco に waDropshadow(frame3) を敷き、川を低地として沈める。"))
    return out
