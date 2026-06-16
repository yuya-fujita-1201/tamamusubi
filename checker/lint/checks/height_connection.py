"""高さ差チェック。

A) 段差規律(2026-06-17 ユーザールール改定): 擁壁/土手/崖の『南向き前面フレーム』の
   セル自身の deco に下黒グラデ(waBaseShadow)が無ければ段差が読めない → ERROR。
   ＝高低差は「段差ブロックの下部」だけを黒くする。水/草/道へは影を落とさない（旧:真下セルに影、は廃止）。
B) 宣言的高さ境界: heightmap があれば、隣接セルの高さが違う境界に段差表現
   (retaining_wall/earth_bank/cliff/stair/waterfall/bridge/river のいずれか) が無ければ ERROR。
   heightmap が無ければ INFO（宣言を促す）。
"""
import common
from common import Finding, ERROR, INFO, AXIS_HEIGHT

CODE = "HEIGHT"
NAME = "高さ差チェック"


def run(ctx):
    out = []
    shadow_cfg = ctx.contract.get("shadow", {})
    shadow_family = shadow_cfg.get("family", "waBaseShadow")

    # A) 段差ブロックの前面フレーム『セル自身』に下黒グラデ(waBaseShadow)があるか
    #    ＝高低差はブロックの下部だけを黒くする（真下の草/道/水へは落とさない）。
    missing = []
    for y in range(ctx.h):
        for x in range(ctx.w):
            k, f = ctx.ground_at(x, y)
            meta = ctx.tile_meta(k)
            if not meta.get("isWallFace"):
                continue
            faces = meta.get("faceFrames")
            if not faces:            # 前面フレーム未定義の家族はこの規律をスキップ（誤検出防止）
                continue
            if f not in faces:
                continue
            dk, _ = ctx.deco_at(x, y)   # ブロック自身のセルの deco
            if dk != shadow_family:
                missing.append([x, y])
    if missing:
        out.append(Finding(
            ERROR, "HEIGHT_NO_BASESHADOW", "段差ブロックの下部に影がない",
            detail=f"{len(missing)} 箇所。石垣/土手等のブロック下部に下黒グラデ({shadow_family})が無く、足元が地面と一体化して段差が読めない。",
            cells=missing, axis=AXIS_HEIGHT,
            suggestion=f"該当ブロックのセル自身の deco に {shadow_family} を敷く（ブロック『下部』を黒く＝水/草/道へは落とさない）。"))

    # B) 宣言的高さ境界
    if ctx.height is None:
        out.append(Finding(
            INFO, "HEIGHT_NO_MAP", "高さマップ(H0/H1/H2)が未宣言",
            detail="宣言的な高低差境界チェックはスキップ。段差規律(影)のみ検査した。",
            axis=AXIS_HEIGHT,
            suggestion="checker/heightmaps/<map>.json に levels(2次元配列)を用意すると、全ての高さ境界に段差表現があるか検査できる。"))
        return out

    sat = set(ctx.grammar.get("heightBoundary", {}).get("satisfierCategories", []))
    H = ctx.height
    bad = []

    def lvl(x, y):
        if 0 <= y < len(H) and 0 <= x < len(H[y]):
            return H[y][x]
        return None

    def is_satisfier(x, y):
        if not ctx.inb(x, y):
            return True
        cat = ctx.ground_category(x, y)
        if cat in sat:
            return True
        # 段差/滝/橋プロップが跨いでいるか
        for p in ctx.props_near(x, y, radius=1):
            if ctx.prop_category(p["sheet"]) in ("waterfall", "bridge") or ctx.prop_role(p["sheet"]) in ("stair", "shrine_stair"):
                return True
        return False

    for y in range(ctx.h):
        for x in range(ctx.w):
            a = lvl(x, y)
            if a is None:
                continue
            for dx, dy in ((1, 0), (0, 1)):
                b = lvl(x + dx, y + dy)
                if b is None:
                    continue
                if abs(a - b) >= 1 and not (is_satisfier(x, y) or is_satisfier(x + dx, y + dy)):
                    bad.append([x, y])
    if bad:
        out.append(Finding(
            ERROR, "HEIGHT_NO_STEP", "高低差の境界に段差表現がない",
            detail=f"{len(bad)} 箇所で高さレベルが隣接セルと違うのに、擁壁/土手/崖/階段/滝/橋/川のいずれも無い。地続きに見える。",
            cells=bad, axis=AXIS_HEIGHT,
            suggestion="境界に kaIshigaki / kaDote / kaShrineWall / 階段 / 滝 / 橋 のいずれかを置く。"))
    return out
