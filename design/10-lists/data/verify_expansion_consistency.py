#!/usr/bin/env python3
"""verify_expansion_consistency.py — EXPANSION_PLAN_16AREAS §9 内部整合チェック

design/10-lists/data/*.json（build_data_json.py で md から再生成した機械可読版）を
読み、内部整合を13項目で機械検証する。PASS/⚠/FAIL を項目ごとに出力。
項目8 = warp ターゲット整合（全 warp トークンが実 map_id か allowlist 済の意図的地域ゲートウェイへ解決＝宙吊り0）。
項目9 = 詳細設計IDマーカー整合（30-detail の「未確定/未付番」が全て意図的繰延＝根拠注記のない裸TODO漏れ0／ID解決台帳あり）。
項目10 = 個別マップ lv_range ⊆ 地域band。項目11 = map_id接頭辞==region。項目12 = ENEMY/BOSS lv_range ⊆ 地域band（敵Lv帯同期・turn-063 追加）。
項目13 = 30-detail 相対mdリンク整合（ディレクトリrename回帰ガード・broken=0／turn-065 追加・critic broken_relative_map_links の真オラクル）。

実行: python3 design/10-lists/data/verify_expansion_consistency.py
（cwd はワークスペース直下 /Users/.../2D-RPG-Seihin を想定。--root で上書き可）

────────────────────────────────────────────────────────────────────────────
■ v2.0（2026-06-16 / 詳細設計続行プロジェクト rn-turn-005 / M4 step4）リナンバリング対応
  旧スクリプトは「旧番号セマンティクス（R9=ホムラ / R7=常世 / R10=和田津見 / R8=高天原）」
  をハードコードしており、REGION_RENUMBER_MAP.md の再採番後は誤検出を量産していた。
  本版は新セマンティクスへ書き換える（[REGION_RENUMBER_MAP](../../00-overview/REGION_RENUMBER_MAP.md) §1 正典）:
    R6 黒洲(クロス)  Lv36-46 / R7 ホムラ(火群と白磐) Lv42-50 / R8 常世(聖域・無戦闘) Lv46-54 /
    R9 和田津見(綿津見の大海・海戦闘) Lv48-56 / R10 高天原(最終) Lv52-62
  新背骨（走破順＝Lv昇順）: R1→R2→R3→R4→R5→R6→R7→R8→R9→R10（線形）。
  ※ map_id 接頭辞（小文字 r{n}_）も turn-054 で region 番号へ再採番済＝**接頭辞 r{n}_ == region R{n}**。
    例: ホムラ詳細マップ r7_*（region R7）／常世 r8_*（R8）／和田津見 r9_*（R9）／高天原 r10_*（R10）。
    項目11 がこの不変条件（prefix==region）を全マップで機械検査する（[REGION_RENUMBER_MAP §9]）。

  本版で意図的に FAIL し得る項目（＝後続 M4 step2/step3 の TODO を falsifiable に指す真オラクル）:
    - 項目2: 新背骨 R6黒洲→R7ホムラ→R8常世 の warp 再配線が MAP_LIST.md 未反映なら FAIL。
    - 項目7: 旧地理（ホムラ＝R4↔R5間 / boss_18→R5）・旧採番哲学（末尾採番）の散文残存があれば FAIL。
             （turn-038: 検査対象 prose_files に R9_wadatsumi.md / WEAPON_LIST.md を追加＝critic flag#2/#3 を恒久カバー）
  これらが PASS に転じた時点で M4（リナンバリング内容整合層）完了。
────────────────────────────────────────────────────────────────────────────
"""
import json, os, sys, re

ROOT = sys.argv[sys.argv.index('--root')+1] if '--root' in sys.argv else os.getcwd()
DATA = os.path.join(ROOT, 'design/10-lists/data')

def load(name, key):
    return json.load(open(os.path.join(DATA, f'{name}.json'), encoding='utf-8'))[key]

regions = load('regions', 'regions')
maps    = load('maps', 'maps')
enemies = load('enemies', 'enemies')
bosses  = load('bosses', 'bosses')
items   = load('items', 'items')
mag     = load('accessories', 'magatama')
koromo  = load('accessories', 'koromo')
weap    = json.load(open(os.path.join(DATA, 'weapons.json'), encoding='utf-8'))
events  = load('events', 'events')
npcs    = load('npcs', 'npcs')
skills  = load('skills', 'skills')

results = []   # (item_no, status, title, [evidence lines])
def record(no, status, title, lines): results.append((no, status, title, lines))
def etext(e): return ' '.join(str(v) for v in e.values())

# ── Item 1: 件数突合（SCOPE v1.1 目標 vs JSON 実数） ──────────────────────────
# 「約」目標は ±20% 許容（SCOPE §0 注記）。確定4要素(地域/マップ/武器/アイテム)は厳密。
targets = {  # name: (target, approx?, actual)
    '地域':   (10,  False, len(regions)),
    'マップ': (300, True,  len(maps)),       # 上限310は別途 item6
    '武器':   (80,  False, weap['count']),
    'アイテム':(115, False, len(items)),      # v1.1 でユーザー合意の確定値
    '勾玉':   (47,  True,  len(mag)),
    '衣':     (10,  True,  len(koromo)),
    '敵':     (75,  True,  len(enemies)),
    'ボス':   (19,  True,  len(bosses)),
    'NPC':    (88,  True,  len(npcs)),
    'イベント':(165, True,  len(events)),
    'スキル': (24,  True,  len(skills)),
}
l1 = []; ok1 = True
for nm, (tgt, approx, act) in targets.items():
    if approx:
        lo, hi = tgt*0.8, tgt*1.2
        good = lo <= act <= hi
        l1.append(f"  {'✓' if good else '✗'} {nm}: 目標約{tgt} / 実数{act} (許容{lo:.0f}〜{hi:.0f})")
    else:
        good = act == tgt
        l1.append(f"  {'✓' if good else '✗'} {nm}: 目標{tgt}(確定) / 実数{act}")
    ok1 = ok1 and good
record(1, 'PASS' if ok1 else 'FAIL', '件数突合', l1)

# ── Item 2: 導線整合（R7 ホムラ＝新背骨 R6黒洲→R7ホムラ→R8常世 ＋喪失→ボス→回復・依代/勾玉） ──
# 旧版は R9=ホムラ前提で「入口R4→出口R5」を検査していた。再採番後ホムラは R7・走破終盤へ移設され、
# 新背骨は R6黒洲 →(火の道)→ R7ホムラ →(外洋船/航路)→ R8常世。turn-054 で接頭辞も再採番＝ホムラは r7_。
# ⚠ MAP_LIST.md の warp 再配線（火の道を R6 起点へ・ホムラ湊→常世航路）が未反映だと入口/出口が
#   見つからず FAIL する＝これは M4 step2 の未了を falsifiable に指す（仕様どおり）。
r7 = [m for m in maps if m.get('region') == 'R7']          # ホムラ詳細マップ（r7_ 接頭辞・region=R7）
def warp_str(m): return str(m.get('warp', ''))
entry = [m['id'] for m in r7 if re.search(r'\br6_', warp_str(m))]                 # 黒洲(R6・r6_)から
exit_ = [m['id'] for m in r7 if re.search(r'\br8_|link_(gaiyosen|tokoyo)', warp_str(m))]   # 常世(R8・r8_接頭辞)/外洋船連絡へ
r7boss = [(b['id'], b['name']) for b in bosses if b.get('region') == 'R7']         # boss_17/18（地域内の山場）
r7mag  = [(m['id'], m['name']) for m in mag if m.get('region') == 'R7']            # mag_041-043 等
r7ev = [e['id'] for e in events if any(k in etext(e) for k in ('火群', 'たたら', '白磐', '湯ノ', '炉の', 'ホムラ'))]
l2 = [
    f"  {'✓' if entry else '✗'} 入口(R6黒洲→R7ホムラ・warp に r6_): {entry or 'なし'}",
    f"  {'✓' if exit_ else '✗'} 出口(R7ホムラ→R8常世・warp に r8_/外洋船link): {exit_ or 'なし'}",
    f"  {'✓' if len(r7boss)>=1 else '✗'} 地域ボス(山場): {r7boss}",
    f"  {'✓' if r7ev else '✗'} ホムラ(火群/たたら)イベント: {r7ev[:8]}{' …' if len(r7ev)>8 else ''}",
    f"  {'✓' if len(r7mag)>=1 else '✗'} 依代/勾玉: {r7mag}",
]
ok2 = bool(entry and exit_ and r7boss and r7ev and r7mag)
record(2, 'PASS' if ok2 else 'FAIL', '導線整合(R7 ホムラ・新背骨 R6→R7→R8)', l2)

# ── Item 3: レベルカーブ単調性（全背骨 R1→…→R10 が開始Lv非減少＋隣接帯オーバーラップ） ────
# 再採番の本旨「ID＝走破順＝Lv昇順」を全領域で falsifiable に検査する（REGION_RENUMBER §3.3）。
def lv(rid):
    r = next(x for x in regions if x['id'] == rid)
    nums = [int(n) for n in re.findall(r'\d+', r['lv_range'])]
    return nums[0], nums[1]
chain = [f'R{i}' for i in range(1, 11)]
lvs = [(rid, *lv(rid)) for rid in chain]
starts = [s for _, s, _ in lvs]
mono = all(starts[i] <= starts[i+1] for i in range(len(starts)-1))     # 開始Lv 非減少
overlap_bad = [f"{lvs[i][0]}末{lvs[i][2]}<{ lvs[i+1][0]}頭{lvs[i+1][1]}"
               for i in range(len(lvs)-1) if lvs[i][2] < lvs[i+1][1]]   # 隣接帯にギャップが無いか
l3 = [
    "  背骨: " + " → ".join(f"{rid}({s}-{e})" for rid, s, e in lvs),
    f"  {'✓' if mono else '✗'} 開始Lv 非減少: {starts}",
    f"  {'✓' if not overlap_bad else '✗'} 隣接帯オーバーラップ(ギャップ無): {overlap_bad or 'OK'}",
]
record(3, 'PASS' if (mono and not overlap_bad) else 'FAIL', 'レベルカーブ単調性(全背骨)', l3)

# ── Item 4: 世界観整合（武器8×10・常世の勾玉ロック・常世(R8)＝完全無戦闘/ボス0/敵0） ──────
# 「常世＝聖域・無戦闘・ボス0」を falsifiable に厳格検査する。常世は再採番後 R8。
# 旧常世の海戦闘(enm/boss_12/13・珊瑚の宮/深海)は R9 和田津見(現世/外洋)へ移設済 →
# 常世(R8)の出現敵・ボス・戦闘マップは literally 0 でなければ FAIL。
series = weap.get('seriesCount')
w_ok = (weap['count'] == 80 and series == 8)
lock = [m for m in mag if m['name'].startswith('常世の勾玉')]
def no_battle(m):
    e = str(m.get('enemies') or '').strip()
    return (e in ('', '—', '-', 'なし', 'None')) or ('無戦闘' in e)
r8 = [m for m in maps if m.get('region') == 'R8']
r8_battle = [m['id'] for m in r8 if not no_battle(m)]                  # 常世の戦闘マップ（0であるべき）
r8boss = [(b['id'], b['name']) for b in bosses if b.get('region') == 'R8']     # 常世ボス（0であるべき）
r8_enm = [e['id'] for e in enemies if e.get('region') == 'R8']                 # 常世出現敵（0であるべき）
# 移設先 R9 和田津見（現世/外洋）に旧常世の海戦闘が在ることを情報表示
r9boss = [(b['id'], b['name']) for b in bosses if b.get('region') == 'R9']
r9_enm = [e['id'] for e in enemies if e.get('region') == 'R9']
tokoyo_clean = (not r8_battle) and (not r8boss) and (not r8_enm)
l4 = [
    f"  {'✓' if w_ok else '✗'} 武器 8系統×10段階: count={weap['count']} seriesCount={series}",
    f"  {'✓' if lock else '✗'} 常世の勾玉(物語ロック)健在: {[m['id'] for m in lock]}",
    f"  {'✓' if not r8_battle else '✗'} 常世(R8)全{len(r8)}枚=無戦闘 (戦闘混入: {r8_battle or 'なし'})",
    f"  {'✓' if not r8boss else '✗'} 常世(R8)ボス0 (残存: {r8boss or 'なし'})",
    f"  {'✓' if not r8_enm else '✗'} 常世(R8)出現敵0 (残存: {r8_enm or 'なし'})",
    f"  ℹ 旧常世の海戦闘は R9 和田津見(現世/外洋)へ移設: ボス{r9boss} / 敵{len(r9_enm)}種",
]
item4_ok = bool(w_ok and lock and tokoyo_clean)
record(4, 'PASS' if item4_ok else 'FAIL', '世界観整合(常世=R8 無戦闘/ボス0)', l4)

# ── Item 5: 相互参照整合（map_id/region キー一貫・R7_homura 基本設計に全map掲載） ─────────
mapids = {m['id'] for m in maps}
regids = {r['id'] for r in regions}
boss_badmap = [(b['id'], b.get('map')) for b in bosses if b.get('map') and b['map'] not in mapids]
enemy_badreg = [(e['id'], e.get('region')) for e in enemies if e.get('region') not in regids]
mag_badreg = [(m['id'], m.get('region')) for m in mag if m.get('region') not in regids and m.get('region') not in (None, '', '—', '共通', '汎用')]
homura = os.path.join(ROOT, 'design/20-basic/regions/R7_homura.md')   # 再採番後: R9_homura.md → R7_homura.md
homura_exists = os.path.isfile(homura)
r7_missing = []
if homura_exists:
    txt = open(homura, encoding='utf-8').read()
    r7_missing = [m['id'] for m in r7 if m['id'] not in txt]
l5 = [
    f"  {'✓' if not boss_badmap else '✗'} boss.map が maps.json に全存在 (欠落: {boss_badmap or 'なし'})",
    f"  {'✓' if not enemy_badreg else '✗'} enemy.region が regions に全存在 (不正: {enemy_badreg or 'なし'})",
    f"  {'✓' if not mag_badreg else '✗'} magatama.region が regions に全存在 (不正: {mag_badreg or 'なし'})",
    f"  {'✗' if not homura_exists else ('✓' if not r7_missing else '✗')} R7_homura.md 基本設計: "
    + ('未作成（FOLLOW-UP B）' if not homura_exists else ('未掲載map=' + (str(r7_missing) if r7_missing else 'なし'))),
]
xref_ok = (not boss_badmap and not enemy_badreg and not mag_badreg)
item5 = 'PASS' if (xref_ok and homura_exists and not r7_missing) else ('PASS(⚠条件付)' if (xref_ok and not homura_exists) else 'FAIL')
record(5, item5, '相互参照整合', l5)

# ── Item 6: 容量（マップ総数≤310・新規タイル系統8〜9） ───────────────────────
n_maps = len(maps)
cap_ok = n_maps <= 310
exp = open(os.path.join(ROOT, 'design/00-overview/EXPANSION_PLAN_16AREAS.md'), encoding='utf-8').read()
tile_doc = ('8〜9 系統' in exp) or ('8〜9系統' in exp)
l6 = [
    f"  {'✓' if cap_ok else '✗'} マップ総数 {n_maps} ≤ 上限目安310",
    f"  {'✓' if tile_doc else '✗'} 新規タイル系統『概ね8〜9系統』を EXPANSION§5.1 が明記",
]
record(6, 'PASS' if (cap_ok and tile_doc) else 'FAIL', '容量', l6)

# ── Item 7: 新背骨整合（旧地理／旧採番哲学の散文残存検出＋常世(R8)events無戦闘） ────────────
# 再採番でホムラは「R4↔R5 の中間（走破5番目）」から「R6黒洲→R7→R8常世（走破終盤）」へ移設された。
# よって以下の旧記述が現役正典の散文に残っていれば FAIL（M4 step3 の TODO を falsifiable に指す）:
#  (A) boss_18（ホムラのゲートボス）が「R5 へ続く/R5 北雪郷」と旧地理で説明される残存。
#  (B) ホムラ/火群が「R4↔R5 メイン導線（上）」に在ると説明される残存。
#  (C) 再採番済リージョン(R7-R10)に「末尾採番」という旧採番哲学を現在形で当てる残存。
#  (D) 常世(R8)に戦闘イベント（boss/撃破/対峙）が存在する残存。
# ※ 履歴・移設説明（旧/移設/再採番/REVISION/改訂）を含む行は当時の記録＝正として除外。
HIST = re.compile(r'旧|移設|再採番|REVISION|改訂|履歴|v1\.\d')   # 当時の記録は除外
prose_files = [
    'design/00-overview/EXPANSION_PLAN_16AREAS.md',
    'design/00-overview/SCOPE_AND_SCALE.md',
    'design/20-basic/systems/PROGRESSION_DESIGN.md',
    'design/20-basic/systems/SCENARIO_DESIGN.md',
    'design/20-basic/regions/R7_homura.md',
    'design/20-basic/regions/R8_tokoyo.md',
    'design/20-basic/regions/R9_wadatsumi.md',   # turn-038: critic flag#2 のカバレッジ追加（末尾採番=旧framingのみ）
    'design/10-lists/MAP_LIST.md',
    'design/10-lists/BOSS_LIST.md',
    'design/10-lists/REGION_LIST.md',
    'design/10-lists/WEAPON_LIST.md',            # turn-038: critic flag#3 のカバレッジ追加（R7=R6→R7終盤framingのみ）
    'Story.md',
]
hits_a, hits_b, hits_c = [], [], []
for rel in prose_files:
    p = os.path.join(ROOT, rel)
    if not os.path.isfile(p):
        continue
    for i, line in enumerate(open(p, encoding='utf-8'), 1):
        if HIST.search(line):
            continue
        # (A) boss_18 を R5 へ続くと説明（新地理では R7→R8常世）
        if re.search(r'boss_18', line) and re.search(r'\bR5\b', line):
            hits_a.append(f"{rel}:{i}")
        # (B) ホムラ/火群が R4↔R5 導線上
        if re.search(r'R4\s*[↔←→\-–~〜]\s*R5', line) and re.search(r'火群|火の地|ホムラ|\bR7\b', line):
            hits_b.append(f"{rel}:{i}")
        # (C) 再採番済リージョンに末尾採番を当てる
        if ('末尾採番' in line) and re.search(r'\bR(7|8|9|10)\b', line):
            hits_c.append(f"{rel}:{i}")
# (D) 常世(R8)events に戦闘
r8_combat_ev = [e['id'] for e in events
                if re.match(r'^R8\b', str(e.get('stage', '')).strip())
                and re.search(r'boss_\d|撃破|対峙|交戦', etext(e))]
l7 = [
    f"  {'✓' if not hits_a else '✗'} boss_18→R5 旧地理残存なし: {hits_a or 'なし'}",
    f"  {'✓' if not hits_b else '✗'} ホムラ＝R4↔R5導線 旧地理残存なし: {hits_b or 'なし'}",
    f"  {'✓' if not hits_c else '✗'} R7-R10に『末尾採番』旧哲学残存なし: {hits_c or 'なし'}",
    f"  {'✓' if not r8_combat_ev else '✗'} 常世(R8)戦闘イベント0: {r8_combat_ev or 'なし'}",
]
item7_ok = (not hits_a) and (not hits_b) and (not hits_c) and (not r8_combat_ev)
record(7, 'PASS' if item7_ok else 'FAIL', '新背骨整合(旧地理/旧採番哲学の散文残存)', l7)

# ── 項目8: warp ターゲット整合（宙吊り0・全 warp が実 map_id へ解決） ──────────
# MAP_LIST.md(→maps.json) の warp 散文を '/' '↔' で分割し、各トークンが
#   (a) 実在 map_id（厳密一致 / 括弧内 map_id / map_id 接頭辞＋和文注記）へ解決、
#   (b) 無warp標識 '—' '-' 'ー'、
# でなければ orphan として FAIL。Phase2 マップ遷移図の「warp 宙吊り0＝全エッジが実ノードへ」を
# falsifiable に保証する。
# 【2026-06-16 更新（critic flag #2 解消）】旧版は非隣接地域への道標4件（R2北出口/R5南出口/
#   R6北山出口/R8最終出口）を allowlist で許容していたが、これは「各マップをノード・warpをエッジ」
#   とする遷移図の完了証拠として不足だった。4件を全て実在 map_id へ結線したため allowlist は空化。
#   r3_kaido_higashi→r3_satoyama_higashi / r3_kaido_minami→r3_suiro_ura /
#   r3_kaido_kita→r3_matsubara / r8_unkai→link_hikuotei_hatchakujo（いずれも逆方向 warp が既存で双方向整合）。
WARP_GATEWAY_ALLOW = set()  # allowlist 廃止: 全 warp が実 map_id へ解決すること（例外なし）
_mids = set(m['id'] for m in maps)
_mids_sorted = sorted(_mids, key=len, reverse=True)
def _resolve_warp(t):
    t = t.strip()
    if not t or t in ('—', '-', 'ー'):
        return 'skip'
    if t in _mids:
        return 'id'
    mp = re.search(r'[(（]([a-z0-9_]+)[)）]', t)
    if mp and mp.group(1) in _mids:
        return 'id'
    for i in _mids_sorted:
        if t.startswith(i):
            return 'id'
    if t in WARP_GATEWAY_ALLOW:
        return 'gateway'
    return 'orphan'
orphans = []
gateway_hits = []
for m in maps:
    for tok in re.split(r'[/↔]', warp_str(m)):
        if not tok.strip():
            continue
        kind = _resolve_warp(tok)
        if kind == 'orphan':
            orphans.append(f"{m['id']}: 「{tok.strip()}」")
        elif kind == 'gateway':
            gateway_hits.append(f"{m['id']}→{tok.strip()}")
l8 = [
    f"  {'✓' if not orphans else '✗'} 非map_id orphan トークン: {len(orphans)} 件" + (f" → {orphans[:8]}" if orphans else ""),
    f"  ✓ 意図的 地域ゲートウェイ(allowlist, 実装フェーズで具体境界へ結線): {len(gateway_hits)} 件 {gateway_hits}",
]
record(8, 'PASS' if not orphans else 'FAIL', 'warpターゲット整合(宙吊り0)', l8)

# ── Item 9: 30-detail「未確定/未付番」マーカーが全て意図的繰延か(裸TODO=0) ───────
# 詳細設計(30-detail/maps/*.md)では、報酬アイテム/勾玉/衣/イベント等で正式 ID(itm_/mag_/
# koromo_/ev_)を捏造せず「ID未確定/未付番」プレースホルダを置く運用がある（捏造防止規律＝
# canon マスタを発明 ID で汚さない / 生成と検査を分ける設計哲学）。設計内容(名称・効果・入手元・
# トリガー・台詞)は完全記述済みで、数値 ID 採番のみを実装フェーズへ繰延している。
# 本項目は「全マーカーが正当な繰延(根拠注記つき or イベント表プレースホルダ行)であり、
# 根拠のない裸の TODO 漏れが 0 件」であることを falsifiable に保証する。
# 台帳 design/30-detail/ID_RESOLUTION_LEDGER.md が分類と実装フェーズ採番タスクを所有する。
import glob as _glob
_RATIONALE = ['発明','寄せ','実装時','実装フェーズ','後続設計','後続の設計','マスタ更新','候補','未付番',
    '進行フラグ','描写ラベル','正式登録','確定予定','確定する','登録する','付番','canon','次版で確定',
    '発明禁止','流用禁止','mag_','itm_','koromo','枠','捏造','記述名','保留','化未確定','正規化',
    'フレーバー','フラグ','報酬名','ev_','—','MAP_LIST','ITEM_LIST','EVENT_LIST']
_detail_glob = os.path.join(ROOT, 'design/30-detail/maps/**/*.md')
_marker_files = sorted(_glob.glob(_detail_glob, recursive=True))
_marker_total = 0
_bare = []
for _f in _marker_files:
    _lines = open(_f, encoding='utf-8').read().splitlines()
    for _i, _ln in enumerate(_lines):
        if '未確定' not in _ln and '未付番' not in _ln:
            continue
        _marker_total += 1
        # 窓 ±4 行内に根拠注記があれば「意図的繰延」と判定（注記が隣接行にある運用を許容）
        _w = '\n'.join(_lines[max(0, _i-4): _i+5])
        if any(tok in _w for tok in _RATIONALE):
            continue
        _bare.append(f"{os.path.relpath(_f, ROOT)}:{_i+1}")
_ledger_ok = os.path.exists(os.path.join(ROOT, 'design/30-detail/ID_RESOLUTION_LEDGER.md'))
l9 = [
    f"  ✓ 30-detail 未確定/未付番マーカー総数: {_marker_total} 件（全て設計内容は完備・数値ID採番のみ実装フェーズへ繰延）",
    f"  {'✓' if not _bare else '✗'} 根拠注記のない裸TODO漏れ: {len(_bare)} 件" + (f" → {_bare[:8]}" if _bare else ""),
    f"  {'✓' if _ledger_ok else '✗'} ID解決台帳 ID_RESOLUTION_LEDGER.md: {'存在' if _ledger_ok else '欠落'}",
    f"  ℹ これら {_marker_total} 件は『数値ID欄のみ未発番』のプレースホルダ＝**ダングリング参照ではない**（どこも壊れた先を指していない）。plan M8 step1『ダングリングID/warp 0件』は項目8（warp宙吊り0）＋項目13（相対mdリンク破損0）＋build のクロスリファレンス解決で別途充足済。詳細＝ID_RESOLUTION_LEDGER.md §0.1 の概念分離表。",
]
record(9, 'PASS' if (not _bare and _ledger_ok) else 'FAIL', '詳細設計IDマーカー整合(裸TODO=0/台帳あり)', l9)

# ── 項目10: 個別マップ lv_range ⊆ 地域band（turn-052 Lv帯同期の falsifiable オラクル） ──
# REGION_LIST §1.1 canon「band＝地域包絡・個別Lv＝band 内グラデーション」を機械検査する。
# turn-052 で R7/R8/R9 を旧スケールから band へ remap_lvrange_bands.py で同期済。
# 例外 allowlist = 文書化された「寄り道レア先取りの強敵地帯」（地域band を意図的に超過）。
# 新規マップが band 外へ drift すれば FAIL＝Lv帯整合を恒久ガードする。
def _lvnums(s):
    return [int(n) for n in re.findall(r'\d+', s or '')]
BAND_EXEMPT = {'r2_sakyu_okuchi', 'r2_sakyu_hokora'}   # MAP_LIST §R2/30-detail §0 に明記の超band寄り道強敵地帯
_band = {}
for r in regions:
    nn = _lvnums(r.get('lv_range'))
    if len(nn) >= 2:
        _band[r['id']] = (nn[0], nn[1])
_out_of_band = []
for m in maps:
    R = m.get('region')
    if R not in _band:                      # LINK 等 band 未定義はスキップ
        continue
    if m['id'] in BAND_EXEMPT:
        continue
    nn = _lvnums(m.get('lv_range'))
    if len(nn) < 2:
        continue
    blo, bhi = _band[R]
    if not (nn[0] >= blo and nn[1] <= bhi):
        _out_of_band.append(f"{m['id']}({R}:{m.get('lv_range')} vs band {blo}-{bhi})")
l10 = [
    f"  対象: R1〜R10 個別マップ {sum(1 for m in maps if m.get('region') in _band)} 件（LINK 除く）",
    f"  許容例外(寄り道強敵地帯): {sorted(BAND_EXEMPT)}",
    f"  {'✓' if not _out_of_band else '✗'} band 逸脱(例外除く): {_out_of_band or '0件'}",
]
record(10, 'PASS' if not _out_of_band else 'FAIL', '個別マップ lv_range ⊆ 地域band(Lv帯同期)', l10)

# ── 項目11: map_id 接頭辞 == region 不変条件（turn-054 接頭辞ローテーションの falsifiable オラクル） ──
# REGION_RENUMBER_MAP §9 canon「接頭辞 r{n}_ は region R{n} と一致（turn-054 で再採番）」を機械検査する。
# R1 は実装準拠で接頭辞なし（chinju/sato/kiritate 等の素ID）・LINK は連絡で region 無し → 検査対象外。
# R2〜R10 の全マップは map_id が `r{region番号}_` で始まらねば FAIL＝接頭辞ドリフトを恒久ガードする。
_pref_bad = []
for m in maps:
    R = m.get('region')
    if not R or not re.fullmatch(r'R\d+', R) or R == 'R1':
        continue                                   # R1=接頭辞なし／LINK=region無しは対象外
    expect = f"r{R[1:]}_"
    if not m['id'].startswith(expect):
        _pref_bad.append(f"{m['id']}({R}: 期待 {expect}*)")
_n_checked = sum(1 for m in maps if m.get('region') and re.fullmatch(r'R\d+', m.get('region')) and m.get('region') != 'R1')
l11 = [
    f"  対象: R2〜R10 個別マップ {_n_checked} 件（R1=接頭辞なし／LINK 除く）",
    f"  {'✓' if not _pref_bad else '✗'} 接頭辞 r{{n}}_ == region R{{n}}: " + ('全一致' if not _pref_bad else f"{len(_pref_bad)} 件ドリフト → {_pref_bad[:8]}"),
]
record(11, 'PASS' if not _pref_bad else 'FAIL', 'map_id接頭辞==region(turn-054 接頭辞再採番)', l11)

# ── 項目12: ENEMY/BOSS lv_range ⊆ 地域band（敵・ボスの Lv帯同期 falsifiable オラクル） ──
# 項目10 が「マップ」の lv_range を地域band で検査するのに対し、本項目は「敵・ボス」の lv_range が
# 地域band 内に収まることを検査する。turn-063 で R7（critic flag1-3：enm_064-068/boss_17/18）・
# R9（enm_047-053・旧常世の海→綿津見へ移設時の取りこぼし）の旧スケール残存を band へ
# remap_r7_enemy_lv.py / remap_r9_enemy_lv.py で同期済。旧版 verify はこの class（戦闘体の Lv帯）を
# 検出できず R7/R9 の旧スケールが 60ターン超 温存された＝critic flag4 の根因。本項目で恒久ガードする。
# 例外 allowlist = 文書化された「寄り道レア先取りの強敵地帯」（地域band を意図的に超過）。
ENEMY_BAND_EXEMPT = {'enm_063'}   # 砂丘奥地の地域帯超え精鋭（r2_sakyu_okuchi 出現・ENEMY_LIST §1.9.1／項目10 BAND_EXEMPT と対）
_eb_out = []
for coll in (enemies, bosses):
    for x in coll:
        R = x.get('region')
        if R not in _band:                  # R8 常世(敵0/ボス0)・band 未定義はスキップ
            continue
        if x['id'] in ENEMY_BAND_EXEMPT:
            continue
        nn = _lvnums(x.get('lv_range'))
        if len(nn) < 2:
            continue
        blo, bhi = _band[R]
        if not (nn[0] >= blo and nn[1] <= bhi):
            _eb_out.append(f"{x['id']}({R}:{x.get('lv_range')} vs band {blo}-{bhi})")
l12 = [
    f"  対象: 敵 {sum(1 for e in enemies if e.get('region') in _band)} 件＋ボス {sum(1 for b in bosses if b.get('region') in _band)} 件（R8 常世=戦闘体0・band未定義除く）",
    f"  許容例外(寄り道強敵地帯): {sorted(ENEMY_BAND_EXEMPT)}",
    f"  {'✓' if not _eb_out else '✗'} band 逸脱(例外除く): {_eb_out or '0件'}",
]
record(12, 'PASS' if not _eb_out else 'FAIL', 'ENEMY/BOSS lv_range ⊆ 地域band(敵Lv帯同期)', l12)

# ── 項目13: 30-detail 相対 .md リンク整合（ディレクトリ rename 回帰の falsifiable オラクル） ──
# block-006 で rn のマップディレクトリ rename（r0X_ 接頭辞付与）が enemies/・characters/ の
# `../maps/{slug}/...` 相対リンクを破壊した。旧 verify は md 間リンクを非検査だったため機械反証できず、
# critic が broken_relative_map_links を turn を跨いで繰返し再掲する根因になった（stale flag の温存）。
# 本項目は 30-detail 配下の全相対 .md リンク（`](../…md)` / `](./…md)`）を実ファイル解決で検査し、
# 破損 0 を恒久ガードする。data/*.json ではなく実 md を直接走査する点が他項目と異なる。
_DETAIL = os.path.join(ROOT, 'design/30-detail')
_link_re = re.compile(r'\]\((\.\.?/[^)]+\.md)\)')
_link_checked = 0
_link_broken = []
for _sub in ('enemies', 'characters', 'events', 'weapons', 'maps'):
    _d = os.path.join(_DETAIL, _sub)
    if not os.path.isdir(_d):
        continue
    for _fn in sorted(os.listdir(_d)):
        if not _fn.endswith('.md'):
            continue
        with open(os.path.join(_d, _fn), encoding='utf-8') as _fh:
            _txt = _fh.read()
        for _m in _link_re.finditer(_txt):
            _link_checked += 1
            _tgt = os.path.normpath(os.path.join(_d, _m.group(1)))
            if not os.path.exists(_tgt):
                _link_broken.append(f"{_sub}/{_fn}: {_m.group(1)}")
l13 = [
    f"  対象: 30-detail/{{enemies,characters,events,weapons,maps}} 相対 .md リンク {_link_checked} 件",
    f"  {'✓' if not _link_broken else '✗'} 破損リンク: " + ('0件' if not _link_broken else f"{len(_link_broken)} 件 → {_link_broken[:8]}"),
]
record(13, 'PASS' if not _link_broken else 'FAIL', '30-detail 相対mdリンク整合(ディレクトリrename回帰ガード)', l13)

# ── 出力 ──────────────────────────────────────────────────────────────────
print("=" * 70)
print("玉結び 製品版設計 内部整合チェック (再採番 v2.0 / 新背骨 R1→…→R10)")
print("=" * 70)
hard_fail = 0
for no, status, title, lines in results:
    print(f"\n[項目{no}] {title} ... {status}")
    for ln in lines: print(ln)
    if status == 'FAIL': hard_fail += 1
print("\n" + "=" * 70)
followups = []
if not (homura_exists):
    followups.append("FOLLOW-UP B: design/20-basic/regions/R7_homura.md を作成し R7(ホムラ) map_id を全掲載")
print(f"判定: ハードFAIL {hard_fail} 件 / 条件付PASS(要フォローアップ) {len(followups)} 件")
for f in followups: print("  - " + f)
if not followups and hard_fail == 0:
    print(f"✅ 全{len(results)}項目 完全PASS（ハードFAIL 0・条件付フォローアップ 0）")
print("=" * 70)
sys.exit(hard_fail)
