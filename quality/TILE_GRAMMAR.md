# TILE_GRAMMAR.md — タイル接続文法（人間可読版）

> **機械可読版**: [`../checker/tile_contract.json`](../checker/tile_contract.json) の `grammar` セクション  
> **自動検査ツール**: [`../checker/README.md`](../checker/README.md)  
> 両者は矛盾してはならない。このファイルを更新したときは `tile_contract.json` の `grammar` セクションも同期すること。

---

## 1. 文法とは何か

タイル配置の「文法」とは、見た目の好みではなく **接続ルールとカテゴリの役割** によって地形を構成することを指す。

AIは放っておくと「描き込み量」で違和感を解決しようとする（「寂しい → 花を増やす」「のっぺりしている → 装飾を追加する」等）。しかし本プロジェクトで必要なのは描き込みではなく次の5点である。

1. **構造が読める** — 高地・低地・歩行域の区分が一目で分かる
2. **高さが読める** — 高低差境界に必ず段差表現がある
3. **歩ける場所が読める** — 通行可能域が孤立しない
4. **主役と背景の優先順位** — 主役タイルが装飾に埋もれない
5. **タイル境界が目立たない** — 128pxグリッドのつなぎ目を破砕する

この5点を満たすために、以下の節がそれぞれどのタイル/プロップをどの順序で配置するかを定める。

**重要**: 「抽象的にもっと自然に」と言ってはならない。どの場所を・どの素材で・どの接続ルールで直すかを具体的に指示すること。

---

## 2. 高低差境界の文法

### 2.1 高さレベルの定義

| レベル | 用途 | 代表タイル/プロップ |
|--------|------|---------------------|
| **H0** | 低地・川・谷・南の入口 | `kaRiver3`, `kaGrassCalm`（下段） |
| **H1** | 中段・山道スパイン・棚田・集落テラス | `kaGrassCalm`（中段）, `kaPath2`, `kaPaddy2` |
| **H2** | 高所・神域の平場 | `kaShrineGround`, `kaShrineWall` |

### 2.2 境界ルール（`tile_contract.json` → `grammar.heightBoundary`）

高さが異なるセルが隣接する境界には **必ず** 段差表現となるカテゴリのタイルを1行挿入すること。

```
満足するカテゴリ: retaining_wall / earth_bank / cliff / stair / waterfall / bridge / river
```

具体的なタイル:

| 段差の種類 | 使用タイル | 備考 |
|-----------|-----------|------|
| 苔石垣（棚田） | `kaIshigaki` | `faceFrames: [5, 9, 10]` — FACE=5、SW角=10、SE角=9 |
| 草付き土手 | `kaDote` | `faceFrames: [4, 5, 6]` — W端=4、FACE=5、E端=6 |
| 神社擁壁 | `kaShrineWall` | `faceFrames: [5, 9, 10]` — 南面のみ前面。側面W=6/E=7は前面扱いしない |
| 岩崖 | `waCliff3` | `faceFrames: [5, 10, 11]` |

### 2.3 前面フレーム3点セット（必須）

擁壁前面（frame 5 = 南向き）の **真下のセル** に `waDropshadow`（`shadow` カテゴリ、frame 3）を配置すること。これで「上端の明るい縁 + 縦面 + 下の接地影」が完結し、段差が一目で読める。

```
配置順（Y方向・上から）:
  capY 行:   [擁壁前面] kaIshigaki / kaDote / kaShrineWall  (frame 5)
  capY+1 行: [接地影]   waDropshadow                         (frame 3)
```

`wallNeedsShadowBelow: true`（tile_contract.json）。影が欠けるとチェッカーの **HEIGHT** チェックが ERROR を出す。

---

## 3. 棚田の文法

### 3.1 構成要素のセット（すべて揃えること）

| 役割 | タイル/プロップ | カテゴリ |
|------|----------------|---------|
| 水面（水鏡） | `kaPaddy2` | `water_surface` |
| 段差境界（南面） | `kaIshigaki` (frame 5) | `retaining_wall` |
| 接地影 | `waDropshadow` (frame 3) | `shadow` |
| 排水口/滝 | `obj.spillway` | `waterfall` |

`kaPaddy2` は `needsRetainingWall: true`、`forbiddenOnGroundOf: ["shrine_ground"]`。  
神域の平場（`kaShrineGround`）に棚田パーツを流用することは **禁止**。

### 3.2 形状の作り方

- 外周の畦（`kaIshigaki`）と石垣で **段の形を先に作る**。中心の水面だけで四角形を作ってはならない。
- `kaPaddy2` は `paintAuto`（オートタイル16フレーム）で配置し、角・縁・中央が自動整合する。
- 各段の南面に `kaIshigaki` を1行 + `waDropshadow` を1行置くことで段差を明示する。
- 各段の石垣には滝の切り欠き（`skipX` 列）を設け、`obj.spillway` を配置する。

### 3.3 関連するチェッカーチェック

- **HEIGHT**: 石垣前面の真下に影がなければ ERROR
- **REPEAT**: `kaPaddy2` の同一frame連続が `repetitionRun: 3` 超で WARNING（変種ありは長め許容）
- **WATERFALL**: 各スピルウェイの上下接続（下記「滝の文法」を参照）

---

## 4. 滝/スピルウェイの文法

### 4.1 縦モジュール構成（`tile_contract.json` → `grammar.waterfall`）

```
[上段]  water_surface または river または retaining_wall  ← requiresAbove
  ↓
[obj.spillway]  縦1モジュール (論理16×48 px = 1×3タイル)
  ↓
[下段]  river または water_surface または ground_grass または path  ← requiresBelow
```

- `obj.spillway` は「上段水田 → 落ち口 → 石垣切り欠き → 短い滝 → 滝壺」を縦1モジュールで完結させるプロップ。
- **単体オブジェクト化の禁止**: 上か下のいずれかに `water_surface` / `river` / `retaining_wall` / `earth_bank` / `cliff` が無い「貼り付けスピルウェイ」は文法違反。

### 4.2 配置コード（tanada.ts の `spillway()` 関数準拠）

```typescript
// wallY = 石垣の前面行（capY）
// obj.spillway は wallY+2 を anchor にして論理 16x48 を上向きに描画
b.prop("obj.spillway", x, wallY + 2, 16, 48, { footW: 0, shadow: false, ysort: false });
```

`ysort: false` = 地面オーバーレイ（プレイヤーの下に描画）。

### 4.3 関連するチェッカーチェック

- **WATERFALL**: 上に水源なし、または下に滝壺/水路なしで ERROR
- **HEIGHT**: スピルウェイ列の石垣切り欠き部に影が欠けた場合 WARNING

---

## 5. 川の文法

### 5.1 川は「低い谷」として見せる（`tile_contract.json` → `grammar.river`）

- `kaRiver3`（`river` カテゴリ、`role: river_lowvalley`）を使う。`needsGroundShadow: true`。
- 川は地面より低い位置を流れているため、**カットバンク岸**（強い接地影）で「地面の下に沈んでいる」ことを示さなければならない。
- 川岸の両側に `waDropshadow` を敷くことで谷の深さを暗示する。

### 5.2 流れの方向

直交2D見下ろし（北=高・南=低）において、川は画面上方から下方へ流れて見えるように配置する。

### 5.3 関連するチェッカーチェック

- **RIVER**: 川岸に接地影がなければ WARNING
- **WALK**: 川を跨ぐ橋なしで歩行域が孤立する場合 WARNING

---

## 6. 橋の文法

### 6.1 橋セット（`tile_contract.json` → `grammar.bridge`）

```
[左端]  path または ground_grass  (kaPath2 等)
  ↓
[橋台]  obj.bridge_abutment       (bridge カテゴリ)
  ↓
[橋床]  obj.bridge2               (bridge カテゴリ。下に river が必須)
  ↓
[橋下影] obj.bridge_shadow        (shadowProp)
  ↓
[橋台]  obj.bridge_abutment
  ↓
[右端]  path または ground_grass
```

### 6.2 ルール

- `obj.bridge2` の直下セルは `kaRiver3`（`river` カテゴリ）でなければならない。
- 両端に `obj.bridge_abutment` が無ければ橋台欠落として BRIDGE チェックが ERROR を出す。
- `obj.bridge_shadow` が無ければ橋下の川への影が欠け、接地感を失う（BRIDGE WARNING）。
- 橋の端は `kaPath2` など `path` カテゴリで接続する（`needsPathConnect: true`）。

### 6.3 関連するチェッカーチェック

- **BRIDGE**: 橋下に川なし / 橋台欠落 / 橋下影なし / 道接続なし → ERROR または WARNING
- **CONTACT**: 橋プロップが水面に浮いている（下に river がない） → WARNING

---

## 7. 神社高台の文法

### 7.1 導線（`tile_contract.json` → `grammar.shrine`）

```
[外側]  obj.torii（鳥居。needsPathThrough: true）
  ↓
[参道]  kaPath2（path カテゴリ）
  ↓
[石段]  obj.shrine_stairs（shrine カテゴリ。verticalModulePx: [256, 384]）
  ↓
[高台]  kaShrineGround（shrine_ground カテゴリ）
  ↓
[社]    obj.hokora（shrine カテゴリ。needsGroundContact: true）
```

`requiredRoles: ["torii", "shrine_stair", "shrine_object"]` — この3つが揃わなければ SHRINE チェックが WARNING を出す。

### 7.2 神社専用文法・棚田/川との分離

| 禁止 | 理由 |
|------|------|
| `kaShrineGround` の隣に `kaPaddy2` | `forbiddenAdjacency`: 神域に棚田パーツ流用（文法混線） |
| `kaShrineGround` の隣に `kaRiver3` | `forbiddenAdjacency`: 神域に川パーツ流用 |
| 神域内に `kaIshigaki` | 棚田石垣を神社擁壁に流用禁止。`kaShrineWall` (dressed ashlar) を使うこと |

神社エリアでは必ず `kaShrineWall`（`retaining_wall` カテゴリ、`role: shrine_wall`）で囲い、  
`kaShrineGround`（`shrine_ground` カテゴリ）を平場のベースとする。

### 7.3 鳥居の後方通行性

`toriiNeedsWalkableBehind: true` — 鳥居の奥が壁や固体タイルで塞がれていてはならない。奥に `kaPath2` または `kaShrineGround` の歩行可能域が続くこと。

### 7.4 関連するチェッカーチェック

- **SHRINE**: 鳥居/石段/社の導線不完全 → WARNING、棚田/川タイル流用 → WARNING、鳥居の奥が通行不可 → ERROR

---

## 8. 128px境界破砕の文法

### 8.1 問題

論理タイル=16px に対してアセット実寸=128px のため、8×8タイルごとにグリッドが繰り返す。  
このグリッド境界が目立つと「切り貼りされた地図」に見える（SEAM チェック対象）。

### 8.2 破砕の手順

1. **`kaEdgeOverlay`**（`seam_breaker` カテゴリ）を森/道/川岸/石垣の境界に散布する。  
   `src/data/maps/tanada.ts` では `EDGE_OVL = "tile.ka_edge_overlay_set"` として `scatterDecals` で配置。
2. **`obj.curve_overlay_2x2`** / **`obj.curve_overlay_3x1`** を境界の角に重ねて、大判のシルエットで切り貼り感を断ち切る。

### 8.3 散布密度の目安

- 歩行域の装飾最大密度 = `decorDensityWalkableMax: 0.30`（30%以下）
- プレイヤースポーン付近 = `decorDensityNearPlayerSpawnMax: 0.10`（10%以下）

SEAM チェックが境界の明度差 `gridSeamDeltaLumaWarn: 14.0` または境界フラクション `gridSeamFracWarn: 0.18` を超えると WARNING。

### 8.4 関連するチェッカーチェック

- **SEAM**: 128pxグリッド境界の明度差 → WARNING（要スクショ）
- **NOISE**: 歩行域の高周波ノイズ `noiseHighFreqStdWarn: 0.16` 超 → WARNING（要スクショ）

---

## 9. チェッカー対応表（まとめ）

| 文法節 | チェックコード | 主な深刻度 | 検証内容 |
|--------|--------------|-----------|---------|
| 高低差境界（§2） | `HEIGHT` | ERROR | 擁壁前面の真下に `waDropshadow` があるか |
| 棚田（§3） | `HEIGHT`, `REPEAT` | ERROR/WARNING | 石垣影・水田の同一frame連続 |
| 滝/スピルウェイ（§4） | `WATERFALL` | ERROR/WARNING | 上に水源・下に滝壺/水路 |
| 川（§5） | `RIVER` | WARNING | 川岸の接地影 |
| 橋（§6） | `BRIDGE`, `CONTACT` | ERROR/WARNING | 橋下川・橋台・橋下影・道接続 |
| 神社高台（§7） | `SHRINE` | ERROR/WARNING | 鳥居/石段/社の導線・棚田/川流用禁止 |
| 128px破砕（§8） | `SEAM`, `NOISE` | WARNING | 境界明度差・高周波ノイズ（要スクショ） |
| 歩行域孤立 | `WALK` | WARNING | 到達不能な歩行ポケット |
| 装飾密度 | `DENSITY` | WARNING | 歩行域装飾率30%以下 |

合格条件: 総合スコア **80点以上** / ERROR **0件** / 重大WARNING **3件以下**  
（`tile_contract.json` → `thresholds.doneScoreMin / doneMaxErrors / doneMaxMajorWarnings`）

---

## 10. 制作順序の原則

装飾から始めてはならない。必ず以下の順番で作ること。

```
1. 地形構造（森/歩行域の輪郭）
2. 導線（道・参道・川・橋）
3. 高低差（擁壁・土手・石段 + 接地影）
4. 建物・オブジェクト（社・民家・水車小屋 + 接地影 + 入口導線）
5. 装飾（花・草むら・kaEdgeOverlay・curve_overlay）
```

この順序で作られていない場合、チェッカーの CONTACT / DENSITY / SHRINE チェックがその違反を検出する。
