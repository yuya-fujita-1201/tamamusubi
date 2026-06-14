"""階段チェック。

階段(タイル category=stair / プロップ role=stair|shrine_stair)は:
  - 上側(奥)・下側に踊り場(歩行可)がある
  - 左右に側壁 or 高さ境界がある
を満たすこと。満たさないと『どこへ繋がる階段か読めない』。
"""
import common
from common import Finding, ERROR, WARNING, AXIS_HEIGHT

CODE = "STAIR"
NAME = "階段チェック"

WALLISH = {"retaining_wall", "earth_bank", "cliff", "forest_wall"}


def _walkable_near(ctx, x, y, dys):
    for dy in dys:
        for dx in (-1, 0, 1):
            if ctx.inb(x + dx, y + dy) and not ctx.solid(x + dx, y + dy):
                return True
    return False


def run(ctx):
    out = []

    # プロップ階段（obj.shrine_stairs 等）
    for p in ctx.props:
        role = ctx.prop_role(p["sheet"])
        if role not in ("stair", "shrine_stair"):
            continue
        x, y = p["itx"], p["ity"]          # 足元(下端)
        up = _walkable_near(ctx, x, y - 3, (-1, -2, -3))
        down = _walkable_near(ctx, x, y, (0, 1, 2))
        left_wall = any(ctx.ground_category(x - dx, yy) in WALLISH
                        for dx in (1, 2) for yy in (y - 1, y - 2))
        right_wall = any(ctx.ground_category(x + dx, yy) in WALLISH
                         for dx in (1, 2) for yy in (y - 1, y - 2))
        if not up or not down:
            out.append(Finding(
                ERROR, "STAIR_NO_LANDING", f"階段の上下に踊り場がない ({p['sheet']})",
                detail=f"({x},{y}) 上={'有' if up else '無'} 下={'有' if down else '無'}。階段が宙に浮く/行き止まり。",
                cells=[[x, y]], axis=AXIS_HEIGHT,
                suggestion="階段の奥(上段)と手前(下段)の両方に歩行可能なlandingを置く。"))
        if not (left_wall or right_wall):
            out.append(Finding(
                WARNING, "STAIR_NO_SIDEWALL", f"階段の左右に側壁/高さ境界がない ({p['sheet']})",
                detail=f"({x},{y}) 階段が平地に貼られたように見える。",
                cells=[[x, y]], axis=AXIS_HEIGHT,
                suggestion="階段の左右に擁壁(kaShrineWall/kaIshigaki)を寄せ、切り込み感を出す。"))

    # タイル階段（waStairs 等）— 連結成分ごとに1回判定
    seen = set()
    for y in range(ctx.h):
        for x in range(ctx.w):
            if (x, y) in seen:
                continue
            if ctx.ground_category(x, y) != "stair":
                continue
            # flood fill stair component
            comp = []
            stack = [(x, y)]
            while stack:
                cx, cy = stack.pop()
                if (cx, cy) in seen or not ctx.inb(cx, cy):
                    continue
                if ctx.ground_category(cx, cy) != "stair":
                    continue
                seen.add((cx, cy))
                comp.append((cx, cy))
                for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    stack.append((cx + ddx, cy + ddy))
            ys = [c[1] for c in comp]
            xs = [c[0] for c in comp]
            top, bot = min(ys), max(ys)
            cxm = sum(xs) // len(xs)
            up = _walkable_near(ctx, cxm, top - 1, (-1,))
            down = _walkable_near(ctx, cxm, bot + 1, (1,))
            if not up or not down:
                out.append(Finding(
                    ERROR, "STAIR_NO_LANDING", "階段(タイル)の上下に踊り場がない",
                    detail=f"x≈{cxm} y={top}..{bot} 上={'有' if up else '無'} 下={'有' if down else '無'}。",
                    cells=[[cxm, top], [cxm, bot]], axis=AXIS_HEIGHT,
                    suggestion="階段列の上端の奥と下端の手前に歩行可能セルを繋げる。"))
    return out
