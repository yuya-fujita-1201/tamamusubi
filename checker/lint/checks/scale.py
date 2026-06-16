"""スケール階層チェック（GPT Pro 021）。

『立体感の強い素材 ≠ 大きい素材』。高低差は大きさでなく上端・縦面・下影・接続で出す。
プロップの視覚 bbox（実描画 w/h のタイル換算）を測り、次を検出する:
  - SCALE_GIANT      : 通常マップに巨大素材（幅≥5 or 高≥7 タイル / 禁止マップ型）= 8倍描画バグや遺跡素材の混入
  - SCALE_OVERSIZED  : scaleClass 予算超過（じわじわ肥大）
  - SCALE_OCCUPANCY  : 単体の非装飾物が1画面面積の閾値以上を占有
  - SCALE_FOCAL      : 主役(landmark)級クラスタの数（1画面に多すぎると視線の優先順位が消える）
  - SCALE_PLAYER_RATIO(INFO): 最大構造物のプレイヤー比
"""
import common
from common import Finding, ERROR, WARNING, INFO, AXIS_FOCUS

CODE = "SCALE"
NAME = "スケール階層チェック"


def _bbox_tiles(p, tile=16.0):
    return p["w"] / tile, p["h"] / tile


def _scale_class(ctx, sc, p):
    ov = sc.get("scaleClassOverride", {})
    if p["sheet"] in ov:
        return ov[p["sheet"]]
    cat = ctx.prop_category(p["sheet"])
    return sc.get("categoryClass", {}).get(cat, "structure")


def _clusters(points, radius):
    """点(center)を radius タイル以内で連結成分にまとめる。戻り: [{center,(cx,cy), members:[...]}]"""
    n = len(points)
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i in range(n):
        for j in range(i + 1, n):
            if abs(points[i][0] - points[j][0]) <= radius and abs(points[i][1] - points[j][1]) <= radius:
                parent[find(i)] = find(j)
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(points[i])
    out = []
    for members in groups.values():
        cx = sum(m[0] for m in members) / len(members)
        cy = sum(m[1] for m in members) / len(members)
        out.append({"center": (cx, cy), "members": members})
    return out


def _max_clusters_in_screen(clusters, sw, sh):
    """1画面(sw×sh)に同時に入るクラスタ中心の最大数とその中心群。
    窓の左上候補を各中心と (中心-画面寸) から作り矩形内包含で最大を取る
    （中心固定の半画面判定だと過少カウントになるため。Codexレビュー反映）。"""
    centers = [c["center"] for c in clusters]
    if not centers:
        return (0, [])
    lefts = set([cx for cx, _ in centers] + [cx - sw for cx, _ in centers])
    tops = set([cy for _, cy in centers] + [cy - sh for _, cy in centers])
    best = (0, [])
    for left in lefts:
        for top in tops:
            inside = [(cx, cy) for cx, cy in centers
                      if left <= cx <= left + sw and top <= cy <= top + sh]
            if len(inside) > best[0]:
                best = (len(inside), inside)
    return best


def run(ctx):
    sc = ctx.contract.get("scale")
    if not sc:
        return []
    out = []
    map_type = sc.get("mapTypes", {}).get(ctx.id, sc.get("mapTypes", {}).get("default", "normal_satoyama"))
    budget = sc.get("classBudget", {})
    screen = sc.get("screenTiles", {"w": 25, "h": 14})
    sw, sh = screen.get("w", 25), screen.get("h", 14)
    screen_area = sw * sh
    occ_max = sc.get("occupancyMaxFrac", 0.10)
    giant_w = sc.get("giantWidthTiles", 5.0)
    giant_h = sc.get("giantHeightTiles", 7.0)
    player = sc.get("playerTiles", 1.75)

    landmark_pts = []
    biggest = (0.0, None)
    for p in ctx.props:
        w, h = _bbox_tiles(p)
        cls = _scale_class(ctx, sc, p)
        b = budget.get(cls, budget.get("structure", {}))
        forb = b.get("forbiddenMapTypes", [])
        area = w * h
        if area > biggest[0]:
            biggest = (area, (p, w, h))
        if b.get("landmark"):
            landmark_pts.append((p["itx"], p["ity"]))

        if (w >= giant_w or h >= giant_h) or (map_type in forb):
            out.append(Finding(
                ERROR, "SCALE_GIANT", f"巨大素材が通常マップに配置 ({p['sheet']})",
                detail=f"視覚 {w:.1f}x{h:.1f} タイル（class={cls}, map={map_type}）。里山に巨大遺跡級が混ざりスケール階層が崩れる。",
                cells=[[p["itx"], p["ity"]]], axis=AXIS_FOCUS,
                suggestion="通常マップでは使わず神殿/ボス前専用に退避するか、人間スケール(幅≤3.5タイル)で描き直す。描画w/hがHD実寸(128/256/384px)のままなら論理px(÷8)へ。"))
            continue
        if w > b.get("maxW", 99) + 0.05 or h > b.get("maxH", 99) + 0.05:
            out.append(Finding(
                WARNING, "SCALE_OVERSIZED", f"スケール超過 ({p['sheet']})",
                detail=f"視覚 {w:.1f}x{h:.1f} タイル > {cls}予算 {b.get('maxW')}x{b.get('maxH')}。プレイヤー(≈{player}タイル)・周囲導線に対し大きい。",
                cells=[[p["itx"], p["ity"]]], axis=AXIS_FOCUS,
                suggestion=f"描画サイズを {cls} 予算内({b.get('maxW')}x{b.get('maxH')}タイル)へ縮小する。"))
        if cls != "decor" and area / screen_area >= occ_max:
            out.append(Finding(
                WARNING, "SCALE_OCCUPANCY", f"単体オブジェクトが画面を占有 ({p['sheet']})",
                detail=f"視覚 {area:.0f}タイル² が1画面({screen_area}タイル²)の {area/screen_area*100:.0f}%（上限{occ_max*100:.0f}%）。主役が埋もれる。",
                cells=[[p["itx"], p["ity"]]], axis=AXIS_FOCUS,
                suggestion="縮小するか、その画面の主役として構成を専用化する。"))

    # 主役(landmark)クラスタ密度＝視線の優先順位
    clusters = _clusters(landmark_pts, sc.get("landmarkClusterRadius", 5))
    warn_n = sc.get("landmarkClusterPerScreenWarn", 3)
    cnt, win = _max_clusters_in_screen(clusters, sw, sh)
    if cnt >= warn_n:
        out.append(Finding(
            WARNING, "SCALE_FOCAL_CROWDED", f"1画面に主役級クラスタが{cnt}個",
            detail="神社/集落/水車/橋など主役級が1画面に集中し、視線の優先順位が付かない（全員主役）。",
            cells=[[int(x), int(y)] for x, y in win], axis=AXIS_FOCUS,
            suggestion="1画面の主役を1つ(多くて2つ)に絞る。残りはサブとして縮小/間引き、または別エリア/別マップへ。"))
    else:
        out.append(Finding(
            INFO, "SCALE_FOCAL", f"主役級クラスタ {len(clusters)}個（同一画面最大 {cnt}個）",
            detail="；".join(f"({int(c['center'][0])},{int(c['center'][1])})" for c in clusters[:6]),
            axis=AXIS_FOCUS))

    if biggest[1]:
        p, w, h = biggest[1]
        out.append(Finding(
            INFO, "SCALE_PLAYER_RATIO", f"最大構造物 {p['sheet']} = 幅{w:.1f}/高{h:.1f}タイル（プレイヤー≈{player}）",
            detail=f"幅比 {w/player:.1f}x。通常マップでは建物でも概ね幅2x前後まで。",
            axis=AXIS_FOCUS))
    return out
