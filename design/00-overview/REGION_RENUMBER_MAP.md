# リージョンID再採番 マッピング・決定台帳（REGION_RENUMBER_MAP）

> 版: v2.0 / 作成: 2026-06-16（rn-turn-002 / M2）・改訂: 2026-06-16（turn-054 接頭辞ローテーション実行 §9）/ 状態: **移行実行済**（リージョンID再採番＋turn-054 で map_id 接頭辞も region 番号へ再採番完了＝接頭辞 `r{n}_` == region `R{n}`。**§9 が現役正典**・§2/§3.1/§4.3/§8 の「接頭辞固定」は歴史記録として保全）
> 出典: ユーザー指示「リージョン構成の整理整頓とリファクタリング（R6黒洲/R7ホムラ/R8常世/R9和田津見/R10高天原）」
> 相互参照: [REGION_LIST](../10-lists/REGION_LIST.md)（背骨・現番号）／ [MAP_LIST](../10-lists/MAP_LIST.md)（map_id・warp）／ [EXPANSION_PLAN_16AREAS](./EXPANSION_PLAN_16AREAS.md)（採番思想）／ [REVISION_LOG](../REVISION_LOG.md)
>
> **この台帳の役割**: 旧リージョンID（R6〜R10）を、ユーザー指定の新順序へ**決定的に**再採番（リナンバリング）するための唯一の正典。旧↔新の対応表・採用方針・根拠・影響ファイル・移行手順・検証計画を固定する。移行スクリプト（M3）と検証スクリプトはすべてこの台帳の表に従う。

---

## 0. 目的と背景

### 0.1 ユーザー指示（原文の要旨）
リージョン構成を以下の順番に整理整頓・リファクタリングする：
1. **R6：黒洲（クロス）**
2. **R7：ホムラ**
3. **R8：常世（トコヨ）**
4. **R9：和田津見（ワタツミ）**
5. **R10：高天原（タカマガハラ）**

### 0.2 現状（再採番前）の番号
拡張プロジェクト（旧 turn-001〜028）の「末尾採番＝参照保護」原則で、地理的走破順と番号が乖離していた：

| 旧ID | スラッグ | 表示名 | 旧Lv帯 | 旧・走破順での位置 |
|---|---|---|---|---|
| R6 | kurosugi | 黒杉の幽谷 | Lv36〜46 | 7番目（R5雪→杉谷隘路） |
| R7 | tokoyo | 常世（聖域・無戦闘） | Lv42〜52 | 8番目（外洋船） |
| R8 | takamagahara | 高天原 | Lv50〜60 | 10番目（飛空艇・最終） |
| R9 | homura | 火群と白磐の地 | Lv28〜38 | **5番目**（R4霊峰→火の道→R5雪・末尾採番でID R9） |
| R10 | wadatsumi | 綿津見の大海 | Lv44〜52 | 9番目（常世の浜→外海） |

> 問題: 旧 R9 homura は走破5番目なのに ID が R9、旧 R7 tokoyo/R10 wadatsumi/R8 takamagahara も番号が走破順と乖離。これを「ID＝走破順（＝Lv昇順）」のクリーンな並びへ整える。

---

## 1. 旧→新 リージョンID対応表（正典）

> R1〜R5 は不変。R6〜R10 のみ再採番。**この表が移行スクリプトの唯一の入力**。

| 旧ID | 新ID | スラッグ（旧→新） | 新・表示名 | 種別/層 | 新Lv帯 | 備考 |
|---|---|---|---|---|---|---|
| R1 | R1 | satoyama | 始まりの里山郷 | 地上/チュートリアル | Lv1〜8 | 不変 |
| R2 | R2 | tatoukai | 瑠璃の多島海 | 地上/海 | Lv8〜16 | 不変 |
| R3 | R3 | miyanokyo | 宮乃京 | 地上/中央ハブ | Lv14〜24 | 不変 |
| R4 | R4 | reihou | 霊峰の裾野 | 地上/縦地形 | Lv22〜32 | 不変 |
| R5 | R5 | hokusetsu | 北雪郷 | 地上/雪 | Lv30〜40 | 不変 |
| **R6** | **R6** | kurosugi → **kurosu** | **黒洲（クロス）** | 地上/暗 | Lv36〜46 | 番号不変・**名称/slug変更**（§3.2） |
| R9 | **R7** | homura | **ホムラ（火群と白磐の地）** | 地上/火山・製鉄・鍛冶 | **Lv42〜50** | **走破位置を終盤へ移設＋Lv再調整**（§3.3） |
| R7 | **R8** | tokoyo | **常世（聖域・無戦闘）** | 海原/聖域・ボス0 | **Lv46〜54** | **無戦闘厳守**・Lv再調整 |
| R10 | **R9** | wadatsumi | **和田津見（綿津見の大海）** | 現世/外洋・海神 | **Lv48〜56** | Lv再調整・boss_12/13保持 |
| R8 | **R10** | takamagahara | **高天原** | 天空/最終 | **Lv52〜62** | Lv再調整・最終領域 |

### 1.1 リージョンID再採番の置換規則（決定的・同時適用）
旧→新は**重複を含む置換（permutation）**なので、逐次文字列置換は二重適用を起こす（例: 旧R7→R8 してから 旧R8→R10 すると 旧R7 が R10 になる）。**必ず一時トークンを経由した二相置換**で同時適用すること：

```
# 第一相: 旧ID → 一時トークン（衝突回避）
R6 → @@RGN6@@   (kurosugi、番号据置だがslug/名称変更を伴うため明示)
R7 → @@RGN8@@   (tokoyo)
R8 → @@RGN10@@  (takamagahara)
R9 → @@RGN7@@   (homura)
R10 → @@RGN9@@   (wadatsumi)
# 第二相: 一時トークン → 新ID
@@RGN6@@ → R6 / @@RGN7@@ → R7 / @@RGN8@@ → R8 / @@RGN9@@ → R9 / @@RGN10@@ → R10
```

> ⚠️ 置換は**大文字 `R{n}` の単語境界**（`\bR(6|7|8|9|10)\b`）のみを対象とする。小文字 `r{n}_`（map_id 接頭辞）は別名前空間なので**絶対に触れない**（§2）。`R10` を先に処理しないと `R1` の規則が `R10` の先頭に誤マッチするため、桁数の多い番号から評価する正規表現順序にも注意。

---

## 2. map_id 接頭辞↔region 対応表（~~接頭辞は不変~~ → **§9 で改訂・接頭辞も再採番済**）

> ⚠️ **turn-054 改訂**: 本節（および §8）の「接頭辞固定＝確定方針」は **§9 で覆された**。計画 plan.md（M2/M3/M4）と独立 critic の要求どおり、map_id 接頭辞 `r{n}_` を region 番号へ再採番し **接頭辞 == region** を達成した（決定的移行スクリプト `data/rotate_map_id_prefixes.py` で全 warp と同時更新＝warp グラフ無破壊）。以下 §2 本文は turn-002〜053 の歴史的決定記録として保全し、現役方針は §9 とする。

> ### ~~採用方針（turn-053 まで）~~: map_id 接頭辞（小文字 `r{n}_`）は再採番せず固定する。リージョンID（大文字 `R{n}`）のみ再採番する。

### 2.1 根拠（なぜ接頭辞を回さないか）
1. **設計体系が既に2名前空間を分離している**: 大文字 `R{n}`＝リージョンID（章見出し・region フィールドが正）、小文字 `r{n}_`＝map_id 接頭辞（**安定識別子**）。両者は case で機械判別可能。
2. **既に decoupling の前例がある**: 旧 R10 wadatsumi は「warp グラフ保護のため `r7_` 接頭辞を保持（region はセクション見出しが正）」と [REGION_LIST §0/§4](../10-lists/REGION_LIST.md) に明記済み。旧 R9 homura も地理的に R4↔R5 間（走破5番目）だが `r9_` を持つ。**接頭辞と番号の乖離は本体系の確立済み設計判断**。
3. **接頭辞回転は本プロジェクト最大の参照破壊リスク**（warp ターゲット・MAP_TRANSITION_GRAPH・ENEMY/BOSS/EVENT/NPC の out 参照・28枚の homura 詳細マップのファイル名+内容を全置換、かつ `r9→r7` は `r7` 占有との衝突を招く）。接頭辞固定なら**warp グラフ破壊ゼロ**。
4. **`region` フィールドが membership の正**: maps.json の各マップは `region` で所属を示し、検証（build/verify）は `region` を数える。接頭辞は所属判定に使われない。

> ➡️ これは計画 turn-001 が想定した「接頭辞ローテーション（r9→r7 等）」からの**意図的な方針変更**。理由は上記＝本体系の確立済み2名前空間規約に整合し、最大リスクを消すため。REVISION_LOG に記録済。

### 2.2 再採番後の 接頭辞↔region 対応（混同防止の早見表）
| map_id 接頭辞 | マップ数 | 新region | 新・表示名 | 旧region |
|---|---|---|---|---|
| `r2_` | 35 | R2 | 瑠璃の多島海 | R2（不変） |
| `r3_` | 32 | R3 | 宮乃京 | R3（不変） |
| `r4_` | 30 | R4 | 霊峰の裾野 | R4（不変） |
| `r5_` | 30 | R5 | 北雪郷 | R5（不変） |
| `r6_` | 26 | R6 | 黒洲（クロス） | R6（不変） |
| `r9_` | 28 | **R7** | ホムラ | R9 |
| `r7_`（tokoyo系 19枚） | 19 | **R8** | 常世 | R7 |
| `r7_`（wadatsumi系 17枚） | 17 | **R9** | 和田津見 | R10 |
| `r8_` | 42 | **R10** | 高天原 | R8 |
| R1 個別接頭辞（satoyama/chinju/ne/sato/kiritate/morioku/takadai/tanada 等 28枚） | 28 | R1 | 始まりの里山郷 | R1（不変） |
| `link_` | 16 | — | 連絡・特殊 | 不変 |
| **合計** | **303** | | | |

### 2.3 `r7_` 36枚の region 別確定リスト（分離の正典）
maps.json の `region` フィールドが既に分離済み。**旧 region 値で機械的に分割**（map_id 名の解析不要）：

- **旧 region=R7（→新 R8 常世・19枚）**: `r8_shirasuna` `r8_rakuen_daichi` `r8_shirohana_no` `r8_torii_mae` `r8_tobiraza_mura` `r8_rakuen_no_sato` `r8_shiro_hokora` `r8_shiro_hokora_nai` `r8_rakuen_hokora` `r8_mio_shitsugen` `r8_mio_oku` `r8_taisha_sando` `r8_taisha_machi` `r8_taisha_honden` `r8_taisha_oku` `r8_mio_hokora` `r8_mio_kioku` `r8_taisha_hokora` `r8_taisha_kioku`
- **旧 region=R10（→新 R9 和田津見・17枚）**: `r9_sango_michi` `r9_umi_hiroba` `r9_kaigan_kita` `r9_kita_misaki` `r9_kaigan_minami` `r9_minami_nyukou` `r9_okiseto` `r9_shinkai_iri` `r9_yakou_dou` `r9_sango_miya_mae` `r9_kaigan_machi` `r9_minatsu_no_shima` `r9_sango_miya` `r9_sango_miya_oku` `r9_shinkai_meiro` `r9_shinkai_boss` `r9_kita_hokora`

> ➡️ maps.json の region 再採番は「旧 region 値 → 新 region 値」の純粋な辞書置換で済む（§1.1 の permutation を JSON の region キーに適用）。`r7_` の名前解析は不要。

---

## 3. 決定事項（3点）と根拠

### 3.1 ~~【決定1】map_id 接頭辞は固定（§2 に詳述）~~ → **§9 で撤回・接頭辞も再採番済**
> ⚠️ **turn-054 改訂**: この決定は **§9 で覆された**。map_id 接頭辞 `r{n}_` は region 番号へ再採番し **接頭辞 == region** を達成済（verify 項目11 で機械保証＝R2〜R10 の259件全一致）。以下の旧本文は turn-002〜053 の歴史的決定記録として保全する。
> ~~リージョンID（大文字 `R{n}`）のみ再採番。map_id 接頭辞（小文字 `r{n}_`）は不変。warp グラフ・相互参照を保護。~~

### 3.2 【決定2】R6 の正式名称＝「黒洲（クロス）」・slug＝`kurosu`
- ユーザー指定「黒洲（クロス）」を正式表示名に採用（旧「黒杉の幽谷」を改称）。読みは「クロス」、slug は `kurosu`。
- **世界観の整合**: 「洲」は領（くに）・地塊の意。黒洲（クロス）＝杉と霧と苔に閉ざされた**暗黒の領**として、旧「黒杉の幽谷」の暗ゾーン世界観（黒緑×霧×苔×一条の光・コントラスト担当）を**そのまま継承**。地域特産「黒杉（itm_073）」「夜光苔（itm_074）」は黒洲に産する素材として**ID・名称とも保持**（黒杉＝黒洲に生える黒い杉材）。
- **影響**: `20-basic/regions/R6_kurosugi.md` → `R6_kurosu.md` にリネーム＋内容の名称同期。`30-detail/maps/kurosugi/`（現状0枚・空）→ `30-detail/maps/kurosu/` を新設（実質新規）。slug `kurosugi` の現役参照を `kurosu` へ同期（map_id 接頭辞は `r6_` のままで影響なし）。

### 3.3 【決定3】走破順＝ID昇順へ統一し、ホムラ（新R7）を終盤へ移設・Lv帯を再調整
- **方針**: ユーザー指定の順序 R6→R7→R8→R9→R10 を**そのまま走破順（＝推奨Lv昇順）**として確定する。これにより「ID＝走破順＝Lv昇順」がクリーンに一致（＝整理整頓の本旨）。
- **新・背骨（終盤）**: `… R4 霊峰 → R5 北雪郷 → R6 黒洲 → R7 ホムラ → R8 常世 → R9 和田津見 → R10 高天原`
  - 物語的にも妥当: 雪（R5）→暗黒の領（R6）→**火と鍛冶（R7・武器強化の最終拠点）**→常世（R8・浄化の聖域）→海神の試練（R9）→天への昇陟（R10）。終盤直前にホムラで装備を鍛え上げ、霊的終盤（常世→海神→高天原）へ。
- **ホムラ移設に伴う連絡（warp）の付け替え**（詳細確定は M4 で REGION_LIST §6・各 basic の §4 導線に反映）:
  - 旧「R4 霊峰 →火の道→ R9 homura →北街道→ R5 北雪郷」を解体。
  - **R4 霊峰 → R5 北雪郷** は直通の峠/街道で再接続（火の道経由を廃止）。
  - **R6 黒洲 → R7 ホムラ**: 「火の道」をここへ移設（暗黒の領から火群の地へ）。
  - **R7 ホムラ → R8 常世**: 外洋船（火群の湊から常世航路へ）。ホムラに外洋へ抜ける湊/海縁を持たせる（鉄を海運する製鉄郷の港）。旧「黒杉→外洋船→常世」の役割をホムラが継承。
  - **R8 常世 → R9 和田津見**: 浜から外海へ（不変の関係・番号のみ更新）。
  - **R9 和田津見 → R10 高天原**: 飛空艇（不変の関係・番号のみ更新）。
- **Lv帯の再調整（単調増加を保証）**: 開始Lvが厳密に非減少になるよう設定。
  - R5=30〜40 → R6=36〜46 → **R7 ホムラ=42〜50**（旧 28〜38 から上方移設・終盤鍛冶拠点）→ **R8 常世=46〜54** → **R9 和田津見=48〜56** → **R10 高天原=52〜62**。
  - 開始Lv列: 1,8,14,22,30,36,42,46,48,52 ＝ **厳密非減少**（単調性 OK）。
  - **下流調整（M4〜M7 で反映）**: ホムラの敵（出現Lv・ステータス指針）とボス（boss_17 鉄喰いの大鬼／boss_18 火群の鬼神）を Lv42〜50 帯へ再設計。常世/和田津見/高天原の敵・ボスの推奨Lvも新帯へ同期。ホムラ既存28枚の詳細マップ内の「Lv28〜38」表記を更新。

---

## 4. 影響ファイル一覧（層別・移行対象）

### 4.1 10-lists 層
- `REGION_LIST.md`（背骨・§1.1表・§1.2/1.3・§6背骨図・Lv帯・解放手段）
- `MAP_LIST.md`（各マップ行の region 表記・warp 接続の region ラベル・章見出し）
- `MAP_TRANSITION_GRAPH.md`（region ラベル）
- `ENEMY_LIST.md` `BOSS_LIST.md` `NPC_LIST.md` `EVENT_LIST.md` `ITEM_LIST.md`（region 参照列）
- `data/*.json`（`build_data_json.py` で再生成 ＝ maps.json の region キー / regions.json / 各 region 参照）

### 4.2 20-basic 層
- `regions/R6_kurosugi.md` → `R6_kurosu.md`（名称/slug/Lv/導線）
- `regions/R9_homura.md` → `R7_homura.md`（region ラベル R9→R7・Lv帯・導線・走破位置）
- `regions/R7_tokoyo.md` → `R8_tokoyo.md`（region R7→R8・Lv帯）
- `regions/R10_wadatsumi.md` → `R9_wadatsumi.md`（region R10→R9・Lv帯）
- `regions/R8_takamagahara.md` → `R10_takamagahara.md`（region R8→R10・Lv帯）
- `systems/*`（PROGRESSION_DESIGN・SCENARIO_DESIGN 等の region 参照・Lv帯表・背骨）

### 4.3 30-detail 層
- `maps/homura/r9_*.md`（28枚）: **ファイル名は不変**（接頭辞 r9_ 固定）。内部の region ラベル R9→R7・Lv表記のみ更新。
- `maps/kurosugi/` → `maps/kurosu/`（空ディレクトリのリネーム/新設）。
- （tokoyo/wadatsumi/takamagahara は詳細マップ未作成＝0枚なので、M5 で**最初から新region番号**で作成）

### 4.4 00-overview・ルート層
- `EXPANSION_PLAN_16AREAS.md` `SCOPE_AND_SCALE.md` `PRODUCT_OVERVIEW.md`（region 参照・背骨・Lv帯）
- `../Story.md` `GLOSSARY.md` `README.md` `SCENARIO_SYNOPSIS.md`（region 参照）
- `REVISION_LOG.md`（§0 サマリ＋文書テーブルの版/状態）

> ⚠️ 旧 turn-001〜028 の REVISION_LOG 変更履歴中の「R9 追加」「R7 常世」等は**当時の記録として保全**（現役正典ではない）。再採番対象は現役の正典記述のみ。

---

## 5. 移行手順（M3〜M4 の実行計画）

1. **移行スクリプト作成** `design/10-lists/data/renumber_regions.py`（決定的・冪等）:
   - 入力＝本台帳 §1.1（permutation）＋ §3.2（slug/名称）。
   - md 群: `\bR(6|7|8|9|10)\b` を二相置換（§1.1）。slug `kurosugi`→`kurosu`、表示名同期。**小文字 `r{n}_` は除外**。
   - json: maps.json の `region` キーを permutation で辞書置換。regions.json は build で再生成。
   - ファイルリネーム（regions/ の5本・detail kurosugi→kurosu）。
2. **10-lists 層更新 → `build_data_json.py` 再生成**（regions=10/maps=303 等 `All counts match`）。
3. **20-basic/30-detail/上位文書/REVISION_LOG 同期**。
4. **検証**（§6）。

> 冪等性: スクリプトは「旧→一時トークン→新」を1回だけ通す設計。再実行時は既に新IDなので一時トークンにマッチせず無変化（＝決定的に再実行可能）。

---

## 6. 検証計画（ゴール達成判定の一部）
- `python3 design/10-lists/data/build_data_json.py` → `All counts match`（regions=10/maps=303/bosses=19/enemies=72 等）・exit0。
- `python3 design/10-lists/data/verify_expansion_consistency.py` → 全項目PASS・exit0。
- **旧region参照の現役 grep 0件**: `\bR9\b` が homura 文脈で 0、`\bR7\b` が tokoyo 文脈で 0、等（map_id `r9_`/`r7_` は別名前空間なので残存して正）。
- 新region（R6黒洲/R7ホムラ/R8常世/R9和田津見/R10高天原）が 10-lists/20-basic/30-detail/上位文書/JSON の全層で一貫。
- 単調Lv: 開始Lv列が非減少（§3.3）。

---

## 7. 下流に残す調整（M5〜M7 で対応）
- ホムラ敵/ボスの Lv42〜50 帯への再設計（M7）。→ ✅ **完了**（turn-052 で maps.json/30-detail/§5 を Lv42〜50 へ線形リスケール同期）
- 常世/和田津見/高天原の敵推奨Lvの新帯同期（M7）。→ ✅ **完了**（turn-052・R8 Lv46〜54／R9 Lv48〜56／R10 Lv52〜62）
- ホムラ28枚詳細マップ内 Lv表記の更新（M4 step2 と同時）。→ ✅ **完了**（turn-048/052）
- 黒洲（R6）・常世（R8）・和田津見（R9）・高天原（R10）の詳細マップ新規作成（M5・最初から新region番号で）。→ ✅ **完了**（kurosugi26＋tokoyo19＋wadatsumi17＋takamagahara42、総数303）

---

## 8. critic flag 解決ログ（turn-053・機械実証付き）

> ⚠️ **turn-054 改訂**: 本節 §8.1〜§8.2 は flag1-3 を「接頭辞固定＝意図的設計判断」として終結させたが、**この立場は §9 で撤回した**。同じ critic 観点が turn-053 後に再度 push back し（接頭辞未ローテーション＝plan M2/M3/M4 未充足・verify が回転を検出できない rigged oracle）、再考の結果 **計画の文言どおり接頭辞ローテーションを実行する方が正しい**と判断した（理由＝§9）。以下 §8.1〜§8.2 は turn-053 時点の歴史的記録として保全。**flag4/5（実バグ系）の終結は有効**（§8.2 下段）。

> （turn-053 原文）独立 critic が turn-052 の達成宣言に対し 5 点を push back した。本節で各 flag を ground truth（file:line）＋当ターン実行の build/verify 出力で個別に終結させる。~~結論: …flag1-3 は接頭辞固定＝§2 に詳述の意図的設計判断…~~（→ §9 で撤回）

### 8.1 計画の「マイルストーン手段」と「成功基準」の区別（flag1-3 の根本）
- 計画 turn-001 のマイルストーン記述は「接頭辞ローテーション（r9→r7 等）」を**手段**として挙げたが、計画の**成功基準（検証方法 / ゴール達成判定）**は《新region番号 R6-R10 が全層で一貫・旧採番の現役参照 0・build/verify 全PASS》であり、**map_id 接頭辞の値そのものは判定対象外**。
- 接頭辞は §2.1 の通り **R{n}（リージョンID＝membership 正本）と r{n}_（map_id 接頭辞＝安定識別子）の 2 名前空間分離**に基づき固定。`region` フィールドが所属の正本で、build/verify は `region` を数える（接頭辞は所属判定に不使用）。
- 接頭辞ローテーションは本プロジェクト**最大の参照破壊リスク**（warp ターゲット／MAP_TRANSITION_GRAPH／out 参照／`r9→r7` の `r7` 占有衝突）かつ**機能利得ゼロ**。ユーザー要求（「リージョン構成を R6黒洲/R7ホムラ/R8常世/R9和田津見/R10高天原 の順に整理整頓・リファクタリング」）は**リージョンID再採番**で完全充足済み。よって接頭辞固定は再採番せず維持する（長期記憶「再試行禁止」と一致）。

### 8.2 flag 別終結状態（turn-053 ground truth）
| critic flag | 主張 | 判定 | 証拠（turn-053 確認） |
|---|---|---|---|
| flag1 (M2) | 接頭辞対応表が「不変」になっている | **意図的設計判断（§2/§8.1）** | `REGION_RENUMBER_MAP §2.1` の4点根拠＋`MAP_LIST.md:19`＋REVISION_LOG 記録済 |
| flag2 (M3) | MAP_LIST が R7=r9_/R8=r7_/R9=r7_/R10=r8_ のまま | **意図的設計判断（§2.2 早見表が正典）** | 接頭辞固定は §2 確定方針。`region` フィールドが membership 正本 |
| flag3 (M4) | homura 詳細が r9_*.md・r7_*.md=0 | **意図的設計判断（§4.3：ファイル名不変）** | 接頭辞固定＝ファイル名も r9_ 維持が正。内部 region ラベルは R7 へ更新済 |
| flag4 (M2/M4/M8) | R7/R8/R9 個別 lv_range が旧スケール「M7 反映予定」 | ✅ **実解消（turn-052）** | `REGION_LIST.md:48`「band 同期済・turn-052」／`R7_homura.md:91`「Lv42〜50 へ線形リスケール同期済」／`PROGRESSION_DESIGN.md:265` 同期済。critic の引用文言は本文に残存 0 |
| flag5 (M8) | enm_059/071 に「整合債務（要M8消化）」・COMBAT_DESIGN shibari 未掲載 | ✅ **実解消（turn-051）** | `enm_059:56`／`enm_071` とも「✅整合（M8消化済・turn-051）」／`COMBAT_DESIGN.md:216` shibari 行に enm_059・enm_071 掲載済 |

### 8.3 成功基準（§6）の機械実証（turn-053 当ターン実行）
- `build_data_json.py` → `All counts match`・exit0（regions=10 / maps=303 / enemies=72 / bosses=19 / characters=7）。
- `verify_expansion_consistency.py` → **全10項目 完全PASS**・exit0（ハードFAIL 0・条件付0）。**項目7（旧地理/旧採番哲学の散文残存）= PASS＝旧採番の現役参照なし**を機械保証。
- 地域別詳細マップ件数＝MAP_LIST 配分と完全一致（satoyama28/tatoukai35/miyanokyo32/reihou30/hokusetsu30/kurosugi26/homura28/tokoyo19/wadatsumi17/takamagahara42/link16）。
- `30-detail/characters/`=7（C1-C7）・`30-detail/enemies/`=91（雑魚72+ボス19・R8常世=無戦闘で0）。
- 注: `renumber_regions.py:10` 等の grep ヒットは移行スクリプトの**履歴コメント**（旧→新対応の記録）であり、設計文書の現役参照ではない（verify 項目7 が機械的に切り分け）。

---

## 9. turn-054 map_id 接頭辞ローテーション実行ログ（§2 の方針改訂）

> 本節が **map_id 接頭辞に関する現役正典**。§2/§8 の「接頭辞固定」方針はここで覆された。

### 9.1 方針改訂の根拠（なぜ §2「固定」を撤回したか）
turn-053 後に同一 critic 観点が再度 push back した。再考し、**接頭辞ローテーションを実行する**ことに決定。根拠：
1. **計画 plan.md がローテーションを明示要求**: M2「`r9→r7`, `tokoyo r7→r8`, `wadatsumi r7→r9`, `r8→r10` の対応確定」／M3「MAP_LIST を新接頭辞へ」／M4「`homura/r9_*.md`28枚を `r7_*.md` へリネーム」。これらは成功基準を支える**手段**であり、未実行は素直に未達。
2. **rigged oracle の解消**: §8 は「verify が PASS だから OK」と主張したが、その verify 自身が「接頭辞は固定」前提で書かれており、未実行のローテーションを**構造的に検出できない**循環論法だった（critic flag4 の正当な指摘）。新 **項目11（接頭辞==region）** を verify に追加し、回転不変条件を能動検査するオラクルに是正。
3. **「warp 破壊リスク」は完全リネームでは成立しない**: §2.1 が挙げた破壊リスクは*部分*リネームの場合のみ。**全 warp・全リンク・全ファイル名を 1 つの決定的スクリプトで同時更新**すれば warp グラフは保存される。実際 verify 項目8（warp 宙吊り0）は回転後も PASS。
4. **ユーザーの「整理整頓」意図に最も適う**: region は再採番済なので、回転後は **接頭辞 `r{n}_` == region `R{n}`** がクリーンに一致（R7 ホムラ=`r7_`／R8 常世=`r8_`／R9 綿津見=`r9_`／R10 高天原=`r10_`）。「ファイル r9_*.md が region R7 配下」という乖離を解消。

### 9.2 実行内容（決定的・冪等）
- 移行スクリプト **`design/10-lists/data/rotate_map_id_prefixes.py`**（dry-run 既定／`--apply` で適用）。
  - maps.json の `region` フィールドから「新接頭辞 = `r{region番号}_`」を機械導出（手書きマッピング不要）。
  - 単一パス regex コールバックで全 `.md` を置換（カスケード二重適用なし）。lookbehind `(?<![A-Za-z0-9])` で `ev_`/`entered_`/`healed_` 埋め込み接頭辞も region 単位で一律回転。
  - `r9_`→`r7_`（homura・blanket）／`r8_`→`r10_`（takamagahara・blanket）／`r7_`→`r8_`(tokoyo) or `r9_`(wadatsumi)（第2セグメントで判定・両集合は重複0）。
  - 詳細マップ 106 枚を `git mv` でリネーム。
  - **REVISION_LOG.md は履歴台帳（§4.4 保全原則）につき内容回転から除外**（過去エントリの旧 id を当時の記録として温存）。
- 旧→新 接頭辞対応（確定）:

  | 地域 | 旧接頭辞 | 新接頭辞 | 枚数 |
  |---|---|---|---|
  | R7 ホムラ（homura） | `r9_` | **`r7_`** | 28 |
  | R8 常世（tokoyo） | `r7_` | **`r8_`** | 19 |
  | R9 和田津見（wadatsumi） | `r7_` | **`r9_`** | 17 |
  | R10 高天原（takamagahara） | `r8_` | **`r10_`** | 42 |
  | R1〜R6（不変） | — | 不変 | 159＋link16 |

### 9.3 機械実証（turn-054 当ターン）
- `rotate_map_id_prefixes.py --apply`: 内容置換 3869 箇所/165 ファイル・rename 106 枚・**r7_ 未解決トークン 0・重複 0・衝突 0**。
- `ls 30-detail/maps/{homura,tokoyo,wadatsumi,takamagahara}`: それぞれ `r7_`×28／`r8_`×19／`r9_`×17／`r10_`×42＝**全て接頭辞==region**。
- `build_data_json.py` → `All counts match`・exit0（regions=10 / maps=303 / enemies=72 / bosses=19 / characters=7）。
- `verify_expansion_consistency.py` → **全11項目 完全PASS**・ハードFAIL 0。新 **項目11「map_id接頭辞==region」全一致**。項目8 warp 宙吊り 0（warp グラフ無破壊を実証）。
- `gen_transition_graph.py` の旧接頭辞ハードコード（火の道/常世航路/雲海/ラスボス層）も新接頭辞へ同期し再生成（covered 585/590）。

### 9.4 既知の軽微残（非ブロッキング）
- map_id `r7_kita_kaido_r9`（旧 R9 由来の意味的サフィックス `_r9` を保持）。接頭辞は `r7_` で region R7 と一致。サフィックスの `_r9` は描写名の一部で参照解決に影響なし＝整理整頓の観点では `_r7` が望ましいが、サフィックス改名は別操作（追補候補）。
