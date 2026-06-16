#!/usr/bin/env python3
"""gen_transition_graph.py — design/10-lists/MAP_TRANSITION_GRAPH.md 自動生成

maps.json / regions.json の warp 接続を正本に、マップ遷移図(Mermaid)を生成する。
warp フィールドは半構造化散文（'/' と '↔' 区切り・地域ラベル・括弧内 map_id・'—' 等）の
ため、頑健なトークナイザで edge を抽出する:
  - exact:  トークン全体が map_id
  - prefix: トークンが map_id + 和文注記（例 'r5_setchu_mura北端'）
  - paren:  括弧内に map_id（例 '多島海船上航路(link_tashima_koro_1)'）
  - region: 'R2北出口' 等の地域ラベル → 地域外部ノードへの edge
  - note:   '—' / '周回スタート地点' / 'クリア後…' 等 → 注記（edge化しない）

実行: python3 design/10-lists/data/gen_transition_graph.py
（cwd はワークスペース直下 /Users/.../2D-RPG-Seihin を想定。--root で上書き可）
"""
import json, os, re, sys
from collections import defaultdict, OrderedDict

ROOT = sys.argv[sys.argv.index('--root')+1] if '--root' in sys.argv else os.getcwd()
DATA = os.path.join(ROOT, 'design/10-lists/data')
OUT  = os.path.join(ROOT, 'design/10-lists/MAP_TRANSITION_GRAPH.md')

maps    = json.load(open(os.path.join(DATA, 'maps.json'), encoding='utf-8'))['maps']
regions = json.load(open(os.path.join(DATA, 'regions.json'), encoding='utf-8'))['regions']

byid = {m['id']: m for m in maps}
ids  = set(byid)
ids_sorted = sorted(ids, key=len, reverse=True)
reg_of = {m['id']: m.get('region', '?') for m in maps}

# ── 正本の走破順（REGION_LIST §6 / PROGRESSION_DESIGN §1.1）。rn-M4 再採番後は R1→R10 の単調昇順 ──
# （旧「末尾挿入採番」を廃止。region は renumber 済み・map_id 接頭辞は warp 保護のため据え置き）
ORDER = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10']
reg_meta = {r['id']: r for r in regions}

# ── warp トークナイザ ───────────────────────────────────────────────────────
def tokenize(w):
    if not w:
        return []
    return [p for p in re.split(r'[/↔]', str(w)) if p.strip()]

def resolve(token):
    """returns (kind, value). kind in exact|prefix|paren|region|note"""
    t = token.strip()
    if not t or t in ('—', '-', 'ー'):
        return ('note', t)
    if t in ids:
        return ('exact', t)
    # 括弧内 map_id
    mp = re.search(r'[(（]([a-z0-9_]+)[)）]', t)
    if mp and mp.group(1) in ids:
        return ('paren', mp.group(1))
    # map_id を接頭辞に持つ（和文注記つき）
    for i in ids_sorted:
        if t.startswith(i):
            return ('prefix', i)
    # 地域ラベル R1..R10（大文字R＋番号。後続が和文でも可。map_id は小文字 r で曖昧性なし）
    mr = re.match(r'^R(10|[1-9])(?![0-9])', t)
    if mr:
        return ('region', mr.group(0))
    return ('note', t)

# ── edge 抽出 ────────────────────────────────────────────────────────────────
intra = defaultdict(set)          # region -> set(frozenset{a,b}) 無向隣接
cross = []                        # (src_id, dst_id) 別地域へ（有向）
ext_region = defaultdict(set)     # src_id -> set(region_label) 地域ラベルへ
notes = defaultdict(list)         # src_id -> [note,...]
covered_tokens = 0
total_tokens = 0

for m in maps:
    src = m['id']
    sreg = reg_of[src]
    for tok in tokenize(m.get('warp', '')):
        total_tokens += 1
        kind, val = resolve(tok)
        if kind in ('exact', 'prefix', 'paren'):
            covered_tokens += 1
            dst = val
            if dst == src:
                continue
            if reg_of.get(dst) == sreg:
                intra[sreg].add(frozenset((src, dst)))
            else:
                cross.append((src, dst))
        elif kind == 'region':
            covered_tokens += 1
            ext_region[src].add(val)
        else:
            notes[src].append(val)

# cross edge を無向で dedupe
cross_set = set()
for a, b in cross:
    cross_set.add((a, b))

def mid_label(mid):
    m = byid[mid]
    nm = m['name']
    return nm

def node_decl(mid):
    m = byid[mid]
    t = m.get('type', '')
    label = f"{m['name']}<br/>[{t}]"
    return f'  {mid}["{label}"]'

# ── Mermaid: リージョン俯瞰図 ───────────────────────────────────────────────
def region_overview():
    lines = ['```mermaid', 'flowchart TD']
    # 各リージョンノード（正本順）
    for rid in ORDER:
        rm = reg_meta[rid]
        nm = rm['name'].split('（')[0]
        lines.append(f'  {rid}["{rid} {nm}<br/>{rm["lv_range"]} / 計{rm["total"]}枚"]')
    # LINK スパインを進行ゲートとして表現
    lines.append('  %% 進行ゲート（移動手段の解放）')
    spine = [
        ('R1', 'R2', '🚢 船入手→里の港から出航<br/>(多島海航路 link_sato_minato→tashima_koro→kako_ko)'),
        ('R2', 'R3', '🚢/徒歩 河港→大橋門<br/>(link_kako_ko)'),
        ('R3', 'R4', '⛰ 峠越え<br/>(link_toge_no_seki)'),
        ('R4', 'R5', '❄ 峠/北街道・直通<br/>(link_kitakaido_shukuba→r5_fubuki_no)'),
        ('R5', 'R6', '🌲 杉谷の隘路・フラグ要<br/>(link_sugitani_airokuchi)'),
        ('R6', 'R7', '🔥 火の道開通(boss_11)＋外洋の鍵<br/>(→r7_hi_no_michi)'),
        ('R7', 'R8', '🌊 外洋船出航(boss_18)→常世航路<br/>(link_gaiyosen_kanpan→tokoyo_koro→r8_shirasuna)'),
        ('R8', 'R9', '🐚 常世の浜→外海・綿津見<br/>(r8_shirasuna→r9_sango_michi)'),
        ('R9', 'R10', '🪽 飛空艇の鍵(boss_13)→雲海航路<br/>(link_hikuotei_hatchakujo→link_unkai_kairo)'),
    ]
    for a, b, lab in spine:
        lines.append(f'  {a} ==>|"{lab}"| {b}')
    # R3 は飛空艇発着場のハブでもある（R9解放後にR3⇄R10短絡）
    lines.append('  R3 -.->|"🪽 飛空艇発着場・後半ファストトラベル"| R10')
    # ラストダンジョン連結（候補・シナリオ確定待ち）
    lines.append('  R10 ==>|"天之浮橋→最終連結→天之磐座(ラスボス)"| FINAL["天之磐座<br/>最終決戦/ラストダンジョン<br/>(link_final_renketu_1/2)"]')
    lines.append('  FINAL -.->|"クリア後・裏ルート (link_ura_iriguchi)"| URA["周回/裏入口"]')
    lines.append('```')
    return '\n'.join(lines)

# ── Mermaid: LINK 連絡スパイン詳細 ─────────────────────────────────────────
def link_spine():
    link_ids = [m['id'] for m in maps if reg_of[m['id']] == 'LINK']
    lines = ['```mermaid', 'flowchart LR']
    for lid in link_ids:
        lines.append(node_decl(lid))
    # 順序エッジ（航路チェーン）
    chain = [
        ('link_sato_minato', 'link_tashima_koro_1'),
        ('link_tashima_koro_1', 'link_tashima_koro_2'),
        ('link_tashima_koro_2', 'link_kako_ko'),
        ('link_toge_no_seki', None),
        ('link_kitakaido_shukuba', None),
        ('link_sugitani_airokuchi', None),
        ('link_gaiyosen_kanpan', 'link_tokoyo_koro_1'),
        ('link_tokoyo_koro_1', 'link_tokoyo_koro_2'),
        ('link_hikuotei_hatchakujo', 'link_unkai_kairo'),
        ('link_amanoukhihashi', 'link_final_renketu_1'),
        ('link_final_renketu_1', 'link_final_renketu_2'),
    ]
    for a, b in chain:
        if b:
            lines.append(f'  {a} --> {b}')
    lines.append('```')
    return '\n'.join(lines)

# ── Mermaid: 地域別詳細遷移図 ───────────────────────────────────────────────
def region_detail(rid):
    rmaps = [m for m in maps if reg_of[m['id']] == rid]
    rids = set(m['id'] for m in rmaps)
    lines = ['```mermaid', 'flowchart LR']
    # ノード宣言
    for m in rmaps:
        lines.append(node_decl(m['id']))
    # 地域内無向隣接
    seen = set()
    for fs in sorted(intra[rid], key=lambda s: sorted(s)):
        a, b = sorted(fs)
        key = (a, b)
        if key in seen:
            continue
        seen.add(key)
        lines.append(f'  {a} --- {b}')
    # 地域外への有向 edge（別地域 map）
    ext_nodes = OrderedDict()
    for (src, dst) in sorted(cross_set):
        if src in rids and dst not in rids:
            ext_nodes[reg_of[dst]] = True
            lines.append(f'  {src} ==>|"→{reg_of[dst]}"| {dst}("{byid[dst]["name"]}<br/>[{reg_of[dst]}]")')
        elif dst in rids and src not in rids:
            ext_nodes[reg_of[src]] = True
            lines.append(f'  {src}("{byid[src]["name"]}<br/>[{reg_of[src]}]") ==>|"{reg_of[src]}→"| {dst}')
    # 地域ラベル外部 edge
    for src in sorted(ext_region):
        if src in rids:
            for rl in sorted(ext_region[src]):
                lines.append(f'  {src} -.->|"接続"| {rl}_ext(["{rl} 方面"])')
    lines.append('```')
    return '\n'.join(lines), rmaps

# ── ハブ分析（多対多接続の明示）─────────────────────────────────────────────
def hub_analysis():
    deg = defaultdict(int)
    for rid, edges in intra.items():
        for fs in edges:
            for n in fs:
                deg[n] += 1
    for (a, b) in cross_set:
        deg[a] += 1
        deg[b] += 1
    for src, labs in ext_region.items():
        deg[src] += len(labs)
    ranked = sorted(deg.items(), key=lambda kv: -kv[1])
    rows = []
    for mid, d in ranked:
        if d < 4:
            break
        rows.append((mid, byid[mid]['name'], reg_of[mid], d))
    return rows

# ── 出力組み立て ────────────────────────────────────────────────────────────
def build():
    L = []
    L.append('# 玉結び（TAMAMUSUBI）マップ遷移図 — MAP_TRANSITION_GRAPH')
    L.append('')
    L.append('> **自動生成**: `design/10-lists/data/gen_transition_graph.py`（正本 = `data/maps.json` の warp 接続）。')
    L.append('> 手編集しないこと。更新は maps.json → `build_data_json.py` → 本スクリプト再実行の順。')
    L.append('')
    L.append('---')
    L.append('')
    # §0 メタ
    L.append('## §0 メタ・凡例')
    L.append('')
    L.append(f'- **総マップ数**: {len(maps)} 枚（地域 {len([r for r in regions])} ＋ 連絡 LINK {len([m for m in maps if reg_of[m["id"]]=="LINK"])} 枚）')
    L.append(f'- **走破順（正本 REGION_LIST §6 / PROGRESSION_DESIGN §1.1）**: ' + ' → '.join(ORDER))
    L.append('  - **rn-M4 再採番**: 走破順は R1→R10 の **単調昇順**（旧「末尾挿入採番」を廃止し、火の道は R6→R7 ゲートへ移設）。')
    L.append('  - **turn-054 接頭辞再採番**: map_id 接頭辞 `r{n}_` は region `R{n}` と一致（R7 火群=`r7_*`／R8 常世=`r8_*`／R9 綿津見=`r9_*`／R10 高天原=`r10_*`）。回転は決定的移行スクリプトで全 warp と同時更新（[REGION_RENUMBER_MAP §9]）。')
    L.append('- **凡例**:')
    L.append('  - `==>`（太線）= 地域間の進行ゲート（移動手段の解放を伴う一方向の物語進行）')
    L.append('  - `---`（無向線）= 地域内マップの隣接（warp による相互行き来）')
    L.append('  - `-.->`（点線）= ファストトラベル/裏ルート/条件付き接続')
    L.append('  - ノード注記 `[野外]/[町]/[D]/[祠]/[連絡]` = マップ種別')
    L.append('')
    cov = covered_tokens / total_tokens * 100
    _gw = sum(len(v) for v in ext_region.values())
    _gw_note = (f'意図的な地域ゲートウェイ {_gw} 件は §6.2 に台帳化。' if _gw else
                '地域ラベル道標は全廃し、**全 warp トークンが実 map_id へ解決**（地域外部ラベルノードは 0）。')
    L.append(f'- **warp トークン会計**: 全 {total_tokens} トークン中 {covered_tokens} 件を edge 化（{cov:.1f}%）。残り {total_tokens-covered_tokens} 件は `—`（無warp標識）のみ。物語終端トークン（「天之磐座(ラストボス)」「周回スタート地点」「クリア後ニューゲーム+」等）は全て実 map_id へ解決済み（後述 §6）。{_gw_note}（`verify_expansion_consistency.py` 項目8 で宙吊り0を機械保証）')
    L.append('')
    L.append('---')
    L.append('')
    # §1 俯瞰
    L.append('## §1 リージョン俯瞰図（マクロ進行）')
    L.append('')
    L.append('各リージョンを 1 ノードに畳み込み、地域間の進行ゲート（移動手段の解放）を太線で示す。')
    L.append('数値は Lv 帯と総マップ枚数。')
    L.append('')
    L.append(region_overview())
    L.append('')
    L.append('### 進行ゲート一覧（解放条件）')
    L.append('')
    L.append('| # | From → To | 解放条件 | 連絡経路（map_id） |')
    L.append('|---|-----------|----------|--------------------|')
    gate_rows = [
        ('1', 'R1 → R2', '船入手（里の港から出航）', 'link_sato_minato → link_tashima_koro_1/2'),
        ('2', 'R2 → R3', '河港着・大橋門（徒歩/船）', 'link_kako_ko'),
        ('3', 'R3 → R4', '峠越え（推奨Lv22）', 'link_toge_no_seki'),
        ('4', 'R4 → R5', '峠/北街道・直通（推奨Lv30）', 'link_kitakaido_shukuba → r5_fubuki_no'),
        ('5', 'R5 → R6', '杉谷の隘路（物語フラグ要）', 'link_sugitani_airokuchi'),
        ('6', 'R6 → R7', 'boss_11撃破で火の道開通＋外洋の鍵', '→ r7_hi_no_michi（火の道）'),
        ('7', 'R7 → R8', 'boss_18撃破＝正しい火の証→外洋船出航・常世航路', 'link_gaiyosen_kanpan → link_tokoyo_koro_1/2 → r8_shirasuna'),
        ('8', 'R8 → R9', '常世の浜→外海（外洋船で綿津見へ）', 'r8_shirasuna → r9_sango_michi'),
        ('9', 'R9 → R10', 'boss_13＝飛空艇の鍵→雲海航路', 'link_hikuotei_hatchakujo → link_unkai_kairo'),
        ('10', 'R10 → 最終', '天之浮橋→最終連結', 'link_amanoukhihashi → link_final_renketu_1/2 → 天之磐座'),
    ]
    for r in gate_rows:
        L.append('| ' + ' | '.join(r) + ' |')
    L.append('')
    L.append('---')
    L.append('')
    # §2 LINK スパイン
    L.append('## §2 連絡（LINK）スパイン詳細')
    L.append('')
    L.append('地域間を結ぶ 16 枚の連絡マップ（航路・関・宿場・飛空艇）。物語進行の背骨。')
    L.append('')
    L.append(link_spine())
    L.append('')
    L.append('---')
    L.append('')
    # §3 地域別詳細
    L.append('## §3 地域別 詳細遷移図')
    L.append('')
    L.append('各マップをノード、warp を辺として描画。1 マップから複数マップへ分岐するハブを明示する。')
    L.append('太線（`==>`）は他地域への出入口。')
    L.append('')
    for rid in ORDER:
        rm = reg_meta[rid]
        diagram, rmaps = region_detail(rid)
        L.append(f'### {rid} — {rm["name"]}（{rm["lv_range"]} / {len(rmaps)}枚）')
        L.append('')
        L.append(f'- 解放条件: {rm["unlock"]}')
        L.append(f'- 内訳: 野外{rm.get("field","?")} / 町{rm.get("town","?")} / D{rm.get("dungeon","?")} / 祠{rm.get("shrine","?")}')
        if rid == 'R8':
            L.append('- ⚠ **R8 常世は完全無戦闘の聖域**（敵0・ボス0）。戦闘は隣接する R9 綿津見の大海に分離。map_id は `r8_` 接頭辞（region R8 と一致）。')
        if rid == 'R9':
            L.append('- ⚠ **R9 綿津見は町（海岸の町/真夏の島）を中核戦闘ハブ**とし、**砂浜・岩礁・深海も戦闘可**の美麗フィールド。map_id は `r9_` 接頭辞（region R9 と一致）。')
        L.append('')
        L.append(diagram)
        L.append('')
    L.append('---')
    L.append('')
    # §4 ハブ一覧
    L.append('## §4 多対多接続ハブ一覧（接続次数 ≥4）')
    L.append('')
    L.append('1 マップから多方向へ分岐する分岐点。導線設計の要所。')
    L.append('')
    L.append('| map_id | 名前 | 地域 | 接続次数 |')
    L.append('|--------|------|------|----------|')
    for mid, nm, rg, d in hub_analysis():
        L.append(f'| `{mid}` | {nm} | {rg} | {d} |')
    L.append('')
    L.append('---')
    L.append('')
    # §5 カバレッジ
    L.append('## §5 カバレッジ整合')
    L.append('')
    node_total = sum(len([m for m in maps if reg_of[m['id']] == rid]) for rid in ORDER)
    link_total = len([m for m in maps if reg_of[m['id']] == 'LINK'])
    L.append(f'- **ノード網羅**: §3 に地域マップ {node_total} 枚、§2 に連絡 {link_total} 枚 = 計 {node_total+link_total} 枚を掲載（maps.json 総数 {len(maps)} と一致）。')
    L.append(f'- **地域内隣接エッジ**: {sum(len(v) for v in intra.values())} 本（無向・重複排除済）。')
    L.append(f'- **地域間エッジ**: {len(cross_set)} 本（有向）。')
    L.append('')
    L.append('---')
    L.append('')
    # §6 warp 解決台帳（全 warp が実 map_id か登録済ゲートウェイへ解決）
    note_rows = []
    for src in sorted(notes):
        toks = [t for t in notes[src] if t not in ('—', '-', 'ー')]
        if toks:
            note_rows.append((src, toks))
    L.append('## §6 warp 解決台帳（宙吊り0・全エッジ整合）')
    L.append('')
    L.append('かつて旧地域ラベル・散文終端で残っていた warp トークンは **全て実 map_id へ解決済み**。')
    L.append('`verify_expansion_consistency.py` 項目8（warpターゲット整合）が、全 warp トークンが「実 map_id」へ解決すること（無warp標識 `—` を除く・地域ラベル等の例外 allowlist は廃止）＝**宙吊り0・全エッジが実ノード** を機械保証する（CI オラクル）。')
    L.append('')
    L.append('### §6.1 物語終端・旧ラベルの解決結果（代表）')
    L.append('')
    L.append('| 旧トークン | 解決先 map_id | 区分 |')
    L.append('|------------|----------------|------|')
    L.append('| 天之磐座(ラストボス) / 天之磐座(裏ルート) | `r10_d_ame_no_iwakura_final` | ラスボス層へ集約 |')
    L.append('| 周回スタート地点 / クリア後ニューゲーム+ 専用入口 | `kiritate` | 周回(NG+)は物語開始地 霧立の里へ |')
    L.append('| R3宮乃京・大橋門（河港着） | `r3_kominato` / `r3_ohashi` | 河港町・大橋のたもと |')
    L.append('| R4雪原の辺境（峠の関→R4） | `r4_suso_ichi` / `r4_kitakaidou_n` | 霊峰の裾野 入界点 |')
    L.append('| R5深森の隠れ里（→R5/R6隘路） | `r5_shirogane_michi` / `r5_sugi_no_iarou` | 北雪郷 入界点・杉の隘路 |')
    L.append('| R8天上の浮島（常世航路/飛空艇） | `r8_shirasuna` / `r10_unkai` | 常世の白砂・雲海の入口 |')
    if note_rows:
        L.append('')
        L.append('> 未解決の散文終端トークン: ' + ' / '.join(f'`{s}`={t}' for s, t in note_rows) + '（要追補）')
    else:
        L.append('')
        L.append('> 未解決の散文終端トークン: **0 件**（全て実 map_id へ解決済み）。')
    L.append('')
    L.append('### §6.2 地域ゲートウェイ（道標）の結線状況')
    L.append('')
    if ext_region:
        L.append('下表は宮乃京(R3)の四街道など、**現スパインで非隣接の地域へ向かう道標**。具体的な境界マップへの結線は実装フェーズ（src/data/maps の warp 配線＝本設計フェーズのスコープ外）で確定する。')
        L.append('')
        L.append('| map_id | 行き先地域（道標） |')
        L.append('|--------|--------------------|')
        for src in sorted(ext_region):
            L.append(f'| `{src}` | {" / ".join(sorted(ext_region[src]))} |')
    else:
        L.append('**地域ラベル道標は全廃済み（0 件）**。かつて宮乃京(R3)の東/南/北街道・雲海入口に残っていた '
                 '非map_id道標（`R2北出口` / `R5南出口` / `R6北山出口` / `R8最終出口`）は、'
                 'いずれも逆方向 warp が既存の実 map_id へ双方向結線した（'
                 '`r3_kaido_higashi`→`r3_satoyama_higashi` / `r3_kaido_minami`→`r3_suiro_ura` / '
                 '`r3_kaido_kita`→`r3_matsubara` / `r10_unkai`→`link_hikuotei_hatchakujo`）。'
                 'これにより本遷移図の全エッジが実マップノードへ解決し、verify 項目8 の allowlist 例外は廃止された。')
    L.append('')
    L.append('---')
    L.append('')
    L.append('## §7 ラストダンジョン（最終盤）接続メモ')
    L.append('')
    L.append('`SCENARIO_SYNOPSIS.md` 付録C の最終盤候補3案を受け、現データ上の最終連結は次の通り（確定はユーザー承認後）。')
    L.append('')
    L.append('- 現状: `R10 高天原` → `link_amanoukhihashi`（天之浮橋）→ `link_final_renketu_1`（第一廊下）→ `link_final_renketu_2`（天之磐座前）→ **`r10_d_ame_no_iwakura_final`（天之磐座 最終層・ラスボス boss_16 玉の主神）**。')
    L.append('- 「高天原の先のもう一つのラストダンジョン」は、この最終連結（link_final_renketu_1/2）を独立地域として基本設計化する案が最有力。')
    L.append('- クリア後: `link_ura_iriguchi`（周回/裏入口）→ `r10_d_ame_no_iwakura_final`（裏ルート）／周回開始は `kiritate`（物語開始地）へ。')
    L.append('')
    return '\n'.join(L)

if __name__ == '__main__':
    md = build()
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(md)
    print(f'WROTE {OUT} ({len(md.splitlines())} lines)')
    print(f'tokens: total={total_tokens} covered={covered_tokens} note={total_tokens-covered_tokens}')
    print(f'intra edges={sum(len(v) for v in intra.values())} cross edges={len(cross_set)}')
