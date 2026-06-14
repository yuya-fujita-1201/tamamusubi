"""装飾密度チェック。

  - 歩行可能域における装飾(decals + deco の category=decor/seam_breaker + 装飾プロップ)の密度が上限超過。
  - 起点(warp/spawn)周囲 2 タイルが装飾で埋もれていないか（主役周りはクリアに）。
情報量が地形構造より目立つと『ノイズ』になる。
"""
import common
from common import Finding, WARNING, INFO, AXIS_NOISE, AXIS_FOCUS

CODE = "DENSITY"
NAME = "装飾密度チェック"

DECOR_CATS = {"decor", "seam_breaker"}
DECOR_ROLES = {"flower", "tuft"}


def run(ctx):
    out = []
    walk = set(ctx.walkable_cells())
    if not walk:
        return out

    decor_cells = set()
    for d in ctx.decals:
        decor_cells.add((d["x"], d["y"]))
    for i, s in enumerate(ctx.deco):
        k, _ = common.parse_cell(s)
        if ctx.category(k) in DECOR_CATS:
            decor_cells.add((i % ctx.w, i // ctx.w))
    for p in ctx.props:
        if ctx.prop_role(p["sheet"]) in DECOR_ROLES:
            decor_cells.add((p["itx"], p["ity"]))

    walk_decor = decor_cells & walk
    density = len(walk_decor) / max(1, len(walk))
    dmax = ctx.threshold("decorDensityWalkableMax", 0.30)
    if density > dmax:
        out.append(Finding(
            WARNING, "DENSITY_HIGH",
            f"歩行域の装飾密度が高い {density*100:.0f}%（上限 {dmax*100:.0f}%）",
            detail="草地ベースより装飾(花/草むら/破砕)が主張し、地形構造が読みにくい。",
            cells=[list(c) for c in list(walk_decor)[:40]], axis=AXIS_NOISE,
            suggestion="歩行域(開けた草地)の装飾を間引き、段差/水辺/森縁に寄せる。25%縮小で確認。"))
    else:
        out.append(Finding(
            INFO, "DENSITY_OK", f"歩行域の装飾密度 {density*100:.0f}%（上限 {dmax*100:.0f}%以内）",
            axis=AXIS_NOISE))

    # 起点周囲のクリアゾーン
    near_max = ctx.threshold("decorDensityNearPlayerSpawnMax", 0.10)
    seeds = ctx.spawn_seeds()
    near = set()
    for (sx, sy) in seeds:
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                if ctx.inb(sx + dx, sy + dy) and not ctx.solid(sx + dx, sy + dy):
                    near.add((sx + dx, sy + dy))
    if near:
        near_density = len(near & decor_cells) / len(near)
        if near_density > near_max:
            out.append(Finding(
                WARNING, "DENSITY_NEAR_SPAWN",
                f"入口/主役周囲の装飾密度が高い {near_density*100:.0f}%（上限 {near_max*100:.0f}%）",
                detail="プレイヤー周囲1-2タイルが装飾で埋もれ、操作キャラが背景に紛れる。",
                cells=[list(c) for c in list(near & decor_cells)[:20]], axis=AXIS_FOCUS,
                suggestion="入場点・主要導線の周囲をクリアゾーンにし、花/草むらを置かない。"))
    return out
