"""高さ差チェック。

A) 段差規律: 擁壁/土手/崖の『南向き前面フレーム』の真下セルに落ち影(waDropshadow)が無ければ、
   段差が一目で読めない → ERROR。（tanada.ts の wall() が守るべき規律の検証）
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
    shadow_family = shadow_cfg.get("family", "waDropshadow")

    # A) 前面フレームの真下に影があるか
    missing = []
    for y in range(ctx.h - 1):
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
            dk, _ = ctx.deco_at(x, y + 1)
            # 真下が壁/森など歩行不可なら段差の下端ではない（影不要）
            below_k, _ = ctx.ground_at(x, y + 1)
            below_meta = ctx.tile_meta(below_k)
            if below_meta.get("isWallFace") or below_meta.get("category") == "forest_wall":
                continue
            if dk != shadow_family:
                missing.append([x, y])
    if missing:
        out.append(Finding(
            ERROR, "HEIGHT_NO_SHADOW", "擁壁前面の真下に落ち影がない",
            detail=f"{len(missing)} 箇所。上端の縁＋縦面はあるが下端の接地影が欠落し、段差が読めない。",
            cells=missing, axis=AXIS_HEIGHT,
            suggestion=f"該当セルの deco レイヤに {shadow_family}(frame {shadow_cfg.get('strongFrame',3)}) を敷く。tanada.ts の wall() は capY+1 に影を置く実装。"))

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
