"""滝チェック。

滝/スピルウェイ(category=waterfall)は単体オブジェクト禁止。縦の接続が要る:
  - 上に水源(water_surface/river)or 落ち口(earth_bank/retaining_wall) がある
  - 下/足元に滝壺・水路(river/water_surface)or 低地(ground_grass/path) がある
水が高所→低所へ流れて見えること。
"""
import common
from common import Finding, ERROR, WARNING, AXIS_WATER

CODE = "WATERFALL"
NAME = "滝チェック"


def _has_cat_in_rows(ctx, x, rows, cats):
    for yy in rows:
        for dx in (-1, 0, 1):
            if ctx.ground_category(x + dx, yy) in cats:
                return True
    return False


def run(ctx):
    out = []
    g = ctx.grammar.get("waterfall", {})
    above_ok = set(g.get("above", ["water_surface", "river", "earth_bank", "retaining_wall", "cliff"]))
    below_ok = set(g.get("below", ["river", "water_surface", "ground_grass", "path"]))

    for p in ctx.props:
        if ctx.prop_category(p["sheet"]) != "waterfall":
            continue
        x, y = p["itx"], p["ity"]   # 足元(下端)
        # 上=水源/落ち口（足元から上方に縦モジュール）
        has_source = _has_cat_in_rows(ctx, x, (y - 1, y - 2, y - 3, y - 4), above_ok)
        # 下=滝壺/低地
        has_basin = _has_cat_in_rows(ctx, x, (y, y + 1, y + 2), below_ok)
        if not has_source:
            out.append(Finding(
                ERROR, "WATERFALL_NO_SOURCE", f"滝の上に水源がない ({p['sheet']})",
                detail=f"({x},{y}) 上方に水面/川/落ち口(石垣・土手)が無く、水が湧いて見える。",
                cells=[[x, y]], axis=AXIS_WATER,
                suggestion="滝の真上に上段水田(kaPaddy2)や川、または石垣の切り欠き(落ち口)を接続する。"))
        if not has_basin:
            out.append(Finding(
                WARNING, "WATERFALL_NO_BASIN", f"滝の下に滝壺/水路がない ({p['sheet']})",
                detail=f"({x},{y}) 下方に水面/川/開けた低地が無く、水の行き先が読めない。",
                cells=[[x, y]], axis=AXIS_WATER,
                suggestion="滝の真下に滝壺(水面)や下段の開けた草地/水路を置く。"))
    return out
