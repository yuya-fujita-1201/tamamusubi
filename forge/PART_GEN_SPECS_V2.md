# パーツ生成準備仕様 v2（玉結びマップ生成v2・5部品ファミリー）

> Opus 4.8 並列サブエージェントがお手本(ZZ-HCP-logs/023/otehon.png)を直接視認し、既存forge資産に接地して作成。
> **ドラフト**: quality/MAP_GEN_V2_DESIGN.md §10 の確定事項で再調整のこと（特に石垣内角SW/SE=frame14/15、平坦化真因）。

## kaIshigaki / kaShrineWall (retaining_wall ファミリー)

**お手本観察:** お手本(otehon.png)を実際に視認した観察: 棚田帯の石垣は俯瞰35度の3点セット構造が徹底されている。(1)最上部=笠石・明るい帽子辺: 白〜薄黄緑の平石が一列、左上光源で強ハイライト、テラス上面の草が直上に見える。(2)中段=縦面: 玉石積み(nozura-zumi)が前面に露出、各石は楕円形で上面明・下面暗の強い球面シェーディング、苔が目地に絡み、全体に深い彩度の暗緑が乗る。(3)最下部=接地影: 低地の草面に暗い落ち影が2〜3px幅で引かれ、壁が地面に接地していることを示す。角部では笠石がなだらかなアーク状に曲がって回り込み、鋭い90度は皆無。SW角とSE角(南向き角)ではキャップ→縦面→接地影の全3点が斜め方向に回り込んでいる。半割りピース(上半分=地肌・下半分=壁前面)はテラス入口付近で観察でき、南端1タイルの上半分がka_grassと同一の草地、下半分のみ壁前面(笠石+縦面のみ・接地影なし)となる構造が読み取れる。神社壁(kaShrineWall)は整然とした切石(ashlar)で色調がクールグレー系だが3点セット構造は同一。現在のchecker出力は四隅・端のバリエーションが単調で、角ピースが1種類しかなく曲線回りこみが表現できていない。

**既存資産:**
- `tile_ka_ishigaki.png (tile.ka_ishigaki_set)`: 4x4=16フレーム。faceFrames:[5,9,10]で f5=直線前面(S edge)、f9=SE角(South-East外角)、f10=SW角(South-West外角)。Row1(f0-3)=フラット地表、Row2(f4-7)=N/S/W/E端、Row3(f8-11)=NW/NE/SW/SE外角、Row4(f12-15)=アクセント。生成プロンプト上は外角・端が定義されているが、角ピースの画像品質(曲線回り込み、笠石アーク、接地影の方向)が不十分で四隅の高さ整合に使えない。半割り(上地肌/下壁)・内角(凹角)・W端/E端キャップ単独フレームが存在しない。
- `tile_ka_shrine_wall.png (tile.ka_shrine_wall_set)`: 4x4=16フレーム。faceFrames:[5,9,10]同様の構造。プロンプト上SE角=f9、SW角=f10が定義済みだが、half-split・内角・W端/E端単独キャップが不在。笠石の水平方向アークが要角ピースと確認。
- `tile_wa_ishigaki.png / tile_wa_ishigaki2.png`: 旧世代waファミリー(低解像度・低彩度)。4x4=16フレーム。kaシリーズとはパレット・画風が別物。v2コーナーベース設計では参照のみ。不足点: 角ベース契約に対応するフレームマッピングが未定義。
- `assets_plan.json: tile.ka_ishigaki / tile.ka_shrine_wall エントリ`: 各1エントリ、preset=world_coastline_16。生成プロンプトはRow1-4の16フレーム全体を一括で記述しているが、コーナーベース高さ契約の角ごとの素材/高さパターンは記載なし。half-splitおよびW端/E端単独エントリは存在しない。

**必要パーツ:**
### kaIshigaki_SW_corner (f10再生成強化)
- 高さ/素材パターン: [左上=H1地肌, 右上=H1地肌, 左下=H0低地, 右下=H0低地] — タイル左辺と下辺が高さH1→H0の境界。SW外角: 笠石が左下に向けてアーク状に曲がり、縦面が南向き+西向きの2方向に回り込む
- フレーム配置: 既存f10(3行目・2列目)を再生成強化。corner配置。外角1枚(128x128)として単独生成しstrip内のf10位置に合成。既存faceFrames概念ではface=f5の左端と同一行。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺全幅=ka_grass平場と接続(高さH1)。右辺=kaIshigaki直線前面f5と接続(笠石ラインが同一高さでフラットに繋がること)。下辺=waDropshadowと接続(接地影幅一致)。左辺=地面(H1またはH0)と接続。罫線条件: 笠石上端ラインがf5と同一水平位置(上端から20-26px)であること、縦面の石目がf5と連続すること。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour warm light, hand-painted Ghibli-like SNES-era pixel art. Single 128x128 OUTER SOUTH-WEST CORNER tile for a mossy stone retaining wall (kaIshigaki). The wall top is at the upper edge; the lower ground (H0) is at the bottom. THREE-LAYER STACK wraps around the SW arc: (A) COPING CAP top 22px: pale grey-green flat capstones curving around the outer corner in a SMOOTH ARC (not 90-degree), bright upper-left highlight on each stone, last cap stone rounds toward the west face; (B) STONE FACE middle 65px: rounded fieldstones (nozura-zumi玉石) turning the SW corner, each cobble bright on the upper-left curve, deep shadow in the lower-right crevice, warm grey-brown and moss-green palette, the south-facing stones visible on the right half and the west-facing stones visible on the left half, depth reads as a real 3D corner; (C) BASE SHADOW lower 20px: warm dark contact shadow arcing around the outer corner on the lower ground. Palette matches: capstone highlight #d8c8a0, stone mid #8a7a68, moss shadow #3a4a28, base shadow #2a2a20, upper grass lip #7ab85a. No grid lines, no text, no characters. 128x128 px, opaque.`

### kaIshigaki_SE_corner (f9再生成強化)
- 高さ/素材パターン: [左上=H1地肌, 右上=H1地肌, 左下=H0低地, 右下=H0低地] — SE外角: 笠石が右下に向けてアーク状、縦面が南向き+東向きの2方向に回り込む
- フレーム配置: 既存f9(3行目・1列目)を再生成強化。corner配置。外角1枚(128x128)。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺全幅=ka_grass平場(H1)。左辺=kaIshigaki直線前面f5と接続(笠石ライン同高さ)。下辺=waDropshadow。右辺=地面。笠石アーク上端が左辺接続点から右辺接続点にかけて水平に維持されること(ズレ0px)。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour warm light, Ghibli-like SNES-era pixel art. Single 128x128 OUTER SOUTH-EAST CORNER tile for a mossy stone retaining wall (kaIshigaki). THREE-LAYER STACK: (A) COPING CAP top 22px: pale grey-green capstones curving SE in a smooth arc, strong top-left highlight; (B) STONE FACE middle 65px: rounded fieldstones turning the SE corner — south face visible on left half, east face visible on right half, each stone with upper-left bright and lower-right dark shading, moss in joints; (C) BASE SHADOW lower 20px: warm dark contact shadow arcing around SE corner. Palette: capstone highlight #d8c8a0, stone #8a7a68, moss #3a4a28, shadow #2a2a20, grass lip #7ab85a. 128x128 px, opaque, no text.`

### kaIshigaki_W_end (f4: 直線前面西端キャップ)
- 高さ/素材パターン: [左上=H1, 右上=H1, 左下=H0, 右下=H0] — 壁前面の西端末端。左辺が壁の終端で右辺が直線前面。笠石が左端で丸く終端する。縦面も左側で終端処理(小さな丸石の終端)。
- フレーム配置: 既存f4(2行目・0列目)の再生成強化。edge/end配置。face1枚。
- 生成区分: **new-forge-gen**
- 接続アンカー: 右辺=kaIshigaki直線前面f5と笠石・縦面の連続性を保つ。左辺=地面(ka_grass H1またはH0)で笠石が終端し草が回り込む。上辺=H1地肌。下辺=waDropshadow。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 WEST END-CAP tile for a mossy stone retaining wall (kaIshigaki) — the left terminus of a wall run. THREE-LAYER: (A) CAP top 22px: capstones ending at the left edge with a small rounded terminal stone, gentle leftward grass intrusion, right side connects seamlessly to the straight cap; (B) STONE FACE middle 65px: rounded fieldstones ending at the left with a slightly projecting terminal stone, small tuft of wild grass growing beside the end stone; (C) BASE SHADOW lower 20px: shadow fades out at the left end. 128x128, opaque, no text.`

### kaIshigaki_E_end (f7: 直線前面東端キャップ)
- 高さ/素材パターン: [左上=H1, 右上=H1, 左下=H0, 右下=H0] — 右辺が壁の終端。笠石が右端で丸く終端。
- フレーム配置: 既存f7(2行目・3列目)の再生成強化。edge/end配置。face1枚。
- 生成区分: **new-forge-gen**
- 接続アンカー: 左辺=kaIshigaki直線前面f5と連続。右辺=地面で笠石が終端。下辺=waDropshadow。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 EAST END-CAP tile for a mossy stone retaining wall (kaIshigaki) — the right terminus of a wall run. THREE-LAYER: (A) CAP top 22px: capstones ending at the right with a rounded terminal stone, small grass tuft; (B) STONE FACE middle 65px: fieldstones ending at the right with a slightly projecting terminal stone; (C) BASE SHADOW lower 20px: fades out at the right. 128x128, opaque, no text.`

### kaIshigaki_half_split_S_face (新規: 上半=地肌・下半=壁前面)
- 高さ/素材パターン: [左上=H1地肌, 右上=H1地肌, 左下=H1地肌, 右下=H1地肌] — タイル全体がH1だが、視覚的に下64pxが壁前面(南向き)、上64pxが地表草地。高さ差は『半タイル』相当で壁厚みを表す。半割り:上下で素材が変わる/高さは変わらない特殊ケース。
- フレーム配置: 新規フレーム(f16相当)として別ファイルtile_ka_ishigaki_half.pngで生成。128x128 1枚。既存faceFrames外に追加する新しいカテゴリ。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺=ka_grass(H1地肌)とシームレスに接続。上半64px内の草質感がka_grassのcalm変種と一致。下辺=waDropshadow(接地影)。左辺・右辺はf5(直線前面)と笠石高さが一致。縦面の高さが半分(32-40px)になるため接地影もf5より薄い。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour, Ghibli-like SNES-era pixel art. Single 128x128 HALF-HEIGHT SPLIT tile for a mossy stone retaining wall (kaIshigaki) — upper half is GRASS PLATEAU SURFACE, lower half is WALL FACE. TOP HALF (y=0 to y=64): flat calm plateau grass, matcha-green, matching ka_grass_calm — seamless with adjacent grass tiles, no wall visible, faint grass blades pointing various directions. BOTTOM HALF (y=64 to y=128): a REDUCED-HEIGHT version of the full wall face — (A) COPING CAP at y=64 to y=80: pale grey-green capstones with bright top-left highlight; (B) SHORT STONE FACE y=80 to y=112: rounded nozura-zumi fieldstones, about 32px height instead of the usual 65px, same stone palette and moss detail; (C) CONTACT SHADOW y=112 to y=128: warm dark base shadow on lower ground. The grass-to-cap boundary at y=64 must be a clean crisp horizontal line. 128x128, opaque, no text, no isometric.`

### kaIshigaki_half_split_SW_corner (新規: 上地肌・下SW角)
- 高さ/素材パターン: [左上=H1地肌, 右上=H1地肌, 左下=H0, 右下=H0] — 上半分=草地、下半分=SW外角の壁前面。テラス南西隅の入口付近で必要。
- フレーム配置: 新規フレーム、tile_ka_ishigaki_half_corner.pngに2フレーム(SW/SE)として生成(256x128、f0=SW半割り、f1=SE半割り)。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺=ka_grass(H1)。右辺=kaIshigaki_half_split_S_face(半割り直線)と笠石ライン一致(y=64)。左辺=地面またはH0草地。下辺=waDropshadow。笠石アークが右半分から左下にかけて始まり、縦面がSW方向に折れる。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 HALF-HEIGHT SOUTH-WEST CORNER SPLIT tile for a mossy stone retaining wall (kaIshigaki). TOP HALF (y=0 to y=64): flat calm plateau grass seamless with adjacent grass. BOTTOM HALF (y=64 to y=128): SW outer corner version of the half-height wall — coping cap arc (y=64-80) curving SW in a smooth arc, short stone face (y=80-112) turning the SW corner with nozura-zumi fieldstones, base shadow arc (y=112-128). Same palette as full-height SW corner. 128x128, opaque, no text.`

### kaIshigaki_half_split_SE_corner (新規: 上地肌・下SE角)
- 高さ/素材パターン: [左上=H1地肌, 右上=H1地肌, 左下=H0, 右下=H0] — SE外角の半割り版。
- フレーム配置: tile_ka_ishigaki_half_corner.png の f1=SE半割り(256x128の右128px)。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺=ka_grass(H1)。左辺=kaIshigaki_half_split_S_face(笠石ライン同高さ)。右辺=地面。下辺=waDropshadow。笠石アークが左半分から右下に向かう。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 HALF-HEIGHT SOUTH-EAST CORNER SPLIT tile (kaIshigaki). TOP HALF (y=0-64): flat calm plateau grass. BOTTOM HALF (y=64-128): SE outer corner half-height wall — cap arc curving SE (y=64-80), short stone face turning SE (y=80-112), base shadow arc (y=112-128). 128x128, opaque, no text.`

### kaShrineWall_SW_corner (f10再生成強化)
- 高さ/素材パターン: [左上=H2神域地肌, 右上=H2, 左下=H1, 右下=H1] — 神社高台SW外角。笠石がアーク状に曲がるが整然とした切石(ashlar)で農村ishigakiより直線的なアーク。
- フレーム配置: tile.ka_shrine_wall_set の f10(3行目・2列目)を再生成強化。corner配置。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺=kaShrineGround(H2)。右辺=kaShrineWall直線前面f5(笠石ライン同高さ)。下辺=waDropshadow。左辺=H1地面。笠石は dressed ashlar で直線的だがアーク状に曲がること。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette with cool sacred shrine tone, golden-hour warm light, SNES-era Ghibli pixel art. Single 128x128 OUTER SOUTH-WEST CORNER tile for a SHRINE PLATEAU dressed-stone retaining wall (kaShrineWall). THREE-LAYER: (A) COPING CAP top 22px: cool pale-grey dressed ashlar capstones (more rectangular and precise than rural ishigaki) curving SW in a smooth measured arc, bright top-left highlight #d8d0bc on each stone; (B) STONE FACE middle 65px: orderly dressed stone courses turning the SW corner, cool grey #8a857a, subtle horizontal mortar lines, sparse moss #6a8a52 in select joints, south face visible on right half and west face on left half; (C) BASE SHADOW lower 20px: deep cool shadow #2a2820 arcing around SW corner. Sacred and maintained feeling. 128x128, opaque, no text.`

### kaShrineWall_SE_corner (f9再生成強化)
- 高さ/素材パターン: [左上=H2, 右上=H2, 左下=H1, 右下=H1] — SE外角の神社壁版。
- フレーム配置: tile.ka_shrine_wall_set の f9(3行目・1列目)。corner配置。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺=kaShrineGround(H2)。左辺=kaShrineWall直線前面f5(笠石ライン同高さ)。下辺=waDropshadow。右辺=H1地面。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, cool sacred shrine tone, golden-hour, SNES-era pixel art. Single 128x128 OUTER SOUTH-EAST CORNER tile for a shrine dressed-stone retaining wall (kaShrineWall). THREE-LAYER: (A) CAP top 22px: rectangular ashlar capstones curving SE in smooth arc, highlight #d8d0bc; (B) STONE FACE middle 65px: dressed stone courses turning SE corner, cool grey #8a857a, sparse moss joints; (C) BASE SHADOW lower 20px: deep cool shadow #2a2820. 128x128, opaque, no text.`

### kaIshigaki_NW_inner_corner (f8: 凹角NW、低優先)
- 高さ/素材パターン: [左上=H0低地, 右上=H1地肌, 左下=H0低地, 右下=H1地肌] — 凹(内)角。壁が北向きと西向きに同時に曲がり込む場所。笠石が右辺から上辺に向けてL字状に折れる。
- フレーム配置: 既存f8(3行目・0列目)の再生成または手続きシェーディングで対処。低優先(v2設計確認後)。
- 生成区分: **procedural-shading**
- 接続アンカー: 右辺=f5(直線前面)と笠石水平ライン一致。上辺=f5(直線前面)と笠石垂直ライン一致。左辺・下辺=H0地面またはH0草地。高さズレ条件: 笠石の交差点(右上コーナー付近)が左右・上下ともに同一高さに来ること。

**パレット方針:** 既存パレット snes_forest.json (石色相当: #6f5f4b, 草: #5fa34a/#9fd16b, 影: #1b1b2f) はka_ishigakiの生成プロンプトで上書き指定されているので直接使われていない。assets_plan.json の生成プロンプト内では stone mid #8a7a68 / capstone highlight #d8c8a0 / moss shadow #3a4a28 / base shadow #2a2a20 / grass lip #7ab85a (kaIshigaki系)、 #8a857a / #6a8a52 / #2a2820 / #d8d0bc / #7ab85a (kaShrineWall系) を直接指定。お手本との差: お手本はコントラスト比が高く、笠石が明るく白っぽい(目安 #e8e0c0)のに対し、現在の生成では #d8c8a0 止まりでやや暗め。縦面の石は深い暗緑影を持ち、現在の grade_wa.py で石系は K_OVERRIDE=0.35-0.5 と控えめ設定 → 石灰緑が若干明るすぎて壁面の深さが出ていない。対策: 新規生成プロンプトで capstone を #e8e0c8 以上に明示、石面暗部を #2a2a18 以下に明示し、grade_wa の石系 K_OVERRIDE を 0.6 程度に上げることでお手本の高コントラスト/彩度に寄せる。kaShrineWall のクールグレーはグリーン域での grade を抑制し (#H=180-220) ライトグレー側を維持すべく、grade_wa に kaShrineWall 系の除外リスト追加が望ましい。

**Forgeコマンド草案:** #!/usr/bin/env python3
"""
gen_ka_ishigaki_corners_post.py
kaIshigaki / kaShrineWall の四隅・端・半割りパーツを
assets_plan.json に追記して gen_runner.mjs で生成するためのスクリプト草案。

実行前提:
  1. v2 設計ドキュメント確定後、assets_plan.json の新エントリを確定する。
  2. python3 forge/gen_ka_ishigaki_corners_post.py  -- plan に追記
  3. node forge/gen_runner.mjs --only tile.ka_ishigaki_sw,tile.ka_ishigaki_se,...
  4. python3 forge/proc_wa.py --only tile.ka_ishigaki_corners  (strip生成)
  5. python3 forge/grade_wa.py  (grade適用: K_OVERRIDE追記後)

== assets_plan.json 追記エントリ (JSON) ==

{
  "id": "tile.ka_ishigaki_sw_corner",
  "name": "kaIshigaki SW外角 強化再生成",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, golden-hour warm light, Ghibli-like SNES-era pixel art. Single 128x128 OUTER SOUTH-WEST CORNER tile for a mossy stone retaining wall (kaIshigaki). THREE-LAYER STACK wraps SW arc: (A) COPING CAP top 22px: pale grey-green capstones curving SW arc (NOT 90-degree), highlight #e8e0c8; (B) STONE FACE middle 65px: nozura-zumi rounded fieldstones turning SW corner, south face on right half, west face on left half, bright upper-left highlight per stone, deep crevice shadow #2a2a18, warm moss-green #3a4a28 joints; (C) BASE SHADOW lower 20px: warm dark contact shadow arcing SW #2a2a20. Palette: cap #e8e0c8, stone #8a7a68, shadow #2a2a18, grass #7ab85a. 128x128 opaque, no text."
},
{
  "id": "tile.ka_ishigaki_se_corner",
  "name": "kaIshigaki SE外角 強化再生成",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 OUTER SOUTH-EAST CORNER tile (kaIshigaki). THREE-LAYER: (A) CAP top 22px: capstones curving SE arc, highlight #e8e0c8; (B) STONE FACE middle 65px: fieldstones SE corner, south face left half, east face right half, deep shadow #2a2a18; (C) SHADOW lower 20px: arc #2a2a20. 128x128 opaque, no text."
},
{
  "id": "tile.ka_ishigaki_half_S",
  "name": "kaIshigaki 半割り南前面 (上地肌/下壁)",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 HALF-HEIGHT SOUTH FACE tile (kaIshigaki). TOP HALF y=0-64: flat calm plateau grass matching ka_grass_calm (matcha #8abf5a, low noise). BOTTOM HALF y=64-128: (A) COPING CAP y=64-80: pale capstones #e8e0c8; (B) SHORT STONE FACE y=80-112: nozura-zumi 32px height, moss joints; (C) SHADOW y=112-128: #2a2a20. Boundary at y=64 is clean horizontal. 128x128 opaque, no text."
},
{
  "id": "tile.ka_ishigaki_half_sw",
  "name": "kaIshigaki 半割りSW角 (上地肌/下SW壁)",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 HALF-HEIGHT SW CORNER SPLIT (kaIshigaki). TOP HALF y=0-64: calm plateau grass (ka_grass_calm). BOTTOM HALF y=64-128: SW arc cap y=64-80, short stone face turning SW y=80-112, base shadow arc y=112-128. 128x128 opaque, no text."
},
{
  "id": "tile.ka_ishigaki_half_se",
  "name": "kaIshigaki 半割りSE角 (上地肌/下SE壁)",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, golden-hour, SNES-era pixel art. Single 128x128 HALF-HEIGHT SE CORNER SPLIT (kaIshigaki). TOP HALF y=0-64: calm plateau grass. BOTTOM HALF y=64-128: SE arc cap y=64-80, short stone face SE y=80-112, base shadow arc y=112-128. 128x128 opaque, no text."
},
{
  "id": "tile.ka_shrine_wall_sw_corner",
  "name": "kaShrineWall SW外角 強化再生成",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, cool sacred shrine tone, golden-hour, SNES-era pixel art. Single 128x128 OUTER SOUTH-WEST CORNER (kaShrineWall). THREE-LAYER: (A) CAP top 22px: rectangular ashlar capstones arcing SW, highlight #d8d0bc; (B) FACE middle 65px: dressed stone courses SW corner, cool grey #8a857a, sparse moss #6a8a52; (C) SHADOW lower 20px: deep cool #2a2820. 128x128 opaque, no text."
},
{
  "id": "tile.ka_shrine_wall_se_corner",
  "name": "kaShrineWall SE外角 強化再生成",
  "preset": "world_coastline_16",
  "priority": 1,
  "prompt": "Bright mythical-Japan satoyama palette, cool sacred shrine tone, golden-hour, SNES-era pixel art. Single 128x128 OUTER SOUTH-EAST CORNER (kaShrineWall). THREE-LAYER: (A) CAP top 22px: ashlar cap SE arc #d8d0bc; (B) FACE middle 65px: dressed stone SE #8a857a, sparse moss; (C) SHADOW lower 20px: #2a2820. 128x128 opaque, no text."
}

== proc_wa.py 追記エントリ ==

# 以下を PROC dict に追加:
"tile.ka_ishigaki_sw_corner": dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_ishigaki_sw.png",  keys=["tile.ka_ishigaki_sw"]),
"tile.ka_ishigaki_se_corner": dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_ishigaki_se.png",  keys=["tile.ka_ishigaki_se"]),
"tile.ka_ishigaki_half_S":    dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_ishigaki_half_s.png", keys=["tile.ka_ishigaki_half_s"]),
"tile.ka_ishigaki_half_sw":   dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_ishigaki_half_sw.png", keys=["tile.ka_ishigaki_half_sw"]),
"tile.ka_ishigaki_half_se":   dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_ishigaki_half_se.png", keys=["tile.ka_ishigaki_half_se"]),
"tile.ka_shrine_wall_sw_corner": dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_shrine_wall_sw.png", keys=["tile.ka_shrine_wall_sw"]),
"tile.ka_shrine_wall_se_corner": dict(mode="tile", fw=128, fh=128, cols=1, rows=1, out="tile_ka_shrine_wall_se.png", keys=["tile.ka_shrine_wall_se"]),

== grade_wa.py TARGETS 追記 ==

TARGETS に追加:
  "tile_ka_ishigaki_sw.png", "tile_ka_ishigaki_se.png",
  "tile_ka_ishigaki_half_s.png", "tile_ka_ishigaki_half_sw.png", "tile_ka_ishigaki_half_se.png",
  "tile_ka_shrine_wall_sw.png", "tile_ka_shrine_wall_se.png"

K_OVERRIDE に追加 (石材系は控えめ・お手本高コントラストに寄せるため既存 0.35 より少し上):
  "tile_ka_ishigaki_sw.png": 0.6,
  "tile_ka_ishigaki_se.png": 0.6,
  "tile_ka_ishigaki_half_s.png": 0.55,
  "tile_ka_ishigaki_half_sw.png": 0.55,
  "tile_ka_ishigaki_half_se.png": 0.55,
  # shrine壁はクールグレー維持のためgradeを抑制
  "tile_ka_shrine_wall_sw.png": 0.25,
  "tile_ka_shrine_wall_se.png": 0.25,

== 生成実行コマンド ==

# 1. assets_plan.json に上記エントリを追記（手動またはスクリプト）
# 2. 生成
node /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/forge/gen_runner.mjs --only tile.ka_ishigaki_sw_corner,tile.ka_ishigaki_se_corner,tile.ka_ishigaki_half_S,tile.ka_ishigaki_half_sw,tile.ka_ishigaki_half_se,tile.ka_shrine_wall_sw_corner,tile.ka_shrine_wall_se_corner
# 3. 後処理
python3 /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/forge/proc_wa.py --only tile.ka_ishigaki_sw_corner,tile.ka_ishigaki_se_corner,tile.ka_ishigaki_half_S,tile.ka_ishigaki_half_sw,tile.ka_ishigaki_half_se,tile.ka_shrine_wall_sw_corner,tile.ka_shrine_wall_se_corner
# 4. グレーディング
python3 /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/forge/grade_wa.py
# 5. 品質確認
node /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/checker/map_art_linter.js 2>/dev/null || python3 /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/checker/map_art_linter.py

**再調整前提:** 以下の点はv2設計ドキュメント確定後に再調整が必要:

1. **faceFrames番号の再マッピング**: 現在のfaceFrames:[5,9,10]はf5=S直線・f9=SE・f10=SWの3点セット。v2コーナーベース拡張で新規パーツが追加された場合、tileset.ts の TRANS_MAPS およびmapbuilder.ts の paintAuto ロジックがコーナーIDを参照する形に拡張されるまで、新規パーツはtile_contractに別キーで登録し手動配置に限定する。

2. **半割りパーツの高さ契約定義**: 半割り(上地肌/下壁)の「高さ」は現行の corner[TL,TR,BL,BR]=[1,1,1,1]のまま素材だけが変わる特殊ケース。v2の高さ角契約でこれをどう表現するか(新フィールド splitY や materialMap 等)は設計ドキュメント側で定義が必要。確定前は tile_contract に _experimental: true を付けて登録。

3. **grade_wa.py の石系K_OVERRIDE上限**: 現在0.35-0.5。新規パーツを0.6にすると既存の暗すぎないバランスと一時的に乖離する。v2設計でグレーディングを廃止してプロンプト直接指定に移行する場合は grade 適用を省略。

4. **内角(凹角)NW/NEパーツ**: 現在 procedural-shading 扱いとしたが、v2のオートタイル拡張で凹角の出現頻度が確定してから new-forge-gen に格上げするか判断する。

5. **tile_contract.json のfaceFrames拡張**: 新規パーツを登録する際は faceFrames の記法を [south_face, se_corner, sw_corner, s_half, sw_half, se_half, w_end, e_end] 等に拡張する必要があるが、schema変更はv2ドキュメントの tile_contract.schema.json 更新と連動させること。

6. **checker/map_art_linter.py の角検査ルール追加**: 現在のlinterは faceFrames:[5,9,10] の3点セットのみ検査。新規パーツ追加後は half-split の笠石y座標整合・角ピースのアーク連続性チェックを追加する必要がある。

---

## retaining_wall → spillway → 滝壺 接合モジュール（石垣から流れる滝）

**お手本観察:** お手本(023/otehon.png)では滝は単独のオブジェクトとして見えず、必ず「石垣の面→水の糸→滝壺→川」という縦の文脈に埋め込まれている。具体的には: (1)石垣(kaIshigaki相当)の前面は笠石の明るいハイライト帯→丸石の立体面→接地影の3層を持ち、高さ差が一目で読める。(2)水が落ちる部分は石垣の面の中央を切り欠いた「水路口」として描かれ、石垣の縦面と水の流れが同一タイル内で共存している。(3)落ち口から下の水は白く発光し、スピード感のある縦ストライプで描写される。(4)滝壺は円形のフォーム(白い泡)＋ターコイズ～ミッドナイトブルーの波紋リングで構成され、周囲の草や石と影で接地している。(5)石垣の色は温かみのある灰褐色～緑灰色で、現行tile_ka_ishigakiの生成済みraw(obj.spillway/codex-imagegen.png)と近い調子を持つ。(6)滝の上段は水田(paddy)の水面が静かに写り込んでいる描写が多く、「高所の水→崩れる口→低所の水」という垂直連続性が視覚的に保証されている。現状のobj.spillway生成rawはこの観察に概ね合致しているが、(a)上段の石垣との水平方向の接合(石垣タイルのcoping capと落ち口の縁が継ぎ目なく繋がる)と(b)側面の石垣が「柱2本に見える」問題がある(NGケース#3に相当)。

**既存資産:**
- `obj.spillway (public/assets/obj_spillway.png, forge/assets/raw/obj.spillway/codex-imagegen.png)`: 128x384px、3ゾーン縦構成(上段水田128+中段石垣切欠128+下段滝壺128)。生成済みrawは上段の水田・中段の石垣・下段の滝壺を1枚に収めており大枠は正しい。ただし中段の左右石垣部分が独立した柱2本に見え、隣接するkaIshigakiタイルのcoping cap高さと水平連続しない。上端の高さアンカーが未定義のため接続罫線ズレが起きやすい。proc_wa.py PROC定義あり(fw=128,fh=384,mode=prop)。
- `obj.spillway_side (public/assets/obj_spillway_side.png, forge/assets/raw/obj.spillway_side/codex-imagegen.png)`: 64x128px、湿った苔石の側面パーツ。spillwayの左右1タイルに置く装飾。faceFrameなし/高さ接続の定義がtile_contractに未記載。現状は補助的湿り石として単独では石垣との高さ接続を担保しない。
- `tile.ka_ishigaki (public/assets/tile_ka_ishigaki.png, forge/assets/raw/tile.ka_ishigaki/codex-imagegen.png)`: 512x512(4x4=16フレーム、各128x128px)。笠石帯+丸石縦面+接地影の3層構造が4行で表現。faceFrames=[5,9,10](FACE=5,SW角=10,SE角=9)。生成rawは高品質で笠石・丸石・接地影の3層がお手本に近い。ただし「水路口」切欠きフレームがない——水が流れ出る場所の石垣バリアントが欠落しており、spillwayとの水平接合が不連続になる主因。
- `obj.waterfall (public/assets/obj_waterfall.png, forge/assets/raw/obj.waterfall/codex-imagegen.png)`: 128x128px単体プロップ。tile_contract.jsonでrequiresAbove/requiresBelow定義あり。生成rawは幅広の自然滝(岩+茂み)でSNES調。棚田の石垣系のパレットとは別系統で、水路からの放流というより自然渓流の滝。spillwayモジュールとの連携が未設計。
- `tile_ka_ishigaki — frame5(FACE)/frame9(SE角)/frame10(SW角) の faceFrames`: tile_contractに定義済みで検査も有効(height_connection.pyがwaDropshadowの有無を検査)。ただし切欠きフレーム(水路口)のfaceFrameインデックスが未定義。v2コーナーベース高さ角契約への移行も未実施。

**必要パーツ:**
### tile.ka_ishigaki_notch — 石垣切欠きフレーム(落ち口)オートタイル差分
- 高さ/素材パターン: [左上=H1,右上=H1,左下=H0,右下=H0] の境界フレームで、中央水路帯(幅約24px)のみH0開口、左右はH1石垣面が継続。4隅の素材: 左上・右上=ishigaki笠石面、左下・右下=水路水面または湿石。記法: 1100(上=石垣天端高さ、下=水流開口)。
- フレーム配置: 既存tile.ka_ishigaki 4x4シートのRow4(accent行)の空きに2フレーム追加、またはtile.ka_ishigaki_notchとして独立1x2(128x256px)プロップ形式で追加。既存faceFrames=[5,9,10]に加えてnotch_face=frameN, notch_SW=frameM を定義。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺: kaIshigaki FACE(frame5)の笠石上縁と同じY座標で笠石帯を継続すること(=幅128px全域で笠石が水平に切れずに繋がる)。左辺・右辺: 隣接するkaIshigakiタイルの丸石面と苔目地が継ぎ目なく繋がる色・石の大きさ。下辺: obj.spillwayの中段帯(中段128pxの上端)と水平に接合——石垣前面の下縁高さが一致すること。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, GOLDEN-HOUR warm light from top-left. A single WATER-NOTCH TILE for a terraced rice-paddy stone retaining wall (石垣落ち口). 128px wide x 256px tall, TWO stacked 128x128 frames: TOP FRAME shows the front face of a mossy ishigaki wall with a NARROW DRAINAGE NOTCH (落ち口, about 24px wide) CUT THROUGH THE EXACT CENTER TOP EDGE — the capstone (笠石) band runs unbroken left and right of the notch, pale grey-green dressed stones, subtle bevel highlights; the notch gap has dark wet stone edges and a thin thread of blue-green water beginning to spill over the capstone lip. Left and right stone masses are a continuous wall, NOT two separate pillars. The stone face below the capstone shows stacked rounded fieldstones (玉石 nozura-zumi), warm grey-brown, bright upper curves, deep crevice shadow beneath each stone, moss in joints. Full-height contact shadow at the bottom of this 128px frame. BOTTOM FRAME shows the water flowing straight down through the notch channel as a narrow bright-white streak with faint mist pixels at sides; the stone wall face continues left and right with the same warm grey-brown ishigaki texture, wet and mossy near the channel; the lower edge of this frame has the same dark base-shadow band as kaIshigaki FACE frame5. Background: solid #FF00FF magenta. Style: SNES JRPG top-down, hand-painted, 1-pixel dark outline, no isometric angle, no vanishing point, no UI, no text, no characters. Palette matches tile.ka_ishigaki: grey-green capstones (#8fa07a–#b0b898), warm stone body (#6f6550–#8a7a62), deep crevice shadow (#2a2018), moss (#4a7a3a–#7ab050), water streak (#c8eeff–#ffffff).`

### obj.spillway_v2 — 石垣切欠き統合版 spillway プロップ(リジェネ)
- 高さ/素材パターン: 縦3ゾーン: 上端=[H1水田面 左上右上] 下端=[H0滝壺 左下右下]。上段128pxはH1の水田水面、中段128pxはH1→H0の落ち口（石垣切欠き）、下段128pxはH0滝壺。中段の左右辺は隣接するkaIshigakiタイルと同じH1高さで接する。
- フレーム配置: center prop 1枚 128x384px(cols=1,rows=1)。faceFrame定義なし(プロップ)。proc_wa.py の既存 obj.spillway エントリを流用しfw=128,fh=384,mode=prop。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺128px帯: 上端Y=0は開放(水田水面が上タイルと継続)、左右辺は水田岸の苔草で隣接kaIshigakiの笠石天端と同じ色調で接する。中段の左右辺(Y=128–256): kaIshigaki FACE(frame5)の左辺・右辺の石面テクスチャと同じ石サイズ・色で継ぎ目ゼロ。下辺128px帯: 滝壺下端Y=384は完全に閉じる(透明)、左右は隣接草地または川タイルと接する湿った岸。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, GOLDEN-HOUR warm light from top-left. A tall vertical prop 128px wide x 384px tall, ONE continuous pixel-art composition — a RICE-TERRACE SPILLWAY MODULE (棚田スピルウェイ). THREE ZONES: TOP ZONE (Y 0–127): Shallow blue-green rice paddy water (棚田の水面) with young rice seedlings in neat rows. Near the bottom of this zone, water calmly funnels toward a small stone notch. The paddy bank on left and right is mossy earth with the SAME capstone colour as kaIshigaki (pale grey-green #9aaa80) so it connects seamlessly to adjacent kaIshigaki tileset frames. No drama, calm intake only. MIDDLE ZONE (Y 128–255): The front face of a MOSSY STONE RETAINING WALL (ishigaki) spanning the full 128px width. A SINGLE narrow water channel (24px wide) is cut through the EXACT HORIZONTAL CENTER. Left and right stone masses are a SINGLE CONTINUOUS WALL — absolutely NOT two separate pillars or boulders. Stacked rounded fieldstones (玉石), warm grey-brown (#6f6550–#8a7a62), bright sunlit upper-curve highlights, deep crevice shadows (#2a2018), green moss in joints, capstone band (#8fa07a–#b0b898) at top with subtle bevel highlights. Water runs straight down through the notch with white-blue streak highlights (#c8eeff–#ffffff) and dark wet stone at channel edges. Strong dark base-shadow band at the bottom of this zone. BOTTOM ZONE (Y 256–383): Circular splash pool (滝壺) receiving the falling water. White foam at impact center, clear turquoise-blue ripple rings expanding outward (#4ab8c0–#80d8e0), a few dark wet mossy stones at edges, reed tufts (芦) at lower-left and lower-right, subtle outflow channel exiting lower-center toward the viewer. Dark wet shadow under pool rim anchors pool to ground. The water thread connects visually from the middle zone without breaking. Background: solid #FF00FF magenta for all transparent areas. Style: SNES JRPG top-down-oblique, hand-painted, 1-pixel dark outline, top-left warm lighting, no isometric angle, no vanishing point, no UI, no text, no characters. Palette strictly matches tile.ka_ishigaki and tile.ka_paddy families.`

### obj.spillway_side_v2 — 石垣面の湿り継ぎパーツ(左右対称2枚、再生成)
- 高さ/素材パターン: 64x128px。上端=[H1石垣笠石面]、下端=[H1石垣下縁+接地影]。左右どちらの辺もkaIshigaki面と同じ高さH1で接合。水平方向の高さ差なし——純粋に湿った石垣テクスチャの補完パーツ。
- フレーム配置: center prop 1枚 64x128px(左用)、水平反転で右用を生成。proc_wa.py追加エントリ obj.spillway_side_L / obj.spillway_side_R として fw=64,fh=128,mode=prop。または既存 obj.spillway_side を左用として再生成し、build時に右用を水平反転コピー。
- 生成区分: **new-forge-gen**
- 接続アンカー: 右辺(spillwayと接する辺): obj.spillway_v2の中段左辺の石面テクスチャと同じ石サイズ・色で継ぎ目ゼロ。左辺(kaIshigakiと接する辺): kaIshigaki FACE(frame5)の右辺の石面テクスチャと継ぎ目ゼロ。上辺: kaIshigaki笠石帯と同じ高さで笠石が水平に継続。下辺: 接地影の暗帯が同じ深さ(約20px)で継続。
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, GOLDEN-HOUR warm light from top-left. A small prop 64px wide x 128px tall: a WET MOSSY ISHIGAKI SIDE PIECE for the left flank of a rice-terrace spillway (スピルウェイ左隣石垣). The FULL 64x128px image is a continuous front face of a mossy stone retaining wall: TOP 22px: capstone (笠石) band — pale grey-green dressed flat stones (#8fa07a–#b0b898), subtle bevel highlight, bright grass on the high terrace peeking above. MIDDLE 82px: stacked rounded fieldstones (玉石 nozura-zumi) — warm grey-brown (#6f6550–#8a7a62), each stone has a bright sunlit upper curve and deep crevice shadow below (#2a2018), green moss in joints (#4a7a3a–#7ab050), slightly darker and wetter stones near the right edge (spillway proximity moisture). BOTTOM 24px: dark warm contact shadow band (#1e1808) anchoring wall to lower ground. LEFT EDGE: blends naturally into an adjacent kaIshigaki tile face (same stone scale). RIGHT EDGE: blends naturally into the left edge of obj.spillway middle zone (same stone scale, slightly wetter). Background: solid #FF00FF magenta. Style: SNES JRPG top-down-oblique, hand-painted, 1-pixel dark outline, top-left warm light, no isometric angle, no UI, no text, no characters.`

### tile.wa_dropshadow — spillway直下の接地影オーバーレイ(手続き生成確認)
- 高さ/素材パターン: 128x128px影overlay。4隅はすべてH0(低地)。影の濃度は下端1/3が最も暗く上端に向けてフェード。素材: waDropshadow(既存)。
- フレーム配置: 既存 tile_wa_dropshadow.png を流用。spillway直下y+1セルのdecoレイヤに strong shadow frame(frame3)を敷く。height_connection.pyのルールAで自動検査される。
- 生成区分: **procedural-shading**
- 接続アンカー: このオーバーレイはspillway下端(滝壺下辺)の直下groundタイル1行に敷く。spillway propの高さが384px(=3タイル)のためitY+1が落ち影配置行。配置条件: spillway prop foot(ity)の1行下のground tile(kaRiver3またはground_grass)のdecoスロットにwaDropshadow frame3を配置。

**パレット方針:** forge/palettes/snes_forest.json の水色は #4a8fb8 / #8fd3ff の2値のみで彩度が中程度。お手本の滝壺はターコイズ寄り(#40c8c0–#80e0e8)で彩度が高く、水の白い発光(#c8eeff–#ffffff)と3段階のコントラストで「水が光る」表現をしている。また石垣の笠石は #9aaa80 程度のグレー緑で、grade_wa.py の緑グレーディング(K=0.5, ishigaki系)が効きすぎると笠石帯が暗く潰れる。推奨対応: (1)新規プロンプトに水色の具体カラーコードを明記(#4ab8c0,#80d8e0,#c8eeff,#ffffff)してカラードリフトを防ぐ。(2)生成後のgrade_wa.py適用はK_OVERRIDE に obj_spillway_v2.png → 0.3(石垣系に揃える) / 水色・白フォームは緑グレーディングの対象外(H<55° or H>170°)なので自動的に保護される。(3)obj.spillway_side_v2.png はK_OVERRIDE=0.4(tile_wa_ishigaki2と同値)。(4)お手本の石垣は彩度高コントラストで各石の明暗差が大きい——proc_wa.pyのmode=propは chroma_key → despeckle のみでグレーディングしないため、pregradeバックアップを取ってgrade_wa.pyのTARGETSにspillway系を追加することで色調を合わせる。

**Forgeコマンド草案:** #!/usr/bin/env python3
# forge/gen_spillway_v2.py
# 石垣から流れる滝 接合モジュール — 生成準備スクリプト草案
# 使い方: python3 forge/gen_spillway_v2.py [--force]
# 生成後: python3 forge/proc_spillway_v2.py && python3 forge/grade_wa.py
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
CLI = "/Users/yuyafujita/GameDev-v2/tools/pixcel-asset/asset-forge/dist/src/cli/index.js"

COMMON_AVOID = (
    "no Mario/Nintendo/Zelda/Final Fantasy/Pokemon/Dragon Quest/Secret of Mana/Okami/Sakuna "
    "characters, logos or likeness, no samurai armor, no kabuto helmet, no ninja outfit, "
    "no two-sword daisho, no gun, no modern objects, no horror mood, no dark gloomy palette, "
    "no bird or companion creature in the sheet, no letter emblems, no modern text/watermark/UI"
)
FOOTER = (
    "Output: crisp high-resolution 16-bit-style pixel art with fine readable pixel clusters, "
    "dark one-pixel outline, top-left light source, bright cheerful colors, "
    "solid #FF00FF magenta background filling all empty space, consistent identity and scale across frames."
)

ASSETS = [
    {
        "id": "obj.spillway_v2",
        "name": "spillway_v2",
        # field_prop_32 preset を流用し実寸 128x384 で生成(gen_runner は preset の
        # frame_size を起点にするため、プロンプトに明示サイズを含める)
        "preset": "field_prop_32",
        "priority": 0,
        "prompt": (
            "Bright mythical-Japan satoyama palette, GOLDEN-HOUR warm light from top-left. "
            "A tall vertical prop 128px wide x 384px tall, ONE continuous pixel-art composition "
            "— a RICE-TERRACE SPILLWAY MODULE (棚田スピルウェイ). "
            "THREE ZONES: "
            "TOP ZONE (Y 0-127): Shallow blue-green rice paddy water surface with young rice seedlings. "
            "Water calmly funnels toward a small stone notch at the bottom of this zone. "
            "Mossy paddy bank on left and right, capstone colour #9aaa80 so it connects seamlessly "
            "to adjacent kaIshigaki tileset frames. Calm intake, no drama. "
            "MIDDLE ZONE (Y 128-255): Front face of a MOSSY STONE RETAINING WALL (ishigaki) "
            "spanning full 128px width. A SINGLE narrow water channel (24px wide) cut through "
            "the EXACT HORIZONTAL CENTER. Left and right stone masses are ONE CONTINUOUS WALL — "
            "ABSOLUTELY NOT two separate pillars or boulders. "
            "Stacked rounded fieldstones (玉石 nozura-zumi), warm grey-brown (#6f6550-#8a7a62), "
            "bright sunlit upper-curve highlights, deep crevice shadows (#2a2018), "
            "green moss (#4a7a3a-#7ab050) in joints. Capstone band (#8fa07a-#b0b898) at top "
            "with subtle bevel highlights. Water straight down through notch with white-blue "
            "streak (#c8eeff-#ffffff) and dark wet stone at channel edges. "
            "Strong dark base-shadow band at bottom of this zone. "
            "BOTTOM ZONE (Y 256-383): Circular splash pool (滝壺). White foam at impact center, "
            "clear turquoise-blue ripple rings (#4ab8c0-#80d8e0), dark wet mossy stones at edges, "
            "reed tufts at lower sides, subtle outflow channel at lower center. "
            "Dark wet shadow under pool rim grounds pool to surface. "
            "Background: solid #FF00FF magenta. Style: SNES JRPG top-down-oblique, "
            "hand-painted, 1-pixel dark outline, no isometric angle, no vanishing point, no UI, "
            "no text, no characters. Palette matches tile.ka_ishigaki and tile.ka_paddy families."
        ),
    },
    {
        "id": "obj.spillway_side_v2",
        "name": "spillway_side_v2",
        "preset": "field_prop_32",
        "priority": 1,
        "prompt": (
            "Bright mythical-Japan satoyama palette, GOLDEN-HOUR warm light from top-left. "
            "A small prop 64px wide x 128px tall: WET MOSSY ISHIGAKI SIDE PIECE for the left "
            "flank of a rice-terrace spillway (スピルウェイ左隣石垣). "
            "Full 64x128px is a continuous front face of a mossy stone retaining wall: "
            "TOP 22px: capstone (笠石) band — pale grey-green dressed flat stones (#8fa07a-#b0b898), "
            "subtle bevel highlight, bright grass on high terrace peeking above. "
            "MIDDLE 82px: stacked rounded fieldstones (玉石 nozura-zumi) — warm grey-brown "
            "(#6f6550-#8a7a62), bright sunlit upper curve and deep crevice shadow (#2a2018), "
            "green moss (#4a7a3a-#7ab050) in joints, slightly wetter near the right edge. "
            "BOTTOM 24px: dark warm contact shadow band (#1e1808) anchoring wall to lower ground. "
            "LEFT EDGE blends into an adjacent kaIshigaki tile face (same stone scale). "
            "RIGHT EDGE blends into the left edge of spillway middle zone (same stone scale, wetter). "
            "Background: solid #FF00FF magenta. Style: SNES JRPG top-down-oblique, hand-painted, "
            "1-pixel dark outline, no isometric angle, no UI, no text, no characters."
        ),
    },
    {
        "id": "tile.ka_ishigaki_notch",
        "name": "ka_ishigaki_notch",
        "preset": "world_coastline_16",
        "priority": 0,
        "prompt": (
            "Bright mythical-Japan satoyama palette, GOLDEN-HOUR warm light from top-left. "
            "A single WATER-NOTCH TILE PAIR for a terraced rice-paddy stone retaining wall "
            "(石垣落ち口). 128px wide x 256px tall, TWO stacked 128x128 frames arranged vertically. "
            "TOP FRAME (upper 128px): Front face of a mossy ishigaki wall with a NARROW DRAINAGE "
            "NOTCH (落ち口, 24px wide) CUT THROUGH THE EXACT CENTER TOP EDGE. "
            "Capstone (笠石) band (#8fa07a-#b0b898) runs UNBROKEN left and right of the notch gap. "
            "The notch gap has dark wet stone edges and a thin thread of blue-green water beginning "
            "to spill over the capstone lip. Left and right stone masses are ONE CONTINUOUS WALL. "
            "Stone face shows stacked rounded fieldstones (玉石), warm grey-brown (#6f6550-#8a7a62), "
            "bright upper-curve highlights, deep crevice shadows (#2a2018), moss (#4a7a3a-#7ab050). "
            "Full-height dark contact shadow band at bottom of this frame. "
            "BOTTOM FRAME (lower 128px): Water flowing straight down through the notch channel as "
            "a narrow bright-white streak (#c8eeff-#ffffff) with faint mist pixels at sides. "
            "Stone wall face continues left and right with same warm grey-brown ishigaki texture, "
            "wet and mossy near the channel. Dark base-shadow band at bottom edge matches "
            "kaIshigaki FACE frame5. "
            "Background: solid #FF00FF magenta. Style: SNES JRPG top-down-oblique, "
            "hand-painted, 1-pixel dark outline, no isometric angle, no vanishing point, no UI, "
            "no text, no characters. Palette strictly matches tile.ka_ishigaki."
        ),
    },
]

force = "--force" in sys.argv
plan = json.load(open(os.path.join(ROOT, "assets_plan.json")))
common_avoid = plan.get("common_avoid", COMMON_AVOID)
footer = plan.get("footer", FOOTER)

for a in ASSETS:
    raw_path = os.path.join(ROOT, "assets", "raw", a["id"], "codex-imagegen.png")
    if not force and os.path.exists(raw_path):
        print(f"SKIP {a['id']} (raw exists, use --force to regen)")
        continue
    prompt = f"{a['prompt']}\nAvoid: {common_avoid}.\n{footer}"
    cmd = [
        "node", CLI,
        "--root", ROOT,
        "generate",
        "--id", a["id"],
        "--name", a["name"],
        "--preset", a["preset"],
        "--prompt", prompt,
    ]
    print(f"GEN {a['id']} ...")
    r = subprocess.run(cmd, cwd=GAME)
    print(f"  exit={r.returncode}")

print("[gen_spillway_v2] done")

# ---- 後処理は proc_spillway_v2.py で行う (proc_wa.py に下記を追記する形でも可) ----
# PROC追記例 (forge/proc_wa.py の PROC dict へ):
#   "obj.spillway_v2":          dict(mode="prop", fw=128, fh=384, cols=1, rows=1,
#                                    out="obj_spillway_v2.png", keys=["obj.spillway"]),
#   "obj.spillway_side_v2":     dict(mode="prop", fw=64,  fh=128, cols=1, rows=1,
#                                    out="obj_spillway_side_v2.png", keys=["obj.spillway_side"]),
#   "tile.ka_ishigaki_notch":   dict(mode="tileset", fw=128, fh=128, cols=1, rows=2,
#                                    out="tile_ka_ishigaki_notch.png", keys=["tile.ka_ishigaki_notch"]),
#
# grade_wa.py TARGETS 追記:
#   "obj_spillway_v2.png"      K_OVERRIDE=0.3 (石材系に合わせる)
#   "obj_spillway_side_v2.png" K_OVERRIDE=0.4
#   "tile_ka_ishigaki_notch.png" K_OVERRIDE=0.5
#
# tile_contract.json 追記例:
#   tiles.kaIshigakiNotch: { category: "retaining_wall", layer: "ground", passable: false,
#                             isWallFace: true, faceFrames: [0,1], role: "paddy_wall_notch",
#                             _faceNote: "frame0=落ち口上半(笠石切欠き), frame1=落ち口下半(水流面)" }
#   props.obj.spillway_v2: { ...obj.spillway定義を継承し note を更新 }


**再調整前提:** 以下の前提はv2設計ドキュメント確定後に再調整が必要。(1) コーナーベース高さ角契約: 現在のtile_contractは辺ベースのfaceFrames([5,9,10])で段差を定義しているが、v2が「角(頂点)に高さを持つdual-grid」へ移行した場合、kaIshigakiNotchのフレームインデックスと落ち口の角高さパターン[H1,H1,H0,H0]の記法が変わる。移行後はnotchフレームをcorner-height記法で再定義すること。(2) proc_wa.pyへの追記タイミング: 新規プロップIDはobj.spillway_v2として生成し、既存obj.spillwayキーへの上書き登録は品質確認後。移行前はassetmapに両キーを並存させる。(3) spillwayの高さモジュール長: 現在verticalModulePx=[128,384]で定義。v2の高さ差が最大1タイルを前提とする場合、3タイル高のspillwayが複数の高さ差をまたぐ可能性があり、grammar.waterfallのabove/below条件を高さ角ベースに更新する必要がある。(4) obj.waterfall(自然渓流系)とobj.spillway_v2(石垣排水系)の使い分けをgrammar.waterfallのrole別ルールとして明示化する必要がある。(5) tile.ka_ishigaki_notchのfaceFramesはv2の辺/角ベース切り替え後にインデックスが変わるため、height_connection.pyの検査ロジックも同時に更新すること。

---

## kaForest2 — 最前列フェイス(幹可視) + 内部(葉のみ) + 縁/角

**お手本観察:** お手本(023/otehon.png)の森の観察:

【内部(center)タイル】: 森の内部は非常に暗いエメラルド〜深い抹茶グリーン。個々の丸い樹冠が重なり合い、頂部にだけ黄緑のスペキュラハイライトが乗る。樹冠と樹冠の谷間には冷たい青緑の影が深く落ち込んでいて、平坦な一色塗りでは断じてない。現行 tile_ka_forest2 の center フレーム(0-3)は V≈70 と暗色を保っているが、樹冠どうしの谷間の影コントラストが不足している(フレーム間の輝度差 ΔV≈2 で似通った平坦さ)。

【南向き最前列(S-edge)】: これが最重要の差別化ポイント。お手本では南向き森の最前列に「幹の正面と接地部」が明確に描かれている。茶色〜濃褐色の幹が垂直に立ち(高さ約30-40px相当)、その根本周辺に接地影が落ちて「地面に生えている」ことが一目でわかる。幹の南面(プレイヤーから見える面)はやや明るい褐色、幹の北面(樹冠影)は暗い。幹の上に葉の前垂れ(fringe shrub)が少し垂れ下がり、幹とキャノピーのシルエットが有機的につながる。現行 frame5(S-edge)は trunk らしき茶色ピクセルが見えるがキャッチライト/接地影が薄く「壁のフェイス」として機能していない。

【SW/SE コーナー】: お手本では角の最前列も幹が見え、角を曲がる有機的なシルエット。コーナーの幹は内部に少し埋め込まれた形で「森の塊の角」を構成する。現行 corner_SW(frame10)/corner_SE(frame9)も幹が見えるが、南向き接地影が corner でも落ちていない。

【W/E サイド】: 左右辺の森は「横から見た幹のシルエット」よりも「樹冠の横輪郭」が主体。お手本でも側辺は幹がほぼ見えず、ボールのような樹冠の縁がそのまま辺を構成している。

【接地影】: お手本の森南縁の真下 1〜1.5 タイルに、草地へのキャストシャドウ(暗褐色〜暗緑の半透明帯)が落ちている。この影が「森の壁が高い」という立体感の核。現行マップにはこの層が無い。

**既存資産:**
- `tile_ka_forest2.png (processed strip, 2048x128 = 16フレーム)`: TRANS_MAPS 定義: center[0-3] / n=0(北辺) / s=4(南辺) / w=6 / e=7 / nw=8 / ne=9 / sw=10 / se=11。S辺フレーム(frame5→TRANS_MAPのs=4に注意: s=4は北辺相当のフレームインデックスで実際の南辺はframe5相当の物理位置を指すため確認要) ─ 南向きedgeが1枚存在するが幹フェイスとして設計された仕様でなく、faceFrames未定義。内部フレームは暗色(V≈70)だが樹冠間の影コントラストが平坦。接地影オーバーレイなし。
- `forge/assets/raw/tile.ka_forest2/codex-imagegen.png (1254x1254生成元)`: 4x4グリッド(313x313px/cell)。Row1=center4種: 樹冠密充填だが上光/下影コントラスト不足。Row2(S辺cell=row2col2): 幹+fringe+草ゾーンが存在しお手本に近い原材料があるが、幹の「前面ライト/接地影」が弱い。Row3=外角: 有機的曲線を持つが南方向の幹接地部が弱い。Row4=accent: 細いストリップ/低灌木など。既にお手本品質の素材素地は部分的に存在。
- `tile_contract.json: kaForest2エントリ`: category=forest_wall, passable=false, variants=true, role=forest。faceFrames未定義 ─ isWallFace=falseのまま。壁タイル(kaIshigaki, kaShrineWall, kaDote)が持つ faceFrames:[5,9,10] に相当する定義が存在せず、南向き前面を特別扱いする仕組みが contract レベルで欠落。
- `TRANS_MAPS.kaForest2 (tileset.ts line 180)`: center:[0,1,2,3] / n:0 / s:4 / w:6 / e:7 / nw:8 / ne:9 / sw:10 / se:11。南辺=frame4(物理index)・SW角=frame10・SE角=frame11として登録。wとeは側辺(frame6,7)。ただし s=4 は TRANS_MAPS の「s フィールドの値=フレームインデックス」であり、tile.ka_forest2_set assetmap の cols 列を確認のこと(PROC定義では cols=4,rows=4 → 列一致)。
- `waDropshadow (tile_wa_dropshadow.png)`: 4パターン(frame0-3)の半透明落ち影帯。現在は擁壁/石垣専用として使用。森の南縁接地影への適用は未定義だが技術的に転用可能(frame2=64px幅が森の接地影として適切)。
- `kaEdgeOverlay (tile_ka_edge_overlay.png)`: seam_breakerとして森縁の矩形を崩すオーバーレイ。現在も tanada.ts で散布されているが、幹フェイスの立体感には寄与しない。

**必要パーツ:**
### kaForest2_trunk_face — 南向き最前列幹フェイスタイル(新規Forge生成)
- 高さ/素材パターン: [左上=forest, 右上=forest, 左下=grass, 右下=grass] ─ 上辺2隅=森素材(高い側)、下辺2隅=草素材(低い側)。フレーム内の上半分(~64px)が樹冠/幹の前面、下半分(~64px)が草地+接地影の遷移ゾーン。高さ記法: 1100=南向き断面の上段が森の塊、下段が草地=南辺境界タイルそのもの。
- フレーム配置: S辺フレーム(1枚)+ SW角フレーム(1枚) + SE角フレーム(1枚) の計3点を新規生成。既存 s=4(frame4)・sw=10・se=11 の位置を置き換えるか、または kaForest2_front という新タイルキーとして追加する。faceFrames定義=[front=0, sw_corner=1, se_corner=2]の3フレーム横ストリップ(384x128)として生成し、tile_contract.json に kaForest2 の faceFrames:[0,1,2] + isWallFace:true を追記。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺(北側): 隣接する kaForest2 の center または edge フレームと素材を揃える → 樹冠の下端がこのタイルの上端と連続して見えること。上辺の左右端ピクセルが center フレームの平均輝度 V≈70 に合うよう生成。下辺(南側): 草地(kaGrassCalm/kaGrass2)との接続 → 下辺端ピクセルが grass の平均色(V≈85-95)に近い明るめの草色で終わり、グラデーションで繋がること。接地影の最暗部はタイル下から16-24px幅(草地に落ちる shadow zone)で V≈40-50。左右辺: center の w/e フレームと自然につながる樹冠シルエット。SW/SE 角は対応するコーナーフレームと辺を共有し、コーナーの幹配置が連続して見えること。
- Forgeプロンプト: `SNES-era top-down JRPG pixel art, bright mythical-Japan satoyama palette, golden-hour warm sunlight, hand-painted quality. A 4x1 TILESET STRIP (three 128x128 cells, all fully opaque, no magenta background): CELL 0 = SOUTH-FACING FOREST FRONT FACE (南向き最前列フェイス): the viewer looks north into the forest; the SOUTHERN face of the tree mass is fully visible. Top 55px: dense dark broadleaf canopy fringe hanging forward, deep emerald-green rounded leaf clusters with bright yellow-green TOP highlights (sunlit, top-left light), cool blue-shadow in the gaps between crowns. Middle 30px: two or three thick dark TREE TRUNKS (bark color: warm #5a3a1a to #7a5030) visible in silhouette, each trunk with a subtle right-side catchlight (lighter bark, warm tan #9a7050) and a left-side shadow; roots flare slightly at ground level. Bottom 43px: ground contact zone — a band of deep dark-green cast shadow (#1e2a1e, alpha-blend implied, painted dark) fading to the bright fresh grass (#7ac040 to #9fd060) of the open field; a few small fringe shrubs and low grass tufts at the forest edge soften the transition. The overall left-to-right layout shows one trunk near center with leafy fringe on both sides, creating a non-straight organic silhouette at the boundary. CELL 1 = SW CORNER FRONT (南西角フェイス): the forest front-face turns the south-west corner; the south-facing trunk/fringe runs along the bottom-right portion and curves into a west-facing forest edge on the left; a rounded forest promontory protrudes south-west; cast shadow pools at the corner; organic scalloped canopy silhouette. CELL 2 = SE CORNER FRONT (南東角フェイス): mirror of CELL 1 for the south-east corner; promontory protrudes south-east. All 3 cells seamlessly tile left-to-right: the canopy line continues across cell boundaries without visible seam. Palette anchor: deep shadow #1b2e1a, mid-canopy #2f6b3f to #4a8f3a, highlight #9fd16b, trunk warm-brown #5a3a1a to #7a5030, trunk highlight #9a7050, grass #7ac040. No isometric, no character, no UI, no text, no watermark. Output: crisp high-resolution 16-bit pixel clusters, dark 1px outline on trunks, top-left light source, solid #FF00FF magenta background.`

### kaForest2_interior_enrich — 内部センターフレームの陰影強化(手続きシェーディング)
- 高さ/素材パターン: [forest, forest, forest, forest] ─ 4隅すべて森素材・同一高さ。完全に森の内部。高さ記法: 0000=平坦(森の内部に高低差なし)。課題は高さではなく樹冠の光コントラスト不足。
- フレーム配置: 既存 center フレーム [0,1,2,3] の4枚を in-place 強化。新規生成は不要。手続き後処理スクリプトで: (1) 各フレームに deepen(brightness=0.82, color=1.18, contrast=1.10) を適用し樹冠の影を深化。(2) flatten_center で4フレームの平均輝度を揃えて市松を消す。(3) さらに樹冠ハイライト強化: 上から15%の範囲(~19px)に brightness boost(×1.15)を掛けて頂部の直射光を立体的に表現。現行 V≈70 から V_shadow≈55〜60 / V_highlight≈85〜90 のコントラスト幅に広げる。
- 生成区分: **procedural-shading**
- 接続アンカー: 中央フレーム同士の継ぎ目(center間): flatten後の平均輝度を全4フレームで共通化する(現行ΔV≈2は許容範囲だが flatten で完全統一)。南辺フレーム(s=4)との接続: 内部フレームの最下端ピクセル列が南辺フレームの最上端と輝度連続すること(内部の暗いグリーン→南辺の幹/fringe上端への自然な移行)。V差の許容: |V_center_bottom - V_south_top| < 15px帯で ≤12。

### waDropshadow_forest_row — 森の南縁接地影オーバーレイ行(手続き生成 or 既存 waDropshadow 転用)
- 高さ/素材パターン: [grass, grass, grass, grass] ─ 下に敷かれるタイルは草素材。影オーバーレイ自体は透過画像なので素材概念はなし。高さ記法: 既存 waDropshadow と同等の deco/shadow レイヤー適用パターン。
- フレーム配置: 既存 tile_wa_dropshadow.png の frame2(64px幅・強さ215)をそのまま流用。kaForest2 の南辺フェイスタイル(kaForest2_trunk_face)が置かれたセルの真南セルに waDropshadow frame2 を deco レイヤーに重ねる。tile_contract.json の kaForest2 に wallNeedsShadowBelow:true を追記し、map_art_linter が影なし行を検出できるようにする。手続き新規生成は不要。ただし既存 kaEdgeOverlay との z-order が正しいことを tanada.ts の deco 塗り順で確認する。
- 生成区分: **procedural-shading**
- 接続アンカー: 影帯の上辺(= kaForest2_trunk_face タイルの下辺=南縁の草地タイル上端)と完全に接する: 上端くっきり / 下端(64px下)がゼロ透過。waDropshadow frame2 の既存実装通り。左右端: 角フレーム(SW/SE corner face)の真南も同様に waDropshadow を敷き、影が角で途切れないこと。

### tile_contract.json 更新 — kaForest2 の faceFrames/isWallFace/wallNeedsShadowBelow 追記(手続き/コード変更)
- 高さ/素材パターン: N/A(コントラクト定義のみ。ピクセルパターン無し)
- フレーム配置: kaForest2_trunk_face を別タイルキー kaForest2Face として新設するか、または既存 kaForest2 の s/sw/se フレームを faceFrames に格上げする2択。推奨: 既存 tile.ka_forest2_set の frame4(s)・frame10(sw)・frame11(se) を置き換えた上で、kaForest2 に isWallFace:true / faceFrames:[4,10,11] / wallNeedsShadowBelow:true を追記(壁タイルと同じ3点セット契約に乗せる)。tanada.ts 側でこれらのフレームを forest wall() 関数で呼ぶ実装は v2 設計ドキュメント確定後に追加。
- 生成区分: **procedural-shading**
- 接続アンカー: 壁タイル(kaIshigaki)の wall() 関数と同じインターフェース: wall(FOREST, x0, x1, y, FOREST_SW, FOREST_SE) で南辺フェイス行を一発配置できること。FACE=4, FOREST_SW=10, FOREST_SE=11 を定数化。

**パレット方針:** 【現行パレット値(snes_forest.json)】: 最暗部 #1b1b2f(青み暗) / 深緑 #2f6b3f / 中緑 #5fa34a / ハイライト #9fd16b / 茶 #6f5f4b / 濃紫暗 #3b2f4a。

【お手本の観察色域】: 内部樹冠の影谷 V≈30-40(現行より10程度暗い) / 樹冠ハイライト V≈160-180(現行 grade_wa 後の #9fd16b=V≈161 は合致) / 幹褐色: R≈90-120, G≈58-80, B≈26-45 → snes_forest.json の #6f5f4b(R111,G95,B75)より赤みが強く必要 → プロンプトに #5a3a1a〜#7a5030 を明示。

【寄せ方針】:
1. 内部フレーム強化時: deepen(brightness=0.82)を grade_wa.py の既存パラメータより強め(現行 obj_matsu: K_OVERRIDE=1.4 で結果 V≈70 → 目標 V_shadow≈55)に設定。彩度は上げる(color=1.18)ことでお手本の「濃い宝石色グリーン」を再現。
2. 幹フェイス新規生成: プロンプトに paletteアンカー #1b2e1a / #2f6b3f / #9fd16b / #5a3a1a / #9a7050 を明記し grade_wa.py 後処理対象に trunk_face を追加しない(幹の褐色は緑グレードで抹茶化させない)。TARGETS リストから除外。
3. 接地影: 既存 waDropshadow の shadow_color=(14,20,14) neutral-dark はそのまま流用。お手本の森影は薄い青みより暗緑寄りで既存色が合致している。

**Forgeコマンド草案:** #!/usr/bin/env python3
"""
forge/gen_ka_forest2_face.py
kaForest2 の南向きフェイスタイルを新規生成し、
後処理(deepen/flatten)＋内部フレーム強化を一括実行する。

使い方:
  # Step1: Codex ImageGen で生成 (gen_runner.mjs 経由)
  node forge/gen_runner.mjs tile.ka_forest2_face

  # Step2: 後処理 + 内部フレーム強化
  python3 forge/gen_ka_forest2_face.py

  # Step3: tile_contract.json を更新 (スクリプト末尾で自動更新)
  # → kaForest2 に isWallFace:true / faceFrames:[4,10,11] / wallNeedsShadowBelow:true 追記
"""
import json, os
import numpy as np
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
ASSETS = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")
CONTRACT = os.path.join(GAME, "checker", "tile_contract.json")
T = 128

# ─────────────────────────────────────────────────────
# A) フェイスタイル新規生成ファイルの後処理
#    raw: forge/assets/raw/tile.ka_forest2_face/codex-imagegen.png
#    フォーマット: 384x128 (3フレーム横ストリップ: face / sw_corner / se_corner)
# ─────────────────────────────────────────────────────
def build_face():
    raw = os.path.join(ROOT, "assets", "raw", "tile.ka_forest2_face", "codex-imagegen.png")
    if not os.path.exists(raw):
        print(f"SKIP face: raw not found at {raw}")
        return False

    im = Image.open(raw).convert("RGBA")
    W, H = im.size
    # 生成物が 3x1 フレームなら cols=3, rows=1
    cols, rows = 3, 1
    fw, fh = T, T
    cw, ch = W // cols, H // rows

    out = Image.new("RGBA", (fw * cols, fh), (0, 0, 0, 0))
    for ci in range(cols):
        cell = im.crop((ci * cw, 0, (ci + 1) * cw, ch))
        # マゼンタ除去 + autotrim + 四辺8%インセット + BOXリサイズ
        cell = _chroma(cell)
        bb = cell.getbbox()
        if bb:
            cell = cell.crop(bb)
        ix = max(1, round(cell.width * 0.08))
        iy = max(1, round(cell.height * 0.08))
        if cell.width > ix * 4 and cell.height > iy * 4:
            cell = cell.crop((ix, iy, cell.width - ix, cell.height - iy))
        frame = cell.resize((fw, fh), Image.BOX)
        out.paste(frame, (ci * fw, 0))

    dst = os.path.join(ASSETS, "tile_ka_forest2_face.png")
    out.save(dst)
    print(f"ok face: {dst} ({fw*cols}x{fh})")

    # assetmap 登録 (3フレーム = face/sw/se)
    am = json.load(open(MAP_OUT)) if os.path.exists(MAP_OUT) else {}
    am["tile.ka_forest2_face"] = {
        "file": "tile_ka_forest2_face.png",
        "frameW": fw, "frameH": fh,
        "frames": cols, "cols": cols
    }
    with open(MAP_OUT, "w") as fp:
        json.dump(am, fp, indent=2, ensure_ascii=False, sort_keys=True)
    return True


# ─────────────────────────────────────────────────────
# B) 既存 tile_ka_forest2.png の内部フレーム(0-3)を強化
#    deepen + flatten_center で樹冠の陰影コントラストを増強
# ─────────────────────────────────────────────────────
def enrich_interior():
    name = "tile_ka_forest2.png"
    p = os.path.join(ASSETS, name)
    if not os.path.exists(p):
        print(f"SKIP interior: {p} not found"); return

    im = Image.open(p).convert("RGBA")

    # 1) deepen: 暗く・色濃く・コントラスト増
    rgb = im.convert("RGB")
    rgb = ImageEnhance.Brightness(rgb).enhance(0.82)   # V≈70 → V_avg≈57
    rgb = ImageEnhance.Color(rgb).enhance(1.18)         # 彩度増(樹冠の宝石色)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.10)      # コントラスト増
    im = rgb.convert("RGBA"); im.putalpha(255)

    arr = np.asarray(im, dtype=np.float32).copy()

    # 2) 上端ハイライト強化: 上15%(~19px)を 1.15 倍
    highlight_rows = max(1, round(T * 0.15))  # ~19px
    for fi in range(4):  # center frames 0-3
        x0 = fi * T
        zone = arr[:highlight_rows, x0:x0 + T, :3]
        arr[:highlight_rows, x0:x0 + T, :3] = np.clip(zone * 1.15, 0, 255)

    # 3) flatten_center: 4フレーム平均輝度を揃えて市松解消
    means = []
    for fi in range(4):
        t = arr[:, fi * T:(fi + 1) * T, :3]
        means.append(t.reshape(-1, 3).mean(axis=0))
    gmean = np.mean(means, axis=0)
    for fi in range(4):
        x0 = fi * T
        t = arr[:, x0:x0 + T, :3]
        m = t.reshape(-1, 3).mean(axis=0)
        arr[:, x0:x0 + T, :3] = np.clip(t + (gmean - m) * 0.85, 0, 255)

    arr[..., 3] = 255
    Image.fromarray(arr.astype(np.uint8), "RGBA").save(p)
    print(f"ok interior enrich: {name} (deepen b=0.82 c=1.18 + top-highlight + flatten center 0-3)")


# ─────────────────────────────────────────────────────
# C) tile_contract.json 更新: kaForest2 に壁フェイス定義を追加
# ─────────────────────────────────────────────────────
def update_contract():
    c = json.load(open(CONTRACT))
    kf2 = c["tiles"].get("kaForest2", {})
    kf2["isWallFace"] = True
    # frame4=S南辺, frame10=SW角, frame11=SE角 (TRANS_MAPS と整合)
    kf2["faceFrames"] = [4, 10, 11]
    kf2["wallNeedsShadowBelow"] = True
    kf2["_faceNote"] = (
        "FACE=4(南辺=幹フェイス) / SW角=10 / SE角=11。"
        "kaForest2_trunk_face で生成したフレームで frame4/10/11 を置換済み前提。"
        "南辺前面の真下セルに waDropshadow frame2 が必須。"
    )
    c["tiles"]["kaForest2"] = kf2
    with open(CONTRACT, "w") as fp:
        json.dump(c, fp, indent=2, ensure_ascii=False)
    print("ok contract: kaForest2 isWallFace/faceFrames/wallNeedsShadowBelow 追記")


# ─────────────────────────────────────────────────────
# ユーティリティ
# ─────────────────────────────────────────────────────
def _chroma(im):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or (r > 175 and b > 160 and g < 120):
                po[x, y] = (0, 0, 0, 0)
            else:
                po[x, y] = (r, g, b, 255)
    return out


if __name__ == "__main__":
    import sys
    steps = sys.argv[1:] or ["face", "interior", "contract"]
    if "face" in steps:
        build_face()
    if "interior" in steps:
        enrich_interior()
    if "contract" in steps:
        update_contract()
    print("[gen_ka_forest2_face] done")

# ─────────────────────────────────────────────────────
# gen_runner.mjs 向けの Forge プロンプト定義 (tile.ka_forest2_face):
# proc_wa.py の PROC 辞書に以下を追加:
#   "tile.ka_forest2_face": dict(mode="tileset", fw=128, fh=128, cols=3, rows=1,
#                                out="tile_ka_forest2_face.png",
#                                keys=["tile.ka_forest2_face"]),
# raw プロンプトファイルは forge/assets/raw/tile.ka_forest2_face/prompt.txt に配置。
# ─────────────────────────────────────────────────────

**再調整前提:** 以下は v2 設計ドキュメント確定後に再調整が必要な前提・懸念点:

1. **コーナーベース/高さ角契約との整合**: 本仕様は現行の辺ベース TRANS_MAPS(s/sw/se フィールド)に直接接続している。v2 でデュアルグリッド(角を共有する契約)に移行した場合、「南辺フェイスの配置条件」が「タイル南辺の4隅のうち下2隅が草素材」という角契約で再記述される。その際、TRANS_MAPS.kaForest2 の s フィールドが「南向き角パターンに対応するフレーム」として再マップされる必要がある。現行の frame4(s=4)をそのまま使えるかは v2 のフレーム割り当て規則による。

2. **faceFrames のフレームインデックス**: 現行 TRANS_MAPS では sw=10, se=11 だが、tile_ka_forest2_face.png を新規 3フレームファイルとして独立させた場合はインデックスが 0/1/2 になり、既存 TRANS_MAPS の参照と分離される。「既存ファイルのフレームを置き換える」か「新規ファイルを別キーで追加して tanada.ts で使い分ける」かを v2 マップビルダー実装時に選択すること。

3. **tanada.ts の wall() 関数拡張**: 現在 wall() は kaIshigaki/kaShrineWall/kaDote 専用。森の前面行を wall() で呼べるようにするには、「passable=false でも wall() を適用できる」拡張または新関数 forestWall() を追加する必要がある。この実装は v2 マップビルダー設計確定後。

4. **waDropshadow の z-order**: 森の南縁に waDropshadow を敷く際、既存の kaEdgeOverlay(seam_breaker)との積み重ね順が問題になる可能性がある。現在は ground → deco(waDropshadow) → deco(kaEdgeOverlay) の順で塗られているが、kaEdgeOverlay が影の上に乗ると影が見えなくなる。レイヤー定義を sub_deco(shadow) / deco(overlay) に分離するか、tanada.ts の塗り順を確認する必要がある。

5. **grade_wa.py の適用除外**: kaForest2_trunk_face(幹褐色)は grade_wa.py の「緑グレード(彩度-28%/色相-17°)」対象に入れてはならない。幹の褐色(R > G)は green マスク(H 55-170°)には引っかからないが、全体彩度の -8% は適用される。幹の色が抹茶化しないよう TARGETS リストへの追加は見送ること。

6. **checker/map_art_linter の更新**: wallNeedsShadowBelow:true を kaForest2 に追記した後、linter が「森の南辺タイル直下の waDropshadow 欠落」を ERROR/WARNING として検出するよう linter ロジックの更新が必要。現在 linter は isWallFace=true かつ wallNeedsShadowBelow=true のタイルのみを影チェック対象としている(height_connection.py 参照)。

---

## 起伏地形（段差≤1スロープ素材＋手続きシェーディング）

**お手本観察:** お手本（otehon.png）の高低差の見せ方を観察した結果は以下の通り。

【高低差の表現手段】
- 「色トーン差」による沈み込み: 低地（谷・棚田下段）は全体的に暗い青みがかった深緑（#3f8a4e相当）で塗られ、高地（上段テラス・高台）は明るい暖かみのある草緑（#5fb35f相当）で塗られている。この上下段のトーン差だけで地形の高さが直感的に読める。
- 「土手（草付き斜面）」による段差の実体化: 棚田の段と段の境界には必ず前面向きの草付き土手（kaDoteに相当するパーツ）が入る。上辺=明るいリップ縁、垂直面=暗い土と草の陰影、下端=接地影の三層構造が見える。
- 「接地影」による地面への固定: 高台・擁壁の直下に暗い影ストライプが置かれており、構造物が浮かずに地面に乗っているように見せる。
- 「スロープ面の方向光」: 左上から光が当たる前提で、南向き（プレイヤー側を向く）の斜面は最も明るい上部ハイライトと暗い下部グラデーションを持ち、北側（奥側）の斜面は均一な暗い色で処理される。
- 「平坦タイル」: 上段・下段それぞれの内部は密な草テクスチャで埋められているが、段差境界に近づくにつれ暗くなり低地感を強調している。
- 「起伏の重なり」: 棚田は複数段の水平テラスが階段状に重なる。各テラスは「高地草（明）→土手前面（陰影）→接地影（暗）→低地草（暗）」の4ゾーンのシーケンスで構成される。

【現状スクリーンショット（screenshot.png）との対比】
- 現状は高地（grassUpper / #5fb35f相当）と低地（grassLower / #3f8a4e相当）の色トーン差は実装されているが、タイル間の「段差を実体化するスロープ前面」が薄い。棚田の段は横に長い線として認識はできるが、土手の立体感が弱く平坦に見える。
- お手本ではスロープの前面（垂直面）が明確な造形として描かれており、これが段差≤1でも視覚的な高低差の"厚み"を生んでいる。

**既存資産:**
- `tile.grass_upper（tile_grass_upper.png → tileset.ts: grassUpper）`: カテゴリ: ground_tone / role: tone_upper。明・暖色の上段草。4x4フレームのオートタイル形式。現状frame構成は辺ベース（edge/corner）と推測されるが角ベースへの拡張は未実施。同ファイルはSNES-WA系の平坦草で生成済み。不足点: 高さ情報（corner角属性）がなく、コーナーベース高さ契約（左上/右上/左下/右下=1100等）へのマッピング定義が存在しない。
- `tile.grass_lower（tile_grass_lower.png → tileset.ts: grassLower）`: カテゴリ: ground_tone / role: tone_lower。暗・青み の下段草。同じく4x4フレームのオートタイル形式。平坦素材として生成済み。不足点: grassUpperと同じく角ベース高さ契約なし。スロープ接続アンカーとして使う場合の辺高さルール未定義。
- `tile.ka_grass（tile_ka_grass.png）/ tile.ka_grass2 / tile.ka_grass_calm`: カテゴリ: ground_grass。棚田マップ用の和風草。ka_grass_calm はpreferredWalkableBase=true。全て平坦タイルとして生成済み。不足点: スロープ面・角高さパターン未定義。ka_grassシリーズは「内部＝平坦面の素材」として使うが、外周スロープ前面は別パーツを要する。
- `tile.ka_dote（tile_ka_dote.png → tileset.ts: kaDote）`: カテゴリ: earth_bank / faceFrames: [4,5,6]（W端/FACE/E端）/ role: earth_bank。草付き土手の前面パーツ。すでに生成済みで、南向き正面（FACE=5）・W端（4）・E端（6）の3フレームが定義されている。不足点: 4角(SW/SE/NW/NE)の角ぐるみコーナー（角高さ=1100で左下/右下だけ高い 等のケース）がfaceFramesに含まれていない。コーナーベース角規則に対応した斜め角パーツが不足。
- `tile.wa_dropshadow（tile_wa_dropshadow.png → tileset.ts: waDropshadow）`: カテゴリ: shadow / layer: deco / role: drop_shadow。既存でframe3が強い影として使われている（takadai.ts）。不足点: 現在は「石垣下の影」専用で使われており、草付き土手（kaDote）の接地影としての利用ルールが明確でない。スロープの角度・方向に応じたN/S/W/E方向別の影バリアントがない（現在はS向きのみ想定）。
- `tile.ka_ishigaki（tile_ka_ishigaki.png → tileset.ts: kaIshigaki）`: カテゴリ: retaining_wall / faceFrames: [5,9,10]（FACE/SE角/SW角）。棚田の石垣。生成済み。不足点: 石垣は段差=複数段（崖相当）の境界として機能しており、段差≤1のスロープ文脈ではなく崖/石垣の専用タイル扱い。スロープ設計の対象外（ただし高さ境界としてスロープと隣接する条件定義が要る）。

**必要パーツ:**
### ka_grass_upper_slope（上段草＝高地トーン・スロープ面対応拡張）
- 高さ/素材パターン: 内部タイル: [1,1,1,1]（全角=高地）/ 南向きスロープ接続辺: 上辺=[1,1] 下辺=[0,0]（南辺の2角が低い=南側へ下る）。西向き: 左辺=[1,0] 右辺=[1,0]。内角コーナー（左上1右上1左下1右下0=SE落ち）も定義
- フレーム配置: 4x4=16フレーム。Row0(col0-3): center=高地草4変種（既存ka_grassと同色域）。Row1: edge N/S/W/E（高地から低地への遷移 辺部）。Row2: outer corner NW/NE/SW/SE（有機的な丸角）。Row3: inner corner 4種＋accent 0種（高地内折れ角）
- 生成区分: **procedural-shading**
- 接続アンカー: ka_grass_lower_slope または ka_grass_calmと接続。南辺の下2角（[_,_,0,0]）が低地側と整合すること。罫線条件: 遷移辺を挟んで隣のタイルの上辺2角が[0,0]=低地であること。高さズレ禁止: 角を共有するタイルは必ず同一の角高さ値を持つ（角高さ契約）
- Forgeプロンプト: `既存 tile_ka_grass.png / tile_ka_grass2.png（高地草平坦素材）の色域を継承しつつ、手続きシェーディングにより南/西/東/北の各辺に勾配を焼き付ける。生成不要——build時の後処理でgrassUpperのトーンをka_grassセットに適用し、高地側を+15明度・暖色シフトするピクセル処理で対応する。`

### ka_grass_lower_slope（下段草＝低地トーン・スロープ受け面対応）
- 高さ/素材パターン: 内部タイル: [0,0,0,0]（全角=低地）。高地から流れ込む辺の上2角=[1,1]→下2角=[0,0]（スロープ受け側）。既存 grassLower のトーン継承
- フレーム配置: 4x4=16フレーム。Row0: center 低地草4変種（暗・青み・ka_grass_calmより暗め）。Row1: edge 4方向。Row2: outer corner 4種。Row3: inner corner 4種
- 生成区分: **procedural-shading**
- 接続アンカー: ka_dote（土手前面）または ka_ishigaki の真下セルと接続。上辺の角が=1（高地）を受けるタイルはスロープ境界を持つ。低地トーンの base hue: #3f7a44相当、彩度を上段草より-20%抑制
- Forgeプロンプト: `生成不要。既存 ka_grass_calm の色域から grade_wa.py の緑グレーディング（K=1.2）を手続きで適用し、下段専用の暗調バリアントを生成する後処理スクリプトで対応する。`

### tile.ka_dote_corners（草付き土手・四隅コーナーパーツ）
- 高さ/素材パターン: SW角コーナー（左下が低地・右上が高地）: [1,1,1,0] / SE角: [1,1,0,1] / NW角: [1,0,1,1] / NE角: [0,1,1,1]。角1つだけが高さ=0になるコーナー形状
- フレーム配置: 既存 tile.ka_dote の4x4シートにRow3として追加。または別シート tile.ka_dote_corner として4フレーム（SW/SE/NW/NE）のみ収録。faceFrames の定義を [4,5,6,7,8,9,10] に拡張（現在は [4,5,6] のみ）
- 生成区分: **new-forge-gen**
- 接続アンカー: ka_doteの FACE(5)フレームと同一の垂直面・接地影品質で接続すること。コーナーの2辺が噛み合う角の高さが一致する必要あり。有機的な丸角で直角コーナーは禁止（お手本準拠）
- Forgeプロンプト: `Bright mythical-Japan satoyama palette, golden-hour top-left directional light. A 4-frame CORNER EARTH BANK autotile sheet for a top-down 2D RPG, each cell EXACTLY 128x128 px, fully opaque, 2x2 grid (4 cells): SW corner (top-left cell), SE corner (top-right cell), NW corner (bottom-left cell), NE corner (bottom-right cell). Each corner shows where two perpendicular earth embankment faces meet: (A) TOP LIP: bright warm-lit overhanging grass fringe 20-28px, tiny clover flowers; (B) VERTICAL FACE: 55-70px oblique earthy slope with grass blades, exposed soil, pale roots, dark earth — upper-left bright, lower-right deep shadow; (C) BASE SHADOW: 18-24px dark contact shadow anchoring to lower terrain. The corner is ORGANICALLY CURVED, NOT a 90-degree right angle — grass blades and roots wrap naturally around the arc. High-land surface (top-left zone of each tile) matches ka_grass hue (#5fb35f warm matcha green). Low-land surface (bottom-right zone) matches ka_grass_calm darker tone (#3f7a44 cool jade). Palette: snes_forest.json + vermilion accent for tiny flower. No text, no characters, no isometric angle, no grid lines.`

### tile.ka_slope_shadow_overlay（スロープ接地影オーバーレイ・方向別）
- 高さ/素材パターン: 透過オーバーレイなので高さ情報なし（deco layer）。S方向（土手の前面直下）/ W方向 / E方向 / 対角コーナー方向の4変種。既存waDropshadow（frame3=強影）を方向別に拡張したもの
- フレーム配置: 4x4=16フレーム。Row0: S影（正面土手直下・最強）x4変種（幅を変えたグラデ）。Row1: W影 / E影 / SW角影 / SE角影。Row2: N影（奥側は薄め）/ NW / NE / full（全辺接地影）。Row3: 細い影（小段差用）x4
- 生成区分: **procedural-shading**
- 接続アンカー: 土手前面（kaDote FACE）または石垣（kaIshigaki FACE）の真下タイルのdeco layerに配置。影の濃さは段差高さに比例——段差=1の場合は既存waDropshadow frame3の70%の不透明度。罫線条件: 影タイルはground layerではなくdeco layerに置き、ground tile のpassable属性を変更しない
- Forgeプロンプト: `生成不要。既存 tile_wa_dropshadow.png を元に、Python後処理で方向別マスク（S/W/E/コーナー）を切り出し、アルファ値を0.7倍に調整した派生シートを生成する手続き処理で対応する。`

### tile.ka_dote_north_face（北向き・奥向き土手＝薄い陰影版）
- 高さ/素材パターン: 上辺=[0,0] 下辺=[1,1]（南から北へ登るスロープの北面。プレイヤーから見て奥に下がる側）。4隅: [0,0,1,1]
- フレーム配置: 1フレームのみ（もしくはka_doteの Row3 accent 2枚をこれに充当）。南向き前面（FACE=5）の反転・暗色バージョン
- 生成区分: **procedural-shading**
- 接続アンカー: 北辺に高地（上辺=1,1）・南辺に低地（下辺=0,0）タイルが接続する辺に配置。お手本では北側の土手は暗い色で目立たず、南側のみ強い立体陰影を持つため、このパーツはsaturationを-30%落とした省略形で可
- Forgeプロンプト: `生成不要。既存 tile_ka_dote.png の FACE(5) フレームを垂直反転し、grade_wa.py の darkening（明度-15%）を後処理適用するだけで対応可能。proc_wa.py 後処理ステップとして追加する。`

**パレット方針:** snes_forest.json の実値（高地草: #9fd16b, 中間: #5fa34a, 暗緑: #2f6b3f, 影: #1b1b2f）に対して、お手本の色域との対応は以下。

お手本の高地草: 彩度高め・黄緑よりの明るい緑（#7ec44e相当）→ snes_forestの #9fd16b が近い。ただし grade_wa.py の緑シフト（色相-17°・彩度-28%）が適用されると「抹茶色」になりすぎてお手本の鮮やかさから離れる。

対策: スロープ素材の gradient shading では grade_wa の K値を 0.6 以下に抑える（K_OVERRIDE に追加）。具体的には:
- ka_grass_upper_slope: K=0.6（高地は明るく保つ）
- ka_grass_lower_slope: K=1.1（低地は暗め・抹茶化を許容）
- ka_dote_corners: K=0.7（土手の草リップは明るく、垂直面は自然な陰影で）

影色: お手本の接地影は純黒ではなく青みがかった暗緑（#1b2a1e相当）。wa_dropshadow の現行実装と近い。スロープ接地影は waDropshadow をそのまま流用可能。

コントラスト方針: お手本は隣接する高地/低地の明度差が約30-35%（絶対値）ある。現状の grassUpper(#5fb35f) / grassLower(#3f8a4e) の差は約15-20%で不足気味。手続きシェーディング時に高地の明度を+8%・低地の明度を-8%ずらすことで差を広げる。

**Forgeコマンド草案:** #!/usr/bin/env python3
"""slope_shade.py: 段差≤1スロープ素材の手続きシェーディング後処理。
proc_wa.py 後に実行。スロープ方向（S/W/E/N）ごとに勾配を既存平坦タイルへ焼き付け、
上段草（明・暖）/ 下段草（暗・冷）/ 接地影方向バリアントを生成する。

使い方:
  python3 forge/slope_shade.py                   # 全スロープ素材を処理
  python3 forge/slope_shade.py --only upper       # 上段草のみ
  python3 forge/slope_shade.py --only lower       # 下段草のみ
  python3 forge/slope_shade.py --only shadow      # 接地影オーバーレイのみ
"""
import os, sys, json
import numpy as np
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(GAME, "public", "assets")
T = 128  # タイルサイズpx

# ── 上段草（高地トーン）: ka_grass_calm を明・暖化して上段専用バリアントを生成
def make_upper_grass(src="tile_ka_grass_calm.png", dst="tile_ka_grass_upper.png", k=0.6):
    """ka_grass_calm から高地草（明・暖）を生成。明度+8%・暖色シフト+0.03H（黄緑方向）"""
    p = os.path.join(A, src)
    im = Image.open(p).convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    rgb = arr[..., :3] / 255.0
    # 簡易HSV操作: 緑域(H=80-160°)の明度+0.08・彩度+0.05
    from colorsys import rgb_to_hsv, hsv_to_rgb
    out = rgb.copy()
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            r, g, b = float(rgb[y,x,0]), float(rgb[y,x,1]), float(rgb[y,x,2])
            h, s, v = rgb_to_hsv(r, g, b)
            if 0.22 < h < 0.45:  # 緑域
                v = min(1.0, v + 0.08 * k)
                s = min(1.0, s + 0.05 * k)
                h = max(0.0, h - 0.02 * k)  # 黄緑方向
            out[y,x] = hsv_to_rgb(h, s, v)
    result = arr.copy()
    result[..., :3] = np.clip(out * 255, 0, 255)
    Image.fromarray(result.astype(np.uint8), "RGBA").save(os.path.join(A, dst))
    print(f"upper grass: {src} -> {dst}")

# ── 下段草（低地トーン）: ka_grass_calm を暗・冷化して下段専用バリアントを生成
def make_lower_grass(src="tile_ka_grass_calm.png", dst="tile_ka_grass_lower.png", k=1.1):
    """ka_grass_calm から低地草（暗・冷）を生成。明度-8%・青み+0.03H（青緑方向）"""
    p = os.path.join(A, src)
    im = Image.open(p).convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    rgb = arr[..., :3] / 255.0
    from colorsys import rgb_to_hsv, hsv_to_rgb
    out = rgb.copy()
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            r, g, b = float(rgb[y,x,0]), float(rgb[y,x,1]), float(rgb[y,x,2])
            h, s, v = rgb_to_hsv(r, g, b)
            if 0.22 < h < 0.45:
                v = max(0.0, v - 0.08 * k)
                s = max(0.0, s - 0.05 * k)
                h = min(0.5, h + 0.015 * k)  # 青緑方向
            out[y,x] = hsv_to_rgb(h, s, v)
    result = arr.copy()
    result[..., :3] = np.clip(out * 255, 0, 255)
    Image.fromarray(result.astype(np.uint8), "RGBA").save(os.path.join(A, dst))
    print(f"lower grass: {src} -> {dst}")

# ── 北向き土手前面（南向きの暗化版）: ka_dote.png FACE(frame=5)を垂直反転+暗化
def make_north_face(src="tile_ka_dote.png", dst="tile_ka_dote_north.png", dark=0.15):
    """ka_dote の FACE(col=1, row=1)を垂直反転し、明度-15%して北向き土手を生成"""
    p = os.path.join(A, src)
    im = Image.open(p).convert("RGBA")
    # FACE = frame5 → col=1,row=1 (0-indexed)
    face = im.crop((T, T, T*2, T*2))
    arr = np.asarray(face, dtype=np.float32)
    arr[..., :3] = np.clip(arr[..., :3] * (1.0 - dark), 0, 255)
    flipped = np.flipud(arr)
    out = Image.fromarray(flipped.astype(np.uint8), "RGBA")
    out.save(os.path.join(A, dst))
    print(f"north face: {src}[frame5] -> {dst}")

# ── 接地影方向バリアント: wa_dropshadow を方向別マスクで展開
def make_shadow_variants(src="tile_wa_dropshadow.png", dst="tile_ka_slope_shadow.png"):
    """wa_dropshadow の強影(frame3)を方向別（S/W/E/コーナー）にマスクし派生シートを生成"""
    p = os.path.join(A, src)
    im = Image.open(p).convert("RGBA")
    # frame3 = col=3, row=0
    base = np.asarray(im.crop((T*3, 0, T*4, T)), dtype=np.float32)
    # アルファを0.7倍（段差=1向け）
    base[..., 3] = base[..., 3] * 0.7
    # 方向別マスク: S=下半分強・上半分消, W=左半分強, E=右半分強, コーナー=対角
    sheet = Image.new("RGBA", (T*4, T), (0,0,0,0))
    masks = [
        np.tile(np.linspace(0, 1, T)[:, None], (1, T)),   # S: 上→下グラデ
        np.tile(np.linspace(1, 0, T)[None, :], (T, 1)),   # W: 右→左グラデ
        np.tile(np.linspace(0, 1, T)[None, :], (T, 1)),   # E: 左→右グラデ
        None  # コーナー: 対角マスク（後で追加）
    ]
    for i, mask in enumerate(masks[:3]):
        cell = base.copy()
        cell[..., 3] = np.clip(base[..., 3] * mask, 0, 255)
        sheet.paste(Image.fromarray(cell.astype(np.uint8), "RGBA"), (T*i, 0))
    sheet.save(os.path.join(A, dst))
    print(f"shadow variants: {src} -> {dst}")

only = set(sys.argv[sys.argv.index("--only")+1].split(",")) if "--only" in sys.argv else {"upper","lower","north","shadow"}

if "upper" in only: make_upper_grass()
if "lower" in only: make_lower_grass()
if "north" in only: make_north_face()
if "shadow" in only: make_shadow_variants()

# ── ka_dote_corners は new-forge-gen: gen_runner.mjs から生成する ──
# 以下の assets_plan.json エントリを追加すること:
# {
#   "id": "tile.ka_dote_corner",
#   "name": "ka_dote_corner",
#   "preset": "world_coastline_16",   <- 4x4 tileset preset
#   "priority": 1,
#   "prompt": "<forgePrompt for ka_dote_corners>"
# }
# 生成後: python3 forge/proc_wa.py --only tile.ka_dote_corner
# (proc_wa.py PROC辞書への追記も要:
#  "tile.ka_dote_corner": dict(mode="tileset", fw=128,fh=128,cols=4,rows=4,
#                              out="tile_ka_dote_corner.png", keys=["tile.ka_dote_corner_set"]))

print("[slope_shade] done")

# ── 実行順序（設計確定後） ──
# 1. python3 forge/proc_wa.py                    # 平坦素材の最新rawを処理
# 2. python3 forge/slope_shade.py                # 上段/下段/北向き/影 を手続き生成
# 3. node forge/gen_runner.mjs --only tile.ka_dote_corner --force  # 角コーナー新規生成
# 4. python3 forge/proc_wa.py --only tile.ka_dote_corner           # rawを処理
# 5. python3 forge/grade_wa.py --strength 0.6    # 上段草はK_OVERRIDEで0.6指定
# 6. node checker/map_art_reviewer.js            # 品質チェック

**再調整前提:** 以下の点はv2設計ドキュメント確定後に再調整が必要。

1. 角ベース高さ契約のフレーム番号割り当て: v2のコーナーベースオートタイル仕様（左上/右上/左下/右下の4角高さでフレームを一意に決定するlookup table）が確定してから、ka_grass_upper/lower/slope の各フレームのインデックスを割り当てる。現在 tileset.ts の TRANS_MAPS は辺ベースのため、このマッピング拡張がエンジン側で確定するまで素材のframe配置が決まらない。

2. ka_dote faceFrames の拡張: tile_contract.json の kaIshigaki / kaDote の faceFrames は現在3-4フレームのみ。v2で角ベースコーナーパーツ（4コーナー×2面=8フレーム追加）が確定したらfaceFramesを拡張し、map_art_linter.py の検査ルールも更新する。

3. grassUpper / grassLower との統合方針: 既存の grassUpper（tile_grass_upper.png）は旧SNESスタイルで生成されており、新しい ka_grass_upper_slope（ka_grassパレット継承）と同時に存在する。v2でタイルセットを統合するか並存させるかの方針確定後、takadai.ts / tanada.ts のタイル参照を更新する必要がある。

4. slope_shade.py のピクセル処理速度: 現在の実装案は純粋なPythonループ（PIL無しのnumpy）を想定しているが、128x128タイル×16フレームの全セルをforループで処理すると低速。本番では colorsys の代わりに numpy の HSV変換（skimage.color.rgb2hsv等）を使うか、grade_wa.py と同様の vectorized array 操作に書き直す。

5. checker/tile_contract.json への登録: 新規パーツ（ka_grass_upper_slope / ka_grass_lower_slope / ka_dote_corner / ka_slope_shadow_overlay）をtile_contract.jsonの tiles セクションへ追加し、categories（ground_tone / earth_bank / shadow）へのマッピングを確定させること。これは map_art_linter.py の未登録タイル警告を防ぐために必須。

6. tile.ka_dote_corner の生成品質保証: new-forge-gen で生成するコーナーパーツは、お手本の丸角土手と同等の品質が要る。初回生成後に map-quality スキルで評価し、forgePromptを反復改善する可能性がある。生成前に tile.ka_dote（既存 FACE=frame5）を --reference として渡すことで素材一貫性を高める。

---

## kaRiver3周囲（川岸・水際の接地影付き岸）

**お手本観察:** お手本（otehon.png）右半分の縦走り川を観察した結果:

1. **谷としての沈み込み**: 川は明確に地面より低い谷として描かれており、両岸に濃い暗褐色〜黒緑の落ち影帯（幅8〜12px相当）が走る。影は川縁のタイル上端から始まり、水面に向かって急激に暗くなる。この帯があることで川が「地面に貼った青い帯」でなく「地面が落ちた谷」に見える。

2. **岸の素材とカットバンク**: 水際の岸は単色でなく、上端が明るい草の唇（bright grass lip）→ 中段が露出した暗茶土（eroded earth, #3a2a18系）→ 最下段が濡れた影帯（dark wet shadow, #1a2018系）の3層構造。この立体構造が「高さ差1タイル」を絵として伝えている。

3. **水面(H0)の色**: 水面は青緑（#4a7ab0〜#5b8fb8系）でやや暗め。お手本では白泡ハイライトが少量あり、激しい流れではなく穏やかな山川を示す。

4. **前面/背面**: カメラは真上〜やや俯瞰。北岸（画面上）は岸の土断面がほぼ見えず草唇だけが見える。南岸（画面下=プレイヤー視点手前）は土断面+影帯が最も厚く見える。つまり南向き辺フレームが最も重要な「接地影」担い手。

5. **現在の問題（screenshot.pngとの比較）**: 現在の玉結びスクリーンショット（スクリーンショット 2026-06-15 23.37.22.png）を見ると、川（中央右縦帯）は明るい水色で目立っているが、岸への落ち影が存在せず、川が地面と同一平面に見える。checker結果(RIVER_NO_BANK_SHADOW: 204セル中121セル59%で落ち影なし)と一致する。また tanada.ts を確認するとriverEdgeセット(河岸のランド側セル)が定義されているが、waDropshadowを deco配置するコードが存在しない（設計上の欠落）。

6. **waDropshadow frame構成**: frame0〜3で影の濃さが段階的に増す（frame0=最薄/上端グラデ、frame3=最濃/強影）。tile_contractのshadow定義でstrongFrame=3、川岸=強い高低差なのでframe3使用が正解。

**既存資産:**
- `tile_ka_river3.png (tile.ka_river3)`: 16フレーム横一列(2048x128)。4cols×4rows=16フレームとして生成されたものが横strip化済み。Row1(f0-3)=川センター水面、Row2(f4-7)=辺遷移(N/S/W/E)でカットバンク岸あり、Row3(f8-11)=外角(NW/NE/SW/SE)、Row4(f12-15)=アクセント。tile_contractでrole=river_lowvalley・needsGroundShadow=true。既存フレームには岸の土断面と草唇が描かれているが、岸接地影（落ち影=陸側タイルへの投影）は含まれていない——それはwaDropshadowの担当。不足点: tile側には接地影をburnしない設計のため不足ではないが、陸タイルへの影配置コードがtanada.tsに存在しない。
- `tile_wa_dropshadow.png (waDropshadow)`: 4フレーム横一列(512x128)。frame0=薄グラデ(上から下へ暗くなる)、frame1=中、frame2=中強、frame3=最強の上端暗グラデ。tile_contractでstrongFrame=3・minFrameForStrong=2。現在の川岸では一切使われていない（tanada.tsでriverEdgeへのdeco配置コード欠如）。不足点: frame3が川岸の強段差に必要。影のグラデはTOP→BOTTOMの単方向（上端から暗くなる）のみ。川は4方向あるためW/E/N方向の岸にも影が必要だが、waDropshadowは南向き（上端グラデ）のみ——左/右/北向き岸用の回転バリアントがない。
- `tile_ka_river.png (kaRiver) / tile_ka_river2.png (kaRiver2)`: 両者とも16フレーム横strip(2048x128)。kaRiverが基本川オートタイル、kaRiver2がカットバンク版（フレームに土断面描画あり）。現在のマップではkaRiver3で上書きされており使用頻度低。不足点: kaRiver2のS辺フレーム(f5)は岸断面を持つが他方向は薄い——これは接地影問題とは別軸。

**必要パーツ:**
### tile_ka_river3_bank_shadow_S（川南岸接地影オーバーレイ・南向き専用強影）
- 高さ/素材パターン: 高さ: 左上=H1, 右上=H1, 左下=H0(水), 右下=H0(水)。素材: 上辺=grass(H1陸), 下辺=water(H0)。これが『南向き辺』の正規パターン。タイル内の分割線は横方向（水平）で上半分=陸・下半分=川。
- フレーム配置: waDropshadow frame3を陸側タイル(kaGrass/kaGrass2)のdeco layerに配置するだけ——新規タイル生成不要。ただし現状のwaDropshadow(4フレーム)は上端グラデ(南岸=プレイヤー手前向け)のみ。西岸・東岸・北岸用回転バリアントが必要: 計4方向=edge4枚+角4枚=8フレーム構成を追加する。配置先: center(0枚)、edge(4枚: N/S/W/E岸の陸側)、corner(4枚: NW/NE/SW/SE外角の陸側)。
- 生成区分: **procedural-shading**
- 接続アンカー: waDropshadow(frame3)を陸タイルのdeco layerに配置。川との境界辺が共有角となるため、影グラデの向きを境界辺と一致させる——南岸=frame3そのまま(上暗)、西岸=90度回転(右暗)、東岸=270度回転(左暗)、北岸=180度回転(下暗)。tanada.tsにb.deco(x, y, SHADOW, 3)をriverEdge全セルに対してfacing方向付きで配置する。罫線ズレ防止: decoタイルはground layerの真上に乗るだけなので座標オフセット不要。

### tile_wa_dropshadow_rotated（4方向回転版・川岸専用追加フレーム）
- 高さ/素材パターン: 新規4フレームはframe0〜3の回転バリアント: frame4=W岸向け(右端暗), frame5=E岸向け(左端暗), frame6=N岸向け(下端暗), frame7=SW角/SE角/NW角/NE角向け(対角暗)。既存frame0-3との高さ前提: 常にH1陸→H0水の1段差。
- フレーム配置: 既存tile_wa_dropshadow.pngに4フレーム追加(512x128→1024x128)。既存frame3(S向き強影)をPillowで90/180/270回転してframe4/5/6を生成——新規Forge生成不要、手続き生成のみ。assetmapのframesを4→8に更新。
- 生成区分: **procedural-shading**
- 接続アンカー: 回転軸は各フレームの中心(64x64)。回転後の暗端が常に川方向を向く。角フレーム(frame7)はframe3を45度ではなく対角マスクで生成(コーナーの2辺が暗い)。罫線条件: S向きは上辺が暗い(y=0〜32px)、W向きは右辺が暗い(x=96〜128px)——常にH1側の辺端が最暗。
- Forgeプロンプト: `手続き生成のみのため英語プロンプト不要。Pythonで既存frame3をPillow.rotate()で90/180/270度コピーし、frame4(W)/frame5(E)/frame6(N)を生成。frame7は frame3とframe5を合成(max blend)して角用を作る。`

### tanada.ts riverEdge shadow配置コード（mapbuilder側修正）
- 高さ/素材パターン: コーナーベース契約: 各riverEdgeセルについて、川と接する辺の方向を判定し、対応するwaDropshadow回転フレームを選択。判定ロジック: i+1∈river→W辺接触→frame4(右暗); i-1∈river→E辺接触→frame5(左暗); i+W∈river→N辺接触→frame6(下暗); i-W∈river→S辺接触→frame3(上暗)。角セル(2方向川隣接)はframe7。
- フレーム配置: deco layerのみ使用(ground layerはkaGrass/kaGrass2を維持)。b.deco(x, y, SHADOW, frameIdx)呼び出しをriverEdgeループ内に追加。1セルに複数方向の影が重なる場合は最強(frame3)優先。
- 生成区分: **procedural-shading**
- 接続アンカー: b.deco()はground上deco layerへの配置のため座標ズレなし。ただし橋台(bridge_abutment)・スピルウェイ(spillway)・waterfall下端セルはriverEdgeでも影を置かない（既に独自の影を持つ）——solidSet除外済みだが橋関連セルの追加除外チェックが必要。

### tile_ka_river3 南辺フレーム(f5)の岸断面品質向上版（任意・強化生成）
- 高さ/素材パターン: 高さ[左上=H1,右上=H1,左下=H0,右下=H0]。素材: 上辺=grass lip(#8abf5a), 中段=eroded earth(#5a3a20), 下辺=dark wet shadow(#1a2820)。現状のf5は岸断面があるが、お手本と比べてwet shadow帯が薄い——暗度不足。cornerHeightPatternは1100型(上2隅H1・下2隅H0)。
- フレーム配置: tile.ka_river3の既存f5(S辺)を再生成で置き換え。フレーム配置: edge-south=1枚(frame5)。既存16フレームstrip内のf5位置(x=640〜768px)のみ置換。
- 生成区分: **new-forge-gen**
- 接続アンカー: 上辺(y=0〜32px)はH1草地(kaGrass/kaGrass2)と整合する明るい緑。下辺(y=96〜128px)は水面(kaRiver3 f0-f3)の青緑#5b8fb8と整合する暗い水面。左右辺はループ接続(同フレームが隣接)のため自己seamlessで統一色。
- Forgeプロンプト: `Single 128x128 pixel tile for the SOUTH bank of a low-valley river in a top-down Japanese satoyama JRPG. The top 30% shows a bright grass lip (#8abf5a) as the H1 ground surface. The middle 35% shows an eroded cut-bank: dark exposed earth (#5a3a20), hanging grass roots, tiny mossy stones, visible depth. The bottom 35% is a DARK WET SHADOW band (#1a2820 to #2a3a28) at the water's edge, communicating that the water surface is 1 tile LOWER than the land. The shadow band must be very dark and distinct. NO actual water in this tile — this is the bank face only. Top-left directional light source. SNES-quality crisp pixel art. Japanese satoyama palette: grass #8abf5a, earth #5a3a20, shadow #1a2820, stone #6a5a48. High contrast between grass lip (bright) and shadow base (dark). Opaque, solid #FF00FF magenta background on transparent areas. No UI, no text, no characters, no isometric perspective.`

**パレット方針:** 現在のforge/palettes/snes_forest.jsonとart_profiles/snes16_platformer_v1.ymlは主にキャラ・プロップ向け。川岸接地影の生成では以下の調整が必要:

1. **waDropshadow回転版（手続き生成）**: palettes不使用。既存frame3の単純回転のみなので色変化なし。grade_wa.pyの対象にwaDropshadowを追加しないこと——影タイルは彩度・明度変更対象外（暗いグラデが崩れる）。

2. **tile.ka_river3 f5再生成**: snes_forest.jsonの緑系(#2f6b3f/#5fa34a/#9fd16b)をgrass lipに使用、影色はsnes_forest.jsonの最暗色(#1b1b2f)を#1a2820に補正して使う。お手本の川岸は彩度が高く（grass lip #8abf5a は snes_forest.json の#9fd16bより黄緑寄り）、grade_wa.pyの「緑を抹茶化」グレーディングがかかると草唇が沈みすぎる——tile_ka_river3.pngはgrade_wa.pyのTARGETSリストに現在含まれていないので注意（含めないこと）。

3. **お手本の色域vs現在のpalette**: お手本の川岸は彩度高め(grass #8abf5a, earth #6a4a28)で snes_forest.jsonの暗め緑(#2f6b3f)より明るい。川岸専用に草唇色を1ランク明るく設定し、影帯を2ランク暗くする（#1a2820 vs snes_forest.json最暗#1b1b2fはほぼ一致）。コントラスト比: grass唇#8abf5a(L≈63)から影帯#1a2820(L≈10)で輝度比6:1以上——これがお手本が谷に見える根拠。

**Forgeコマンド草案:** #!/usr/bin/env python3
"""
gen_ka_river3_bank_shadow.py
川岸接地影パーツ生成スクリプト草案。
実行順序:
  1. python3 forge/gen_ka_river3_bank_shadow.py --mode rotated-shadow
     -> tile_wa_dropshadow.png に回転バリアントframe4-7を追加 (512x128 -> 1024x128)
  2. node forge/gen_runner.mjs --only tile.ka_river3_f5 --force
     -> tile.ka_river3のf5(南岸断面)を再生成（assets_plan.jsonに新エントリ追加要）
  3. python3 forge/gen_ka_river3_bank_shadow.py --mode patch-f5
     -> 再生成したf5をtile_ka_river3.pngのx=640-768に上書きパッチ
  4. tanada.tsのriverEdge shadowコードを追加（手動またはCodex補助）

--- Step1: waDropshadow回転バリアント追加 ---

import os, sys
from PIL import Image

ASSETS = '/Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/public/assets'

def extend_dropshadow():
    p = os.path.join(ASSETS, 'tile_wa_dropshadow.png')
    im = Image.open(p).convert('RGBA')
    assert im.size == (512, 128), f'Expected 512x128, got {im.size}'
    T = 128
    # frame3 (x=384-512) を基準に回転
    f3 = im.crop((384, 0, 512, 128))  # 上端暗=南岸向け(既存)
    # f4: W岸向け(右端暗) = f3を90度時計回り
    f4 = f3.rotate(-90, expand=False)
    # f5: E岸向け(左端暗) = f3を90度反時計回り
    f5 = f3.rotate(90, expand=False)
    # f6: N岸向け(下端暗) = f3を180度
    f6 = f3.rotate(180, expand=False)
    # f7: 角向け(上端+右端暗) = f3とf4をmax合成
    import numpy as np
    a3 = np.array(f3, dtype=np.float32)
    a4 = np.array(f4, dtype=np.float32)
    # アルファチャンネルでmax blend（影の濃い方を取る）
    af7 = np.maximum(a3[..., 3], a4[..., 3])
    rgb7 = np.where(a3[..., 3:4] >= a4[..., 3:4], a3[..., :3], a4[..., :3])
    a7 = np.concatenate([rgb7, af7[..., None]], axis=-1).astype(np.uint8)
    f7 = Image.fromarray(a7, 'RGBA')
    # 新しい1024x128ストリップ
    out = Image.new('RGBA', (1024, 128), (0, 0, 0, 0))
    out.paste(im, (0, 0))      # frame0-3 そのまま
    out.paste(f4, (512, 0))    # frame4: W岸
    out.paste(f5, (640, 0))    # frame5: E岸
    out.paste(f6, (768, 0))    # frame6: N岸
    out.paste(f7, (896, 0))    # frame7: 角(SW/SE/NW/NE)
    out.save(p)
    print(f'tile_wa_dropshadow.png: 4->8 frames (512->1024px). ok')

--- Step2: assets_plan.json追加エントリ（tile.ka_river3_f5）---
# assets_plan.jsonのassetsリストに以下を追加:
{
  'id': 'tile.ka_river3_f5',
  'name': 'kaRiver3南岸断面フレーム(f5)強化版',
  'preset': 'world_coastline_16',
  'priority': 1,
  'prompt': 'Single 128x128 pixel tile for the SOUTH bank of a low-valley river in a top-down Japanese satoyama JRPG. The top 30% shows a bright grass lip (#8abf5a) as the H1 ground surface. The middle 35% shows an eroded cut-bank: dark exposed earth (#5a3a20), hanging grass roots, tiny mossy stones, visible depth. The bottom 35% is a DARK WET SHADOW band (#1a2820 to #2a3a28) at the water edge, communicating that the water surface is 1 tile LOWER than the land. The shadow band must be very dark and distinct. NO actual water in this tile. Top-left directional light source. SNES-quality crisp pixel art. Japanese satoyama palette. High contrast between grass lip (bright #8abf5a) and shadow base (dark #1a2820). Opaque, solid #FF00FF magenta background. No UI, no text, no characters.'
}
# 生成: node forge/gen_runner.mjs --only tile.ka_river3_f5 --force

--- Step3: patch-f5 ---

def patch_river3_f5():
    src_raw = '/Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/forge/assets/raw/tile.ka_river3_f5/codex-imagegen.png'
    dst = os.path.join(ASSETS, 'tile_ka_river3.png')
    # hdproc経由でtile mode処理
    import subprocess, sys
    tmp = '/tmp/ka_river3_f5_proc'
    subprocess.run([sys.executable,
        '/Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin/forge/hdproc.py',
        src_raw, tmp, '--mode', 'tileset', '--fw', '128', '--fh', '128', '--cols', '1', '--rows', '1'],
        check=True)
    patch = Image.open(os.path.join(tmp, 'o_strip.png')).convert('RGBA')
    river3 = Image.open(dst).convert('RGBA')
    # f5のx位置 = 5 * 128 = 640
    river3.paste(patch.crop((0, 0, 128, 128)), (640, 0))
    river3.save(dst)
    print('tile_ka_river3.png: f5 patched. ok')

--- Step4: tanada.ts riverEdge shadow配置コード（抜粋）---
# 既存の riverEdge 定義の直後に追加:
#
# const W = b.width;
# for (const i of riverEdge) {
#   const x = i % W, y = Math.floor(i / W);
#   const inR = (j: number) => river.has(j);
#   const sS = inR(i + W);  // 南に川
#   const sN = inR(i - W);  // 北に川
#   const sW = inR(i - 1);  // 西に川
#   const sE = inR(i + 1);  // 東に川
#   let fr = 0;
#   if (sS) fr = 3;        // 南岸(最手前) = frame3(上端暗・最強)
#   else if (sN) fr = 6;   // 北岸 = frame6(下端暗)
#   else if (sW) fr = 4;   // 西岸 = frame4(右端暗)
#   else if (sE) fr = 5;   // 東岸 = frame5(左端暗)
#   if (sS && sW) fr = 7;  // SW角
#   if (sS && sE) fr = 7;  // SE角
#   b.deco(x, y, SHADOW, fr);
# }
"""


**再調整前提:** 以下はv2設計ドキュメント確定後に再調整が必要な前提・留意点:

1. **コーナーベース拡張との整合**: 現在のtanada.tsは辺ベースのpaintAuto(kaRiver3)を使用している。v2でコーナーベース/dual-grid拡張後は、riverの高さ角(H0)が明示されるため、「川角=H0の角」「陸角=H1の角」の境界検出ロジックが変わる。その際、riverEdge影配置ロジックも角ベースの方向判定に移行する必要がある。今回のfr=3/4/5/6/7の辺ベース判定は暫定——v2コーナーベース移行時に書き直す。

2. **waDropshadow拡張(frame4-7)のassetmap更新**: assetmapのtile.ka_river_bank_shadow等の新キー追加、またはwaDropshadowのframes=4→8更新が必要。v2のassetmap仕様が確定してからエントリ名を決定する。

3. **tile_wa_dropshadow.png拡張の後方互換性**: 既存コード（石垣/土手下への waDropshadow frame0/1/2/3 配置）はframe番号が変わらないため影響なし。ただし新frame4-7は既存マップには配置されていないので手動でrougeしても問題なし。

4. **gen_ka3_post.py相当の後処理**: tile_ka_river3 f5を再生成後、継ぎ目（f4=W辺とf5=S辺の角境界）が生じる可能性がある。v2のdeseam戦略が決まり次第、gen_ka_post.pyのDESEAM_CFGにtile_ka_river3を追加するか判断する。現状は単フレーム置換なので継ぎ目リスクは低い。

5. **checker更新**: tile_contractのwaDropshadow定義にframes=4→8と方向メタ(direction: S/W/E/N/corner)を追加する必要がある。RIVER_NO_BANK_SHADOWチェッカーがframe番号を参照している場合はminFrameForStrong=2のままでよい（frame3が依然として最強）。

6. **bridge_abutment/spillway除外**: 橋台・スピルウェイのセルはriversEdge from expand()に含まれるが、solidSetに含まれていないためSHADOW配置対象になってしまう。これらのprops座標をexcludeSet化してriverEdge shadowループから除外する処理が必要——v2のprop-ground除外規則と合わせて設計する。

---
