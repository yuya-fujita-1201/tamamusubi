# Map Definition of Done — 玉結び(TAMAMUSUBI) 全マップ共通

> **位置づけ**: GPT Pro が定める4本柱の内、「3) 自動検査（[checker](../checker/README.md)）」と「4) AIレビュー用固定プロンプト（[MAP_REVIEW_PROMPT](./MAP_REVIEW_PROMPT.md)）」に本文書を接続する。
> 自動チェックで通らないものは人間のレビューに回さない。人間が最終的に確認するのは最後の4問だけ。

---

## 根本思想

AIは放っておくと「描き込み量」で違和感を解決しようとする（寂しい→花を増やす、など）。
必要なのは描き込みではなく **「構造が読める / 高さが読める / 歩ける場所が読める / 主役と背景の優先順位 / タイル境界が目立たない」** の5点だ。
抽象的に「もっと自然に」と言わず、**どの場所を・どの素材で・どの接続ルールで直すか**を指示する。

---

## 1. 構造

高さ定義（[tile_contract.json](../checker/tile_contract.json) の `heightLevels`）:

| レベル | 意味 | 代表タイル |
|---|---|---|
| H0 | 低地。川・谷・南の入口 | `kaRiver3`, `river`, 南の `kaGrassCalm` |
| H1 | 中段。山道スパイン・棚田・集落テラス | `kaGrassCalm`, `kaPaddy2`, `kaPath2` |
| H2 | 高所。神域の平場 | `kaShrineGround` |

- [ ] H0 / H1 / H2 の3段階が全てマップ上に存在し、`checker/heightmaps/<map>.json` に宣言されている
- [ ] 高低差のある境界すべてに段差表現（`kaIshigaki` / `kaDote` / `kaShrineWall` / 崖 / 階段）が存在する
  - 根拠: `tile_contract.json` → `grammar.heightBoundary.satisfierCategories`
- [ ] 擁壁前面行（`faceFrames: [5, 9, 10]`）の **真下のセル** に `waDropshadow` frame3 が敷かれている
  - 根拠: `tile_contract.json` → `shadow.strongFrame = 3 / wallNeedsShadowBelow = true`
- [ ] 南入口（H0）から神域（H2）まで、歩行可能な主要導線が1本以上途切れず通じている
- [ ] 階段・橋・建物入口が、導線の中で自然な接続点として機能している（孤立したランドマークになっていない）

---

## 2. 視認性

- [ ] **25%縮小（512px相当）** でも「草地 / 水路 / 棚田の段差 / 神社高台 / 森の輪郭」が読める
  - 根拠: `tile_contract.json` → `thresholds.downscalePctReadability = 25`
  - 確認物: `screenshot_25percent.png`（納品物リスト参照）
- [ ] **グレースケール変換** で「道（明） / 水面（暗・鏡面） / 擁壁影（暗） / 森（最暗）」のコントラストが保たれている
  - 確認物: `grayscale_check.png`
- [ ] プレイヤースポーン周囲1〜2タイルが `decor` タイルで埋もれていない（装飾密度 ≤10% in spawn proximity）
  - 根拠: `thresholds.decorDensityNearPlayerSpawnMax = 0.10`
- [ ] UIオーバーレイ（HP/マップアイコン想定）を重ねても、主要地形の読み取りを妨げない余白がある

---

## 3. タイル品質

- [ ] 128px グリッド境界（= 論理8タイル境界）での明度差が閾値以内
  - 根拠: `thresholds.gridSeamDeltaLumaWarn = 14.0 / gridSeamFracWarn = 0.18`
  - チェックコード: `SEAM`（`checker/lint/checks/` 内）
- [ ] 同一タイルが**3連続以上**続く箇所が残っていない（バリアント使用で緩和可）
  - 根拠: `thresholds.repetitionRun = 3 / repetitionAllowVariants = true`
  - チェックコード: `REPEAT`
  - 特に注意: `kaPaddy2`・`kaShrineGround` の長連続（既知 WARNING: tanada 水田/平場）
- [ ] 森（`kaForest2`）・川岸（`kaRiver3`）・道（`kaPath2`）・棚田畦（`kaIshigaki`）の輪郭が矩形に見えない
  - 対策: `kaEdgeOverlay`（`seam_breaker`カテゴリ）の散布と `obj.curve_overlay_2x2` / `obj.curve_overlay_3x1` の重置
- [ ] 2×1 / 2×2 / 3×1 オーバーレイを重ねた箇所でタイル境界が崩れていない（ysort・レイヤー順が正しい）

---

## 4. 地形文法

地形文法の詳細は [TILE_GRAMMAR](./TILE_GRAMMAR.md) を参照。本チェックリストは `tile_contract.json → grammar` セクションに直結する自動チェックの通過を確認する。

### 4-1 棚田の滝（WATERFALL チェック）

- [ ] `obj.spillway` の上セルが `water_surface`（`kaPaddy2`）または `retaining_wall`（`kaIshigaki`）
- [ ] `obj.spillway` の下セルが `river`（`kaRiver3`）または `water_surface` または `ground_grass`
- [ ] 滝が「上段水田 → 落ち口（石垣の切り欠き） → 滝 → 滝壺」の縦1モジュールとして成立している
  - 根拠: `grammar.waterfall` / `props.obj.spillway.requiresAbove|requiresBelow`

### 4-2 川と橋（BRIDGE チェック）

- [ ] `obj.bridge2` / `obj.bridge_shadow` の直下セルが `kaRiver3`（`river`カテゴリ）
- [ ] 橋の両端に `obj.bridge_abutment` が配置されている
- [ ] 橋の道接続（`pathConnect: true`）—— 橋の両側が `kaPath2`（`path`カテゴリ）につながっている
- [ ] 川岸の拡張1セルに `waDropshadow` frame3 が敷かれている（川が谷として低く見える）
  - チェックコード: `RIVER / BRIDGE`

### 4-3 神社高台（SHRINE チェック）

- [ ] 神域の地面が `kaShrineGround`（`shrine_ground`カテゴリ）のみ使われている
- [ ] `kaShrineGround` エリアに `kaPaddy2`（`water_surface`）・`kaRiver3`（`river`）が混入していない
  - 根拠: `grammar.forbiddenAdjacency` / `tiles.kaPaddy2.forbiddenOnGroundOf`
- [ ] 神社囲い壁が `kaShrineWall`（`retaining_wall`・`faceFrames: [5, 9, 10]`）で統一されている（`kaIshigaki` を流用しない）
- [ ] `obj.torii` → `obj.shrine_stairs` → `kaShrineGround` → `obj.hokora` の縦導線が通じている
  - 根拠: `grammar.shrine.requiredRoles / toriiNeedsWalkableBehind`
- [ ] 鳥居の奥（北側）が壁で塞がれていない（`toriiNeedsWalkableBehind = true`）
  - チェックコード: `SHRINE`

### 4-4 階段（STAIR チェック）

- [ ] 階段（`obj.shrine_stairs` / `waStairs` 等）の上下に歩行可能な踊り場がある
- [ ] 階段の左右に側壁（`retaining_wall` / `earth_bank` / `forest_wall`）または高さ境界がある
  - チェックコード: `STAIR`

### 4-5 建物（CONTACT チェック）

- [ ] `obj.watermill_channel` の足元（`footW=2 / footH=2`）が地面（`ground_grass` または `path`）に接地している
- [ ] 建物入口から `path` カテゴリのタイルが接続されている
  - チェックコード: `CONTACT`

---

## 5. ノイズ

- [ ] `kaGrassCalm`（`ground_grass`カテゴリ）のベース草が主張しすぎない——高周波ノイズ標準偏差が閾値以内
  - 根拠: `thresholds.noiseHighFreqStdWarn = 0.16`
  - チェックコード: `NOISE`
- [ ] 花・草むらなどの `decor` タイルが歩行域の30%を超えていない
  - 根拠: `thresholds.decorDensityWalkableMax = 0.30`
  - チェックコード: `DENSITY`
- [ ] 花・草むらがグリッド状（等間隔）に並んでいない（ハッシュ散布または blob 配置）
- [ ] `kaPaddy2` の水面白波フレーム（frame12〜15 のアクセント）が過密でない
- [ ] `kaForest2` の縁ぼかしが構造の読み取りを阻害していない（構造 > 装飾の優先順位）

---

## 6. 自動検査（checker）による合格条件

実行コマンド:

```bash
checker/run_check.sh <map>
checker/run_check.sh <map> public/assets/<map>_screenshot.png   # 画像チェック込み
```

出力先: `checker/out/<map>/`

| 条件 | 閾値 | 根拠（tile_contract.json） |
|---|---|---|
| 総合スコア | **80点以上** | `thresholds.doneScoreMin = 80` |
| ERROR件数 | **0件** | `thresholds.doneMaxErrors = 0` |
| 重大WARNING件数 | **3件以下** | `thresholds.doneMaxMajorWarnings = 3` |

**12チェックすべて通過**が前提（コード別の深刻度は [checker/README.md](../checker/README.md) の表を参照）:

| コード | 内容 |
|---|---|
| `HEIGHT` | 擁壁前面の真下に `waDropshadow` frame3 / 高低差境界に段差表現 |
| `STAIR` | 階段の上下に踊り場・左右に側壁 |
| `WATERFALL` | 滝の上に水源（`water_surface` 等）・下に滝壺/水路 |
| `BRIDGE` | 橋の下に `river`・両端に `obj.bridge_abutment`・橋下影・道接続 |
| `SHRINE` | 鳥居→石段→神域平場→社の導線・棚田/川タイルの流用禁止 |
| `RIVER` | 川岸の接地影（`kaRiver3` 周囲1セルに `waDropshadow`） |
| `REPEAT` | 同一タイル3連続以上なし |
| `WALK` | 到達不能な歩行域（浮き島）なし・通行不可率 30〜55%以内 |
| `CONTACT` | プロップの接地・建物の入口導線 |
| `DENSITY` | 歩行域の装飾密度 ≤30% / スポーン周囲 ≤10% |
| `SEAM` | 128pxグリッド境界の明度差 ΔLuma ≤14 / 超過率 ≤18% |
| `NOISE` | 高周波ノイズ標準偏差 ≤0.16 / 25%縮小で構造保持 |

- [ ] `checker/out/<map>/art_qa_report.md` の総合スコアが **80点以上**
- [ ] `checker/out/<map>/score.json` の ERROR件数が **0**
- [ ] `checker/out/<map>/score.json` の重大WARNING件数が **3以下**
- [ ] `error_overlay.png` に赤セルが残っていない（ERRORセルのオーバーレイ）

---

## 7. AIレビュー（MAP_REVIEW_PROMPT）

自動検査通過後、[MAP_REVIEW_PROMPT](./MAP_REVIEW_PROMPT.md) を使用した検査AIレビューを実施する。
検査AIは「描く」ではなく「検査する」役割であり、生成AIとは別人格・別プロンプトで動かす。

- [ ] MAP_REVIEW_PROMPT によるレビューで **「差し戻し」判定がない**（「合格」または「条件付き合格」）
- [ ] レビューで指摘された箇所が `checker/out/<map>/known_issues.md` または `fix_plan.md` に記録されている

---

## 8. 納品物リスト

マップを「完成」とするために必要なファイル一覧。
特に `height_map` / `walkable_overlay` / `screenshot_25percent.png` / `art_qa_report.md` の **4点が自己検査の要** であり、これら4点がない状態でのレビュー依頼は受け付けない。

| ファイル | パス | 必須 | 概要 |
|---|---|---|---|
| タイルマップ（TS） | `src/data/maps/<map>.ts` | 必須 | MapBuilder による宣言的定義 |
| 高さマップ | `checker/heightmaps/<map>.json` | **必須（自己検査の要）** | H0/H1/H2 の2次元グリッド宣言 |
| 歩行可能オーバーレイ | `checker/out/<map>/error_overlay.png` または `warning_overlay.png` | **必須（自己検査の要）** | checker が生成する構造マップ |
| スクリーンショット（等倍） | `public/assets/<map>_screenshot.png` または `checker/out/<map>/screenshot.png` | 必須 | ゲーム内実画像 |
| スクリーンショット（25%縮小） | `checker/out/<map>/screenshot_25percent.png` | **必須（自己検査の要）** | 25%縮小での視認性確認 |
| グレースケール確認 | `checker/out/<map>/grayscale_check.png` | 必須 | コントラスト確認 |
| アートQAレポート | `checker/out/<map>/art_qa_report.md` | **必須（自己検査の要）** | checker による総合スコア・全 finding |
| スコアJSON | `checker/out/<map>/score.json` | 必須 | 機械可読スコア・finding一覧 |
| マップゴール | `quality/<map>_map_goal.md` または別途定義場所 | 推奨 | 「このマップで伝えたいこと」の1文 |
| 既知の問題 | `checker/out/<map>/known_issues.md` | 推奨 | 意図的に残している WARNING の理由 |
| 修正計画 | `checker/out/<map>/fix_plan.md` | 差し戻し時必須 | 次回修正の対象・素材・接続ルール |

- [ ] 上記「必須」ファイルがすべて存在する
- [ ] `height_map`（`checker/heightmaps/<map>.json`）が最新のタイルマップと整合している
- [ ] `art_qa_report.md` がスクリーンショット込みで生成されている（`SEAM` / `NOISE` チェックを含む）

---

## 9. 完成チェックリスト（まとめ）

以下をすべて ✅ にすること。

### 構造
- [ ] H0 / H1 / H2 が宣言・存在する
- [ ] 高低差境界に段差表現がある（`HEIGHT` チェック通過）
- [ ] 主要導線が南入口から神域まで途切れず通じている
- [ ] 階段・橋・入口が導線として機能している（`STAIR` / `BRIDGE` / `CONTACT` 通過）

### 視認性
- [ ] 25%縮小で地形が読める（`screenshot_25percent.png` で確認）
- [ ] グレースケールで道/水/段差のコントラストが保たれている（`grayscale_check.png` で確認）
- [ ] スポーン周囲の装飾密度 ≤10%

### タイル品質
- [ ] 128px境界の明度差が閾値以内（`SEAM` 通過）
- [ ] 同一タイル3連続以上なし（`REPEAT` 通過）
- [ ] 森・川岸・棚田の輪郭が矩形に見えない（`kaEdgeOverlay` / `obj.curve_overlay_*` で対処）

### 地形文法（[TILE_GRAMMAR](./TILE_GRAMMAR.md) 参照）
- [ ] `obj.spillway` の上下接続が正しい（`WATERFALL` 通過）
- [ ] `obj.bridge2` の橋セットが完全（`BRIDGE` 通過）
- [ ] 神社高台の文法が正しい（`SHRINE` 通過）
- [ ] 階段の踊り場・側壁が正しい（`STAIR` 通過）
- [ ] `kaShrineGround` に `kaPaddy2` / `kaRiver3` が混入していない

### ノイズ
- [ ] 歩行域の装飾密度 ≤30%（`DENSITY` 通過）
- [ ] 高周波ノイズ ≤0.16（`NOISE` 通過）
- [ ] 花・草むらがグリッド状でない

### 自動検査
- [ ] **総合スコア 80点以上**
- [ ] **ERROR 0件**
- [ ] **重大WARNING 3件以下**

### AIレビュー
- [ ] MAP_REVIEW_PROMPT による検査AIレビューで差し戻しなし

### 納品物
- [ ] 必須4点（`height_map` / `walkable_overlay` / `screenshot_25percent.png` / `art_qa_report.md`）が存在する
- [ ] 全「必須」ファイルが揃っている

---

## 10. 人間の最終確認（4問）

自動検査と検査AIがすべて通過した後、人間が見るのは以下の **4点だけ**。
技術的な正しさの確認はツールに委ね、人間は体験の判断に集中する。

1. **世界観として好きか** — このマップの空気感、玉結びの和風世界に合っているか
2. **行きたくなるか** — 画面を見た瞬間に「あそこへ行ってみたい」という場所が1つ以上あるか
3. **気持ち悪さが残っていないか** — 説明できない違和感・引っかかり・目が止まる不自然さがないか
4. **遊びやすそうか** — どこを歩けるかが一目で分かり、迷子になる不安がないか

これらのどれか1つでも「No」なら、`fix_plan.md` に**どの場所を・どの素材で・どの接続ルールで**直すかを書いてから再提出する。「もっと自然に」という抽象指示は書かない。
