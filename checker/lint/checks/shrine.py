"""神社高台チェック。

神域(torii プロップ or shrine_ground タイルが存在する)は:
  - 鳥居 / 石段 / 社 の3導線要素がある
  - 平場(shrine_ground)がある
  - 棚田(water_surface)/川(river) タイルの流用が無い（文法混線の禁止）
  - 鳥居の奥が壁で塞がっていない（歩いて社へ行ける）
を満たすこと。
"""
import common
from common import Finding, ERROR, WARNING, AXIS_WORLD

CODE = "SHRINE"
NAME = "神社高台チェック"


def _shrine_region(ctx):
    cells = [(i % ctx.w, i // ctx.w) for i, s in enumerate(ctx.ground)
             if common.parse_cell(s)[0] and ctx.category(common.parse_cell(s)[0]) == "shrine_ground"]
    toriis = ctx.props_by_role("torii")
    hokoras = ctx.props_by_role("shrine_object")
    # 「神社高台」と見なすのは神域の平場(kaShrineGround)が存在する時だけ。
    # 単独の鳥居(村の門)や道端の祠は高台文法を要求しない＝偽陽性回避。
    if not cells:
        return None
    xs = [c[0] for c in cells] + [t["itx"] for t in toriis] + [hk["itx"] for hk in hokoras]
    ys = [c[1] for c in cells] + [t["ity"] for t in toriis] + [hk["ity"] for hk in hokoras]
    return (min(xs) - 1, min(ys) - 2, max(xs) + 1, max(ys) + 1), set(cells)


def run(ctx):
    region = _shrine_region(ctx)
    if region is None:
        return []
    (rx0, ry0, rx1, ry1), ground_cells = region
    out = []
    g = ctx.grammar.get("shrine", {})

    # 必須ロール（鳥居・社は ERROR / 石段は WARNING でタイル階段でも可）
    center = [[(rx0 + rx1) // 2, (ry0 + ry1) // 2]]
    present_roles = set(ctx.prop_role(p["sheet"]) for p in ctx.props
                        if rx0 - 1 <= p["itx"] <= rx1 + 1 and ry0 - 1 <= p["ity"] <= ry1 + 2)
    # 石段はプロップ(obj.shrine_stairs)でもタイル階段(category=stair)でも満たす
    region_has_stair_tile = any(ctx.ground_category(x, y) == "stair"
                                for y in range(max(0, ry0), min(ctx.h, ry1 + 1))
                                for x in range(max(0, rx0), min(ctx.w, rx1 + 1)))
    if region_has_stair_tile:
        present_roles.add("shrine_stair")

    sugg = {"torii": "鳥居 obj.torii を参道入口に置く。",
            "shrine_stair": "切り込み石段 obj.shrine_stairs を擁壁の切り欠きに嵌める（タイル階段でも可）。",
            "shrine_object": "社 obj.hokora を平場の奥に置く。"}
    for role in ("torii", "shrine_object"):
        if role not in present_roles:
            out.append(Finding(
                ERROR, "SHRINE_MISSING_ELEMENT", f"神域(平場)に必須要素 {role} がない",
                detail=f"鳥居→石段→平場→社の縦導線のうち {role} が欠落。",
                cells=center, axis=AXIS_WORLD, suggestion=sugg[role]))
    if "shrine_stair" not in present_roles:
        out.append(Finding(
            WARNING, "SHRINE_NO_STAIR", "神域(平場)へ上がる石段がない",
            detail="平場へ至る切り込み石段(obj.shrine_stairs)もタイル階段も無い。高台へどう上がるか読めない。",
            cells=center, axis=AXIS_WORLD, suggestion=sugg["shrine_stair"]))

    if not ground_cells:
        out.append(Finding(
            WARNING, "SHRINE_NO_GROUND", "神域に平場(shrine_ground)がない",
            detail="神社専用の管理された平場が無く、地面の格が出ない。",
            cells=[[(rx0 + rx1) // 2, (ry0 + ry1) // 2]], axis=AXIS_WORLD,
            suggestion="神域の床を kaShrineGround で敷く（棚田/草地の流用をやめる）。"))

    # 文法混線（棚田/川タイルの流用）
    forbidden = set(g.get("forbiddenGroundCategories", ["water_surface", "river"]))
    bad = []
    for y in range(max(0, ry0), min(ctx.h, ry1 + 1)):
        for x in range(max(0, rx0), min(ctx.w, rx1 + 1)):
            if ctx.ground_category(x, y) in forbidden:
                bad.append([x, y])
    if bad:
        out.append(Finding(
            WARNING, "SHRINE_TILE_MISUSE", "神域に棚田/川タイルが流用されている",
            detail=f"{len(bad)} 箇所。意味の違う素材流用で文法が混線する。",
            cells=bad, axis=AXIS_WORLD,
            suggestion="神域内の water_surface/river タイルを kaShrineGround / kaShrineWall に置換する。"))

    # 鳥居の奥(=神域の平場がある方向)が歩行可か。方向は shrine_ground の重心から決める（北固定にしない）。
    if g.get("toriiNeedsWalkableBehind", True) and ground_cells:
        gx = sum(c[0] for c in ground_cells) / len(ground_cells)
        gy = sum(c[1] for c in ground_cells) / len(ground_cells)
        for t in ctx.props_by_role("torii"):
            tx, ty = t["itx"], t["ity"]
            sdx = 0 if abs(gx - tx) < 1 else (1 if gx > tx else -1)
            sdy = 0 if abs(gy - ty) < 1 else (1 if gy > ty else -1)
            if sdx == 0 and sdy == 0:
                continue
            reachable = any(
                ctx.inb(tx + sdx * step + ox, ty + sdy * step + oy)
                and not ctx.solid(tx + sdx * step + ox, ty + sdy * step + oy)
                for step in (1, 2, 3) for ox in (-1, 0, 1) for oy in (-1, 0, 1))
            if not reachable:
                out.append(Finding(
                    ERROR, "SHRINE_TORII_BLOCKED", "鳥居の奥が壁で塞がっている",
                    detail=f"鳥居({tx},{ty}) の神域側(平場の方向)に歩行可能セルが無く、社へ行けない。",
                    cells=[[tx, ty]], axis=AXIS_WORLD,
                    suggestion="鳥居の奥に石段→平場の歩行導線を通す（擁壁の切り欠きを開ける）。"))
    return out
