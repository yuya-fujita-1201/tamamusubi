"""接地感チェック。

needsGroundContact なプロップ(民家/水車/社/立木)は、足元が地面(草/道/平場)に乗っていること。
水面/川/空セルの上に浮いていると接地しない。
needsEntrancePath な建物は、足元の隣接に歩行可能セル(入口導線)があること。
"""
import common
from common import Finding, WARNING, AXIS_CONTACT

CODE = "CONTACT"
NAME = "接地感チェック"

GROUND_OK = {"ground_grass", "ground_tone", "shrine_ground", "path"}


def run(ctx):
    out = []
    floating = []
    no_entrance = []
    for p in ctx.props:
        meta = ctx.prop_meta(p["sheet"])
        x, y = p["itx"], p["ity"]
        if meta.get("needsGroundContact"):
            cat = ctx.ground_category(x, y)
            allow_water = set(meta.get("nearCategory", []))
            # 足元が地面 or 許容カテゴリ(水車=水辺許容)。空セルや非許容水域は浮き。
            if cat in GROUND_OK:
                pass
            elif cat in allow_water:
                pass
            elif cat in ("water_surface", "river") and not allow_water:
                floating.append((p["sheet"], [x, y], cat))
            elif cat is None:
                floating.append((p["sheet"], [x, y], "empty"))
        if meta.get("needsEntrancePath"):
            adj_walk = any(not ctx.solid(x + dx, y + dy)
                           for dx, dy in ((-1, 0), (1, 0), (0, 1), (0, 2), (-1, 1), (1, 1)))
            if not adj_walk:
                no_entrance.append((p["sheet"], [x, y]))

    if floating:
        out.append(Finding(
            WARNING, "CONTACT_FLOATING", f"接地していないプロップ {len(floating)} 個",
            detail="; ".join(f"{s}({c[0]},{c[1]})→{cat}" for s, c, cat in floating[:8]),
            cells=[c for _, c, _ in floating], axis=AXIS_CONTACT,
            suggestion="足元を草地/道/平場に乗せる。水辺に置くなら土台・敷石・接地影を足す。"))
    if no_entrance:
        out.append(Finding(
            WARNING, "CONTACT_NO_ENTRANCE", f"入口導線が無い建物 {len(no_entrance)} 個",
            detail="; ".join(f"{s}({c[0]},{c[1]})" for s, c in no_entrance[:8]),
            cells=[c for _, c in no_entrance], axis=AXIS_CONTACT,
            suggestion="建物の足元の前面に道(kaPath2)/歩行可能セルを接続する。"))
    return out
