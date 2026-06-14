# MAP_REVIEW_CASES.md — OK/NGケースDB（棚田の谷・蓄積型）

> 関連: [checker README](../checker/README.md) / [tile_contract](../checker/tile_contract.json)

---

## 使い方

- **レビュー時**: 全Caseと照合し、該当するNGパターンが存在しないかを確認してから合格判定する。
- **新しい違和感が出たら**: 原因を特定したうえで 1 Case 追記する。番号は連番で足す。
- **自動チェックとの対応**: 各 Case には `関連チェック` として checker の検査コードを記載している。自動検出できる項目は `checker/run_check.sh tanada` の出力 (`checker/out/tanada/art_qa_report.md`) で先に消すこと。
- **合格条件の数値基準**: 総合スコア 80 点以上 / ERROR 0 件 / 重大 WARNING 3 件以下。数値をクリアしても以下の Case に該当すれば差し戻す。

---

## Case 001: 棚田が青い四角形に見える

### 症状(NG)

kaPaddy2 の水田ブロックが周囲の草地と接続されず、「切り貼りした青い矩形」として浮いて見える。

### 原因

- `b.paintAuto()` を呼ばず、フレーム 0 の center タイルを平塗りしている。
- 南面に `kaIshigaki`（FACE=5）の石垣行が無く、上段と下段の高低差が表現されていない。
- 水田ブロックの外周に `kaEdgeOverlay`（seam_breaker）が配置されていないため 128px グリッドの切れ目が目立つ。

### 修正（どの素材で・どの接続ルールで）

1. `b.paintAuto(blob, PADDY, "kaPaddy2", "ground", true)` で autoframe を適用し、畦の曲線を出す。
2. 水田 blob の南端 `wallY` 行に `wall(ISHI, x0, x1, wallY, ISHI_L, ISHI_R, ...)` で苔石垣（`kaIshigaki`）の前面フレーム（FACE=5、角=ISHI_L=10/ISHI_R=9）を置く。
3. 石垣の真下（`capY+1`）行に `b.deco(x, capY+1, SHADOW, 3)` で最強影（frame=3）を敷く。
4. 水田ブロック縁に `b.scatterDecals(0.16, [12,13,14,15], nearStone, "tile.ka_edge_overlay_set")` で境界破砕オーバーレイを散布する。

### OK条件

- 水田ブロックが「溜まった水鏡」として読める（草地より高い位置の水面）。
- 石垣前面と落ち影が揃っており、1 行で「上端の縁＋縦面＋下の接地影」が完結している。
- 25% 縮小画像でも棚田の段差が判別できる（NOISE チェック合格が目安）。

### 関連チェック

`HEIGHT`（擁壁前面の真下の落ち影不足）、`SEAM`（128px 境界の明度差）、`NOISE`（高周波ノイズ）

### 関連文法

tile_contract.json `grammar.heightBoundary` / `tiles.kaPaddy2.needsRetainingWall`

---

## Case 002: 滝がオブジェクトを貼り付けただけに見える（西スピルウェイ）

### 症状(NG)

`obj.spillway` が石垣の切り欠きに置かれているが、上段に水源（kaPaddy2 の水田）が連続せず、下段に滝壺（kaRiver3 または kaPaddy2）が存在しない。滝だけが宙に浮いて見える。
現リンタ結果: `WATERFALL_NO_BASIN` WARNING（西スピルウェイ x1）

### 原因

- `spillway(x, wallY)` の呼び出し位置（`wallY+2` に prop を置く）と、上段水田の blob の y 範囲がずれており、obj.spillway の上端に water_surface タイルが接していない。
- 滝壺相当の water_surface / river セルが `wallY+3` 以降に存在しない。
- `tile_contract.json` の `props["obj.spillway"].requiresAbove` は `["water_surface","river","earth_bank","retaining_wall"]`、`requiresBelow` は `["river","water_surface","ground_grass","path"]` — 両方を満たしていない。

### 修正（どの素材で・どの接続ルールで）

1. `paddy(cx, cy, rx, ry, x0, x1, wallY, skipX)` の `skipX` 列が obj.spillway の x と一致しているか確認する。
2. `spillway(x, wallY)` の prop は `b.prop("obj.spillway", x, wallY+2, 16, 48, ...)` で配置されるため、`wallY-1` 行（上段水田の最下行）が kaPaddy2 で埋まっていること。
3. `wallY+3` 行以降に kaRiver3（river カテゴリ）または kaPaddy2（water_surface カテゴリ）を 1 行以上配置して滝壺を形成する。
4. 石垣切り欠き列（skipX）には石垣を置かないが、両隣の石垣フレームが切り欠きを「額縁」として見せること（ISHI_L=10 / ISHI_R=9 が切り欠き外側に来る配置）。

### OK条件

- `obj.spillway` の上下 1 タイル以内に water_surface または river カテゴリのタイルが連続している。
- checker `WATERFALL` チェックが WARNING 0 件。
- 25% 縮小で「上段水田→落ち口→石垣→滝→滝壺」の縦ラインが 1 本の流れとして読める。

### 関連チェック

`WATERFALL`（滝の水源・滝壺未接続）

### 関連文法

tile_contract.json `grammar.waterfall` / `props["obj.spillway"]`

---

## Case 003: 滝がオブジェクトを貼り付けただけに見える（東スピルウェイ）

### 症状(NG)

東の棚田（`paddy(45,24,...,47)` / `paddy(44,30,...,43)`）の `obj.spillway` が、下段水田または kaRiver3 に接続されていない。Case 002 と同じ症状が東側でも発生している。
現リンタ結果: `WATERFALL_NO_BASIN` WARNING（東スピルウェイ x1）

### 原因

- 東の棚田 2 段は `spillway(47,26)` と `spillway(43,33)` で配置される。
- 東の川（kaRiver3）のパスが `[[40,2],[38,9],[40,17],[38,26],[40,38],[39,45]]` であり、x=43〜47 付近を通らないため、スピルウェイ下段に river カテゴリが存在しない区間がある。
- 下段水田 blob（`paddy(44,30,...)`）の上端が `spillway(47,26)` の下端と接していない場合、water_surface も river も無い谷間が生じる。

### 修正（どの素材で・どの接続ルールで）

Case 002 と同手順。加えて:

- 東スピルウェイ下段に kaPaddy2（water_surface）または kaRiver3（river）のいずれかが隣接するよう、下段水田 blob の rx/ry または cy を微調整する。
- または東の川パスに `[45,26]` などを中継点として追加し、スピルウェイ下端を river カテゴリに接続する。

### OK条件

Case 002 と同じ。checker `WATERFALL` チェック WARNING 0 件。

### 関連チェック

`WATERFALL`（滝の水源・滝壺未接続）

### 関連文法

tile_contract.json `grammar.waterfall` / `props["obj.spillway"]`

---

## Case 004: 高台（神社）の正面が石垣で塞がれ、到達できない

### 症状(NG)

神社高台（x=23〜33, y=4〜9、PCAP=10）の南面石垣（kaShrineWall）に石段の切り欠きが無く、またはあっても鳥居から石段までの歩行経路が繋がっていない。「神社があるのに登れない」状態。

### 原因

- `isStair = (x) => x === 27 || x === 28` の skip 条件が `wall(SHRINE_WALL, PX0, PX1, PCAP, ...)` に渡っていない。
- `obj.shrine_stairs` の x/y が石垣切り欠きとずれており、歩行可セル（x=27,28・y=10〜12）が solidSet に残っている。
- 鳥居（`obj.torii` y=13）直後のセルが歩行不可になっており、道が石段入口に届いていない。
- tile_contract.json `grammar.shrine.toriiNeedsWalkableBehind = true` 違反。

### 修正（どの素材で・どの接続ルールで）

1. `wall()` に `isStair` を skip 関数として渡し、x=27,28 の PCAP 行に石垣を置かない。
2. `b.solid(sx, sy, false)` で石段通路（x=27,28 / y=10〜12）を歩行可にし solidSet から削除する。
3. `obj.torii`（y=13）の直後 y=12 が kaPath2 または歩行可セルになっていることを確認する。
4. checker `SHRINE` チェックの ERROR/WARNING が 0 件になることで確認する。

### OK条件

- `obj.torii`（x=27.5, y=13）→ `obj.shrine_stairs`（x=28, y=13/pitch=48px）→ kaShrineGround（y=4〜9）の縦導線が歩行可セルで繋がっている。
- checker `WALK` チェックで神社が到達可能ランドマークとして認識される。

### 関連チェック

`SHRINE`（鳥居の奥の通行性・石段の導線）、`WALK`（ランドマーク到達性）

### 関連文法

tile_contract.json `grammar.shrine` / `grammar.stair`

---

## Case 005: 草がノイズに見える（高周波チェッカー）

### 症状(NG)

kaGrassCalm を同一フレーム（例: frame=0）で全面塗りしたため、タイルの繰り返しパターンが「高周波ノイズ」として検出される。または逆に複数フレームをランダムに置いたが、分布が一様すぎてチェッカー模様に見える。

### 原因

- `gf(x, y)` のハッシュ散布を使わず、すべてのセルに `b.ground(x, y, GRASS, 0)` などの固定フレームを使っている。
- または `Math.random()` で散布したため、フレームの分布が空間的に相関を持たない（市松のチェッカー感）。
- tile_contract.json `thresholds.noiseHighFreqStdWarn = 0.16` — 画像の高周波 std がこの値を超えると WARNING。

### 修正（どの素材で・どの接続ルールで）

1. kaGrassCalm の center フレーム（0〜3）を `gf(x,y) % 4` で位置依存ハッシュにより散布する（`gf` 関数参照: tanada.ts L46〜50）。
2. 画像チェック: `checker/run_check.sh tanada screenshot.png` を実行し、checker `NOISE` チェックの `高周波ノイズ std` が 0.16 未満であることを確認する。
3. 25% 縮小（`thresholds.downscalePctReadability = 25`）で草が均質なベース地として読めることを目視確認する。

### OK条件

- checker `NOISE` チェック WARNING 0 件。
- 25% 縮小で草地が「静かなベース」として読め、主役（道・棚田・川）が埋もれていない。

### 関連チェック

`NOISE`（高周波ノイズ・画像解析）

### 関連文法

tile_contract.json `tiles.kaGrassCalm.role = "base_calm"` / `tiles.kaGrassCalm.preferredWalkableBase`

---

## Case 006: 森の端が 128px 単位で直線に切れる

### 症状(NG)

kaForest2 の森ブロックが 128px（8 論理タイル）グリッドに沿って直線状に切れており、「コピペした壁紙」のように見える。GPT 診断「接続文法が弱い」の典型例。

### 原因

- `b.invert(meadow)` で得た forest セットをそのまま paintAuto しているが、kaEdgeOverlay（seam_breaker）の散布量が不足、または forest 縁付近のみに限定されていない。
- 大判の `obj.curve_overlay_2x2`（seam_breaker）を森縁に配置していない。
- tile_contract.json `thresholds.gridSeamDeltaLumaWarn = 14.0` / `gridSeamFracWarn = 0.18` — 境界の明度差がこれを超えると SEAM WARNING。

### 修正（どの素材で・どの接続ルールで）

1. 森縁（`nearForest`）に `b.scatterDecals(0.22, [0,1,2,3], nearForest, "tile.ka_edge_overlay_set")` を適用する。
2. `obj.curve_overlay_2x2` または `obj.curve_overlay_3x1` を森の外縁の主要な 128px 境界ライン上（x=0,8,16,24,32,40,48 / y=0,8,16,24,32,40 付近）に点在させ、直線感を分断する。
3. `checker/run_check.sh tanada screenshot.png` で SEAM チェックを確認。

### OK条件

- checker `SEAM` チェック WARNING 0 件。
- 森の外縁フレームが autoframe の凸凹シルエットになっており、矩形に見えない。

### 関連チェック

`SEAM`（128px グリッド境界の明度差）

### 関連文法

tile_contract.json `categories.seam_breaker` / `tiles.kaEdgeOverlay`

---

## Case 007: 道がベージュの直線に見える

### 症状(NG)

kaPath2 の山道がマップを南北に一直線に走り、蛇行や幅変化が無く「ベージュの直線」として目立ちすぎる。または道の幅が均一すぎて「引いた線」に見える。

### 原因

- `b.path(roadPts, 1.8)` の制御点が直線的すぎる（中継点が少ない、または南北同一 x に並んでいる）。
- `b.paintAuto(road, PATH, "kaPath2", "ground")` は autoframe を適用するが、パス幅（radius=1.8）が一定のため autoframe が center フレームばかりになる。
- 道縁への kaEdgeOverlay 散布（frames 4〜7: 草の食い込み）が薄い、または抜けている。
- tile_contract.json `tiles.kaPath2.role = "winding_path"` — 蛇行が前提の素材。

### 修正（どの素材で・どの接続ルールで）

1. `roadPts` の制御点に x 方向の揺れを加える（例: `[28,44],[27,38],[29,31],[28,23]` のように交互にずらす）。
2. 道縁（`roadEdge`）に `b.scatterDecals(0.12, [4,5,6,7], roadEdge, "tile.ka_edge_overlay_set")` を適用し、草が道に食い込むエッジを作る。
3. 入場点クリアゾーン（x=26〜30, y=40〜44）は noFlower に登録し、道の入口を広く見せる。

### OK条件

- 25% 縮小で道が「蛇行する山道」として読め、ベージュの直線に見えない。
- 道縁に草の食い込みが見え、道と草地の境界がなめらか。

### 関連チェック

`REPEAT`（同一タイル連続）、`SEAM`（境界の切れ目）

### 関連文法

tile_contract.json `tiles.kaPath2` / `categories.path`

---

## Case 008: 川が地面の「青い帯」に見える

### 症状(NG)

kaRiver3 の川が「地面と同じ高さに貼り付けた青いタイル」として見える。低い谷（H0）として読めず、川の深さ・速さが伝わらない。

### 原因

- 川（river）の外周 1 タイルへの接地影（`b.deco(x,y,SHADOW,3)`）が欠けている。
- kaRiver3 の autoframe が正しく適用されておらず、川幅全体が同一フレーム（center）になっている。
- 川の幅が均一すぎて流れの変化が無い。
- tile_contract.json `tiles.kaRiver3.needsGroundShadow = true` / `grammar.river.needsBankShadow = true`。

### 修正（どの素材で・どの接続ルールで）

1. `b.expand(river, 1)` で川岸セットを取得し、`river.has(i)` でない各セルに `b.deco(x, y, SHADOW, 3)` を置く（frame=3=最強影）。
2. `b.paintAuto(river, RIVER, "kaRiver3", "ground", true)` で autoframe（カットバンク岸の凸凹）を適用する。
3. 川パスの制御点を増やして蛇行幅を変化させる（狭→広→狭の緩急）。

### OK条件

- 川岸全周に waDropshadow（frame=3）が配置されている。
- checker `RIVER` チェック WARNING 0 件。
- 25% 縮小で川が「地面を削って流れる低い谷」として読める。

### 関連チェック

`RIVER`（川岸の接地影）

### 関連文法

tile_contract.json `grammar.river` / `tiles.kaRiver3` / `categories.river`

---

## Case 009: 神域に棚田パーツが流用されている

### 症状(NG)

神社高台（x=23〜33, y=4〜9）の床に kaPaddy2（water_surface）または kaRiver3（river）が置かれている。「水田の中に鳥居が浮いている」ように見え、神聖さが失われる。

### 原因

- 神域の床塗りに `b.ground(x, y, SHRINE_GND, ...)` の代わりに PADDY または RIVER を使っている。
- `paddy()` の blob が神域 y 範囲（y=4〜9）にはみ出している。
- tile_contract.json `tiles.kaPaddy2.forbiddenOnGroundOf = ["shrine_ground"]` / `grammar.forbiddenAdjacency[0]`（shrine_ground + water_surface → WARNING）。

### 修正（どの素材で・どの接続ルールで）

1. 神域床塗り（y=GY0〜GY1, x=PX0〜PX1）は必ず `b.ground(x, y, SHRINE_GND, gf(x,y) % 8)` で上書きする。
2. `paddy()` の cy/ry を神域 y 範囲と重ならないよう調整する（西棚田の `paddy(10,13,5.0,1.4,...)` の cy=13 は GY1=9 より南なので基本問題ないが、ry が大きいと被る）。
3. checker `SHRINE` チェックの「神域への棚田/川タイル流用禁止」違反が 0 件になることで確認する。

### OK条件

- 神社高台内に kaPaddy2 / kaRiver3 / kaDote が一切存在しない。
- 神域の床が kaShrineGround のみで構成されている。
- checker `SHRINE` チェック ERROR/WARNING 0 件。

### 関連チェック

`SHRINE`（神域への棚田/川タイル流用禁止）

### 関連文法

tile_contract.json `grammar.shrine.forbiddenGroundCategories` / `grammar.forbiddenAdjacency`

---

## Case 010: 到達できない歩行ポケット（孤立歩行域）

### 症状(NG)

マップ上に歩行可（passable=true）なセルが孤立しており、南の入口（スポーン地点: x=28, y=44 周辺）から BFS でたどり着けない「浮き島」が存在する。
現リンタ結果: `WALK_ISLAND` WARNING（東側に到達できない歩行ポケット 72 セル）

### 原因

- 東の集落テラス（x=40〜51, y=10〜20 周辺）と中央スパインを繋ぐ枝道（`branchPts`）の radius が小さく、forest/solidSet との間に歩行可セルが残らない区間ができている。
- 水車小屋（`obj.watermill_channel`）または民家（`obj.minka_a/b`）の footW/footH が大きく、枝道を物理的にブロックしている。
- 橋（y=15）前後の solid 解除（`b.solid(x,15,false)` for x=36〜42）が行われているが、橋の西端 x=36 が forest セルで覆われ、橋への導線が切れている。

### 修正（どの素材で・どの接続ルールで）

1. `branchPts` の制御点（`[28,17],[35,15],[42,15],[47,17]`）の radius を 1.8〜2.0 に広げ、森との間に歩行可セルが途切れないようにする。
2. 橋両端（x=36 と x=42）が `solidSet` に入っていないこと、forest セットと重なっていないことを確認する。
3. checker `WALK` チェックで BFS 到達不能セル数が 0（または INFO 閾値以下）になることで確認する。
4. 孤立の疑いがある領域は `checker/out/tanada/warning_overlay.png` の `WALK_ISLAND` 色で可視確認する。

### OK条件

- checker `WALK_ISLAND` WARNING 0 件。
- 南入口から橋、集落、神社高台石段入口、すべてのランドマークに BFS 到達できる。

### 関連チェック

`WALK`（到達不能な歩行域・浮き島・ランドマーク到達性）

### 関連文法

tile_contract.json `grammar.bridge.needsPathConnect` / `categories.path`

---

## Case 011: 同一タイルの長い連続（反復バンド）

### 症状(NG)

kaPaddy2 または kaShrineGround の同一フレームが 4 タイル以上横に連続し、「市松の帯」または「ストライプ」として目立つ。
現リンタ結果: `REPEAT_RUN` WARNING（水田/平場の同一 frame 長連続）

### 原因

- `b.paintAuto()` を使っているが、blob が横長の矩形に近く、interior セル（全方向に隣接する center フレーム）が連続する。
- center フレームが 0〜3 のうち `gf(x,y) % 4` の散布が不十分で同一フレームのランが 3 超になっている。
- tile_contract.json `thresholds.repetitionRun = 3`（変種あり許容。変種を使えば長めのランも許容）、`repetitionAllowVariants = true`。

### 修正（どの素材で・どの接続ルールで）

1. kaPaddy2 の interior セルでは `gf(x,y) % 4` のハッシュ散布が各 frame を均等に使っていることを確認する。
2. kaShrineGround の神域床は `gf(x,y) % 8` で 8 フレームから散布する（tile_contract.json `tiles.kaShrineGround.variants = true`）。
3. 帯状に 4 以上連続する区間には kaEdgeOverlay（seam_breaker）を deco レイヤに重ね、視覚的なランを分断する。
4. checker `REPEAT` チェックの WARNING が 0 件になることで確認する。

### OK条件

- 同一フレームの連続が 3 タイル以下（または変種が混在）。
- checker `REPEAT_RUN` WARNING 0 件。

### 関連チェック

`REPEAT`（同一タイルの長い連続）

### 関連文法

tile_contract.json `thresholds.repetitionRun` / `thresholds.repetitionAllowVariants`

---

## Case 012: 橋の下に川が無い・橋台・道接続が欠けている

### 症状(NG)

`obj.bridge2` / `obj.bridge_shadow` が配置されているが、橋の下（y=15 付近）に kaRiver3（river カテゴリ）が存在しない、または橋台（`obj.bridge_abutment`）が片側だけ、または橋から kaPath2 への接続が途切れている。

### 原因

- 川パスの中継点が y=15 を通らず、橋の下が ground_grass になっている。
- `b.prop("obj.bridge_abutment", 36, 15, ...)` と `b.prop("obj.bridge_abutment", 42, 15, ...)` の x 座標が橋床の両端（`obj.bridge2` の x+0 と x+2 付近）とずれている。
- `b.solid(x,15,false)` と kaPath2 の塗りが x=36〜42 の全範囲に適用されておらず、橋中央に solid セルが残っている。
- tile_contract.json `props["obj.bridge2"].requiresBelow = ["river"]` / `endcaps = ["obj.bridge_abutment"]` / `pathConnect = true`。

### 修正（どの素材で・どの接続ルールで）

1. 川パスに y=15 の制御点（例: `[40,15]` 付近）を追加し、橋直下に river セルを確保する。
2. 橋台は橋床の両端キャップ位置（x=36 と x=42）に `ysort:true` で配置する。
3. `b.solid(x,15,false)` の range を x=36〜42 全セルに適用し、`b.ground(x,15,PATH,0)` で道タイルを敷く。
4. 橋下影（`obj.bridge_shadow`）は橋床（`obj.bridge2`）より先に `ysort:false` で挿入する（レイヤー順）。
5. checker `BRIDGE` チェック WARNING 0 件で確認する。

### OK条件

- 橋の下に kaRiver3 が 1 タイル以上存在する。
- `obj.bridge_shadow`→`obj.bridge2`→`obj.bridge_abutment`×2→kaPath2 の接続セットが揃っている。
- checker `BRIDGE` チェック ERROR/WARNING 0 件。

### 関連チェック

`BRIDGE`（川・橋台・橋下影・道接続）

### 関連文法

tile_contract.json `grammar.bridge` / `props["obj.bridge2"]`

---

*最終更新: 2026-06-14 — 棚田の谷 第4版レビュー時の WARNING 4 件（WATERFALL x2・WALK_ISLAND x1・REPEAT_RUN x1）を Cases 002〜003・010〜011 として収録。*
