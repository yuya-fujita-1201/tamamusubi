"""歩行可能範囲チェック。

  - 起点(warp/spawn)から BFS し、到達できない歩行可能ポケット(浮き島)を検出。
  - ランドマーク/対話プロップ(社/鳥居/宝箱/看板/民家/水車)の足元が到達可能か。
  - 通行不可率 solidRatio が目標帯[min,max]に収まるか。
"""
import common
from common import Finding, WARNING, INFO, AXIS_WALKABLE

CODE = "WALK"
NAME = "歩行可能範囲チェック"

LANDMARK_ROLES = {"shrine_object", "torii", "chest", "sign", "house", "watermill"}


def run(ctx):
    out = []
    walk = set(ctx.walkable_cells())
    if not walk:
        return [Finding(WARNING, "WALK_NONE", "歩行可能セルが無い", axis=AXIS_WALKABLE)]

    reach = ctx.bfs_reach(ctx.spawn_seeds())
    unreached = walk - reach
    if unreached:
        # クラスタ数を数える
        clusters = _clusters(ctx, unreached)
        big = [c for c in clusters if len(c) >= 4]
        sample = [list(next(iter(c))) for c in clusters[:8]]
        out.append(Finding(
            WARNING if big else INFO, "WALK_ISLAND",
            f"到達できない歩行域が {len(unreached)} セル({len(clusters)}塊)",
            detail="起点(入口warp/spawn)から歩いて辿り着けない歩行可能ポケット。浮き島/分断の疑い。",
            cells=sample, axis=AXIS_WALKABLE,
            suggestion="主要導線(道)から該当エリアへ歩行可能セルを繋ぐ。意図的な分断でなければ道で接続する。"))

    # ランドマーク到達性
    blocked = []
    for p in ctx.props:
        if ctx.prop_role(p["sheet"]) not in LANDMARK_ROLES:
            continue
        x, y = p["itx"], p["ity"]
        ok = any((x + dx, y + dy) in reach for dx in (-1, 0, 1) for dy in (-1, 0, 1, 2))
        if not ok:
            blocked.append((p["sheet"], [x, y]))
    if blocked:
        out.append(Finding(
            WARNING, "WALK_LANDMARK_UNREACHABLE",
            f"到達できないランドマークが {len(blocked)} 個",
            detail="; ".join(f"{s}({c[0]},{c[1]})" for s, c in blocked[:8]),
            cells=[c for _, c in blocked], axis=AXIS_WALKABLE,
            suggestion="該当プロップの足元の隣接に歩行可能セル(道/平場)を確保する。"))

    # solidRatio
    ratio = sum(1 for c in ctx.collision if c) / len(ctx.collision)
    lo = ctx.threshold("solidRatioMin", 0.30)
    hi = ctx.threshold("solidRatioMax", 0.55)
    if ratio < lo or ratio > hi:
        out.append(Finding(
            INFO, "WALK_SOLID_RATIO",
            f"通行不可率 {ratio*100:.0f}%（目標 {lo*100:.0f}-{hi*100:.0f}%）",
            detail="低すぎると箱庭の四角が見え、高すぎると歩ける場所が狭く窮屈。",
            axis=AXIS_WALKABLE))
    return out


def _clusters(ctx, cells):
    cells = set(cells)
    seen = set()
    clusters = []
    for c in cells:
        if c in seen:
            continue
        comp = set()
        stack = [c]
        while stack:
            cx, cy = stack.pop()
            if (cx, cy) in seen or (cx, cy) not in cells:
                continue
            seen.add((cx, cy))
            comp.add((cx, cy))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                stack.append((cx + dx, cy + dy))
        clusters.append(comp)
    clusters.sort(key=len, reverse=True)
    return clusters
