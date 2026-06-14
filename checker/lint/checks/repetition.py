"""反復チェック。

同一タイル(key:frame が完全一致)が縦/横に N 個以上連続すると、切り貼り感・市松感が出る。
歩行域で目に入る category(草/道/平場/水面/棚田) のみ対象。背景の森壁/影/装飾は除外。
variant(中央バリエーション)がある family は『同じ frame の連続』のみ警告（変種で崩せていない証拠）。
"""
import common
from common import Finding, WARNING, INFO, AXIS_SEAM

CODE = "REPEAT"
NAME = "反復チェック"

TARGET_CATS = {"ground_grass", "ground_tone", "shrine_ground", "path", "water_surface"}


def _runs(seq):
    """[(value,startIndex,length), ...] for runs length>=1"""
    out = []
    i = 0
    n = len(seq)
    while i < n:
        j = i
        while j + 1 < n and seq[j + 1] == seq[i]:
            j += 1
        out.append((seq[i], i, j - i + 1))
        i = j + 1
    return out


def run(ctx):
    out = []
    run_min = int(ctx.threshold("repetitionRun", 3))
    var_min = max(5, run_min + 2)   # 変種ありの family は偶発の短い連続を許容（長い連続のみ＝散布失敗）
    cells = set()
    longest = 0

    def need_len(val):
        key, _ = common.parse_cell(val)
        cat = ctx.category(key)
        if cat not in TARGET_CATS:
            return None
        return var_min if ctx.tile_meta(key).get("variants") else run_min

    def scan(get_val, to_cell, n):
        nonlocal longest
        seq = [get_val(i) for i in range(n)]
        for val, start, length in _runs(seq):
            if not val:
                continue
            need = need_len(val)
            if need is None or length < need:
                continue
            longest = max(longest, length)
            for k in range(length):
                cells.add(to_cell(start + k))

    for y in range(ctx.h):
        scan(lambda x: ctx.ground[ctx.idx(x, y)], lambda x, _y=y: (x, _y), ctx.w)
    for x in range(ctx.w):
        scan(lambda y: ctx.ground[ctx.idx(x, y)], lambda y, _x=x: (_x, y), ctx.h)

    if cells:
        uniq = [list(c) for c in cells]
        # 較正: 非常に長い連続(>=8) or 広範囲(>=6%) なら WARNING、それ以外は INFO（偶発反復で減点しすぎない）
        big = longest >= 8 or len(uniq) > ctx.w * ctx.h * 0.06
        out.append(Finding(
            WARNING if big else INFO, "REPEAT_RUN",
            f"同一タイルの連続（最長{longest}連・{len(uniq)}セル）",
            detail=f"歩行域で同一 frame が連続し切り貼り/市松感（変種ありは{var_min}連以上、無しは{run_min}連以上で計上）。",
            cells=uniq, axis=AXIS_SEAM,
            suggestion="ground のハッシュ散布で center 変種(frame 0-3)をばらす / kaEdgeOverlay・curve_overlay を重ねて境界を崩す。"))
    return out
