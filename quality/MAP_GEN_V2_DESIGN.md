# 玉結びマップ生成 v2 — 高さ場駆動・コーナーベース設計

## 0. なぜv2か

**根本原因（1行）:** 採点システムがお手本（`ZZ-HCP-logs/023/otehon.png`）との視覚距離を測らず、お手本へ向かう勾配がループに存在しない。

具体的な連鎖：

- `checker/heightmaps/tanada.json` が不在 → `height_connection.py` パートBが全スキップ → `Ctx.height=None` のまま `score=95/passed=True`（`checker/out/tanada/score.json` 実測）
- `grade_wa.py` が緑彩度を20〜26pt削り（K=1.35）、`flatten_tiles.py` が輝度stdをほぼゼロに圧縮 → お手本（FF6系 S=65〜77%）との彩度差が30〜40pt
- `tanada.ts` は `addPath` + `blob` の副作用逐次累積で、構図の宣言が存在しない → どのステップを変えても意図した収束先がない
- `paintAuto`（`mapbuilder.ts:220-247`）が辺ベース4方向のみ → 内角コーナーを `center` にフォールバック → 継ぎ目対策として `kaGrassCalm` の低ノイズ化が固定化

リンタ95点合格は文法適合の証明であり、お手本接近の証明ではない。v2はこの逆設計を構造から直す。

---

## 1. 設計思想

### 1-1. 高さ場 = 真実の源（Source of Truth）

`checker/heightmaps/` の `levels[y][x]` を「検査の入力（任意）」から「マップ著述の出発点（必須）」へ昇格させる。`tanada.ts` が `H[]` を先に宣言し、タイル参照値（`ground[]` 等）はビルド末尾の `buildTiles()` パスで `H[]` × `M[]` から決定論的に導出される。`H[]` がなければビルドが走らない。

### 1-2. 2フィールドモデル

```
heightField : Uint8Array((W+1)*(H+1))  // コーナー解像度（角グリッド）
materialField: Uint8Array(W*H)          // タイル中心解像度（素材ID）
```

タイル `(x,y)` の見た目は `f(cornerH[TL,TR,BL,BR], cornerM[TL,TR,BL,BR])` の純関数。外部状態・副作用なし。

### 1-3. コーナーベース / Dual-Grid

高さを「角（頂点）」に持つ。隣接タイル `(x,y)` と `(x+1,y)` は `TR(x,y)` = `TL(x+1,y)` = `cornerH[x+1][y]` を共有する。書き込みは角に対して行われるため、不整合な配置が API レベルで不可能になる。検査は事後確認から事前保証に変わる。

### 1-4. 段差 ≤ 1 制約

`setCornerHeight(cx, cy, h)` は書き込み時に隣接角との差が 1 を超える場合に `assert` または `clamp` する。高さ差 ≥ 2 は崖専用タイル（`waCliff3`）の文脈のみで許容し、専用エントリとして `CornerMap` に登録する。これによりタイルカタログが有限化される。

### 1-5. 手続きシェーディング（生成でなく後処理）

Forge は素材テクスチャを「豊かに1回だけ」生成する。`grade_wa.py` の平坦化（K=1.35 → 彩度-26pt）をやめ、高さ場の勾配から `gen_cliff3.py` の `vgrad_multiply()` + `edge_shadow()` を汎化した `gen_shade_pass.py` で方向光を build 時に焼く。シェーディング強度の根拠は `H[]` にあり、Forge の指示プロンプトには含まれない。

### 1-6. Map-as-Numbers

マップの意図は `H[]` + `M[]` の2配列として存在し、タイル配置は決定論的な導出結果に過ぎない。構図（背骨・ゾーン・段差位置）はこの数値場に宿る。座標ハードコードの手置き積み上げ（現行 `tanada.ts`）はゾーン定数 + DSL 呼び出しに置き換わる。

---

## 2. データモデル

### 2-1. 角グリッド（コーナー解像度）

tanada の論理サイズ W=112, H=92 のとき：

```
cornerGrid: Uint8Array(113 * 93)  // インデックス: cy * (W+1) + cx
```

角 `(cx, cy)` は4枚のタイルに共有される：
- 右下タイル `(cx, cy)` の TL コーナー
- 右下タイル `(cx-1, cy)` の TR コーナー
- 右下タイル `(cx, cy-1)` の BL コーナー
- 右下タイル `(cx-1, cy-1)` の BR コーナー

タイル `(x,y)` の4隅コーナーインデックス：

```
TL = cy*(W+1)+cx  where (cx,cy)=(x,y)
TR = cy*(W+1)+(cx+1)
BL = (cy+1)*(W+1)+cx
BR = (cy+1)*(W+1)+(cx+1)
```

### 2-2. 素材場（タイル中心解像度）

```typescript
// src/field/mapdata.ts に追加
materialField: Uint8Array(W * H)

// 素材ID定数（src/field/materials.ts 新設）
export const M = {
  GRASS:    0,
  PADDY:    1,
  RIVER:    2,
  FOREST:   3,
  PATH:     4,
  SHRINE:   5,
  EARTH:    6,
  CLIFF:    7,
  VOID:    255,
} as const;
```

### 2-3. heightField のフォーマット（checker/heightmaps との整合）

`checker/heightmaps/tanada_h.json` の新フォーマット：

```json
{
  "width": 112,
  "height": 92,
  "format": "corners",
  "cornerWidth": 113,
  "cornerHeight": 93,
  "corners": [[0,0,0,...], [0,1,1,...], ...]
}
```

後方互換として旧 `levels[y][x]` キーも許容。`map_art_linter.py` の `load_height()` に分岐を追加：

```python
# checker/lint/map_art_linter.py:53-65 に追記
if 'corners' in data:
    ctx.corners = data['corners']   # (H+1) × (W+1) の2次元配列
    ctx.height = None               # 旧フィールドは使わない
elif 'levels' in data:
    ctx.height = data['levels']     # 旧互換
```

### 2-4. MapData への追加フィールド

```typescript
// src/field/tilemap.ts の MapData インターフェースに追記（既存フィールドを壊さない）
heightField:   Uint8Array    // (W+1)*(H+1) コーナーグリッド
materialField: Uint8Array    // W*H タイル中心素材
shadeLayer:    Uint16Array   // W*H 手続きシェーディングオーバーレイ（既存 deco の上）
```

`ground[]`/`deco[]`/`overhead[]` の既存3層は変更しない。`buildTiles()` パス（後述 §3-4）がこれらに書き込む。

### 2-5. tanada 実寸での具体例

```
高さ場（値0/1/2）の意味（tile_contract.json の heightLevels 定義を引き継ぐ）:
  H0 = 谷床・川底・道下（標準地面）
  H1 = 棚田面・一段高い畦  
  H2 = 神社台・山頂

コーナーグリッド例（神社台 x=44-68, y=7-20 付近を H2 で塗る）:
  setCornerHeight(44, 7, 2) ... setCornerHeight(68, 20, 2)
  → タイル(44,7)〜(67,19)の TL/TR/BL/BR が全て 2
  → コーナータイラーが kaGrass フラットタイルを選択
  → 境界タイル(43,7)はTL=1, TR=2 → コーナータイラーが段差タイルを選択
```

---

## 3. タイラー仕様

### 3-1. コーナーパターン → フレーム番号の写像

4隅の高さタプル `[TL,TR,BL,BR]` から「高さが最も高い側が上（H_top）、低い側が下（H_bot）」の2値化を行い、4bit マスクを生成する：

```
bit3=TL, bit2=TR, bit1=BL, bit0=BR
値が H_top なら 1、H_bot なら 0
```

16通りのパターン → `CornerMap` テーブル（`tileset.ts` に追加）：

```typescript
// src/field/tileset.ts に追加
export interface CornerMap {
  // 16 パターン (0b0000 〜 0b1111)
  patterns: Record<number, number>  // パターンビット → フレーム番号
  // 素材ペア境界用（例: grass/paddy 混在の角）
  mixed?: Record<number, number>
}

export interface TileSetDef {
  // 既存フィールド維持
  sheet: string;
  frames: number;
  // 追加
  cornerMap?: CornerMap       // コーナーベース選択テーブル
  transMap?: TransitionMap    // 既存辺ベース（後方互換）
  cornerProfile?: number[][]  // フレーム別 [TL,TR,BL,BR] 高さプロファイル
}
```

### 3-2. 16パターンとフレーム番号の対応（kaGrass 系を例に）

現行 `paintAuto` の16フレームシート（4×4）をそのままコーナーベースの16パターンに再利用する。ビット意味の再定義：

```
0b0000 = 全隅同素材 → center (frame 0-3 ランダム)
0b1111 = 全隅同素材（上と同じ、フラット）
0b1100 = 上辺のみ高い → N端 (frame 4)
0b0011 = 下辺のみ高い → S端 (frame 5)
0b1001 = 左辺のみ高い → W端 (frame 6)
0b0110 = 右辺のみ高い → E端 (frame 7)
0b1000 = TL のみ高い  → NW外角 (frame 8)
0b0100 = TR のみ高い  → NE外角 (frame 9)
0b0001 = BL のみ高い  → SW外角 (frame 10)
0b0010 = BR のみ高い  → SE外角 (frame 11)
0b0111 = TL のみ低い  → NW内角 (frame 12) ★現行未定義
0b1011 = TR のみ低い  → NE内角 (frame 13) ★現行未定義
0b1101 = BL のみ低い  → SW内角 (frame 14) ★現行未定義
0b1110 = BR のみ低い  → SE内角 (frame 15) ★現行未定義
0b1010 = 対角(TL,BR)  → center フォールバック
0b0101 = 対角(TR,BL)  → center フォールバック
```

内角4種（frame 12〜15）が現行 `TransitionMap` の `innerNW/NE/SW/SE` 未定義ギャップに対応する。これが現行の「`center` フォールバック → 低ノイズ推奨」の構造的原因。

### 3-3. 既存 TRANS_MAPS との共存戦略

`paintAuto`（`mapbuilder.ts:220-247`）は廃止しない。既存マップ互換のため並存させる：

```typescript
// src/field/mapbuilder.ts に追加
paintDualGrid(
  x: number, y: number,
  hf: Uint8Array,   // cornerGrid
  mf: Uint8Array,   // materialField
  layer: Uint16Array
): void {
  const [tl,tr,bl,br] = tileCorners(x, y, hf, W);
  const hMax = Math.max(tl,tr,bl,br);
  const hMin = Math.min(tl,tr,bl,br);

  if (hMax === hMin) {
    // フラット: 素材場でタイルセットを決定
    const setKey = materialToSet(mf[y*W+x]);
    const cm = CORNER_MAPS[setKey];
    layer[y*W+x] = T(setKey, cm.patterns[0b1111]);
    return;
  }
  // 段差: パターンビット計算
  const mask = ((tl>=hMax?1:0)<<3)|((tr>=hMax?1:0)<<2)
              |((bl>=hMax?1:0)<<1)|((br>=hMax?1:0)<<0);
  // 素材ペアから適切なタイルセットを選択
  const setKey = resolveEdgeTileSet(tl,tr,bl,br, mf, x, y, W);
  const cm = CORNER_MAPS[setKey];
  layer[y*W+x] = T(setKey, cm.patterns[mask] ?? cm.patterns[0]);
}
```

切り替えは `transKey` プレフィックスではなく `MapData.version: 2` フラグで行う：

```typescript
// buildTiles() で分岐
if (map.version >= 2) {
  for (let y=0; y<H; y++)
    for (let x=0; x<W; x++)
      paintDualGrid(x, y, map.heightField, map.materialField, map.ground);
} else {
  // 既存 paintAuto パス
}
```

### 3-4. buildTiles() パスの処理順

```
1. materialField → ground[] : paintDualGrid で素材フラットタイルを全面塗り
2. heightField 等高線 → 境界 Set : extractLevelBoundary(hf, from, to)
3. 境界 Set → 段差タイル : wall(ISHI,...) / wall(DOTE,...) / wall(CLIFF,...) を自動選択
4. 森最前列検出 : M[]==FOREST かつ南隣 M[]==GRASS/PATH の行 → forest_front フレーム
5. 滝配置 : 石垣境界上の M[]==PADDY セルに obj_spillway を自動プロップ
6. applyDirectionalShadow(hf, 'NW') → shadeLayer[]
7. shadeLayer → deco[] へマージ（既存 waDropshadow フレーム選択）
```

### 3-5. 段差 ≤ 1 のカタログ（タイルセット別）

| コーナーパターン | 高さ差 | タイルセット | フレーム例 |
|---|---|---|---|
| 全隅 H=n | 0 | 素材系（kaGrass等） | center |
| 上辺 H=n+1, 下辺 H=n | 1（南下がり） | kaDote / kaIshigaki | FACE=5 |
| 上辺 H=n, 下辺 H=n+1 | 1（北下がり） | kaDote逆 / kaGrass | N端=4 |
| TL=n+1のみ | 1（NW内角） | kaIshigaki | frame 12 ★要生成 |
| TR=n+1のみ | 1（NE内角） | kaIshigaki | frame 13 ★要生成 |
| 上辺 H=n+2, 下辺 H=n | 2（急崖） | waCliff3 | FACE=5 |

段差 > 1 は `waCliff3`（`faceFrames:[5,10,11]`）専用。段差 ≤ 1 の範囲では `kaDote`・`kaIshigaki` が全パターンを網羅すればよく、必要な新規フレームは内角4種のみ（既存16fシートへの追記）。

---

## 4. 手続きシェーディング仕様

### 4-1. 設計方針

「生成 = 豊かさ、シェーディング = 後処理」を実現するため、現行の彩度破壊チェーンを以下のように組み替える：

```
現行: Forge生成 → hdproc(8%インセット) → grade_wa(K=1.35彩度-26pt) → flatten/deseam(輝度std圧縮) → 貧しい出力

v2:  Forge生成 → hdproc(--inset 0.0) → gen_shade_pass.py(勾配乗算) → 豊かな出力
                                         ↑ grade_wa は草系 K=0.0〜0.3 に下げる
```

### 4-2. gen_shade_pass.py（新設）

`gen_cliff3.py` の `vgrad_multiply()` + `edge_shadow()` を汎化したスクリプト：

```python
# forge/gen_shade_pass.py（新設）
def shade_tile(img: Image, h_corners: tuple[int,int,int,int],
               light_dir: tuple[float,float] = (-0.707, -0.707),
               h_max: int = 2) -> Image:
    """
    h_corners = (NW, NE, SW, SE) の高さ値
    gen_cliff3.vgrad_multiply() の汎化版
    """
    h_nw, h_ne, h_sw, h_se = h_corners
    h_top = (h_nw + h_ne) / 2 / h_max  # 上辺の平均高さ (0.0〜1.0)
    h_bot = (h_sw + h_se) / 2 / h_max  # 下辺の平均高さ

    # gen_cliff3.py の L_COPING=1.04, L_WBASE=0.40 を参考に補間
    top_mul = 0.70 + 0.35 * h_top   # 高い辺ほど明るい (0.70〜1.05)
    bot_mul = 0.70 + 0.35 * h_bot

    img = vgrad_multiply(img, top=top_mul, bot=bot_mul)  # gen_cliff3流用

    # 東西辺の高さ差から側面影
    h_diff_ew = (h_nw + h_sw)/2 - (h_ne + h_se)/2
    east_alpha = int(clamp(h_diff_ew / h_max * 180, 0, 160))
    west_alpha = int(clamp(-h_diff_ew / h_max * 180, 0, 160))
    img = edge_shadow(img, left_alpha=west_alpha, right_alpha=east_alpha)  # gen_cliff3流用

    return img
```

呼び出しは `proc_wa.py` の後段として追加：

```python
# forge/proc_wa.py の PROC ループ末尾に追記
if asset_id in SHADE_PASS_TARGETS:
    corners = height_map[asset_id]['corners']  # forge/height_map.json から
    img = shade_tile(img, corners, h_max=2)
```

### 4-3. hdproc.py のインセット削除

```python
# forge/hdproc.py:98-109 の現行コード
ix = max(1, round(t.size[0] * 0.08))  # 四辺8%インセット

# v2 変更: --inset オプション追加（default=0.08 で後方互換）
parser.add_argument('--inset', type=float, default=0.08)
ix = max(0, round(t.size[0] * args.inset))

# proc_wa.py から v2 タイルを生成する際は --inset 0.0 を渡す
```

インセットゼロにより、Forge が生成したエッジのハイライト/シャドウ情報が維持される。継ぎ目はコーナー規則が担うのでインセットは不要。

### 4-4. grade_wa.py の平坦化軽減

```python
# forge/grade_wa.py の K_OVERRIDE（現行値 → v2値）
K_OVERRIDE = {
    # 現行 → v2（草系を大幅軽減）
    'tile_grass_wa':     (1.35, 0.20),   # 彩度-26pt → -3.8pt
    'tile_ka_grass':     (1.00, 0.20),
    'tile_ka_grass2':    (1.00, 0.20),
    'tile_ka_grass_calm':(1.00, 0.20),
    'obj_matsu':         (1.40, 0.50),   # 松はやや下げる程度
    'tile_wa_ishigaki':  (0.35, 0.35),   # 石系はほぼ現状維持
    'tile_ka_ishigaki':  (0.50, 0.50),
    'tile_detail_wa':    (1.20, 0.30),
}
```

移行期間は K 値をパラメータとして `proc_wa.py` から渡し、v2 フラグで切り替える。

### 4-5. パレット彩度の修正

```json
// forge/palettes/snes_forest.json（現行 → v2）
{
  "mid_green":   {"hex": "#48b030", "note": "S=67.3% ← 現行 #5fa34a S=54.6%"},
  "light_green": {"hex": "#88d040", "note": "S=69.9% ← 現行 #9fd16b S=48.8%"},
  "dark_green":  {"hex": "#2f7840", "note": "S=61.0% ← 現行 #2f6b3f S=56.1%"}
}
```

Forge プロンプトにも数値指定を追記：`vivid saturated Japanese-style green, S>65%, V>60%, avoid muted or washed-out tones`。

### 4-6. waDropshadow の自動選択

`applyDirectionalShadow()` が高さ差に応じて `waDropshadow`（`tileset.ts:64`）のフレームを選択：

```
h差=1 かつ S辺が低い → frame=1（中影、現行 wall() と同じ）
h差=1 かつ SW/SE コーナー → frame=0（薄影）
h差=2 （崖） → frame=3（強影、shadow.strongFrame=3）
```

現行 `wall()` 内の手動 `deco(SHADOW,1)` 付与（`tanada.ts:59`）は `buildTiles()` パスに統合後に削除する。

---

## 5. パーツ語彙の棚卸し

### 5-1. 現行インベントリ表

| カテゴリ | タイルセットキー | フレーム数 | 役割 | v2 での扱い |
|---|---|---|---|---|
| 草（地面） | kaGrass/kaGrass2/kaGrassCalm | 16f×3 | フラット地面 | 再利用。内角4f追記が必要 |
| 草（辺） | grassUpper/grassLower/grassWa | 16f×3 | 斜面表現 | 手続きシェーディングで代替可 |
| 水田 | kaPaddy/kaPaddy2 | 16f×2 | 棚田面 | 再利用 |
| 川 | kaRiver/kaRiver2/kaRiver3 | 16f×3 | 河川 | 再利用（水系 deseam は継続） |
| 道 | kaPath/kaPath2/pathWa | 16f×3 | 導線 | 再利用 |
| 石垣 | kaIshigaki/waIshigaki/waKasaishi | 16f×3 | 段差壁面 | frame 12/13（内角）追記必須 |
| 土手 | kaDote | 16f | 緩段差 | 再利用 |
| 崖 | waCliff/waCliff3 | 16/21f | 急崖（H差2） | 再利用。south_face/corner_SW/SE追記 |
| 森 | kaForest/kaForest2/forestWa | 16f×3 | 森内部（葉カノピー） | 再利用（内部のみ） |
| 階段 | waStairs/waStairs2/waStairs3 | 1/16f×2 | 通行可段差 | 再利用 |
| 滝 | obj_spillway/spillway_side/waterfall | prop | 石垣からの滝 | spillway_side の contract 整備必要 |
| 影 | waDropshadow | 4f | 接地影 | 手続きシェーディングで自動選択 |
| シームブレーカ | kaEdgeOverlay/curve_overlay | 16f/prop | グリッド境界破砕 | コーナー規則で削減可能 |
| 神社 | kaShrineGround/kaShrineWall | 16f×2 | 神社台 | 再利用 |

### 5-2. 不足パーツのリスト（ユーザー指摘 §9 対応）

#### (a) 石垣四隅の内角フレーム（★ Forge 2フレーム追記）

**現状:** `kaIshigaki` の `faceFrames:[5,9,10]` は南向き外角のみ。`tanada.ts` が `vwall` で `frame 8/11` をハードコードするが `tile_contract.json` の `_faceNote` に未記載。内角（L字・U字折れ）はフレームが存在しない。

**対応:** 既存 `tile_ka_ishigaki.png`（16f = 2048×128px）の空きフレームに Forge で2フレーム追記：

```json
// tile_contract.json の kaIshigaki エントリを拡張
"kaIshigaki": {
  "faceFrames": [5, 9, 10],
  "extendedFaceFrames": {
    "FACE_S": 5, "CORNER_SE": 9, "CORNER_SW": 10,
    "FACE_E": 8, "FACE_W": 11,
    "CORNER_NE_INNER": 12,   // ★新規生成フレーム
    "CORNER_NW_INNER": 13    // ★新規生成フレーム
  }
}
```

Forge 生成指示: `同じ石積みテクスチャの内角コーナー（凹み形状）。北側から見た石垣の内側コーナー。隣接フレームと石目が連続すること。`

#### (b) 石垣から流れる滝（★ obj_spillway_side の contract 整備 + L字版は Forge 新規）

**現状:** `obj_spillway.png`（128×384px、直線石垣からの縦落ち）は存在。`obj_spillway_side.png`（64×128px）は存在するが `tile_contract.json` に `verticalModulePx` 未定義、`grammar` の `requiresAbove/Below` も未記述。

**対応:**

```json
// tile_contract.json の props.spillway_side を整備
"spillway_side": {
  "category": "waterfall",
  "role": "spillway_side",
  "verticalModulePx": [64, 384],
  "requiresAbove": "retaining_wall",
  "requiresBelow": "river",
  "cornerProfile": [1, 0, 0, 0]  // W面から落ちる想定
}
```

石垣が L字に曲がる角から斜めに水が落ちるパターンが必要な場合のみ `obj.spillway_corner`（L字滝口）を Forge で新規生成。直線石垣の滝は既存 `obj_spillway` で対応可。

自動配置ルール（`buildTiles()` §5 で実装）：

```
境界 Set の中で M[]==PADDY かつ 南隣 M[]==RIVER のセル
→ obj_spillway を自動プロップ（spillway() 関数が不要になる）
```

#### (c) 森の最前列 — 幹が見えるタイル（★ Forge 新規 16f シート必須）

**現状:** `kaForest/kaForest2/forestWa` は上空から見た葉カノピーの遷移シートのみ。南辺に面する森の正面（プレイヤーが向き合う辺）に幹が見えるフレームが存在しない。`forest_edge_set.png` も葉カノピーの辺遷移であり、幹絵ではない。

**対応:** `tile.ka_forest_front`（新規 16f シート）を Forge で生成：

```
Forge プロンプト指針:
  上半分: 葉の下縁（暗い影の帯）
  下半分: 幹が2〜3本、苔・根が見える
  左右辺: 隣接する幹が半裁で見える（継ぎ目対応）
  category: forest_wall, role: forest_south_face
```

コーナータイラーでの自動選択ルール：

```typescript
// buildTiles() §4 の森最前列検出
if (M[y*W+x] === M_FOREST && M[(y+1)*W+x] !== M_FOREST) {
  // 南隣が森でない = 最前列
  ground[y*W+x] = T(TS.kaForestFront, selectFrontFrame(x, y, mf));
}
```

#### (d) 起伏地形の斜面テクスチャ（★ Forge 新規 16f シート必須）

**現状:** 平坦（`kaGrassCalm`）/ 急崖（`waCliff3`）/ 土手（`kaDote`）の三択のみ。高さ差 0.5 段相当の緩斜面（丘）を表現するテクスチャがない。

**対応:** `tile.ka_relief_ground`（新規 16f）を Forge で生成：

```
Forge プロンプト指針:
  草が薄くなり土肌・岩が露出した緩斜面テクスチャ
  16フレームで辺/角の遷移パターンを持つ（paintAuto 互換）
  category: earth_bank, role: gentle_slope
```

自動選択条件：

```typescript
// コーナータイラーで勾配 0.3〜0.7 のセルに適用
const slope = (h_br + h_bl - h_tr - h_tl) / 2;  // 南北勾配
if (Math.abs(slope) >= 0.3 && Math.abs(slope) <= 0.7) {
  // gentle_slope タイルを選択
  ground[y*W+x] = T(TS.kaReliefGround, cornerMask);
}
```

### 5-3. 新規 Forge 生成 vs 手続き代替の仕分け

| パーツ | 対応方法 |
|---|---|
| 石垣内角（NW/NE）frame 12/13 | Forge 追記（既存シートへ2フレーム） |
| 石垣外角 SW/SE frame | 既存 frame 9/10 で対応済み |
| 石垣東西面 frame 8/11 | 既存（`tanada.ts` でハードコード中）、contract 整備のみ |
| 石垣L字滝口 spillway_corner | Forge 新規（必要な構成でのみ） |
| 森最前列（幹） ka_forest_front | Forge 新規必須 |
| 起伏斜面 ka_relief_ground | Forge 新規必須 |
| 草スロープ明暗 | 手続きシェーディング（gen_shade_pass.py）で代替 |
| 川岸影 | applyDirectionalShadow() で自動 |
| 石垣接地影 | waDropshadow frame 自動選択で代替 |
| 水田スロープ陰影 | 手続きシェーディングで代替 |

---

## 6. 検査・採点の改訂

### 6-1. お手本ゲート（二層化 passed）

根本診断「お手本への勾配がゼロ」を解消するため、`checker/lint/report.py` の `passed` を二層化する：

```python
# checker/lint/report.py の passed 判定を拡張
passed_grammar = (score >= 80) and (errors == 0) and (major_warnings <= 3)
passed_otehon  = run_otehon_gate(result_png, otehon_png)  # 新設

# score.json に書き出す新フィールド
{
  "passed": passed_grammar and passed_otehon,
  "passed_grammar": passed_grammar,
  "passed_otehon": passed_otehon,
  "otehon_stats": { "sat_chi2": ..., "luma_slope_match": ..., "ssim_region": ... }
}
```

**統計プリフィルタ（Python, `checker/lint/checks/otehon_gate.py` 新設）:**

```python
def run_otehon_gate(result: Path, otehon: Path, threshold: dict) -> bool:
    r = Image.open(result).resize((result.width//4, result.height//4))
    o = Image.open(otehon).resize((o.width//4, o.height//4))

    # 1. 彩度ヒストグラムのχ²距離
    sat_chi2 = chi2_distance(sat_histogram(r), sat_histogram(o))

    # 2. 中央縦軸（x=W/2）の明度勾配符号一致率
    luma_slope_match = slope_sign_match(r, o, axis='vertical')

    # 3. 縮小SSIM（構造保持率）
    ssim = structural_sim(r, o)

    passed = (sat_chi2 < threshold['satChi2Max']    # 例: 0.35
           and luma_slope_match > threshold['lumaMatchMin']  # 例: 0.60
           and ssim > threshold['ssimMin'])          # 例: 0.45

    return passed
```

閾値は `otehon.png` を実測してから決定する（先に数値を固定すると偽陽性が高い）。初期は `INFO`（`passed` に影響せず）として運用し、段階的に `WARNING` → 二層 `passed` に昇格させる。

**視覚 AI レビュー（第2層）:** `passed_otehon=false` の場合のみ、`map-art-reviewer` エージェント（既存、`MEMORY.md` に記録済み）に `result.png` + `otehon.png` + `otehon_stats` を渡して差異を記述させ、`passed_otehon` を上書きする。

### 6-2. ミクロ4チェック（新設チェックモジュール）

`checker/lint/checks/__init__.py` の `ALL_CHECKS` に追加：

#### ADJACENCY_GAP（隣接コーナー不整合）

```python
# checker/lint/checks/adjacency_gap.py
def check(ctx: Ctx) -> list[Finding]:
    if ctx.corners is None:
        return [Finding('ADJACENCY_GAP', Severity.INFO, 'corners フォーマット未使用')]
    findings = []
    for cy in range(ctx.H+1):
        for cx in range(ctx.W):
            # タイル(cx,cy)のTRコーナー vs タイル(cx+1,cy)のTLコーナー
            left_tr  = ctx.corner_h(cx+1, cy)   # 共有角のはず
            right_tl = ctx.corner_h(cx+1, cy)   # コーナーベースなら同一
            # コーナーベースが正しく実装されていれば不一致は起きえない
            # → 旧マップや移行中の不整合を検出するフォールバック
            if ctx.height and abs(ctx.height[cy][cx] - ctx.height[cy][cx+1]) > 1:
                findings.append(Finding('ADJACENCY_GAP', Severity.ERROR,
                    f'({cx},{cy})→({cx+1},{cy}) 高さ差 > 1'))
    return findings
```

#### EDGE_TERMINATION（川・石垣・森の孤立端末）

```python
# checker/lint/checks/edge_termination.py
TARGET_CATS = {'river', 'retaining_wall', 'forest_wall'}
for cat in TARGET_CATS:
    clusters = bfs_clusters(ctx, cat)          # walkable.py の _clusters 流用
    for cluster in clusters:
        if len(cluster) <= 2:                  # 1〜2セルの孤立
            for (x,y) in cluster:
                findings.append(Finding('EDGE_TERMINATION', Severity.WARNING,
                    f'{cat} 孤立端末 ({x},{y})'))
```

#### TRANSITION_MISSING（素材境界に遷移タイルなし）

```python
# checker/lint/checks/transition_missing.py
# tile_contract.json に transitionPairs テーブルを追加して参照
PAIRS = ctx.tile_meta('__global__').get('transitionPairs', [])
for pair in PAIRS:
    from_cat, to_cat, req_deco = pair['from'], pair['to'], pair['required_deco']
    for y in range(ctx.H):
        for x in range(ctx.W-1):
            if ctx.ground_category(x,y) == from_cat \
               and ctx.ground_category(x+1,y) == to_cat \
               and not ctx.has_deco_category(x,y,req_deco) \
               and not ctx.has_deco_category(x+1,y,req_deco):
                findings.append(Finding('TRANSITION_MISSING', Severity.WARNING,
                    f'{from_cat}→{to_cat} 遷移なし ({x},{y})'))
```

#### WATER_STREAK（川岸影の行単位欠落）

```python
# checker/lint/checks/water_streak.py（river.py の拡張）
streak_thresh = ctx.threshold('waterStreakRowFrac', 0.70)
for y in range(ctx.H):
    row_river = [x for x in range(ctx.W) if ctx.ground_category(x,y)=='river']
    if not row_river:
        continue
    missing = sum(1 for x in row_river
                  if not ctx.has_deco_category(x, y+1, 'shadow'))
    if missing / len(row_river) > streak_thresh:
        findings.append(Finding('WATER_STREAK', Severity.ERROR,
            f'y={y} 川岸影欠落率 {missing}/{len(row_river)}'))
```

### 6-3. ノイズ指標の組換え

| 現行指標 | v2 での扱い |
|---|---|
| `noiseHighFreqStdWarn: 0.16`（草タイルに適用） | ベースタイルへの適用を免除。`decor/overlay` カテゴリのみに限定 |
| `gridSeamDeltaLumaWarn: 14.0` | コーナー規則で継ぎ目が構造的に消えるため `INFO` に降格（廃止はせず確認用に残す） |
| `gridSeamFracWarn: 0.18` | 同上 |
| 新: `ssimRegionMin: 0.45` | お手本ゲートの縮小 SSIM（昇格） |
| 新: `satChi2Max: 0.35` | お手本ゲートの彩度距離（昇格） |

`checker/tile_contract.json` の `thresholds` セクションを上記に更新する。

### 6-4. 二層 DoD（Definition of Done）

```
Gate 1（文法ゲート、現行と同等）:
  score >= 80 AND errors == 0 AND major_warnings <= 3
  + 新: ADJACENCY_GAP errors == 0
  + 新: EDGE_TERMINATION warnings <= 2
  + 新: WATER_STREAK errors == 0

Gate 2（お手本ゲート、v2 新設）:
  passed_otehon == true
  （統計プリフィルタ 3指標 AND 視覚 AI レビュー承認）

passed = Gate1 AND Gate2
```

初期ロールアウト：Gate2 は `INFO` → 段階的に `WARNING` → `passed` 条件に昇格。

---

## 7. マップ著述の移行

### 7-1. 移行2案の比較

**案 (a): 現行 tanada.ts からの逆生成**

- 利点: 現在の構図（背骨 x≈56・棚田配置・神社位置）を保持。`props`/`warps` 座標変更不要
- 問題: `blob()` が `this.rng.next()` に依存するため境界が決定論的に再現不可。`doteStep` の5本から H[] を逆引きすると曖昧さが残る。川岸影59%欠損等の構造欠陥を引き継ぐ

**案 (b): お手本を参照してゾーン定数から H[] + M[] を再設計**

- 利点: H[] が正確な設計意図を持ち、お手本への接近を最初から組み込める。既存欠陥を持ち越さない
- 問題: `props` 座標の再調整が必要。工数多め

**推奨: 案 (b)** を採用し、`props` は現行座標を流用する。お手本を参照しながら粗→補間→細の3ステップで H[] を確定させる。

### 7-2. ゾーン定数の宣言（tanada.ts 冒頭に追加）

```typescript
// src/data/maps/tanada.ts 冒頭に追加
const W = 112, H = 92;

// マクロ構図定数（高さ場・素材場の著述の根拠）
const SPINE_X     = 56;           // 中央背骨道の X 座標（現行 addPath の起点）
const SHRINE_ZONE = {x0:44,x1:68,y0:7,y1:20};   // 神社台（H2）
const WEST_PADDY  = {x0:0, x1:40, y0:15,y1:90};  // 西棚田ゾーン（H1）
const EAST_PADDY  = {x0:60,x1:112,y0:15,y1:90};  // 東棚田ゾーン（H1）
const RIVER_EAST_X = 79;          // 東川の中心 X
const VALLEY_Y    = 55;           // 谷床の Y 基準（H0）

// 高さレベル定数
const H0 = 0, H1 = 1, H2 = 2;
```

### 7-3. 著述 DSL の拡張（MapBuilder に追加）

```typescript
// src/field/mapbuilder.ts に追加
heightRect(x0: number, y0: number, x1: number, y1: number, h: number): void {
  for (let cy=y0; cy<=y1; cy++)
    for (let cx=x0; cx<=x1; cx++)
      this.setCornerHeight(cx, cy, h);
}

heightBlob(cx: number, cy: number, rx: number, ry: number, h: number): void {
  // blob の Set<number> 生成器を流用してコーナーグリッドに高さを書く
}

materialRect(x0: number, y0: number, x1: number, y1: number, m: number): void {
  for (let y=y0; y<y1; y++)
    for (let x=x0; x<x1; x++)
      this.materialField[y*W+x] = m;
}

setCornerHeight(cx: number, cy: number, h: number): void {
  const prev = this.heightField[cy*(W+1)+cx];
  if (Math.abs(h - prev) > 1 && prev !== 0)
    throw new Error(`Corner height gap > 1 at (${cx},${cy}): ${prev}→${h}`);
  this.heightField[cy*(W+1)+cx] = h;
}
```

### 7-4. tanada.ts の著述フロー（v2 移行後の構造）

```typescript
// 粗設計: ゾーン定数から H[] + M[] を塗る
b.heightRect(0, 0, W, H, H0);                           // 全面 H0
b.heightRect(SHRINE_ZONE.x0, SHRINE_ZONE.y0,
             SHRINE_ZONE.x1, SHRINE_ZONE.y1, H2);        // 神社台 H2
b.heightRect(WEST_PADDY.x0, WEST_PADDY.y0,
             WEST_PADDY.x1, WEST_PADDY.y1, H1);          // 西棚田 H1
b.heightRect(EAST_PADDY.x0, EAST_PADDY.y0,
             EAST_PADDY.x1, EAST_PADDY.y1, H1);          // 東棚田 H1

b.materialRect(0, 0, W, H, M.GRASS);                    // 全面草
b.materialRect(WEST_PADDY.x0, WEST_PADDY.y0,
               WEST_PADDY.x1, WEST_PADDY.y1, M.PADDY);  // 西棚田素材
// ... 東棚田・川・森・道・神社

// 補間: 境界1セルをなだらかに（手動 or interpolateHeight()）

// 細部手調整（現行 props 流用）
b.prop('obj_shrine', {x: 56, y: 14});  // 現行座標そのまま

// ビルド末尾: H[] × M[] → ground[]/deco[]/overhead[] を決定論的に導出
b.buildTiles();  // コーナータイラー + applyDirectionalShadow 内包
```

### 7-5. 段差自動生成（doteStep/wall の廃止）

```typescript
// src/field/mapbuilder.ts に追加
extractLevelBoundary(fromLevel: number, toLevel: number): Set<number> {
  const result = new Set<number>();
  for (let y=0; y<H-1; y++)
    for (let x=0; x<W; x++) {
      const h_cur = avgCornerH(x, y, this.heightField, W);
      const h_s   = avgCornerH(x, y+1, this.heightField, W);
      if (Math.round(h_cur) === fromLevel && Math.round(h_s) === toLevel)
        result.add(y*W+x);
    }
  return result;
}
```

`buildTiles()` 内で自動呼び出し：

```typescript
// H1→H0 の南向き境界 → kaIshigaki または kaDote
const h1h0_boundary = this.extractLevelBoundary(1, 0);
// 境界セルの素材から石垣/土手を自動選択
for (const i of h1h0_boundary) {
  const m = this.materialField[i];
  const tile = m === M.PADDY ? ISHI : DOTE;
  this.wall(tile, i%W, i%W, Math.floor(i/W));  // 既存 wall() 再利用
}
```

現行 `doteStep(38,41,72), doteStep(55,36,74)` 等の5行（`tanada.ts:262-266`）は削除される。

---

## 8. 段階的移行プラン

### Phase 0: 契約定義（前提整備）

**完了条件:** checker が新フォーマットを読める。既存マップが壊れない。

1. `tile_contract.json` に `cornerProfile` フィールドを追加（既存 `faceFrames` 維持）
2. `checker/heightmaps/_template.json` に `corners` フォーマットの記述を追加
3. `map_art_linter.py` の `load_height()` に `corners` 分岐を追記
4. `Ctx` に `corner_h(cx,cy)` / `tile_corners(x,y)` / `tile_corner_profile(key,frame)` ヘルパを追加
5. `ALL_CHECKS` に `adjacency_gap` / `edge_termination` / `transition_missing` / `water_streak` を追加（初期は全 INFO）

### Phase 1: タイラー実装

**完了条件:** `paintDualGrid()` が tanada のフラット地面を正しく再現できる。内角コーナーが選ばれる。

1. `src/field/tileset.ts` に `CornerMap` インターフェースと `CORNER_MAPS` 辞書を追加
2. `src/field/mapbuilder.ts` に `paintDualGrid()` を実装（`paintAuto` と並存）
3. `MapData` に `heightField` / `materialField` / `shadeLayer` を追加
4. `buildTiles()` パスを実装（`MapData.version >= 2` で分岐）
5. kaIshigaki の内角フレーム 12/13 を Forge で生成・追記
6. tanada に `version: 2` を付けてビルドし、目視確認

### Phase 2: シェーダ実装

**完了条件:** `gen_shade_pass.py` が高さ場から方向光を焼ける。草の彩度が復元される。

1. `forge/gen_shade_pass.py` を新設（`gen_cliff3.vgrad_multiply()` 流用）
2. `hdproc.py` に `--inset` オプション追加（デフォルト 0.08、v2 では 0.0）
3. `grade_wa.py` の草系 K 値を 0.20 に下げる（`K_OVERRIDE` 更新）
4. `forge/palettes/snes_forest.json` の緑3色を S+12〜15pt に更新
5. Forge プロンプトに `S>65%` 指定を追記
6. tanada を再生成し、お手本との彩度比較（`otehon_gate.py` の統計プリフィルタ初回実行）

### Phase 3: 不足パーツ生成

**完了条件:** 4不足パーツが `tile_contract.json` に登録され、コーナータイラーが参照できる。

1. `tile.ka_forest_front`（幹）を Forge で新規生成 → `tile_contract.json` に登録
2. `tile.ka_relief_ground`（起伏斜面）を Forge で新規生成 → 登録
3. `obj_spillway_side` の `tile_contract.json` を整備（`verticalModulePx`・`requiresAbove/Below`）
4. `buildTiles()` の森最前列検出・斜面自動選択を実装
5. 滝の自動プロップ配置を実装（`spillway()` 手置きの削除）

### Phase 4: tanada.ts 移行

**完了条件:** tanada.ts がゾーン定数 + H[] + M[] 著述に移行し、手置き段差コードが消える。

1. `tanada.ts` 冒頭にゾーン定数ブロックを追加（`SPINE_X` 等）
2. `MapBuilder` に `heightRect/heightBlob/materialRect/setCornerHeight` を追加
3. 粗 H[] を ゾーン定数から著述（`SHRINE_ZONE=H2, WEST_PADDY=H1` 等）
4. `extractLevelBoundary()` で境界 Set を自動生成 → 段差タイル自動配置
5. `doteStep()/wall()` の手置き5行を削除
6. `checker/heightmaps/tanada_h.json` を自動 export するビルドステップを追加
7. HEIGHT チェックが初めて「実データあり」で走ることを確認

### Phase 5: 検証・昇格

**完了条件:** 二層 DoD を通過。お手本ゲートが `passed` 条件に昇格。

1. お手本ゲートの閾値を `otehon.png` 実測値から設定
2. `ADJACENCY_GAP` / `EDGE_TERMINATION` / `WATER_STREAK` チェックを ERROR 昇格
3. `noiseHighFreqStdWarn` のスコープをベースタイルから除外
4. `gridSeamDeltaLumaWarn` を `INFO` に降格
5. `map-art-reviewer` エージェントを `passed_otehon=false` 時の第2層として CI に組み込む
6. tanada の最終スコアが Gate1 AND Gate2 を通過することを確認

---

## 9. リスクと未解決論点

### R1: paintAuto と paintDualGrid の二重管理

現行 `paintAuto`（`mapbuilder.ts:220-247`）と新 `paintDualGrid` が並存する移行期間、フレームの上書き順序バグが発生しやすい。対策：`buildTiles()` 内で v2 パスを後処理として追加し、v1 パスを上書きする順序を明示。`MapData.version` フラグで厳密に分岐する。

### R2: blob の Rng 依存と H[] の境界不一致

`blob()`（`mapbuilder.ts:178-190`）は `this.rng.next()` で縁をジッタするため、`materialField` の blob 境界と `heightField` の等高線が一致しない箇所が生じる。対策：`M[]` の塗りに `blob()` を使い、`H[]` は `heightRect/heightBlob` で独立して著述する（blob 境界と H[] 境界を切り離す）。

### R3: waDropshadow の二重管理（移行期間）

現行 `wall()` 内の `deco(SHADOW,1)` と `applyDirectionalShadow()` が両方走ると二重付与になる。対策：Phase 4 で `wall()` の内部 shadow 付与を削除するコミットと `applyDirectionalShadow()` 追加を同一コミットにまとめる。中途半端な移行コミットを作らない。

### R4: 専用パーツ未生成時のコーナータイラーの動作

`tile.ka_forest_front` 等が未生成のまま `buildTiles()` を走らせると、森最前列のフレーム参照が `undefined` になる。対策：`CornerMap` にフォールバックフレーム（既存 `kaForest2` の center）を必ず定義し、未生成パーツを参照した場合は `console.warn` で通知する。Phase 3 完了前は警告のみで生成を止めない。

### R5: コーナーグリッドを dump に含めるか

現行 `_dump/tanada.json` には高さ情報がない（`ground/deco/overhead/collision/props` のみ）。v2 では `heightField` を dump に追加する必要があるが、`dump_map.dump.test.ts` のスナップショット更新が発生する。対策：dump に `heightField` を `base64` エンコードで追加する。スナップショット更新は Phase 4 の一環として計画する。

### R6: 森最前列の cornerProfile 定義

森最前列タイル（`ka_forest_front`）の `cornerProfile` は「高さが変わるのか、それとも視覚的奥行きのみか」が未決定。判断基準：プレイヤーが森の南辺をすり抜けられる設計（`passable:false`）なら H が変わらない。視覚上の奥行きは `overhead` レイヤで表現する方が整合的。推奨：`cornerProfile = [H1,H1,H1,H1]`（高さ変化なし、overhead に葉天蓋を重ねる）。

### R7: お手本ゲートの閾値の偽陽性

彩度χ²距離・SSIM の閾値を `otehon.png` 実測前に設定すると、マップが正しくてもゲートを通過できない偽陽性が発生する。対策：Phase 2 でお手本ゲートを初回実行し、tanada の統計値を測定してから閾値を逆算する。最低3回の生成サイクルを経て閾値を確定する。

### R8: obj_spillway_side の verticalModulePx 未確認

`obj_spillway_side.png` のファイル実寸（64×128px と記録）が実際の縦モジュール数（1モジュール or 3モジュール）と一致するか未確認。`tile_contract.json` に登録する前に `PIL.Image.open().size` で実寸を確認し、`verticalModulePx` を実測値で定義すること。

---

## 10. v1.1 補正 — 完全性レビュー＋実コード検証の反映（実装はこの節を優先）

> 完全性批判フェーズ(critique)と実コード検証で判明した、§0–§9 を上書きする確定事項。
> 実装者はここを最優先で読むこと。critique 判定: coversAllUserPoints/coversAllRootCauses/implementableAgainstCode いずれも要補正。

### 10-1. 【最重要・訂正】平坦化の真因は grade_wa ではない
- 検証: `forge/grade_wa.py` TARGETS(L20-27)・`forge/flatten_tiles.py` TARGETS(L24)・`forge/deseam_tiles.py` は **旧"wa"世代タイル**(`tile_grass_wa.png` `tile_forest_wa.png` `tile_water_edge_wa.png` 等)のみが対象。現行 tanada が描画する **"ka"系**(`kaGrassCalm`/`kaForest2`/`kaPaddy2`/`kaRiver3`/`kaIshigaki`)は **これらの対象外**。
- 帰結: 「grade_wa/deseam の平坦化のツケで現行パーツが平坦」という §0・§1-5・§4-4 の前提は **ka系には不成立（誤帰属）**。
- 真因候補: (a) ka系の Forge 生成プロンプト自体に陰影要件が無い / (b) `hdproc.py` tileset モードの 8% インセット(L105 `ix=round(w*0.08)`)。
- 対応: §4-4「grade_wa の K 値変更」は ka系に無効なので **破棄**。Phase 0 で (a)/(b) のどちらが主因かを実測特定 → (a)なら生成プロンプトに陰影要件追加、(b)なら `hdproc.py --inset 0.0`(§4-3)で ka系再処理。

### 10-2. MapData 追加フィールドは全て optional（既存5マップ破壊回避）
- 検証: `src/field/tilemap.ts:53-88` は ground/deco/overhead/collision が必須。
- 確定: `version?: number; heightField?: Uint8Array; materialField?: Uint8Array; shadeLayer?: Uint16Array` を **全て optional** 追加。`buildTiles()` は `map.version >= 2` のときのみ参照。dump スナップショット更新は Phase 4 のコミットに含める。

### 10-3. お手本ゲートは AI レビューで上書き不可（根本原因の再導入防止）
- 確定: `passed_otehon` は統計プリフィルタ＋（実装後の）視覚比較でのみ決定。map-art-reviewer の役割は「差異の記述・改善提案(INFO診断)」に限定し **passed を上書きしない**。`passed_otehon=false` なら再生成ループを強制。AIレビュー出力は logs に保存し Forge プロンプトへのフィードバックに使う。

### 10-4. resolveEdgeTileSet() の判定ルール定義（2フィールドモデルの核心）
- 確定: 4隅 materialField の最多素材を base とし、隣接素材ペア(grass-paddy/grass-river/paddy-river/grass-forest 等)ごとに `CORNER_MAPS` の transition エントリ参照。未定義ペアは base の flat フレームにフォールバック（＋ TRANSITION_MISSING を WARNING 計上）。

### 10-5. gen_shade_pass.py の依存を実体化（空理空論の解消）
- 確定: (1) 新設 `forge/height_map.json` 形式 `{"tile.ka_grass_set": {"corners":[NW,NE,SW,SE]}, ...}`。(2) `SHADE_PASS_TARGETS` = proc_wa の PROC キーのうち手続きシェーディング対象（草系・水田系を列挙）。(3) `proc_wa.py` は hdproc 呼出後に `gen_shade_pass.shade_tile()` を **Python から直接**呼ぶ（サブプロセスでない）。

### 10-6. 川岸影の具体規則（59%欠損の確実な解消）
- 確定: `M[]==RIVER` セルの4近傍のうち `M[]!=RIVER`(=川岸)に `waDropshadow frame=1` を自動付与。川のどちら側かに関わらず全川岸に適用、既存 deco[] が非空なら上書きしない。`buildTiles()` に川岸影専用ステップを追加。WATER_STREAK はこの規則の充足を行単位で検査。

### 10-7. setCornerHeight は clamp（throw しない）＋後検査
- 確定: `setCornerHeight()` は clamp（警告のみ）。整合は `buildTiles()` で heightField 全走査し MAX_STEP=1 超の隣接角ペアを ERROR 列挙する **後検査モード**で担保（ゾーン著述の順序非依存）。§1-4/§7-3 のコードはこれに統一。

### 10-8. 石垣内角は4種すべて（SW/SE内角の欠落補修）
- 確定: §5-2(a) kaIshigaki extendedFaceFrames に `CORNER_SW_INNER:14` `CORNER_SE_INNER:15` を追記し内角4種(12-15)を全生成。シート 16f→20f（横2048→2560px）に拡張。パーツ仕様(forge/PART_GEN_SPECS_V2.md の石垣コーナーセット)と整合させる。

### 10-9. SEAM の INFO 降格は Phase 5（実装完了後）
- 確定: grid_seam の INFO 降格は Phase 5 の完了条件。Phase 1-4 は WARNING 維持。Phase 1 完了条件に「tanada 全面 paintDualGrid 描画で SEAM_VISIBLE 率 ≤10%」を追加。

### 10-10. マクロ構図はお手本座標から（現行座標の流用でない）
- 確定: ゾーン定数(SPINE_X/SHRINE_ZONE/VALLEY_Y)は お手本(otehon.png)とレンダのオーバーレイ比較で目測確定。`buildTiles()` にゾーン境界候補を INFO ログ出力するデバッグモードを組む。現行 addPath/blob 座標の逆算流用はしない。

### 10-11. 解像度の明文化＋素材場とコーナー場の独立
- 1論理タイル=128px=SS8倍描画。著述はタイル座標(W=112,H=92)で足り、1000×1000 ピクセル設計は不要。コーナー場は 113×93 個の整数。
- 素材場(タイル中心 W×H)と高さ場(コーナー)は独立。高さ差あり同素材=手続きシェーディング、高さ差あり異素材=resolveEdgeTileSet が境界タイル選択。
