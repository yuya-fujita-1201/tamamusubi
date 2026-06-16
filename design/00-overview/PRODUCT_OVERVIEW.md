# PRODUCT_OVERVIEW.md — 製品版 全体構想（設計工程の視点で再構成）

> 版: v1.0（数量スナップショットを 2026-06-15 に **v1.1＝16エリア拡張** へ同期）/ 最終更新: 2026-06-15 / 状態: 第一版完＋v1.1数量反映
> 出典（正典）: [`../../PLAN.md`](../../PLAN.md)（企画書）・[`../../Story.md`](../../Story.md)（シナリオ）・[`../../Systems.md`](../../Systems.md)（システム仕様 v2）
> 本書の位置づけ: 上記 PLAN を **「設計書体系 `design/` の最上位ナビ」** として工程視点で再構成したもの。企画判断そのものは PLAN が正典。矛盾が出たら PLAN を優先し [REVISION_LOG §6](../REVISION_LOG.md) に注記する。

---

## 0. この文書の役割（PLAN との違い）

| | PLAN.md（企画書） | 本書 PRODUCT_OVERVIEW.md（全体構想） |
|---|---|---|
| 問い | 「**何を・なぜ**作るか」 | 「製品版の全要素を **どう設計工程に展開するか**」 |
| 読者 | 企画意思決定・対外説明 | 設計者（一覧→基本→詳細を起こす人＝サブエージェント含む） |
| 内容 | コンセプト・市場・確定判断・リスク | 設計対象の全景と、各要素が `design/` のどこに落ちるかの地図 |
| 更新 | 企画変更時（要ユーザー再確認） | 設計の網羅が進むたび（版管理は REVISION_LOG） |

→ **「製品版を一望して、次にどの設計書を書けばよいか分かる」** ことが本書のゴール。詳細数量は [SCOPE_AND_SCALE](./SCOPE_AND_SCALE.md)、要素索引は各 [10-lists](../10-lists/) が所有し、本書は重複させず参照に徹する。

---

## 1. 製品版のコンセプト（設計が必ず守る核）

**「見えていた場所に、いつか本当に辿り着く」明るい和風探索アクションRPG。**（PLAN §1）

- **核となる感情**: 「飛空艇で全世界を飛べた頃」の喪失感を取り戻す。世界の広さは物量ではなく **“移動の連続性”** から生む（PLAN §1）。
- **内部ショートハンド**: 聖剣伝説 × オープンワールド × テラリア。ただし対外文言では「オープンワールド」「完全シームレス」を使わない（期待値事故防止）。
- **規模感の指針**: 聖剣伝説2/3級（v1.1: マップ約300・武器80・アイテム約115）。根拠は [MANA_SCALE_RESEARCH](./MANA_SCALE_RESEARCH.md)、確定数量は [SCOPE_AND_SCALE §0](./SCOPE_AND_SCALE.md)。

### 1.1 設計の不変原則（全設計書が従う 8 つの確定判断 ＝ PLAN §2 の工程化）

下記はユーザー合意の確定判断。**個別設計でこれに反する案は採用しない**（変更には再確認が必要）。

1. 骨格 = 聖剣系シームレスアクション戦闘 × 自由探索 × 語られない世界の秘密（テラリア式環境語り）。ストーリーは薄め。
2. 世界 = 擬似日本列島（架空名「八洲」）。「全世界」を謳わない正直なスコープ。
3. 三層構造 = 地上（列島）／ 海原（常世の浜）／ 天空（高天原）。**別ワールドではなく1つの連続世界の層**。
4. 移動の連続性 = FF6/FF9方式。マップ選択ジャンプ禁止。ファストトラベルは初回連続移動後のQoLのみ。
5. 和の置き方 = コスモロジー基底（八百万・鳥居・祓い・依代）。トーンは明るい。
6. 探索 = 攻略順自由・地域レベル帯・強敵地帯スニークでレア先取り（FF11式）。
7. 収集 = 勾玉系アクセサリー厳選（武器は少数固定でグラフィック負荷回避）。
8. 景色は明るめ・開放感最優先（空中都市と明るい砂浜は必ず見せ場）。

> 用語の正典は [GLOSSARY](../GLOSSARY.md)。時代観（無時代の神話日本・除外/採用リスト）は PLAN §2-9 を参照。

---

## 2. 製品の四本柱（差別化の核 ＝ 設計の評価軸）

各設計書は「この4本柱に貢献しているか」で自己点検する。

| 柱 | 中身 | 主に担う設計書 |
|---|---|---|
| **A. 移動の連続性** | 徒歩→船→外洋船→飛空艇で「見えていた場所」が開く。着域演出（BGM・パレット・敵グラの三点同時切替を30秒以内に体感） | [PROGRESSION_DESIGN](../20-basic/systems/PROGRESSION_DESIGN.md)・各地域基本設計 |
| **B. FF11式スニーク探索** | 強敵地帯を視界（sightR）外で縫ってレア勾玉を先取り。手がかり（目/角/霊気の色・予備動作・安全地帯地形・複数ルート） | [COMBAT_DESIGN](../20-basic/systems/COMBAT_DESIGN.md)・各地域導線（基本設計 §4） |
| **C. 祓いと勾玉ビルド** | 攻撃で穢れが剥がれ祓いゲージ蓄積→解放で全画面浄化。装備勾玉で祓い波の性質が変わる（炎化/回復/加速…） | [COMBAT_DESIGN](../20-basic/systems/COMBAT_DESIGN.md)・[EQUIP_SYSTEM_DESIGN](../20-basic/systems/EQUIP_SYSTEM_DESIGN.md) |
| **D. 明るい和風列島** | 地面輝度 L≥55% 原則（黒杉のみ例外）。地域ごと主調色を変え、着域でパレット一変＝「旅した感」 | 各地域基本設計（色彩）・[REGION_LIST §1.2](../10-lists/REGION_LIST.md) |

---

## 3. 世界の全体像（三層 × 10地域）— 設計対象の全景

製品版の舞台は三層・10地域。**リージョンID＝走破順（推奨Lv昇順）**でクリーンに並ぶ（R1→R10 が単調増加）。現世の **R7 火群と白磐の地** と海原の **R9 綿津見の大海** は拡張で加わった地域で、常世（R8）を無戦闘の聖域として独立させた経緯を持つ。**詳細メタ（Lv帯・色彩・解放・マップ配分）の正典は [REGION_LIST](../10-lists/REGION_LIST.md)**。本書は層構造の俯瞰のみ示す。

```
【天空層】 R10 高天原（白金の空中都市群・最終領域） ……飛空艇で雲海を突破
       ▲
【海原層】 R8 常世の浜（白砂×ターコイズ・最も明るい楽園） → R9 綿津見の大海（外洋・海神の領域） ……外洋船で水平線をくぐる
       ▲
【地上層】 R1 始まりの里山郷 → R2 瑠璃の多島海 → R3 宮乃京【中央ハブ】
           → R4 霊峰の裾野 → R5 北雪郷 → R6 黒洲（唯一の暗ゾーン）
           → R7 火群と白磐の地（火の道・たたら鍛冶街）
                                   ……徒歩→船で水平に拡大
```

| 層 | 地域 | 役割 | 設計書 |
|---|---|---|---|
| 地上 | R1〜R7（7地域） | 列島の水平展開。R3 宮乃京が中央ハブ（店/鍛冶/情報/各地への街道）。終盤の R7 火群と白磐の地＝武器強化拠点（たたら鍛冶街） | [20-basic/regions/R1〜R7](../20-basic/regions/) |
| 海原 | R8 常世の浜・R9 綿津見の大海 | 第二層。R8＝浄化の極北（最も明るい無戦闘の聖域）／R9＝海神の試練（飛空艇の鍵） | [R8_tokoyo.md](../20-basic/regions/R8_tokoyo.md)・[R9_wadatsumi.md](../20-basic/regions/R9_wadatsumi.md) |
| 天空 | R10 高天原 | 第三層・最終領域。最終ダンジョン「天之磐座」 | [R10_takamagahara.md](../20-basic/regions/R10_takamagahara.md) |

- **進行の背骨**（メイン基準線）と移動解放の連鎖は [REGION_LIST §6](../10-lists/REGION_LIST.md) が図示。Lv帯は R1:1-8 → R10:52-62 の段階上昇（開始Lvは R1〜R10 で厳密に非減少）。
- **層をまたぐ演出**（地上→常世＝水平線の光柱／地上→高天原＝雲海突入）が体験の頂点。着域演出として各地域基本設計と PROGRESSION で詳細化する。

---

## 4. システムの全体像（7 システム → 20-basic/systems への地図）

PLAN §5〜6 と Systems.md を、基本設計 7 本に展開する。**詳細は各文書が所有**し、本書は対応関係のみ示す。

| システム基本設計 | 範囲（PLAN/Systems 由来） | 主な一覧 |
|---|---|---|
| [COMBAT_DESIGN](../20-basic/systems/COMBAT_DESIGN.md) | フレームデータ戦闘・祓い波・武器8系統の戦闘ニッチ・敵の行動/スニーク・ボス2フェーズ | [WEAPON_LIST](../10-lists/WEAPON_LIST.md)・[ENEMY_LIST](../10-lists/ENEMY_LIST.md)・[BOSS_LIST](../10-lists/BOSS_LIST.md)・[SKILL_LIST](../10-lists/SKILL_LIST.md) |
| [GROWTH_DESIGN](../20-basic/systems/GROWTH_DESIGN.md) | レベル/経験・武器強化10段階（銭＋地域特産）・依代の恵み | [WEAPON_LIST](../10-lists/WEAPON_LIST.md) |
| [ITEM_SYSTEM_DESIGN](../20-basic/systems/ITEM_SYSTEM_DESIGN.md) | 回復/お清め/復活/バフ/探索照明/収集/特産/クラフト/キー（区分計約115） | [ITEM_LIST](../10-lists/ITEM_LIST.md) |
| [EQUIP_SYSTEM_DESIGN](../20-basic/systems/EQUIP_SYSTEM_DESIGN.md) | 武器1＋勾玉2〜3枠＋衣1枠。勾玉の特性スロット式（FF11式厳選）・祓い波変化 | [ACCESSORY_LIST](../10-lists/ACCESSORY_LIST.md) |
| [EVENT_SYSTEM_DESIGN](../20-basic/systems/EVENT_SYSTEM_DESIGN.md) | フラグ/トリガー/環境語り（メイン/サブ/環境の三種） | [EVENT_LIST](../10-lists/EVENT_LIST.md)・[NPC_LIST](../10-lists/NPC_LIST.md) |
| [PROGRESSION_DESIGN](../20-basic/systems/PROGRESSION_DESIGN.md) | 攻略順・Lv帯カーブ・移動解放ゲート（徒歩→船→外洋船→飛空艇） | [REGION_LIST](../10-lists/REGION_LIST.md)・[MAP_LIST](../10-lists/MAP_LIST.md) |
| [SCENARIO_DESIGN](../20-basic/systems/SCENARIO_DESIGN.md) | Story.md を 幕→地域→イベント に構造化。タイトル二層（玉結び＝魂結び） | [EVENT_LIST](../10-lists/EVENT_LIST.md)・[NPC_LIST](../10-lists/NPC_LIST.md) |

> 武器・装備・アイテムの仕様根拠は [Systems.md](../../Systems.md)（§1 武器8種・§3 衣・勾玉・§5 アイテム方針・§6 強化・§7 武器/スキル分担）。

---

## 5. 規模の全体像（数量目標サマリ）

確定数量の正典は [SCOPE_AND_SCALE §0](./SCOPE_AND_SCALE.md)。本書は俯瞰のみ（**乖離が出たら SCOPE を更新**）。

| 要素 | 目標 | 確定/概算 |
|---|---|---|
| 地域 | **10**（v1.1: R7 追加／v1.2: R9 綿津見の大海 追加） | 確定（ユーザー合意） |
| マップ（画面） | **約300**（帯200〜300・上限目安310） | 確定（10地域＋連絡16＝303） |
| 武器 | **80**（8系統×10段階） | 確定 |
| アイテム | **約115** | 確定 |
| 勾玉/衣 | 約47 / 約10 | 概算（±20%可） |
| 敵/ボス | 約75 / 約19 | 概算 |
| NPC/イベント/スキル | 約88 / 約165 / 約24 | 概算 |

> 太字4要素はユーザー合意の確定目標。内訳・検算・歯止め（武器は8系統固定で深さ10段階・1地域=1スプリント・照明や鍵を進行ゲートにしない）は [SCOPE_AND_SCALE §1〜4](./SCOPE_AND_SCALE.md)。

---

## 6. 製品版ロードマップと設計書体系の対応

PLAN §9 のリリースフェーズと、本設計書体系（design/）の対応。**体験版は製品版のスライス**であり、二重管理しない（実装状況は [MAP_LIST](../10-lists/MAP_LIST.md) の `状態` 列で吸収）。

| フェーズ（PLAN §9） | 内容 | 製品版設計での位置づけ | この設計書体系での扱い |
|---|---|---|---|
| Phase 0 | 技術検証スプリント | 飛行カメラ/parallax/祓い波 等の白黒 | 設計の前提（実装側 HANDOFF が管理） |
| Phase 1A | 最小縦切り（15-20分） | R1 のごく一部 | MAP_LIST `体験版`・R1 詳細設計の一部 |
| Phase 1B | 公開体験版（30-45分） | R1 の主要動線（里→里山→根の洞→ボス→断崖） | MAP_LIST `体験版`・[30-detail/maps/satoyama](../30-detail/maps/satoyama/) |
| Phase 2 | 地上層の残り地域 | R2〜R7（1地域=1スプリント4週） | 各地域基本設計＋詳細設計（30-detail/maps 全地域 §0〜§10 完備済） |
| Phase 3 | 船＋R2＋R8＋R9＋軽量クラフト＋ランダム勾玉層 | 海原層の開放 | R2/R8/R9 基本設計・ITEM/ACCESSORY 拡張 |
| Phase 4 | 飛空艇＋R10＋最終ダンジョン＋ED | 天空層・完結 | R10 基本設計・SCENARIO 終盤 |

- 想定ボリューム: メイン8〜12時間／探索コンプ15〜20時間。価格帯 ¥1,500〜2,500（PLAN §9）。
- **設計範囲**: 全10地域（v1.2）の一覧＋基本設計を網羅し、マップ詳細設計は **全10地域＋連絡路＝303/303 マップを §0〜§10（map_goal/heightmap/DoD5本柱）完備**（武器8系統＋序盤イベント詳細も整備済）。残課題＝残イベント単体詳細・数値ID採番は [REVISION_LOG §7 次版TODO](../REVISION_LOG.md)。詳細は [SCOPE_AND_SCALE §5](./SCOPE_AND_SCALE.md)。

---

## 7. 実装現状との接続（設計が実装をどこまで先行するか）

| レイヤ | 実装現状（PLAN ステータス／src） | 設計書体系での扱い |
|---|---|---|
| エンジン | Phase 0 完了＋Phase 1A 前半（戦闘コア・ミト4シート・祓い波・里山ほか5マップ・ボス岩鬼の王） | 既成事実として前提化。詳細設計は実装に追従できる粒度で書く |
| マップ実装 | `src/data/maps`（satoyama/kiritate/morioku/takadai/tanada） | MAP_LIST で `実装済` 表記。R1 詳細設計はこの5枚を包含 |
| 武器実装 | `src/data/weapons.ts`（sword/hammer/mirror 実装・残5枠は仕様） | WEAPON_LIST の「実装キー」列で設計ID（W1〜W8）と対応づけ |
| マップ品質 | `checker/`＋`quality/`（4本柱・DoD・tile文法） | マップ詳細設計は map_goal/heightmap 入力節で直結（[MAP_DETAIL_TEMPLATE](../templates/MAP_DETAIL_TEMPLATE.md)） |

---

## 8. この文書から辿る（ナビゲーション）

| 知りたいこと | 行き先 |
|---|---|
| 数量の確定値・内訳 | [SCOPE_AND_SCALE](./SCOPE_AND_SCALE.md) |
| 規模感の根拠（聖剣2/3） | [MANA_SCALE_RESEARCH](./MANA_SCALE_RESEARCH.md) |
| 地域の全メタ・進行順（背骨） | [REGION_LIST](../10-lists/REGION_LIST.md) |
| 各要素の全件リスト | [10-lists/](../10-lists/) |
| 工程ルール・ID命名・DoD | [DESIGN_PROCESS](./DESIGN_PROCESS.md) |
| 用語の意味 | [GLOSSARY](../GLOSSARY.md) |
| 文書の完成/未着手 | [REVISION_LOG](../REVISION_LOG.md) |
| 体系全体の読み方 | [README](../README.md) |

---

## 9. 第一版の留意点（未確定・要照合）

- **MANA_SCALE_RESEARCH は手元知識ベース**（WebSearch 未許可）。聖剣2/3 の数値は一次情報での検証が次版TODO。
- **人物固有名詞は Story.md 未精読部分あり**。SCENARIO_DESIGN / EVENT_LIST 起草時に Story.md と照合する（本書では物語の中身に踏み込まない）。
- **概算数量（v1.1: 勾玉47/敵75/イベント165 等）は一覧作成時に±20%調整可**。調整時は SCOPE を更新し REVISION_LOG に記録。
- **タイトル商標**（J-PlatPat 9類/41類）の正式確認はストア公開前 TODO（PLAN §12）。本設計書では英語表記 TAMAMUSUBI を仮で用いる。
