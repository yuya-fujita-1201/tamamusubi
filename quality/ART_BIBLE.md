# ART_BIBLE — 玉結び(TAMAMUSUBI) アート品質基準

> GPT Pro 4本柱の **①** 。  
> タイル配置の文法は [TILE_GRAMMAR](./TILE_GRAMMAR.md)、自動検査は [checker](../checker/README.md)、AIレビュー用プロンプトは [MAP_REVIEW_PROMPT](./MAP_REVIEW_PROMPT.md) を参照。

---

## 1. 目的 ― 「描き込み量ではなく可読性が正義」

このゲームのアートが満たすべきことは一つだけだ。

**プレイヤーが画面を見た瞬間に「どこを歩けるか」「地形がどんな高さか」「何が主役で何が背景か」を即座に読み取れること。**

AIは放っておくと「寂しい→花を増やす」「自然にしたい→テクスチャを細かくする」という方向で問題を解決しようとする。しかしそれは間違いだ。タイルの接続文法が弱いまま装飾を増やしても、可読性は上がらない。むしろノイズが増えて悪化する。

* 描き込みが足りないのではない。**構造が読めていないだけだ。**
* 自然に見えないのではない。**タイル同士の接続ルールが守られていないだけだ。**
* 世界観が弱いのではない。**主役と背景の優先順位が逆転しているだけだ。**

修正は「具体的な場所を・具体的なタイルで・具体的なルールで直す」。抽象的な「もっと自然に」は禁止。

---

## 2. 基本仕様

| 項目 | 仕様 |
|---|---|
| 画面方向 | 直交2D見下ろし。北=高、南=低 |
| 論理タイルサイズ | 16px |
| アセット実寸 | 128px（8倍） |
| 座標系 | `prop.x = tileX * 16`（tileset.ts の TILESETS 準拠） |
| 高さレベル | H0=低地(川/谷/南入口)、H1=中段(山道/棚田/集落)、H2=高所(神域) |

### 2-1. 色の方向性

* **主役色**: 苔色・抹茶グリーンを軸にした落ち着いた彩度
* **アクセント**: 朱（鳥居・社）、淡い水色（水鏡・川）を引き色として使う
* **背景を暗くして主役を浮かせる**: 森(`kaForest2`)は彩度を落として背景化し、歩行域を浮き立たせる
* **神域は低ノイズ**: `kaShrineGround` は草地より平坦で静かなトーンを保つ

### 2-2. ノイズ量の上限

* 歩行域の装飾密度: **最大30%**（`checker/tile_contract.json` の `decorDensityWalkableMax: 0.30`）
* プレイヤースポーン周辺: **最大10%**（`decorDensityNearPlayerSpawnMax: 0.10`）
* 高周波ノイズ閾値: stddev 0.16超は警告（`noiseHighFreqStdWarn: 0.16`）
* 25%縮小しても地形の大まかな構造が読める密度を保つ

### 2-3. 高低差の表現ルール ― 3点セット

高さが変わる境界には**必ず**以下3要素を揃えること。これが1つでも欠けると「高さが読めない」になる。

1. **上端の縁**: 擁壁タイルの前面フレーム (`frame5` = 南向き)。明るい縁が段差の天面を示す
2. **縦面**: 石垣(`kaIshigaki`)・土手(`kaDote`)・神社石垣(`kaShrineWall`)の本体面
3. **下の接地影**: 前面フレームの真下のセルに `waDropshadow`(frame3=最強)を必ず敷く

具体的なフレーム番号（`src/data/maps/tanada.ts` の定数 FACE/ISHI_L/ISHI_R を参照）:

```
FACE = 5          // 南向き前面（共通）
ISHI_L = 10       // kaIshigaki 左端（SW曲線）
ISHI_R = 9        // kaIshigaki 右端（SE曲線）
DOTE_L = 4        // kaDote 左端キャップ（W）
DOTE_R = 6        // kaDote 右端キャップ（E）
SHRINE_L = 10     // kaShrineWall 左端（SW曲線）
SHRINE_R = 9      // kaShrineWall 右端（SE曲線）
```

---

## 3. 地形別アート方針

各地形で「何を主役にして何を背景にするか」を明確にする。主役と背景が逆転すると可読性が崩れる。

### 3-1. 草地（`kaGrassCalm`）

* **主役は何もない**: `kaGrassCalm` はプレイヤーを邪魔しない静かなベース
* **背景**: 歩行域の 70%以上を占める沈黙の地。目立ってはいけない
* `kaGrassCalm` の center は 0-3 の4変種。ハッシュ散布でチェッカー感を消す
* `grassUpperTone`/`grassLowerTone` でH1/H0の色トーン差を付けてよい

### 3-2. 川（`kaRiver3`）

* **主役は「地面より低い谷」**: 川面が地面と同じ高さに見えたら失敗
* 川岸には必ず `waDropshadow`(frame3) を展開する（`kaRiver3` の `needsGroundShadow: true`）
* カットバンク岸の曲線を `paintAuto` で表現し、直線的な帯にしない
* 橋と交差する場合は「橋の下を川が流れている」ことが明確に読めること

### 3-3. 棚田（`kaPaddy2`）

* **主役は水鏡**: 鏡面として反射する水面が棚田の美しさの核
* **背景は南面の石垣(`kaIshigaki`)**: 段差境界として機能し、主役（水鏡）を額縁のように支える
* 各段の南端に `kaIshigaki`(FACE=5) を配置し、真下に `waDropshadow` を敷く
* 滝（`obj.spillway`）は「上段水田→落ち口→石垣の切り欠き→滝→滝壺」の縦1モジュールで完結させる
* `kaPaddy2` の `forbiddenOnGroundOf: ["shrine_ground"]` — 神域には流用禁止

### 3-4. 滝（`obj.spillway`）

* **主役は水の落下経路**: 上から下まで視線が追える縦1モジュール
* 「貼り付けオブジェクト」扱いで単体配置するのは禁止（`grammar.waterfall.comment`）
* `requiresAbove: ["water_surface", "river", "earth_bank", "retaining_wall"]` — 上に水源必須
* `requiresBelow: ["river", "water_surface", "ground_grass", "path"]` — 下に滝壺/水路必須
* `obj.spillway` の論理サイズ: 16x48（1x3タイル縦モジュール）

### 3-5. 橋（`obj.bridge2`）

* **主役は「川を渡る構造物」**: 川の上に浮いて見える架橋
* 橋は必ずセット: 橋床(`obj.bridge2`) + 橋台(`obj.bridge_abutment`) + 橋下影(`obj.bridge_shadow`) + 道接続(`kaPath2`)
* `requiresBelow: ["river"]` — 橋の真下が川でないと違和感
* 橋台がない橋は「宙に浮いた板」に見える。両端の橋台は省略不可

### 3-6. 神社高台（`kaShrineWall` + `kaShrineGround` + `obj.shrine_stairs`）

* **主役は「聖域の格調」**: 棚田とは別文法の石垣で神域を区切る
* 導線は必ずこの順: 鳥居(`obj.torii`) → 石段(`obj.shrine_stairs`) → 神域平場(`kaShrineGround`) → 社(`obj.hokora`)
* `kaShrineWall` は `dressed ashlar`（目地がある加工石積）。棚田の `kaIshigaki`（苔石垣）と明確に異なる外見を持つ
* `kaShrineGround` は低ノイズ。棚田タイルや川タイルの流用禁止（`grammar.forbiddenAdjacency`）
* 鳥居の奥が歩行可でないと `SHRINE` チェックが ERROR を出す（`toriiNeedsWalkableBehind: true`）

### 3-7. 森（`kaForest2`）

* **主役は「マップの輪郭を作る壁」**: 歩行不可の背景として外周を締める
* 縁ぼかし（`paintAuto` の変種フレーム）で森の端をぼかし、128px境界の硬い切れ目を隠す
* 北端2行は `kaBamboo`（竹林の壁）で置換し、神域の奥行き感を出す
* 森が途切れる場所（歩行可への境界）には `kaEdgeOverlay`(seam_breaker) を散布する

### 3-8. 道（`kaPath2`）

* **主役は「歩く線の流れ」**: 蛇行することで山道らしさを出す。直線はNG
* プレイヤーが「この道を歩けばどこかに繋がる」とわかること
* 道がどこにも繋がっていない行き止まりは `WALK` チェックが警告する

### 3-9. 竹林（`kaBamboo`）

* **主役は「密度の壁」**: 神社北側の背景として均一な壁を作る
* 竹林は `forest_wall` カテゴリ（歩行不可）。歩行域に紛れ込ませない

### 3-10. 村・民家（`obj.minka_a`, `obj.minka_b`, `obj.watermill_channel`）

* **主役は「生活の匂い」**: 接地影と入口導線で「地面に立っている」ことを示す
* `needsGroundContact: true` — 水面や空中に浮かせない
* `needsEntrancePath: true` — 玄関前に道が繋がっていること
* 水車小屋(`obj.watermill_channel`)は川か水田の近くに配置する（`nearCategory: ["river", "water_surface"]`）

---

## 4. OK例 ― 「読めている」状態の言語化

以下の状態になっていれば合格とみなす。

* **棚田**: 段々になった水鏡が見え、南面に石垣があり、石垣の真下に影があり、滝が石垣の切り欠きから落ちて滝壺に吸い込まれる。水田と草地の境界が有機的な曲線になっている
* **川**: 周囲の草地より明らかに低い位置を流れているように見え、川岸に強い影があり、橋の下を川が通っている構造が読める
* **神社**: 鳥居をくぐると石段があり、石段を上ると低ノイズの神域平場に出て、社が奥に置かれている。石垣は棚田の石垣と質感が異なる
* **25%縮小**: 画面を25%に縮小しても地形の大まかな高低差と通路が読める（ノイズが構造を食いつぶしていない）
* **歩行域**: 草地・道・神域平場が視覚的に歩けると分かり、森・石垣・川・水田が「通れない」と一目で分かる

---

## 5. NG例 ― 必ず避ける実例と「なぜ悪いか」

ここが最重要。AI生成で実際に起きた失敗を具体的に列挙する。同じ失敗を繰り返さないためにある。

### NG-01. 水田が「青い四角形」に見える

**実例**: `kaPaddy2` を矩形のまま配置し、縁の `paintAuto` を使わなかった。  
**なぜ悪いか**: 有機的な畦の曲線がなく、テクスチャを貼った四角い床にしか見えない。棚田の自然な形が失われ、「田んぼ」ではなく「青い床タイル」になる。  
**修正**: `b.blob()` + `b.paintAuto(blob, PADDY, "kaPaddy2", "ground", true)` で有機形状に塗る。

### NG-02. 滝が「オブジェクトを貼っただけ」に見える

**実例**: `obj.spillway` を石垣の上端に単体配置した（上段水田なし、滝壺なし）。  
**なぜ悪いか**: 水の流れが上にも下にも繋がっていない「飾り」にしか見えない。滝は水源から滝壺まで連続した経路として認識されて初めて意味を持つ。  
**修正**: 石垣の切り欠き列に `spillway(x, wallY)` を呼ぶ（`src/data/maps/tanada.ts` の `spillway()` 関数参照）。上に `kaPaddy2`、下に `kaRiver3` or `kaGrassCalm` が接続していることを確認。

### NG-03. 高台の正面が「塞がって」見える

**実例**: `kaShrineWall` の石垣を置いたが、石段(`obj.shrine_stairs`)を切り欠かず、鳥居の奥が `solid` になっていた。  
**なぜ悪いか**: 鳥居をくぐっても石垣の壁にぶつかるだけで、神社に入れる印象が生まれない。`SHRINE` チェックが `toriiNeedsWalkableBehind` の ERROR を出す。  
**修正**: 石垣の中央に `obj.shrine_stairs` を配置し、石段の列を `solid` から外す。鳥居と石段が同じ X 列上に並ぶことを確認。

### NG-04. 草地が「ノイズ」に見える

**実例**: `kaGrassCalm` の上に `kaDecor`（花・草むら）を密度 40% 以上で重ねた。  
**なぜ悪いか**: プレイヤーが歩ける地面なのか障害物なのかが一瞬で判断できなくなる。装飾密度 30%超えは `DENSITY` チェックが WARNING を出す（`decorDensityWalkableMax: 0.30`）。  
**修正**: 装飾は 30% 以下に抑える。スポーン周辺は 10% 以下。

### NG-05. 森の端が「128px単位で切れる」

**実例**: `kaForest2` を矩形配置し、オートタイルの変種を使わなかった。  
**なぜ悪いか**: アセット実寸128pxの格子線がそのまま見え、「コピー&ペースト感」が露骨に出る。`SEAM` チェックが `gridSeamDeltaLumaWarn: 14.0` を超えたら WARNING。  
**修正**: `kaEdgeOverlay`(seam_breaker カテゴリ)を森の縁に散布し、大判 `obj.curve_overlay_2x2` / `obj.curve_overlay_3x1` を重ねて格子線を分断する。

### NG-06. 道が「ベージュの直線」に見える

**実例**: `kaPath2` を垂直/水平に直線配置した。  
**なぜ悪いか**: 山道が定規で引いた直線になり、自然な地形との齟齬が生まれる。道の「流れ」が読めず、次の場所へ向かうナビゲーション機能も弱くなる。  
**修正**: `b.path(waypoints, 1.8)` で制御点を複数置き、蛇行するルートを作る（`tanada.ts` の `roadPts` 参照）。

### NG-07. 川が「地面に貼った青い帯」に見える

**実例**: `kaRiver3` を配置したが、川岸に `waDropshadow` を敷かなかった。  
**なぜ悪いか**: 地面と川が同じ高さに見える。川が「低い谷を流れる水」ではなく「地面に塗った青色」になる。`RIVER` チェックが `needsBankShadow` の WARNING を出す。  
**修正**: `b.expand(river, 1)` で川岸セルを取り、`b.deco(x, y, SHADOW, 3)` を敷く（`tanada.ts` のコード参照）。

### NG-08. 神域に棚田パーツを流用する

**実例**: 神社高台の地面に `kaPaddy2` を配置した。または `kaIshigaki` を `kaShrineWall` の代わりに使った。  
**なぜ悪いか**: 神域が棚田と同じ文法で作られてしまい、「聖域の格調」が消える。`checker` の `grammar.forbiddenAdjacency` が `shrine_ground` + `water_surface` の隣接を WARNING として検出する。  
**修正**: 神域の地面は必ず `kaShrineGround`。石垣は必ず `kaShrineWall`（dressed ashlar）。`kaPaddy2`/`kaRiver3`/`kaIshigaki` は神域に置かない。

### NG-09. 橋が「橋台なしで宙に浮く」

**実例**: `obj.bridge2` のみを川の上に配置し、橋台(`obj.bridge_abutment`)と橋下影(`obj.bridge_shadow`)を省略した。  
**なぜ悪いか**: 橋が地面から浮いて見える。橋の重さ・接地感が消え、「描いた橋の絵」に見える。`BRIDGE` チェックが橋台と橋下影の欠如を ERROR/WARNING として検出する。  
**修正**: `obj.bridge2` + `obj.bridge_abutment`(両端) + `obj.bridge_shadow`(橋下) + `kaPath2`(道接続) の4点セット必須。

### NG-10. 同一タイルを3連続以上で並べる

**実例**: `kaPaddy2` の同一フレームを4セル連続で配置した（変種なし）。  
**なぜ悪いか**: 「切り貼り感」が出て、テクスチャが繰り返しているとプレイヤーが気づく。`REPEAT` チェックが `repetitionRun: 3` 超えで WARNING を出す。  
**修正**: `b.paintAuto()` のオートタイル変種機能を使うか、デコールを散布して単調さを崩す。変種あり（`repetitionAllowVariants: true`）の場合は実質4連続まで許容。

### NG-11. 到達不能な歩行ポケットを作る

**実例**: 東側に孤立した歩行可セルが72セル残った（tanada 第4版の既知WARNING）。  
**なぜ悪いか**: プレイヤーが絶対に辿り着けない広いスペースが存在し、制作意図が伝わらない。`WALK` チェックが孤立歩行域を WARNING として検出する。  
**修正**: BFS（幅優先探索）でスタート地点から全歩行域が繋がっているかを確認。孤立域は forest や solid で埋めるか、道を通して接続する。

### NG-12. 「鳥居の先が壁で塞がれる」NG と類似して「社の前に障害物がある」

**実例**: `obj.hokora` の前に `obj.tree_oak` や `kaIshigaki` を置き、社の正面が塞がれた。  
**なぜ悪いか**: 参拝の動線が視覚的に切れる。神社は「鳥居→石段→平場→社」の縦軸が通り抜けられて初めて神域として機能する。  
**修正**: 社の正面（南側）3セルはクリアゾーンを保つ。

---

## 6. 絶対に避ける表現（箇条書き）

* `kaPaddy2` を神域(`kaShrineGround` の上)に配置すること
* `kaRiver3` を神域に配置すること
* 滝(`obj.spillway`)を水源なし・滝壺なしで単体配置すること
* 橋(`obj.bridge2`)を橋台・橋下影なしで配置すること
* 石垣前面の真下に `waDropshadow` を省略すること
* 同一フレームのタイルを変種なしで4連続以上並べること（`repetitionRun: 3` を超える）
* 装飾密度を歩行域で30%超・スポーン周辺で10%超にすること
* 鳥居(`obj.torii`)の奥を `solid` にすること
* 森(`kaForest2`)を矩形配置して128px境界の切れ目を露出させること
* 道(`kaPath2`)を直線で配置すること
* 「抽象的な指示」（「もっと自然に」「違和感がある」）だけで素材変更を指示すること — 必ず「どの座標を・どのタイルで・どのルールで」を明示する

---

## 7. 制作順序と検査の委任

### 制作順序（必ずこの順）

1. **地形構造**: 高低差(H0/H1/H2)の配置、外周の森、スパインの道
2. **導線**: 歩行可能ルートが全エリアに繋がっているか確認。BFSで孤立域チェック
3. **高低差の視覚化**: 段差境界に `kaIshigaki`/`kaDote`/`kaShrineWall` + `waDropshadow` を配置
4. **建物・構造物**: 橋セット・滝モジュール・神社の縦軸・民家を配置
5. **装飾**: `kaEdgeOverlay`(境界破砕)・`kaDecor`・prop の配置。密度上限を守る

装飾を最初に置いてはいけない。構造が不完全なまま装飾を重ねても修正コストが増えるだけだ。

### 検査の委任

自動検査は `checker/run_check.sh <map> [screenshot.png]` に委ねる。

* 構造検査（HEIGHT/STAIR/WATERFALL/BRIDGE/SHRINE/RIVER/REPEAT/WALK/CONTACT/DENSITY）は スクショなしで実行可能
* 画像検査（SEAM/NOISE）はスクショが必要
* 詳細は [checker/README.md](../checker/README.md) を参照

AIによるレビューは [MAP_REVIEW_PROMPT](./MAP_REVIEW_PROMPT.md) の固定プロンプトを使う。「絵を描く AI」と「絵を検査する AI」は別人格・別プロンプトで分ける。

### 合格条件（Definition of Done）

| 条件 | 数値 |
|---|---|
| 総合スコア | 80点以上 |
| ERROR | 0件 |
| 重大WARNING | 3件以下 |

スコア計算の 10軸は `checker/tile_contract.json` の `scoreAxes` を参照（各0-5点 → 100点換算）。
