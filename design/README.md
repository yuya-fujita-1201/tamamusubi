# design/ — 玉結び（TAMAMUSUBI）製品版 設計書体系 インデックス

> 体験版（Phase 1A/1B）と**並行して進める製品版（聖剣伝説2/3級＝v1.1: マップ約300・武器80・アイテム約115）の設計工程**を、
> SI開発式の3層（一覧 → 基本設計 → 詳細設計）で網羅する作業フォルダ。
> このディレクトリは「企画文書（正典）」の**工程展開**であり、企画判断そのものではない。

> **ステータス（2026-06-16 / 第二版 完了）: 第一版 完了・維持中＋第二版（全地域詳細化）完遂**。plan §7 Verification 全7項は turn-022 で PASS、その後の独立 critic レビューで判明した残存不整合（F1〜F5・C1〜C4）も全て解消。**第二版で 30-detail/ を全面拡張**＝マップ詳細 **全10地域 303 枚**（satoyama28/tatoukai35/miyanokyo32/reihou30/hokusetsu30/kurosugi[R6黒洲]26/homura[R7]28/tokoyo[R8]19/wadatsumi[R9]17/takamagahara[R10]42＋地域間 link16）、キャラクター詳細 **C1〜C7（7本）**、エネミー詳細 **雑魚72＋ボス19（91本）** を新規完備（常世 R8＝無戦闘ゆえ敵0は設計どおり）。リージョンID再採番（R6黒洲→R10高天原）に加え、**turn-054 で map_id 接頭辞も region 番号へ再採番＝接頭辞 `r{n}_` == region `R{n}`**（homura=`r7_`／tokoyo=`r8_`／wadatsumi=`r9_`／takamagahara=`r10_`・[REGION_RENUMBER_MAP §9](./00-overview/REGION_RENUMBER_MAP.md)）。**現役の未解決判定は [REVISION_LOG §0 現役ステータス](./REVISION_LOG.md) と [§7 次版TODO](./REVISION_LOG.md) のみを参照すること**（過去の経緯は §9 以降の changelog として保全しており、本文 grep で未解決と誤読しない）。検証は `build_data_json.py`（All counts match）＋`verify_expansion_consistency.py`（**全13項目PASS**・項目11 接頭辞==region／項目12 ENEMY・BOSS lv_range⊆band／項目13 30-detail相対mdリンク整合 含む）で機械実証済（turn-065 時点・exit0）。
> turn-023〜024: warp宙吊り参照9件→0／data JSON・system設計書の陳腐化注記是正／templates リンク切れ15→0／satoyama 詳細28ファイルの仮ev・保留宣言を一掃し EVENT_LIST 正ev_###へ接続。
> turn-026: map_id 大文字18件（階層サフィックス）を全小文字へ正規化（maps.json と完全一致・大文字残0を実証）。turn-028: §0 現役ステータスバナーを新設し changelog 誤検出ループを構造的に遮断。
> turn-029: W6_shikifu 詳細の偽マップID `kurosugi_fugou_sato` を MAP_LIST 正規ID `r6_kakurega_sato` へ是正（C4）。
> turn-030（次版起点）: R2 瑠璃の多島海（tatoukai）全マップの詳細設計を新規作成。以降、第二版で **R1〜R10 全10地域 303 マップの詳細設計を完遂**（§0〜§10完備・発明ID0/偽マップID0）、さらに **30-detail/characters/（C1〜C7）と 30-detail/enemies/（雑魚72＋ボス19）を新設**して詳細層を全要素へ拡張した。
> **REVISION_LOG への第二版詳細群の台帳登録は turn-050 で完了**（§4 詳細設計に 30-detail/maps 303・characters C1〜C7・enemies 雑魚72＋ボス19＝91 を登録／§5 テンプレートに CHARACTER・ENEMY DETAIL_TEMPLATE を登録）。**最終整合検証も turn-053／turn-056〜065 で機械実証済**（`build_data_json.py`「All counts match」exit0＋`verify_expansion_consistency.py` **全13項目PASS** exit0。検証項目は turn-063 で項目12〔ENEMY・BOSS lv_range⊆band〕・turn-065 で項目13〔30-detail相対mdリンク整合〕を追加し全11→全13へ拡充）。**非ブロッキングの次版TODO**（残イベント詳細・MANA一次情報・flg_101〜104・一覧側フレーバー名一本化）のみ残存＝[REVISION_LOG §7](./REVISION_LOG.md) 参照。

---

## 0. 上位文書（正典）との関係

`design/` は下記の上位企画文書を **出典（正典, source of truth）** として参照・具体化する工程ドキュメントである。
矛盾が生じた場合は**上位文書を優先**し、`design/` 側で拡張・解釈した点は [REVISION_LOG.md](./REVISION_LOG.md) に必ず注記する。

| 上位文書 | 役割 | design/ 側の対応層 |
|---|---|---|
| [`../PLAN.md`](../PLAN.md) | 企画書（コンセプト・確定設計判断・世界設定・ロードマップ） | 00-overview / 20-basic 全般 |
| [`../Story.md`](../Story.md) | シナリオ正典（物語・登場人物・固有名詞） | 20-basic/systems/SCENARIO_DESIGN.md / 30-detail/events |
| [`../Systems.md`](../Systems.md) | システム仕様 v2（武器8種・衣・勾玉・アイテム方針） | 20-basic/systems / 10-lists/WEAPON・ITEM 系 |
| [`../quality/`](../quality/) | マップ品質保証システム（4本柱・DoD・tile文法） | 30-detail/maps（詳細設計はここへ接続） |

実装データ（`../src/data/`）の現状: 武器枠 `weapons.ts`（sword/hammer/mirror 実装・残5枠は仕様のみ）、
敵 `enemies.ts`、マップ `maps/`（satoyama / kiritate / morioku / takadai / tanada）。一覧の「状態」列で実装状況を吸収する。

---

## 1. 3層構造（読み方）

数字接頭辞が SI 工程の段階に対応する。**上から下へ詳細化**し、**下から上へ整合**を取る。

| 層 | ディレクトリ | 何が書いてあるか | 第一版の網羅度 |
|---|---|---|---|
| ① 一覧図 | [`10-lists/`](./10-lists/) | 全要素のマスターリスト（マップ/武器/アイテム/敵/ボス/NPC/イベント/勾玉/スキル）。Markdown表が主、全10一覧を `data/*.json` に自動ミラー（[`data/README.md`](./10-lists/data/README.md)） | **全網羅**（数量目標まで） |
| ② 基本設計 | [`20-basic/`](./20-basic/) | 地域別（R1〜R10）＝全マップの地形概要＋敵構成＋導線＋ボス＋解放。システム別（戦闘/成長/アイテム/装備/イベント/進行/シナリオ） | **全網羅**（地域10＋システム7） |
| ③ 詳細設計 | [`30-detail/`](./30-detail/) | 個別実装に落とせる粒度。マップは map-quality パイプライン（map_goal/heightmap）に直結 | **全地域網羅**（マップ全10地域303＋キャラC1〜C7＋敵72/ボス19＋武器8系統＋序盤イベント） |

第一版は「完成度」より「**網羅と骨格**」を優先する。未着手分は [REVISION_LOG.md](./REVISION_LOG.md) に「次版TODO」として残す。

---

## 2. ディレクトリ地図

```
design/
  README.md                 # 本書（体系インデックス）
  REVISION_LOG.md           # 版管理台帳：全文書の状態（第一版完/雛形/未着手）と更新履歴
  GLOSSARY.md               # 固有名詞・用語集（八洲/依代/祓い波/勾玉/常世/高天原…）

  00-overview/              # 全体構想・規模・工程ルール
    PRODUCT_OVERVIEW.md     #   製品版 全体構想（PLAN を工程視点で再構成）
    SCOPE_AND_SCALE.md      #   規模設計：数量目標の確定と内訳・根拠
    MANA_SCALE_RESEARCH.md  #   聖剣伝説2/3 規模リサーチ（武器80/エリア/アイテム数の根拠）
    DESIGN_PROCESS.md       #   工程運用ルール（一覧→基本→詳細・版管理・DoD・ID命名規則）

  10-lists/                 # ① 一覧図（マスターリスト）
    REGION_LIST.md          #   地域一覧（10エリア×Lv帯×色彩×解放手段×マップ数）= 体系の背骨
    MAP_LIST.md             #   マップ一覧（全約300行）
    WEAPON_LIST.md          #   武器一覧（8系統×10段階=80）
    ITEM_LIST.md            #   アイテム一覧（約115）
    ACCESSORY_LIST.md       #   勾玉・衣 一覧
    ENEMY_LIST.md           #   敵一覧（地域別×行動パターン）
    BOSS_LIST.md            #   ボス一覧
    NPC_LIST.md             #   NPC一覧
    EVENT_LIST.md           #   イベント一覧（メイン/サブ/環境語り）
    SKILL_LIST.md           #   祓い三流派スキル一覧
    data/                   #   機械可読ミラー（自動生成・全10一覧）: build_data_json.py が ../*.md を解析して
                            #   regions/maps/weapons/items/enemies/bosses/accessories/npcs/skills/events.json を生成（README.md 参照）

  20-basic/                 # ② 基本設計書
    regions/  R1_satoyama.md … R10_takamagahara.md R7_homura.md R9_wadatsumi.md（全10地域）
    systems/  COMBAT_DESIGN.md GROWTH_DESIGN.md ITEM_SYSTEM_DESIGN.md
              EQUIP_SYSTEM_DESIGN.md EVENT_SYSTEM_DESIGN.md
              PROGRESSION_DESIGN.md SCENARIO_DESIGN.md

  30-detail/                # ③ 詳細設計書（第二版で全要素へ拡張）
    maps/                   #   全10地域303マップを詳細設計（map_goal/heightmap 入力節つき）
                            #     satoyama/ tatoukai/ miyanokyo/ reihou/ hokusetsu/ kurosugi/[R6黒洲]
                            #     homura/[R7] tokoyo/[R8] wadatsumi/[R9] takamagahara/[R10] link/[地域間]
    characters/             #   C1_mito.md … C7_amakusarimori.md（中核キャラ7本の詳細）
    enemies/                #   enm_001…enm_072（雑魚72）＋ boss_01…boss_19（ボス19）の詳細
    weapons/                #   W1_haraitou.md … W8_shakujo.md（8系統 強化ツリー詳細）
    events/                 #   シナリオ序盤の主要イベント詳細

  templates/                # 各文書テンプレの正本（メンテ体制の核）
    MAP_DETAIL_TEMPLATE.md REGION_BASIC_TEMPLATE.md
    WEAPON_DETAIL_TEMPLATE.md EVENT_DETAIL_TEMPLATE.md LIST_TEMPLATE.md
```

---

## 3. 使い方（典型タスク別）

| やりたいこと | 見る場所 |
|---|---|
| 全体像・規模感を掴む | [`00-overview/PRODUCT_OVERVIEW.md`](./00-overview/PRODUCT_OVERVIEW.md) → [`SCOPE_AND_SCALE.md`](./00-overview/SCOPE_AND_SCALE.md) |
| 新しいマップ/武器/イベントを起こす | [`templates/`](./templates/) からコピーして起こす（命名・節構成を統一） |
| ある地域の全体像を知る | [`20-basic/regions/Rn_*.md`](./20-basic/regions/) |
| 一覧から個別IDを引く | [`10-lists/`](./10-lists/) の各リスト → IDで basic/detail を相互参照 |
| 命名規則・版管理ルールを確認 | [`00-overview/DESIGN_PROCESS.md`](./00-overview/DESIGN_PROCESS.md) |
| どの文書が完成/未着手か | [REVISION_LOG.md](./REVISION_LOG.md) |
| 用語の意味 | [GLOSSARY.md](./GLOSSARY.md) |

---

## 4. 運用の鉄則（詳細は DESIGN_PROCESS.md）

1. **一覧 → 基本 → 詳細の順**で作る。一覧に無いIDを詳細設計しない。
2. **新規文書は必ず `templates/` から起こす**（節構成・命名の統一）。
3. **一覧↔基本↔詳細はIDで相互参照**する（マップ=snake_case / 武器=`W{n}_romaji` / アイテム=`itm_###` / イベント=`ev_###` 等）。
4. **新規作成・更新したら必ず [REVISION_LOG.md](./REVISION_LOG.md) を更新**する（書いていないものは「やっていない」とみなす）。
5. **上位文書（PLAN/Story/Systems）と矛盾したら上位を優先**し、解釈・拡張点を REVISION_LOG に注記する。
6. マップ詳細設計は `quality/MAP_DEFINITION_OF_DONE.md` の合格条件と `checker/` パイプラインへ接続できる節を必ず持つ。
