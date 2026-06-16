# 玉結び（TAMAMUSUBI）マップ遷移図 — MAP_TRANSITION_GRAPH

> **自動生成**: `design/10-lists/data/gen_transition_graph.py`（正本 = `data/maps.json` の warp 接続）。
> 手編集しないこと。更新は maps.json → `build_data_json.py` → 本スクリプト再実行の順。

---

## §0 メタ・凡例

- **総マップ数**: 303 枚（地域 10 ＋ 連絡 LINK 16 枚）
- **走破順（正本 REGION_LIST §6 / PROGRESSION_DESIGN §1.1）**: R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9 → R10
  - **rn-M4 再採番**: 走破順は R1→R10 の **単調昇順**（旧「末尾挿入採番」を廃止し、火の道は R6→R7 ゲートへ移設）。
  - **turn-054 接頭辞再採番**: map_id 接頭辞 `r{n}_` は region `R{n}` と一致（R7 火群=`r7_*`／R8 常世=`r8_*`／R9 綿津見=`r9_*`／R10 高天原=`r10_*`）。回転は決定的移行スクリプトで全 warp と同時更新（[REGION_RENUMBER_MAP §9]）。
- **凡例**:
  - `==>`（太線）= 地域間の進行ゲート（移動手段の解放を伴う一方向の物語進行）
  - `---`（無向線）= 地域内マップの隣接（warp による相互行き来）
  - `-.->`（点線）= ファストトラベル/裏ルート/条件付き接続
  - ノード注記 `[野外]/[町]/[D]/[祠]/[連絡]` = マップ種別

- **warp トークン会計**: 全 590 トークン中 585 件を edge 化（99.2%）。残り 5 件は `—`（無warp標識）のみ。物語終端トークン（「天之磐座(ラストボス)」「周回スタート地点」「クリア後ニューゲーム+」等）は全て実 map_id へ解決済み（後述 §6）。地域ラベル道標は全廃し、**全 warp トークンが実 map_id へ解決**（地域外部ラベルノードは 0）。（`verify_expansion_consistency.py` 項目8 で宙吊り0を機械保証）

---

## §1 リージョン俯瞰図（マクロ進行）

各リージョンを 1 ノードに畳み込み、地域間の進行ゲート（移動手段の解放）を太線で示す。
数値は Lv 帯と総マップ枚数。

```mermaid
flowchart TD
  R1["R1 始まりの里山郷<br/>Lv1〜8 / 計28枚"]
  R2["R2 瑠璃の多島海<br/>Lv8〜16 / 計35枚"]
  R3["R3 宮乃京<br/>Lv14〜24 / 計32枚"]
  R4["R4 霊峰の裾野<br/>Lv22〜32 / 計30枚"]
  R5["R5 北雪郷<br/>Lv30〜40 / 計30枚"]
  R6["R6 黒洲<br/>Lv36〜46 / 計26枚"]
  R7["R7 火群と白磐の地<br/>Lv42〜50 / 計28枚"]
  R8["R8 常世<br/>Lv46〜54 / 計19枚"]
  R9["R9 綿津見の大海<br/>Lv48〜56 / 計17枚"]
  R10["R10 高天原<br/>Lv52〜62 / 計42枚"]
  %% 進行ゲート（移動手段の解放）
  R1 ==>|"🚢 船入手→里の港から出航<br/>(多島海航路 link_sato_minato→tashima_koro→kako_ko)"| R2
  R2 ==>|"🚢/徒歩 河港→大橋門<br/>(link_kako_ko)"| R3
  R3 ==>|"⛰ 峠越え<br/>(link_toge_no_seki)"| R4
  R4 ==>|"❄ 峠/北街道・直通<br/>(link_kitakaido_shukuba→r5_fubuki_no)"| R5
  R5 ==>|"🌲 杉谷の隘路・フラグ要<br/>(link_sugitani_airokuchi)"| R6
  R6 ==>|"🔥 火の道開通(boss_11)＋外洋の鍵<br/>(→r7_hi_no_michi)"| R7
  R7 ==>|"🌊 外洋船出航(boss_18)→常世航路<br/>(link_gaiyosen_kanpan→tokoyo_koro→r8_shirasuna)"| R8
  R8 ==>|"🐚 常世の浜→外海・綿津見<br/>(r8_shirasuna→r9_sango_michi)"| R9
  R9 ==>|"🪽 飛空艇の鍵(boss_13)→雲海航路<br/>(link_hikuotei_hatchakujo→link_unkai_kairo)"| R10
  R3 -.->|"🪽 飛空艇発着場・後半ファストトラベル"| R10
  R10 ==>|"天之浮橋→最終連結→天之磐座(ラスボス)"| FINAL["天之磐座<br/>最終決戦/ラストダンジョン<br/>(link_final_renketu_1/2)"]
  FINAL -.->|"クリア後・裏ルート (link_ura_iriguchi)"| URA["周回/裏入口"]
```

### 進行ゲート一覧（解放条件）

| # | From → To | 解放条件 | 連絡経路（map_id） |
|---|-----------|----------|--------------------|
| 1 | R1 → R2 | 船入手（里の港から出航） | link_sato_minato → link_tashima_koro_1/2 |
| 2 | R2 → R3 | 河港着・大橋門（徒歩/船） | link_kako_ko |
| 3 | R3 → R4 | 峠越え（推奨Lv22） | link_toge_no_seki |
| 4 | R4 → R5 | 峠/北街道・直通（推奨Lv30） | link_kitakaido_shukuba → r5_fubuki_no |
| 5 | R5 → R6 | 杉谷の隘路（物語フラグ要） | link_sugitani_airokuchi |
| 6 | R6 → R7 | boss_11撃破で火の道開通＋外洋の鍵 | → r7_hi_no_michi（火の道） |
| 7 | R7 → R8 | boss_18撃破＝正しい火の証→外洋船出航・常世航路 | link_gaiyosen_kanpan → link_tokoyo_koro_1/2 → r8_shirasuna |
| 8 | R8 → R9 | 常世の浜→外海（外洋船で綿津見へ） | r8_shirasuna → r9_sango_michi |
| 9 | R9 → R10 | boss_13＝飛空艇の鍵→雲海航路 | link_hikuotei_hatchakujo → link_unkai_kairo |
| 10 | R10 → 最終 | 天之浮橋→最終連結 | link_amanoukhihashi → link_final_renketu_1/2 → 天之磐座 |

---

## §2 連絡（LINK）スパイン詳細

地域間を結ぶ 16 枚の連絡マップ（航路・関・宿場・飛空艇）。物語進行の背骨。

```mermaid
flowchart LR
  link_sato_minato["里の港着場<br/>[連絡]"]
  link_tashima_koro_1["多島海の船上航路・前半<br/>[連絡]"]
  link_tashima_koro_2["多島海の船上航路・後半<br/>[連絡]"]
  link_kako_ko["河港（花港）<br/>[連絡]"]
  link_toge_no_seki["峠の関<br/>[連絡]"]
  link_kitakaido_shukuba["北街道の宿場<br/>[連絡]"]
  link_sugitani_airokuchi["杉谷の隘路口<br/>[連絡]"]
  link_gaiyosen_kanpan["外洋船の甲板<br/>[連絡]"]
  link_tokoyo_koro_1["常世航路・往路<br/>[連絡]"]
  link_tokoyo_koro_2["常世航路・水平線の彼方<br/>[連絡]"]
  link_hikuotei_hatchakujo["飛空艇の発着場<br/>[連絡]"]
  link_unkai_kairo["雲海航路<br/>[連絡]"]
  link_amanoukhihashi["天之浮橋<br/>[連絡]"]
  link_final_renketu_1["最終ダンジョン連結・第一廊下<br/>[連絡]"]
  link_final_renketu_2["最終ダンジョン連結・天之磐座前<br/>[連絡]"]
  link_ura_iriguchi["周回/裏入口<br/>[連絡]"]
  link_sato_minato --> link_tashima_koro_1
  link_tashima_koro_1 --> link_tashima_koro_2
  link_tashima_koro_2 --> link_kako_ko
  link_gaiyosen_kanpan --> link_tokoyo_koro_1
  link_tokoyo_koro_1 --> link_tokoyo_koro_2
  link_hikuotei_hatchakujo --> link_unkai_kairo
  link_amanoukhihashi --> link_final_renketu_1
  link_final_renketu_1 --> link_final_renketu_2
```

---

## §3 地域別 詳細遷移図

各マップをノード、warp を辺として描画。1 マップから複数マップへ分岐するハブを明示する。
太線（`==>`）は他地域への出入口。

### R1 — 始まりの里山郷（Lv1〜8 / 28枚）

- 解放条件: 初期（徒歩・物語開始地点）
- 内訳: 野外12 / 町6 / D6 / 祠4

```mermaid
flowchart LR
  satoyama["始まりの里山郷<br/>[野外]"]
  kiritate["霧立の里<br/>[野外]"]
  morioku["杜の奥<br/>[野外]"]
  takadai["高台<br/>[野外]"]
  tanada["棚田の谷<br/>[野外]"]
  aze_michi["畦道の広がり<br/>[野外]"]
  hotaru_ogawa["蛍の小川<br/>[野外]"]
  kuririn["栗林の抜け道<br/>[野外]"]
  chinju_sando["鎮守の参道<br/>[野外]"]
  higashizaka["東坂の棚<br/>[野外]"]
  kawagishi["川岸の渡し<br/>[野外]"]
  uemura_hatake["上村の畑<br/>[野外]"]
  tama_musubi_sato["玉結びの里 本村<br/>[町]"]
  sato_kajiya["里の鍛冶屋<br/>[町]"]
  sato_yado["里の宿<br/>[町]"]
  sato_donya["里の問屋<br/>[町]"]
  sato_yakuba["里の役場<br/>[町]"]
  sato_jinja_haiden["鎮守社 拝殿<br/>[町]"]
  ne_no_hora_ent["根の洞 入口<br/>[D]"]
  ne_no_hora_b1["根の洞 第一層<br/>[D]"]
  ne_no_hora_b2["根の洞 第二層<br/>[D]"]
  ne_no_hora_mirror["御鏡の間<br/>[D]"]
  ne_no_hora_boss["根の洞 最深部<br/>[D]"]
  chinju_yashiro_ue["鎮守社 地下祠<br/>[D]"]
  chinju_yashiro["鎮守の社<br/>[祠]"]
  kakushi_izumi["隠し湧き水の祠<br/>[祠]"]
  kofun_iwa["古墳の石室<br/>[祠]"]
  tanuki_hokora["狸の祠<br/>[祠]"]
  aze_michi --- kiritate
  aze_michi --- kuririn
  chinju_sando --- chinju_yashiro
  chinju_sando --- kuririn
  chinju_sando --- morioku
  chinju_sando --- sato_jinja_haiden
  chinju_yashiro --- chinju_yashiro_ue
  chinju_yashiro --- morioku
  chinju_yashiro --- sato_jinja_haiden
  chinju_yashiro_ue --- sato_jinja_haiden
  higashizaka --- ne_no_hora_ent
  higashizaka --- satoyama
  higashizaka --- uemura_hatake
  hotaru_ogawa --- kakushi_izumi
  hotaru_ogawa --- kawagishi
  hotaru_ogawa --- ne_no_hora_ent
  hotaru_ogawa --- tanada
  kawagishi --- tanada
  kiritate --- satoyama
  kofun_iwa --- uemura_hatake
  kuririn --- tanuki_hokora
  ne_no_hora_b1 --- ne_no_hora_b2
  ne_no_hora_b1 --- ne_no_hora_ent
  ne_no_hora_b2 --- ne_no_hora_mirror
  ne_no_hora_boss --- ne_no_hora_mirror
  sato_donya --- tama_musubi_sato
  sato_kajiya --- tama_musubi_sato
  sato_yado --- tama_musubi_sato
  sato_yakuba --- tama_musubi_sato
  satoyama --- takadai
  satoyama --- tama_musubi_sato
  takadai --- tanada
  takadai --- uemura_hatake
  link_sato_minato("里の港着場<br/>[LINK]") ==>|"LINK→"| satoyama
  link_ura_iriguchi("周回/裏入口<br/>[LINK]") ==>|"LINK→"| kiritate
  r10_hokora_final("最終の祠（周回接続）<br/>[R10]") ==>|"R10→"| kiritate
```

### R2 — 瑠璃の多島海（＋砂丘サブゾーン）（Lv8〜16 / 35枚）

- 解放条件: 船入手後（里の港から出航）
- 内訳: 野外18 / 町6 / D6 / 祠5

```mermaid
flowchart LR
  r2_umi_irie["入り江の海路<br/>[野外]"]
  r2_futago_jima["双子島<br/>[野外]"]
  r2_shio_kaze_michi["潮風の道<br/>[野外]"]
  r2_midori_no_oki["緑の沖合<br/>[野外]"]
  r2_nango_se["南護瀬<br/>[野外]"]
  r2_kita_no_shima["北の島<br/>[野外]"]
  r2_seto_ooumi["瀬戸大海<br/>[野外]"]
  r2_shio_no_yashiro_mae["潮の社前浜<br/>[野外]"]
  r2_ura_umi["裏海路<br/>[野外]"]
  r2_hana_no_seto["花の瀬戸<br/>[野外]"]
  r2_kawakou["河港沖<br/>[野外]"]
  r2_oki_no_se["沖の瀬<br/>[野外]"]
  r2_amijima["網島<br/>[野外]"]
  r2_sango_se["珊瑚の瀬<br/>[野外]"]
  r2_minato["湊の町<br/>[町]"]
  r2_toiya["問屋街<br/>[町]"]
  r2_ama_mura["海女の村<br/>[町]"]
  r2_kaizoku_yashiki["海賊崩れの屋敷<br/>[町]"]
  r2_toudai_machi["燈台守の家<br/>[町]"]
  r2_sosogi_ya["漕ぎ屋<br/>[町]"]
  r2_kaishoku_do_1f["海蝕洞 第1層<br/>[D]"]
  r2_kaishoku_do_2f["海蝕洞 第2層<br/>[D]"]
  r2_kaishoku_do_3f["海蝕洞 第3層<br/>[D]"]
  r2_shio_no_yashiro_1f["潮の社 第1層<br/>[D]"]
  r2_shio_no_yashiro_2f["潮の社 第2層<br/>[D]"]
  r2_iwaya_oku["海蝕洞 奥の岩屋<br/>[D]"]
  r2_shio_no_yashiro["潮の社（外観）<br/>[祠]"]
  r2_taiko_iwa_hokora["太鼓岩の祠<br/>[祠]"]
  r2_amijima_hokora["網島の祠<br/>[祠]"]
  r2_sango_hokora["珊瑚の祠<br/>[祠]"]
  r2_narisuna_misaki["鳴り砂の岬<br/>[野外]"]
  r2_sakyu_ono["砂丘の大野<br/>[野外]"]
  r2_sakyu_oasis["砂丘の隠れ泉<br/>[野外]"]
  r2_sakyu_okuchi["砂丘の奥地<br/>[野外]"]
  r2_sakyu_hokora["砂丘の埋もれ祠<br/>[祠]"]
  r2_ama_mura --- r2_futago_jima
  r2_ama_mura --- r2_shio_kaze_michi
  r2_amijima --- r2_amijima_hokora
  r2_amijima --- r2_minato
  r2_amijima --- r2_sango_se
  r2_amijima --- r2_seto_ooumi
  r2_futago_jima --- r2_shio_kaze_michi
  r2_futago_jima --- r2_taiko_iwa_hokora
  r2_futago_jima --- r2_umi_irie
  r2_hana_no_seto --- r2_kawakou
  r2_hana_no_seto --- r2_ura_umi
  r2_iwaya_oku --- r2_kaishoku_do_2f
  r2_iwaya_oku --- r2_kaishoku_do_3f
  r2_kaishoku_do_1f --- r2_kaishoku_do_2f
  r2_kaishoku_do_1f --- r2_kita_no_shima
  r2_kaishoku_do_2f --- r2_kaishoku_do_3f
  r2_kaizoku_yashiki --- r2_ura_umi
  r2_kawakou --- r2_ura_umi
  r2_kita_no_shima --- r2_nango_se
  r2_kita_no_shima --- r2_narisuna_misaki
  r2_kita_no_shima --- r2_toudai_machi
  r2_midori_no_oki --- r2_nango_se
  r2_midori_no_oki --- r2_shio_kaze_michi
  r2_minato --- r2_sango_se
  r2_minato --- r2_sosogi_ya
  r2_minato --- r2_toiya
  r2_nango_se --- r2_oki_no_se
  r2_nango_se --- r2_seto_ooumi
  r2_narisuna_misaki --- r2_sakyu_ono
  r2_oki_no_se --- r2_seto_ooumi
  r2_sakyu_hokora --- r2_sakyu_okuchi
  r2_sakyu_oasis --- r2_sakyu_ono
  r2_sakyu_okuchi --- r2_sakyu_ono
  r2_sango_hokora --- r2_sango_se
  r2_seto_ooumi --- r2_shio_no_yashiro_mae
  r2_shio_kaze_michi --- r2_shio_no_yashiro
  r2_shio_no_yashiro --- r2_shio_no_yashiro_mae
  r2_shio_no_yashiro_1f --- r2_shio_no_yashiro_2f
  r2_shio_no_yashiro_1f --- r2_shio_no_yashiro_mae
  r2_shio_no_yashiro_mae --- r2_ura_umi
  r2_kawakou ==>|"→R3"| r3_kominato("河港町<br/>[R3]")
  r2_umi_irie ==>|"→LINK"| link_tashima_koro_1("多島海の船上航路・前半<br/>[LINK]")
```

### R3 — 宮乃京（Lv14〜24 / 32枚）

- 解放条件: 徒歩（街道）／船（河港）
- 内訳: 野外10 / 町12 / D6 / 祠4

```mermaid
flowchart LR
  r3_kaido_higashi["東街道<br/>[野外]"]
  r3_kaido_nishi["西街道<br/>[野外]"]
  r3_kaido_minami["南街道<br/>[野外]"]
  r3_kaido_kita["北街道<br/>[野外]"]
  r3_satoyama_nishi["西の里山<br/>[野外]"]
  r3_satoyama_higashi["東の里山<br/>[野外]"]
  r3_kawara["鴨の河原<br/>[野外]"]
  r3_suiro_ura["旧都の外堀跡<br/>[野外]"]
  r3_matsubara["松原の古道<br/>[野外]"]
  r3_tobira_oka["扉ヶ丘<br/>[野外]"]
  r3_ichi["宮乃京 市<br/>[町]"]
  r3_shaka_ku["社家区<br/>[町]"]
  r3_sekisho["関の砦（表門）<br/>[町]"]
  r3_yado["旅籠 京の宿<br/>[町]"]
  r3_kajiya["鍛冶屋 炉職堂<br/>[町]"]
  r3_yumishi["弓師の工房<br/>[町]"]
  r3_toiya["問屋 丸屋<br/>[町]"]
  r3_chaya["茶屋 一服亭<br/>[町]"]
  r3_jingikan["神祇官庁<br/>[町]"]
  r3_ohashi["大橋のたもと<br/>[町]"]
  r3_kominato["河港町<br/>[町]"]
  r3_mise_nai["商店内 呉服処<br/>[町]"]
  r3_chika_suiro["旧都の地下水路<br/>[D]"]
  r3_chika_suiro_oku["旧都の地下水路 奥殿<br/>[D]"]
  r3_chika_sekisho["関の砦 地下牢<br/>[D]"]
  r3_chika_sekisho_ura["関の砦 番鬼の間<br/>[D]"]
  r3_chika_roka["旧都の地下回廊<br/>[D]"]
  r3_chika_kura["旧都の宝物蔵<br/>[D]"]
  r3_hokora_kami["天つ社の小祠<br/>[祠]"]
  r3_hokora_torii["参道の末社<br/>[祠]"]
  r3_hokora_yama["里山の岩祠<br/>[祠]"]
  r3_hokora_kawa["川辺の水祠<br/>[祠]"]
  r3_chaya --- r3_ichi
  r3_chaya --- r3_yado
  r3_chika_kura --- r3_chika_roka
  r3_chika_roka --- r3_chika_sekisho
  r3_chika_roka --- r3_chika_suiro
  r3_chika_sekisho --- r3_chika_sekisho_ura
  r3_chika_sekisho --- r3_sekisho
  r3_chika_suiro --- r3_chika_suiro_oku
  r3_chika_suiro --- r3_suiro_ura
  r3_hokora_kami --- r3_ichi
  r3_hokora_kawa --- r3_kominato
  r3_hokora_torii --- r3_jingikan
  r3_hokora_torii --- r3_satoyama_higashi
  r3_hokora_yama --- r3_satoyama_nishi
  r3_ichi --- r3_kaido_kita
  r3_ichi --- r3_kajiya
  r3_ichi --- r3_mise_nai
  r3_ichi --- r3_shaka_ku
  r3_ichi --- r3_toiya
  r3_ichi --- r3_yado
  r3_ichi --- r3_yumishi
  r3_jingikan --- r3_shaka_ku
  r3_kaido_higashi --- r3_matsubara
  r3_kaido_higashi --- r3_satoyama_higashi
  r3_kaido_higashi --- r3_sekisho
  r3_kaido_higashi --- r3_toiya
  r3_kaido_kita --- r3_matsubara
  r3_kaido_minami --- r3_kominato
  r3_kaido_minami --- r3_suiro_ura
  r3_kaido_nishi --- r3_satoyama_nishi
  r3_kaido_nishi --- r3_sekisho
  r3_kaido_nishi --- r3_tobira_oka
  r3_kajiya --- r3_yumishi
  r3_kawara --- r3_kominato
  r3_kawara --- r3_ohashi
  r3_kominato --- r3_ohashi
  link_hikuotei_hatchakujo("飛空艇の発着場<br/>[LINK]") ==>|"LINK→"| r3_kawara
  link_kako_ko("河港（花港）<br/>[LINK]") ==>|"LINK→"| r3_kominato
  link_kako_ko("河港（花港）<br/>[LINK]") ==>|"LINK→"| r3_ohashi
  link_toge_no_seki("峠の関<br/>[LINK]") ==>|"LINK→"| r3_kaido_nishi
  r2_kawakou("河港沖<br/>[R2]") ==>|"R2→"| r3_kominato
  r3_kaido_nishi ==>|"→LINK"| link_toge_no_seki("峠の関<br/>[LINK]")
  r3_tobira_oka ==>|"→LINK"| link_toge_no_seki("峠の関<br/>[LINK]")
  r4_suso_ichi("裾野の一の坂<br/>[R4]") ==>|"R4→"| r3_kaido_kita
```

### R4 — 霊峰の裾野（Lv22〜32 / 30枚）

- 解放条件: 徒歩（宮乃京から峠越え）
- 内訳: 野外14 / 町4 / D8 / 祠4

```mermaid
flowchart LR
  r4_suso_ichi["裾野の一の坂<br/>[野外]"]
  r4_suso_ni["裾野の二の坂<br/>[野外]"]
  r4_takazan_ichi["高山の一帯<br/>[野外]"]
  r4_takazan_ni["高山の二帯<br/>[野外]"]
  r4_kanko_michi["観行の道<br/>[野外]"]
  r4_kaze_tani["風の谷間<br/>[野外]"]
  r4_sessho_iwa["折石の原<br/>[野外]"]
  r4_yuki_gen["雪解けの源流<br/>[野外]"]
  r4_setsugyo_hara["雪域の原野<br/>[野外]"]
  r4_reiho_dake["霊峰の岳麓<br/>[野外]"]
  r4_kitakaidou_n["北街道の北端<br/>[野外]"]
  r4_iwa_tobira["岩扉の前路<br/>[野外]"]
  r4_gyoja_fumoto["行者の麓<br/>[野外]"]
  r4_tenku_iwa["天空岩台<br/>[野外]"]
  r4_sanzoku_mura["山岳の宿場町<br/>[町]"]
  r4_hyokutsu_machi["氷窟の前哨村<br/>[町]"]
  r4_gyoja_juku["行者の修験宿<br/>[町]"]
  r4_reiho_torii["霊峰の鳥居集落<br/>[町]"]
  r4_hyokutsu_b1["霊峰の氷窟B1<br/>[D]"]
  r4_hyokutsu_b2["霊峰の氷窟B2<br/>[D]"]
  r4_hyokutsu_b3["霊峰の氷窟B3<br/>[D]"]
  r4_hyokutsu_boss["氷窟の最深祭壇<br/>[D]"]
  r4_gyoja_iwato_f1["行者の岩塔一層<br/>[D]"]
  r4_gyoja_iwato_f2["行者の岩塔二層<br/>[D]"]
  r4_gyoja_iwato_f3["行者の岩塔三層<br/>[D]"]
  r4_gyoja_iwato_top["行者の岩塔頂上祭壇<br/>[D]"]
  r4_iwa_hokora["岩穿ちの祠<br/>[祠]"]
  r4_yukigami_hokora["雪神の祠<br/>[祠]"]
  r4_mori_hokora["天空の守り祠<br/>[祠]"]
  r4_chojohotai["霊峰頂上祠<br/>[祠]"]
  r4_chojohotai --- r4_reiho_torii
  r4_gyoja_fumoto --- r4_gyoja_iwato_f1
  r4_gyoja_fumoto --- r4_gyoja_juku
  r4_gyoja_fumoto --- r4_kanko_michi
  r4_gyoja_iwato_f1 --- r4_gyoja_iwato_f2
  r4_gyoja_iwato_f1 --- r4_gyoja_juku
  r4_gyoja_iwato_f2 --- r4_gyoja_iwato_f3
  r4_gyoja_iwato_f3 --- r4_gyoja_iwato_top
  r4_hyokutsu_b1 --- r4_hyokutsu_b2
  r4_hyokutsu_b1 --- r4_hyokutsu_machi
  r4_hyokutsu_b1 --- r4_iwa_tobira
  r4_hyokutsu_b2 --- r4_hyokutsu_b3
  r4_hyokutsu_b3 --- r4_hyokutsu_boss
  r4_hyokutsu_machi --- r4_iwa_tobira
  r4_hyokutsu_machi --- r4_reiho_dake
  r4_iwa_hokora --- r4_takazan_ni
  r4_iwa_tobira --- r4_sessho_iwa
  r4_kanko_michi --- r4_kaze_tani
  r4_kanko_michi --- r4_sanzoku_mura
  r4_kanko_michi --- r4_takazan_ni
  r4_kaze_tani --- r4_sessho_iwa
  r4_kitakaidou_n --- r4_reiho_dake
  r4_mori_hokora --- r4_tenku_iwa
  r4_reiho_dake --- r4_reiho_torii
  r4_reiho_dake --- r4_setsugyo_hara
  r4_sanzoku_mura --- r4_takazan_ichi
  r4_sessho_iwa --- r4_yuki_gen
  r4_setsugyo_hara --- r4_tenku_iwa
  r4_setsugyo_hara --- r4_yuki_gen
  r4_suso_ichi --- r4_suso_ni
  r4_suso_ni --- r4_takazan_ichi
  r4_takazan_ichi --- r4_takazan_ni
  r4_yuki_gen --- r4_yukigami_hokora
  link_kitakaido_shukuba("北街道の宿場<br/>[LINK]") ==>|"LINK→"| r4_kitakaidou_n
  link_toge_no_seki("峠の関<br/>[LINK]") ==>|"LINK→"| r4_suso_ichi
  r4_kitakaidou_n ==>|"→R5"| r5_fubuki_no("吹雪野<br/>[R5]")
  r4_suso_ichi ==>|"→R3"| r3_kaido_kita("北街道<br/>[R3]")
  r5_fubuki_no("吹雪野<br/>[R5]") ==>|"R5→"| r4_kitakaidou_n
```

### R5 — 北雪郷（Lv30〜40 / 30枚）

- 解放条件: 徒歩（R4 霊峰から峠／街道で直通）／船（沿岸）
- 内訳: 野外14 / 町6 / D6 / 祠4

```mermaid
flowchart LR
  r5_fubuki_no["吹雪野<br/>[野外]"]
  r5_shirogane_michi["白銀の道<br/>[野外]"]
  r5_hyoumen_taira["氷面平ら<br/>[野外]"]
  r5_kori_no_hama["氷の浜<br/>[野外]"]
  r5_yukidamari_mori["雪溜まりの森<br/>[野外]"]
  r5_yukifuri_toge["雪降り峠<br/>[野外]"]
  r5_reika_kougen["冷霞の高原<br/>[野外]"]
  r5_sugi_hara["杉原<br/>[野外]"]
  r5_sugi_no_iarou["杉の隘路<br/>[野外]"]
  r5_kiri_tsubo["霧の壺地<br/>[野外]"]
  r5_oshiro_ato["御城跡<br/>[野外]"]
  r5_umonuki_dori["埋貫き通り<br/>[野外]"]
  r5_haku_gen["白原<br/>[野外]"]
  r5_tohyou_ga["凍氷河<br/>[野外]"]
  r5_setchu_mura["雪中の村<br/>[町]"]
  r5_fugaku_cho["富嶽町<br/>[町]"]
  r5_hokka_hiroba["焰火広場<br/>[町]"]
  r5_shirako_hatago["白子の旅籠<br/>[町]"]
  r5_kaji_kobo["鍛治工房<br/>[町]"]
  r5_fushimi_gura["伏見蔵<br/>[町]"]
  r5_hyochu_kairo["氷柱の回廊<br/>[D]"]
  r5_hyochu_kairo_b2["氷柱の回廊・深層<br/>[D]"]
  r5_hyochu_bosu["氷柱の回廊・最奥<br/>[D]"]
  r5_setchu_yashiro["雪中の社<br/>[D]"]
  r5_setchu_yashiro_oku["雪中の社・御本殿<br/>[D]"]
  r5_setchu_yashiro_ura["雪中の社・裏殿<br/>[D]"]
  r5_fubuki_yashiro["吹雪の祠<br/>[祠]"]
  r5_kori_yashiro["氷の祠<br/>[祠]"]
  r5_yuki_yashiro["雪の祠<br/>[祠]"]
  r5_hakuzan_yashiro["白山の祠<br/>[祠]"]
  r5_fubuki_no --- r5_fubuki_yashiro
  r5_fubuki_no --- r5_setchu_mura
  r5_fubuki_no --- r5_shirogane_michi
  r5_fugaku_cho --- r5_hokka_hiroba
  r5_fugaku_cho --- r5_reika_kougen
  r5_fushimi_gura --- r5_kaji_kobo
  r5_fushimi_gura --- r5_setchu_mura
  r5_haku_gen --- r5_setchu_mura
  r5_haku_gen --- r5_tohyou_ga
  r5_haku_gen --- r5_umonuki_dori
  r5_hakuzan_yashiro --- r5_reika_kougen
  r5_hokka_hiroba --- r5_setchu_mura
  r5_hokka_hiroba --- r5_shirako_hatago
  r5_hyochu_bosu --- r5_hyochu_kairo_b2
  r5_hyochu_kairo --- r5_hyochu_kairo_b2
  r5_hyochu_kairo --- r5_kori_no_hama
  r5_hyoumen_taira --- r5_kori_no_hama
  r5_hyoumen_taira --- r5_shirogane_michi
  r5_kaji_kobo --- r5_setchu_mura
  r5_kaji_kobo --- r5_shirako_hatago
  r5_kiri_tsubo --- r5_oshiro_ato
  r5_kiri_tsubo --- r5_sugi_no_iarou
  r5_kori_no_hama --- r5_kori_yashiro
  r5_kori_no_hama --- r5_yukidamari_mori
  r5_oshiro_ato --- r5_umonuki_dori
  r5_reika_kougen --- r5_sugi_hara
  r5_reika_kougen --- r5_yukifuri_toge
  r5_setchu_mura --- r5_shirako_hatago
  r5_setchu_mura --- r5_tohyou_ga
  r5_setchu_mura --- r5_umonuki_dori
  r5_setchu_mura --- r5_yukidamari_mori
  r5_setchu_yashiro --- r5_setchu_yashiro_oku
  r5_setchu_yashiro --- r5_sugi_hara
  r5_setchu_yashiro_oku --- r5_setchu_yashiro_ura
  r5_sugi_hara --- r5_sugi_no_iarou
  r5_sugi_hara --- r5_yuki_yashiro
  r5_yukidamari_mori --- r5_yukifuri_toge
  link_kitakaido_shukuba("北街道の宿場<br/>[LINK]") ==>|"LINK→"| r5_shirogane_michi
  link_sugitani_airokuchi("杉谷の隘路口<br/>[LINK]") ==>|"LINK→"| r5_sugi_no_iarou
  r4_kitakaidou_n("北街道の北端<br/>[R4]") ==>|"R4→"| r5_fubuki_no
  r5_fubuki_no ==>|"→R4"| r4_kitakaidou_n("北街道の北端<br/>[R4]")
  r5_sugi_no_iarou ==>|"→R6"| r6_kurosugi_iriguchi("黒洲・入口<br/>[R6]")
  r6_kurosugi_iriguchi("黒洲・入口<br/>[R6]") ==>|"R6→"| r5_sugi_no_iarou
```

### R6 — 黒洲（Lv36〜46 / 26枚）

- 解放条件: 徒歩（R5 北雪郷から杉谷の隘路・フラグ要）
- 内訳: 野外12 / 町2 / D8 / 祠4

```mermaid
flowchart LR
  r6_kurosugi_iriguchi["黒洲・入口<br/>[野外]"]
  r6_kiri_no["霧の谷<br/>[野外]"]
  r6_tanikuchi_higashi["谷口・東<br/>[野外]"]
  r6_sugi_minami["黒杉の南斜面<br/>[野外]"]
  r6_koke_daichi["苔の大地<br/>[野外]"]
  r6_kagero_michi["陽炎道<br/>[野外]"]
  r6_kuroyama_fumoto["黒山の麓<br/>[野外]"]
  r6_fuuchi_taki["幽地の滝<br/>[野外]"]
  r6_kosui_hotori["幽湖のほとり<br/>[野外]"]
  r6_nukarumi["沼地の抜け道<br/>[野外]"]
  r6_ooksugi_kanata["大杉の彼方<br/>[野外]"]
  r6_yami_tobira["闇の扉<br/>[野外]"]
  r6_sumiyaki["炭焼き小屋<br/>[町]"]
  r6_kakurega_sato["隠れ里<br/>[町]"]
  r6_jukai_d1["黒杉の樹海・第一層<br/>[D]"]
  r6_jukai_d2["黒杉の樹海・第二層<br/>[D]"]
  r6_jukai_d3["黒杉の樹海・第三層<br/>[D]"]
  r6_jukai_d4["黒杉の樹海・第四層<br/>[D]"]
  r6_jukai_d5["黒杉の樹海・第五層<br/>[D]"]
  r6_jukai_d6["黒杉の樹海・第六層<br/>[D]"]
  r6_jukai_boss1["樹海の主・朽王の間<br/>[D]"]
  r6_jukai_boss2["幽谷の魔将・霧鬼の間<br/>[D]"]
  r6_hotoke_iwa["仏岩の祠<br/>[祠]"]
  r6_kagami_yashiro["鏡社<br/>[祠]"]
  r6_sugi_reichi["杉霊地<br/>[祠]"]
  r6_yomi_tobira_hokora["黄泉扉の祠<br/>[祠]"]
  r6_fuuchi_taki --- r6_kosui_hotori
  r6_fuuchi_taki --- r6_kuroyama_fumoto
  r6_fuuchi_taki --- r6_sumiyaki
  r6_hotoke_iwa --- r6_koke_daichi
  r6_jukai_boss1 --- r6_jukai_boss2
  r6_jukai_boss1 --- r6_jukai_d6
  r6_jukai_boss2 --- r6_yami_tobira
  r6_jukai_d1 --- r6_jukai_d2
  r6_jukai_d1 --- r6_yami_tobira
  r6_jukai_d2 --- r6_jukai_d3
  r6_jukai_d3 --- r6_jukai_d4
  r6_jukai_d3 --- r6_kakurega_sato
  r6_jukai_d4 --- r6_jukai_d5
  r6_jukai_d5 --- r6_jukai_d6
  r6_kagami_yashiro --- r6_kosui_hotori
  r6_kagero_michi --- r6_koke_daichi
  r6_kagero_michi --- r6_kuroyama_fumoto
  r6_kakurega_sato --- r6_nukarumi
  r6_kakurega_sato --- r6_sumiyaki
  r6_kiri_no --- r6_kurosugi_iriguchi
  r6_kiri_no --- r6_tanikuchi_higashi
  r6_koke_daichi --- r6_sugi_minami
  r6_kosui_hotori --- r6_nukarumi
  r6_nukarumi --- r6_ooksugi_kanata
  r6_ooksugi_kanata --- r6_sugi_reichi
  r6_ooksugi_kanata --- r6_sumiyaki
  r6_ooksugi_kanata --- r6_yami_tobira
  r6_sugi_minami --- r6_tanikuchi_higashi
  r6_yami_tobira --- r6_yomi_tobira_hokora
  link_sugitani_airokuchi("杉谷の隘路口<br/>[LINK]") ==>|"LINK→"| r6_kurosugi_iriguchi
  r5_sugi_no_iarou("杉の隘路<br/>[R5]") ==>|"R5→"| r6_kurosugi_iriguchi
  r6_kurosugi_iriguchi ==>|"→R5"| r5_sugi_no_iarou("杉の隘路<br/>[R5]")
  r6_yami_tobira ==>|"→R7"| r7_hi_no_michi("火の道<br/>[R7]")
  r7_hi_no_michi("火の道<br/>[R7]") ==>|"R7→"| r6_yami_tobira
```

### R7 — 火群と白磐の地（Lv42〜50 / 28枚）

- 解放条件: 徒歩（R6 から「火の道」）
- 内訳: 野外8 / 町8 / D6 / 祠6

```mermaid
flowchart LR
  r7_hi_no_michi["火の道<br/>[野外]"]
  r7_shiroiwa_no["白磐の野<br/>[野外]"]
  r7_shiroiwa_kita["白磐の北野<br/>[野外]"]
  r7_karusuto_dai["カルスト台地<br/>[野外]"]
  r7_funki_tani["噴気の谷<br/>[野外]"]
  r7_yukemuri_michi["湯けむりの道<br/>[野外]"]
  r7_tatara_gairo["たたらの外路<br/>[野外]"]
  r7_kita_kaido_r9["火群の湊口<br/>[野外]"]
  r7_tatara_machi["鍛冶の街 たたら<br/>[町]"]
  r7_tatara_kobo["たたらの大鍛冶場<br/>[町]"]
  r7_tatara_ichi["たたらの市<br/>[町]"]
  r7_yunokigou["湯ノ鬼郷<br/>[町]"]
  r7_yu_no_yado["湯治の宿<br/>[町]"]
  r7_yu_no_yashiro["回復湯ノ社<br/>[町]"]
  r7_shiroiwa_sato["白磐の里<br/>[町]"]
  r7_funki_ban["噴気の番小屋<br/>[町]"]
  r7_shounyu_d1["鍾乳洞 第一層<br/>[D]"]
  r7_shounyu_d2["鍾乳洞 第二層<br/>[D]"]
  r7_shounyu_d3["鍾乳洞 第三層<br/>[D]"]
  r7_tatara_ana["たたらの地下坑道<br/>[D]"]
  r7_jigokudani_d["地獄谷の火窟<br/>[D]"]
  r7_jigokudani_boss["地獄谷 火炉の最奥<br/>[D]"]
  r7_shiroiwa_hokora["白磐の祠<br/>[祠]"]
  r7_hi_no_hokora["火の祠<br/>[祠]"]
  r7_yu_no_hokora["湯の隠し祠<br/>[祠]"]
  r7_shounyu_hokora["鍾乳の祠<br/>[祠]"]
  r7_tatara_oku_hokora["たたら奥の祠<br/>[祠]"]
  r7_karusuto_hokora["カルストの隠し祠<br/>[祠]"]
  r7_funki_ban --- r7_funki_tani
  r7_funki_ban --- r7_jigokudani_d
  r7_funki_tani --- r7_karusuto_dai
  r7_funki_tani --- r7_yukemuri_michi
  r7_hi_no_hokora --- r7_hi_no_michi
  r7_hi_no_michi --- r7_shiroiwa_no
  r7_jigokudani_boss --- r7_jigokudani_d
  r7_jigokudani_d --- r7_tatara_gairo
  r7_karusuto_dai --- r7_karusuto_hokora
  r7_karusuto_dai --- r7_shiroiwa_no
  r7_kita_kaido_r9 --- r7_tatara_machi
  r7_shiroiwa_hokora --- r7_shounyu_d3
  r7_shiroiwa_kita --- r7_shiroiwa_no
  r7_shiroiwa_kita --- r7_shiroiwa_sato
  r7_shiroiwa_kita --- r7_shounyu_d1
  r7_shiroiwa_sato --- r7_shounyu_d1
  r7_shounyu_d1 --- r7_shounyu_d2
  r7_shounyu_d2 --- r7_shounyu_d3
  r7_shounyu_d2 --- r7_shounyu_hokora
  r7_tatara_ana --- r7_tatara_kobo
  r7_tatara_ana --- r7_tatara_oku_hokora
  r7_tatara_gairo --- r7_tatara_machi
  r7_tatara_gairo --- r7_yunokigou
  r7_tatara_ichi --- r7_tatara_machi
  r7_tatara_ichi --- r7_yunokigou
  r7_tatara_kobo --- r7_tatara_machi
  r7_yu_no_hokora --- r7_yukemuri_michi
  r7_yu_no_yado --- r7_yunokigou
  r7_yu_no_yashiro --- r7_yunokigou
  r7_yukemuri_michi --- r7_yunokigou
  link_gaiyosen_kanpan("外洋船の甲板<br/>[LINK]") ==>|"LINK→"| r7_kita_kaido_r9
  r6_yami_tobira("闇の扉<br/>[R6]") ==>|"R6→"| r7_hi_no_michi
  r7_hi_no_michi ==>|"→R6"| r6_yami_tobira("闇の扉<br/>[R6]")
  r7_kita_kaido_r9 ==>|"→LINK"| link_gaiyosen_kanpan("外洋船の甲板<br/>[LINK]")
```

### R8 — 常世（聖域・無戦闘）（Lv46〜54 / 19枚）

- 解放条件: 外洋船（R7 ホムラの湊から常世航路へ）
- 内訳: 野外6 / 町4 / D2 / 祠7
- ⚠ **R8 常世は完全無戦闘の聖域**（敵0・ボス0）。戦闘は隣接する R9 綿津見の大海に分離。map_id は `r8_` 接頭辞（region R8 と一致）。

```mermaid
flowchart LR
  r8_shirasuna["白砂の浜<br/>[野外]"]
  r8_rakuen_daichi["楽園の台地<br/>[野外]"]
  r8_shirohana_no["白花野<br/>[野外]"]
  r8_torii_mae["鳥居前の浜<br/>[野外]"]
  r8_tobiraza_mura["渡場の村<br/>[町]"]
  r8_rakuen_no_sato["楽園の里<br/>[町]"]
  r8_shiro_hokora["白砂の祠（外）<br/>[祠]"]
  r8_shiro_hokora_nai["白砂の祠（内陣）<br/>[祠]"]
  r8_rakuen_hokora["楽園の祠<br/>[祠]"]
  r8_mio_shitsugen["澪渡りの湿地<br/>[野外]"]
  r8_mio_oku["澪渡りの奥<br/>[野外]"]
  r8_taisha_sando["常世の大社 参道<br/>[町]"]
  r8_taisha_machi["大社の社家町<br/>[町]"]
  r8_taisha_honden["常世の大社 本殿<br/>[D]"]
  r8_taisha_oku["常世の大社 奥宮<br/>[D]"]
  r8_mio_hokora["湿地の祠<br/>[祠]"]
  r8_mio_kioku["澪の記憶<br/>[祠]"]
  r8_taisha_hokora["大社の末社<br/>[祠]"]
  r8_taisha_kioku["大社の記憶殿<br/>[祠]"]
  r8_mio_hokora --- r8_mio_shitsugen
  r8_mio_kioku --- r8_mio_oku
  r8_mio_oku --- r8_mio_shitsugen
  r8_mio_shitsugen --- r8_shirohana_no
  r8_rakuen_daichi --- r8_rakuen_hokora
  r8_rakuen_daichi --- r8_rakuen_no_sato
  r8_rakuen_daichi --- r8_shirohana_no
  r8_rakuen_no_sato --- r8_shirohana_no
  r8_shirasuna --- r8_shiro_hokora
  r8_shirasuna --- r8_tobiraza_mura
  r8_shiro_hokora --- r8_shiro_hokora_nai
  r8_shirohana_no --- r8_torii_mae
  r8_taisha_hokora --- r8_taisha_machi
  r8_taisha_honden --- r8_taisha_kioku
  r8_taisha_honden --- r8_taisha_oku
  r8_taisha_honden --- r8_taisha_sando
  r8_taisha_machi --- r8_taisha_sando
  r8_taisha_sando --- r8_torii_mae
  r8_tobiraza_mura --- r8_torii_mae
  link_tokoyo_koro_2("常世航路・水平線の彼方<br/>[LINK]") ==>|"LINK→"| r8_shirasuna
  r8_rakuen_daichi ==>|"→R9"| r9_umi_hiroba("海の広場<br/>[R9]")
  r8_shirasuna ==>|"→LINK"| link_tokoyo_koro_2("常世航路・水平線の彼方<br/>[LINK]")
  r8_shirasuna ==>|"→R9"| r9_sango_michi("珊瑚の小道<br/>[R9]")
  r8_torii_mae ==>|"→R9"| r9_sango_miya_mae("珊瑚の宮前広場<br/>[R9]")
  r9_minatsu_no_shima("真夏の島<br/>[R9]") ==>|"R9→"| r8_tobiraza_mura
  r9_minatsu_no_shima("真夏の島<br/>[R9]") ==>|"R9→"| r8_torii_mae
  r9_sango_michi("珊瑚の小道<br/>[R9]") ==>|"R9→"| r8_shirasuna
  r9_sango_miya_mae("珊瑚の宮前広場<br/>[R9]") ==>|"R9→"| r8_torii_mae
```

### R9 — 綿津見の大海（Lv48〜56 / 17枚）

- 解放条件: 常世の浜から外海へ（綿津見の試練・飛空艇の鍵）
- 内訳: 野外10 / 町2 / D4 / 祠1
- ⚠ **R9 綿津見は町（海岸の町/真夏の島）を中核戦闘ハブ**とし、**砂浜・岩礁・深海も戦闘可**の美麗フィールド。map_id は `r9_` 接頭辞（region R9 と一致）。

```mermaid
flowchart LR
  r9_sango_michi["珊瑚の小道<br/>[野外]"]
  r9_umi_hiroba["海の広場<br/>[野外]"]
  r9_kaigan_kita["北の岩礁帯<br/>[野外]"]
  r9_kita_misaki["北の岬<br/>[野外]"]
  r9_kaigan_minami["南の磯<br/>[野外]"]
  r9_minami_nyukou["南入江（澪の干潟）<br/>[野外]"]
  r9_okiseto["沖瀬戸<br/>[野外]"]
  r9_shinkai_iri["深海の入口<br/>[野外]"]
  r9_yakou_dou["夜光洞<br/>[野外]"]
  r9_sango_miya_mae["珊瑚の宮前広場<br/>[野外]"]
  r9_kaigan_machi["海神の町（わだつみの大会 本戦会場）<br/>[町]"]
  r9_minatsu_no_shima["真夏の島<br/>[町]"]
  r9_sango_miya["珊瑚の宮（前殿）<br/>[D]"]
  r9_sango_miya_oku["珊瑚の宮（奥殿）<br/>[D]"]
  r9_shinkai_meiro["深海迷路<br/>[D]"]
  r9_shinkai_boss["深海の間（大会・決勝）<br/>[D]"]
  r9_kita_hokora["北岬の祠<br/>[祠]"]
  r9_kaigan_kita --- r9_kaigan_machi
  r9_kaigan_kita --- r9_kita_misaki
  r9_kaigan_kita --- r9_umi_hiroba
  r9_kaigan_machi --- r9_umi_hiroba
  r9_kaigan_minami --- r9_minami_nyukou
  r9_kaigan_minami --- r9_umi_hiroba
  r9_kita_hokora --- r9_kita_misaki
  r9_kita_misaki --- r9_sango_miya_mae
  r9_minami_nyukou --- r9_sango_miya
  r9_okiseto --- r9_shinkai_iri
  r9_okiseto --- r9_umi_hiroba
  r9_sango_michi --- r9_umi_hiroba
  r9_sango_miya --- r9_sango_miya_mae
  r9_sango_miya --- r9_sango_miya_oku
  r9_sango_miya --- r9_yakou_dou
  r9_shinkai_boss --- r9_shinkai_meiro
  r9_shinkai_iri --- r9_yakou_dou
  r9_shinkai_meiro --- r9_yakou_dou
  r8_rakuen_daichi("楽園の台地<br/>[R8]") ==>|"R8→"| r9_umi_hiroba
  r8_shirasuna("白砂の浜<br/>[R8]") ==>|"R8→"| r9_sango_michi
  r8_torii_mae("鳥居前の浜<br/>[R8]") ==>|"R8→"| r9_sango_miya_mae
  r9_minatsu_no_shima ==>|"→R8"| r8_tobiraza_mura("渡場の村<br/>[R8]")
  r9_minatsu_no_shima ==>|"→R8"| r8_torii_mae("鳥居前の浜<br/>[R8]")
  r9_sango_michi ==>|"→R8"| r8_shirasuna("白砂の浜<br/>[R8]")
  r9_sango_miya_mae ==>|"→R8"| r8_torii_mae("鳥居前の浜<br/>[R8]")
```

### R10 — 高天原（＋架け橋/森/星空）（Lv52〜62 / 42枚）

- 解放条件: 飛空艇（高天原への昇陟）
- 内訳: 野外16 / 町8 / D10 / 祠8

```mermaid
flowchart LR
  r10_unkai["雲海の入口<br/>[野外]"]
  r10_unkai_hashi["雲海の橋渡り<br/>[野外]"]
  r10_kumogaki["雲垣の原<br/>[野外]"]
  r10_ameno_tobira["天の扉前<br/>[野外]"]
  r10_tensho_michi["天昇の道<br/>[野外]"]
  r10_kinseki_daichi["金石の大地<br/>[野外]"]
  r10_shirohane_no_mori["白羽の森<br/>[野外]"]
  r10_raikumo_mine["雷雲の峰<br/>[野外]"]
  r10_shirogane_heiya["白銀の平野<br/>[野外]"]
  r10_ameno_fune_ko["天の鳥船乗場<br/>[野外]"]
  r10_kinteki_hogai["金的の峯外<br/>[野外]"]
  r10_reikon_no_hara["霊魂の原<br/>[野外]"]
  r10_takama_kyo["高天ノ京（外縁）<br/>[町]"]
  r10_takama_kyo_ichi["高天ノ京（市）<br/>[町]"]
  r10_takama_kyo_yakata["高天ノ京（館）<br/>[町]"]
  r10_takama_kyo_kojin["高天ノ京（鋳師の工房）<br/>[町]"]
  r10_takama_kyo_mon["高天ノ京（大門）<br/>[町]"]
  r10_ameno_iwakura_mae["天之磐座（前庭）<br/>[町]"]
  r10_d_takama_kyo_01["高天ノ京 中枢 第1層<br/>[D]"]
  r10_d_takama_kyo_02["高天ノ京 中枢 第2層<br/>[D]"]
  r10_d_takama_kyo_03["高天ノ京 中枢 第3層（ボス）<br/>[D]"]
  r10_d_takama_kyo_04["高天ノ京 中枢 第4層<br/>[D]"]
  r10_d_takama_kyo_05["高天ノ京 中枢 第5層（中ボス）<br/>[D]"]
  r10_d_ame_no_iwakura_01["天之磐座 第1層<br/>[D]"]
  r10_d_ame_no_iwakura_02["天之磐座 第2層<br/>[D]"]
  r10_d_ame_no_iwakura_03["天之磐座 第3層<br/>[D]"]
  r10_d_ame_no_iwakura_04["天之磐座 第4層<br/>[D]"]
  r10_d_ame_no_iwakura_final["天之磐座 最終層（ラスボス）<br/>[D]"]
  r10_hokora_unkai["雲海の祠<br/>[祠]"]
  r10_hokora_tensho["天昇の祠<br/>[祠]"]
  r10_hokora_shirohane["白羽の祠<br/>[祠]"]
  r10_hokora_final["最終の祠（周回接続）<br/>[祠]"]
  r10_yakumo_ukihashi["八雲の架け橋<br/>[野外]"]
  r10_yakumo_shima["架け橋の浮島市<br/>[町]"]
  r10_gensou_mori["幻想の森<br/>[野外]"]
  r10_gensou_oku["幻想の森の奥<br/>[野外]"]
  r10_tokoyami_hara["常闇の原<br/>[野外]"]
  r10_hoshimi_dai["星見台の里<br/>[町]"]
  r10_yakumo_hokora["架け橋の祠<br/>[祠]"]
  r10_gensou_hokora["幻想の森の隠し祠<br/>[祠]"]
  r10_hoshi_hokora["星空の隠し祠<br/>[祠]"]
  r10_tokoyami_hokora["常闇の祠<br/>[祠]"]
  r10_ameno_fune_ko --- r10_kinteki_hogai
  r10_ameno_fune_ko --- r10_shirogane_heiya
  r10_ameno_iwakura_mae --- r10_d_ame_no_iwakura_01
  r10_ameno_iwakura_mae --- r10_d_takama_kyo_05
  r10_ameno_iwakura_mae --- r10_takama_kyo_mon
  r10_ameno_tobira --- r10_kumogaki
  r10_ameno_tobira --- r10_takama_kyo_mon
  r10_ameno_tobira --- r10_tensho_michi
  r10_d_ame_no_iwakura_01 --- r10_d_ame_no_iwakura_02
  r10_d_ame_no_iwakura_02 --- r10_d_ame_no_iwakura_03
  r10_d_ame_no_iwakura_03 --- r10_d_ame_no_iwakura_04
  r10_d_ame_no_iwakura_04 --- r10_d_ame_no_iwakura_final
  r10_d_ame_no_iwakura_final --- r10_hokora_final
  r10_d_takama_kyo_01 --- r10_d_takama_kyo_02
  r10_d_takama_kyo_01 --- r10_takama_kyo_mon
  r10_d_takama_kyo_02 --- r10_d_takama_kyo_03
  r10_d_takama_kyo_03 --- r10_d_takama_kyo_04
  r10_d_takama_kyo_04 --- r10_d_takama_kyo_05
  r10_gensou_hokora --- r10_gensou_mori
  r10_gensou_mori --- r10_gensou_oku
  r10_gensou_mori --- r10_shirohane_no_mori
  r10_hokora_shirohane --- r10_shirohane_no_mori
  r10_hokora_tensho --- r10_tensho_michi
  r10_hokora_unkai --- r10_unkai_hashi
  r10_hoshi_hokora --- r10_tokoyami_hara
  r10_hoshimi_dai --- r10_tokoyami_hara
  r10_kinseki_daichi --- r10_shirohane_no_mori
  r10_kinseki_daichi --- r10_tensho_michi
  r10_kinteki_hogai --- r10_reikon_no_hara
  r10_kinteki_hogai --- r10_takama_kyo_mon
  r10_kumogaki --- r10_unkai_hashi
  r10_raikumo_mine --- r10_shirogane_heiya
  r10_raikumo_mine --- r10_shirohane_no_mori
  r10_reikon_no_hara --- r10_takama_kyo
  r10_shirogane_heiya --- r10_takama_kyo
  r10_shirogane_heiya --- r10_tokoyami_hara
  r10_takama_kyo --- r10_takama_kyo_ichi
  r10_takama_kyo --- r10_takama_kyo_mon
  r10_takama_kyo_ichi --- r10_takama_kyo_yakata
  r10_takama_kyo_kojin --- r10_takama_kyo_mon
  r10_takama_kyo_kojin --- r10_takama_kyo_yakata
  r10_tokoyami_hara --- r10_tokoyami_hokora
  r10_unkai --- r10_unkai_hashi
  r10_unkai_hashi --- r10_yakumo_ukihashi
  r10_yakumo_hokora --- r10_yakumo_ukihashi
  r10_yakumo_shima --- r10_yakumo_ukihashi
  link_final_renketu_2("最終ダンジョン連結・天之磐座前<br/>[LINK]") ==>|"LINK→"| r10_d_ame_no_iwakura_final
  link_hikuotei_hatchakujo("飛空艇の発着場<br/>[LINK]") ==>|"LINK→"| r10_unkai
  link_ura_iriguchi("周回/裏入口<br/>[LINK]") ==>|"LINK→"| r10_d_ame_no_iwakura_final
  r10_hokora_final ==>|"→R1"| kiritate("霧立の里<br/>[R1]")
  r10_unkai ==>|"→LINK"| link_hikuotei_hatchakujo("飛空艇の発着場<br/>[LINK]")
```

---

## §4 多対多接続ハブ一覧（接続次数 ≥4）

1 マップから多方向へ分岐する分岐点。導線設計の要所。

| map_id | 名前 | 地域 | 接続次数 |
|--------|------|------|----------|
| `r3_ichi` | 宮乃京 市 | R3 | 9 |
| `r5_setchu_mura` | 雪中の村 | R5 | 9 |
| `r3_kominato` | 河港町 | R3 | 6 |
| `r6_yami_tobira` | 闇の扉 | R6 | 6 |
| `r8_shirasuna` | 白砂の浜 | R8 | 6 |
| `r8_torii_mae` | 鳥居前の浜 | R8 | 6 |
| `r9_umi_hiroba` | 海の広場 | R9 | 6 |
| `r10_takama_kyo_mon` | 高天ノ京（大門） | R10 | 6 |
| `tama_musubi_sato` | 玉結びの里 本村 | R1 | 5 |
| `satoyama` | 始まりの里山郷 | R1 | 5 |
| `r3_kaido_nishi` | 西街道 | R3 | 5 |
| `r7_yunokigou` | 湯ノ鬼郷 | R7 | 5 |
| `r5_fubuki_no` | 吹雪野 | R5 | 5 |
| `r5_sugi_no_iarou` | 杉の隘路 | R5 | 5 |
| `chinju_yashiro` | 鎮守の社 | R1 | 4 |
| `hotaru_ogawa` | 蛍の小川 | R1 | 4 |
| `kiritate` | 霧立の里 | R1 | 4 |
| `chinju_sando` | 鎮守の参道 | R1 | 4 |
| `r2_futago_jima` | 双子島 | R2 | 4 |
| `r2_amijima` | 網島 | R2 | 4 |
| `r2_minato` | 湊の町 | R2 | 4 |
| `r2_seto_ooumi` | 瀬戸大海 | R2 | 4 |
| `r2_nango_se` | 南護瀬 | R2 | 4 |
| `r2_shio_kaze_michi` | 潮風の道 | R2 | 4 |
| `r2_kita_no_shima` | 北の島 | R2 | 4 |
| `r2_ura_umi` | 裏海路 | R2 | 4 |
| `r2_shio_no_yashiro_mae` | 潮の社前浜 | R2 | 4 |
| `r3_kaido_higashi` | 東街道 | R3 | 4 |
| `r4_kanko_michi` | 観行の道 | R4 | 4 |
| `r4_reiho_dake` | 霊峰の岳麓 | R4 | 4 |
| `r4_kitakaidou_n` | 北街道の北端 | R4 | 4 |
| `r7_hi_no_michi` | 火の道 | R7 | 4 |
| `r7_tatara_machi` | 鍛冶の街 たたら | R7 | 4 |
| `r5_sugi_hara` | 杉原 | R5 | 4 |
| `r5_reika_kougen` | 冷霞の高原 | R5 | 4 |
| `r5_kori_no_hama` | 氷の浜 | R5 | 4 |
| `r6_ooksugi_kanata` | 大杉の彼方 | R6 | 4 |
| `r6_kurosugi_iriguchi` | 黒洲・入口 | R6 | 4 |
| `r8_rakuen_daichi` | 楽園の台地 | R8 | 4 |
| `r8_shirohana_no` | 白花野 | R8 | 4 |
| `r9_sango_miya` | 珊瑚の宮（前殿） | R9 | 4 |
| `r9_sango_miya_mae` | 珊瑚の宮前広場 | R9 | 4 |
| `r10_tokoyami_hara` | 常闇の原 | R10 | 4 |
| `r10_shirogane_heiya` | 白銀の平野 | R10 | 4 |
| `r10_shirohane_no_mori` | 白羽の森 | R10 | 4 |
| `r10_d_ame_no_iwakura_final` | 天之磐座 最終層（ラスボス） | R10 | 4 |
| `r10_unkai_hashi` | 雲海の橋渡り | R10 | 4 |
| `r10_takama_kyo` | 高天ノ京（外縁） | R10 | 4 |
| `link_hikuotei_hatchakujo` | 飛空艇の発着場 | LINK | 4 |
| `link_toge_no_seki` | 峠の関 | LINK | 4 |

---

## §5 カバレッジ整合

- **ノード網羅**: §3 に地域マップ 287 枚、§2 に連絡 16 枚 = 計 303 枚を掲載（maps.json 総数 303 と一致）。
- **地域内隣接エッジ**: 330 本（無向・重複排除済）。
- **地域間エッジ**: 38 本（有向）。

---

## §6 warp 解決台帳（宙吊り0・全エッジ整合）

かつて旧地域ラベル・散文終端で残っていた warp トークンは **全て実 map_id へ解決済み**。
`verify_expansion_consistency.py` 項目8（warpターゲット整合）が、全 warp トークンが「実 map_id」へ解決すること（無warp標識 `—` を除く・地域ラベル等の例外 allowlist は廃止）＝**宙吊り0・全エッジが実ノード** を機械保証する（CI オラクル）。

### §6.1 物語終端・旧ラベルの解決結果（代表）

| 旧トークン | 解決先 map_id | 区分 |
|------------|----------------|------|
| 天之磐座(ラストボス) / 天之磐座(裏ルート) | `r10_d_ame_no_iwakura_final` | ラスボス層へ集約 |
| 周回スタート地点 / クリア後ニューゲーム+ 専用入口 | `kiritate` | 周回(NG+)は物語開始地 霧立の里へ |
| R3宮乃京・大橋門（河港着） | `r3_kominato` / `r3_ohashi` | 河港町・大橋のたもと |
| R4雪原の辺境（峠の関→R4） | `r4_suso_ichi` / `r4_kitakaidou_n` | 霊峰の裾野 入界点 |
| R5深森の隠れ里（→R5/R6隘路） | `r5_shirogane_michi` / `r5_sugi_no_iarou` | 北雪郷 入界点・杉の隘路 |
| R8天上の浮島（常世航路/飛空艇） | `r8_shirasuna` / `r10_unkai` | 常世の白砂・雲海の入口 |

> 未解決の散文終端トークン: **0 件**（全て実 map_id へ解決済み）。

### §6.2 地域ゲートウェイ（道標）の結線状況

**地域ラベル道標は全廃済み（0 件）**。かつて宮乃京(R3)の東/南/北街道・雲海入口に残っていた 非map_id道標（`R2北出口` / `R5南出口` / `R6北山出口` / `R8最終出口`）は、いずれも逆方向 warp が既存の実 map_id へ双方向結線した（`r3_kaido_higashi`→`r3_satoyama_higashi` / `r3_kaido_minami`→`r3_suiro_ura` / `r3_kaido_kita`→`r3_matsubara` / `r10_unkai`→`link_hikuotei_hatchakujo`）。これにより本遷移図の全エッジが実マップノードへ解決し、verify 項目8 の allowlist 例外は廃止された。

---

## §7 ラストダンジョン（最終盤）接続メモ

`SCENARIO_SYNOPSIS.md` 付録C の最終盤候補3案を受け、現データ上の最終連結は次の通り（確定はユーザー承認後）。

- 現状: `R10 高天原` → `link_amanoukhihashi`（天之浮橋）→ `link_final_renketu_1`（第一廊下）→ `link_final_renketu_2`（天之磐座前）→ **`r10_d_ame_no_iwakura_final`（天之磐座 最終層・ラスボス boss_16 玉の主神）**。
- 「高天原の先のもう一つのラストダンジョン」は、この最終連結（link_final_renketu_1/2）を独立地域として基本設計化する案が最有力。
- クリア後: `link_ura_iriguchi`（周回/裏入口）→ `r10_d_ame_no_iwakura_final`（裏ルート）／周回開始は `kiritate`（物語開始地）へ。
