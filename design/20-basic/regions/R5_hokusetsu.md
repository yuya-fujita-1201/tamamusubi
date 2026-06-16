# R5 北雪郷（hokusetsu）基本設計

> 版: v1.0 / 最終更新: 2026-06-14 / 状態: 第一版完
> 出典: [PLAN §3.2](../../../PLAN.md) ／ [REGION_LIST](../../10-lists/REGION_LIST.md) の R5 行 ／ [SCOPE_AND_SCALE §1.2](../../00-overview/SCOPE_AND_SCALE.md)
> 相互参照: [MAP_LIST](../../10-lists/MAP_LIST.md)（地域=R5）／ [ENEMY_LIST](../../10-lists/ENEMY_LIST.md)（enm_033〜040）／ [BOSS_LIST](../../10-lists/BOSS_LIST.md)（boss_08〜09）／ [EVENT_LIST](../../10-lists/EVENT_LIST.md) ／ 詳細設計 `30-detail/maps/hokusetsu/`

---

## 0. 地域メタ

| 項目 | 値 |
|---|---|
| 地域ID | R5 |
| スラッグ | hokusetsu |
| 表示名 | 北雪郷 |
| 層/種別 | 地上・雪 |
| 推奨Lv帯 | Lv30〜40 |
| マップ数 | 野外14・町6・ダンジョン6・祠4＝計30（SCOPE §1.2 と一致） |
| 解放手段 | 徒歩（北街道）／船（沿岸）。R4 霊峰頂上祠（r4_chojohotai）でR5解放鍵を入手後、r5_fubuki_no へ |
| 色彩キー | 白雪×藍×囲炉裏の橙。昼は白銀のコントラスト、夜は囲炉裏灯が暖かく浮かぶ |

## 1. 地域コンセプト

北の大地を覆う雪と氷の世界。プレイヤーが初めて本格的な「寒冷環境ギミック」を体験する地域で、聖剣2/3 の北方氷雪ゾーン相当にあたる。

核となるテーマは**「吹雪との戦い—見えない道を開く」**。吹雪が視界を奪い、凍結が足を止め、雪解けが足場を危うくする。これらすべての鍵を握るのが **W6式符（火符）** であり、符師から式符を入手したプレイヤーが環境そのものに「応答」できるようになる転換が、R5 体験の山場である。

集落「雪中の村（r5_setchu_mura）」が探索の起点兼補給拠点となる。焰火広場の篝火、旅籠の囲炉裏、鍛冶工房の火花——橙色の「温もり」が白銀の荒野を際立たせる。二体のボス（氷柱の大魔・雪女の御霊）はどちらも火符による弱点露出が攻略の鍵であり、W6の「符を貼る/溶かす」操作を集大成として問う構成になっている。

## 2. 色彩・画面設計の方針

- **主色**: 純白〜青みがかった白（雪原・氷面）
- **対比**: 藍（雪影・岩肌・夜空）
- **アクセント**: 囲炉裏・篝火の橙/赤（町・祠の光源として機能し、遠くから視認できるランドマーク色となる）
- **ダンジョン色**: 氷柱の回廊は青白の透過感、雪中の社は煤けた灰白と破損した朱（廃社）
- **視界変化**: 吹雪中は彩度が落ちて白モヤが前景に乗り、敵が「気配」として滲むシルエットで見える（25%縮小でも吹雪エリアと通常エリアの判別が可能なコントラストを維持）
- **光源の統一**: 屋外は白色反射光（曇天前提）、屋内/ダンジョンは暖色の点光源。ART_BIBLE MAP_DEFINITION_OF_DONE §2 の「25%縮小でも構造が読める」原則を地形の明暗段差で担保する

## 3. マップ構成（全マップ）

> MAP_LIST の R5 行（176〜209行目、計30枚）を束ね、地形概要・出現敵構成・導線を記述する。

| map_id | 種別 | 名称 | 地形概要 | 出現敵構成 | 主な導線/接続 | 報酬 | 状態 |
|---|---|---|---|---|---|---|---|
| r5_fubuki_no | 野外 | 吹雪野 | 吹雪で視界制限される広大な雪原。積雪で歩速低下。W6火符で吹雪を和らげ視界を回復 | enm_034 雪女・enm_033 白狼の群れ・enm_035 吹雪の精 | r5_setchu_mura北端 / r5_shirogane_michi / r5_fubuki_yashiro | 氷晶石・白貂の毛皮 | 設計のみ |
| r5_shirogane_michi | 野外 | 白銀の道 | 圧雪された山道。両脇に雪壁が迫る一本道 | enm_033 白狼の群れ・enm_039 凍て蝙蝠 | r5_fubuki_no / r5_hyoumen_taira | 氷晶石（itm_071） | 設計のみ |
| r5_hyoumen_taira | 野外 | 氷面平ら | 凍結した湖上フィールド。滑走ギミック・亀裂で転落の危険。W6火符で亀裂に符を貼り足場を補強 | enm_036 氷柱魔・enm_037 白熊 | r5_shirogane_michi / r5_kori_no_hama | 白貂の毛皮（itm_072関連） | 設計のみ |
| r5_kori_no_hama | 野外 | 氷の浜 | 凍結した湖岸。氷塊が打ち上げられた砂浜状の地形 | enm_036 氷柱魔・enm_038 寒蝉・enm_039 凍て蝙蝠 | r5_hyoumen_taira / r5_yukidamari_mori / r5_hyochu_kairo / r5_kori_yashiro | 氷晶石（itm_071） | 設計のみ |
| r5_yukidamari_mori | 野外 | 雪溜まりの森 | 針葉樹が雪に埋もれた暗い森。足場が雪に隠れ落とし穴あり。W6火符で雪を溶かして隠し足場を出現 | enm_040 雪だるまの付喪・enm_033 白狼の群れ | r5_kori_no_hama / r5_setchu_mura東口 | 手控帳ページ（itm_055） | 設計のみ |
| r5_yukifuri_toge | 野外 | 雪降り峠 | 稜線の峠道。横風が強くキャラが流される強風ギミック | enm_035 吹雪の精・enm_033 白狼の群れ | r5_yukidamari_mori / r5_reika_kougen | 白貂の毛皮（itm_072） | 設計のみ |
| r5_reika_kougen | 野外 | 冷霞の高原 | 高原台地。朝霧と雪が混じる幻想的な景色。視界が周期的に変化 | enm_035 吹雪の精・enm_034 雪女 | r5_yukifuri_toge / r5_sugi_hara / r5_fugaku_cho / r5_hakuzan_yashiro | 氷晶石（itm_071） | 設計のみ |
| r5_sugi_hara | 野外 | 杉原 | 巨大な杉が並ぶ雪原。杉から雪が落ちる落雪ダメージギミック | enm_040 雪だるまの付喪・enm_038 寒蝉 | r5_reika_kougen / r5_sugi_no_iarou / r5_setchu_yashiro / r5_yuki_yashiro | 手控帳ページ（itm_055） | 設計のみ |
| r5_sugi_no_iarou | 野外 | 杉の隘路 | 杉木立が迫る狭い獣道。R6への隘路入口。凍結した水路が横切る。W6火符で凍結水路を溶かして渡河 | enm_039 凍て蝙蝠・enm_036 氷柱魔 | r5_sugi_hara / r6_kurosugi_iriguchi / r5_kiri_tsubo | 鍵（R6解放） | 設計のみ |
| r5_kiri_tsubo | 野外 | 霧の壺地 | 霧が溜まる盆地。凍えた沼地で沈む足場が点在 | enm_034 雪女・enm_037 白熊 | r5_sugi_no_iarou / r5_oshiro_ato | 白貂の毛皮（itm_072） | 設計のみ |
| r5_oshiro_ato | 野外 | 御城跡 | 雪に埋もれた廃城の外郭。崩れた石垣を登るルート探索 | enm_037 白熊・enm_040 雪だるまの付喪 | r5_kiri_tsubo / r5_umonuki_dori | 手控帳ページ・氷晶石（itm_071） | 設計のみ |
| r5_umonuki_dori | 野外 | 埋貫き通り | 吹雪で完全に埋もれかけた旧街道。W6火符で雪壁を溶かして通路を確保 | enm_035 吹雪の精・enm_038 寒蝉 | r5_oshiro_ato / r5_setchu_mura南口 | 氷晶石（itm_071） | 設計のみ |
| r5_haku_gen | 野外 | 白原 | なだらかな雪原。遮蔽物が少なく敵が遠くから視認できる | enm_033 白狼の群れ・enm_039 凍て蝙蝠 | r5_umonuki_dori / r5_setchu_mura西口 | 白貂の毛皮（itm_072） | 設計のみ |
| r5_tohyou_ga | 野外 | 凍氷河 | 凍りついた河川地形。氷の上を滑走しながら進む横スクロール区間。W6火符で氷柱を溶かして先へ | enm_036 氷柱魔・enm_037 白熊 | r5_haku_gen / r5_setchu_mura西口 | 氷晶石（itm_071）・勾玉 | 設計のみ |
| r5_setchu_mura | 町 | 雪中の村 | 囲炉裏の灯りが灯る雪国の集落。W6式符師の工房あり。地域の補給拠点・情報ハブ | — | r5_fubuki_no北端 / r5_yukidamari_mori東口 / r5_umonuki_dori南口 / r5_haku_gen西口 / r5_shirako_hatago / r5_kaji_kobo / r5_fushimi_gura | — | 設計のみ |
| r5_fugaku_cho | 町 | 富嶽町 | 雪山を望む高台の町。防寒具・回復薬の商店街 | — | r5_reika_kougen / r5_hokka_hiroba | — | 設計のみ |
| r5_hokka_hiroba | 町 | 焰火広場 | 巨大な篝火を囲む広場。町のランドマーク・イベント拠点 | — | r5_fugaku_cho / r5_setchu_mura | — | 設計のみ |
| r5_shirako_hatago | 町 | 白子の旅籠 | 雪国情緒あふれる旅館。回復・セーブ・情報収集の拠点 | — | r5_setchu_mura / r5_hokka_hiroba | — | 設計のみ |
| r5_kaji_kobo | 町 | 鍛冶工房 | 雪国の鍛冶師が営む工房。W6式符の強化・氷晶（itm_071）/白銀（itm_072）の加工が可能 | — | r5_setchu_mura / r5_shirako_hatago | — | 設計のみ |
| r5_fushimi_gura | 町 | 伏見蔵 | 雪に埋もれた古い蔵。隠しアイテム・手控帳ページの保管庫 | — | r5_setchu_mura / r5_kaji_kobo | 手控帳ページ（itm_055）・衣 | 設計のみ |
| r5_hyochu_kairo | D | 氷柱の回廊 | 氷柱が天井から垂れ下がる洞窟ダンジョン。多段階フロア構成。W6火符で氷柱を溶かして進路と足場を確保 | enm_036 氷柱魔・enm_039 凍て蝙蝠・enm_038 寒蝉 | r5_kori_no_hama / r5_hyochu_kairo_b2 | 氷晶石（itm_071）・白貂の毛皮・勾玉 | 設計のみ |
| r5_hyochu_kairo_b2 | D | 氷柱の回廊・深層 | さらに深い氷柱帯。床全面が凍結し滑走必須の難関区間。W6火符で凍結床に符を貼り滑走停止ポイントを作成 | enm_036 氷柱魔・enm_037 白熊・enm_034 雪女 | r5_hyochu_kairo / r5_hyochu_bosu | 手控帳ページ・衣 | 設計のみ |
| r5_hyochu_bosu | D | 氷柱の回廊・最奥 | ボス「氷柱の大魔（boss_08）」との決戦間。天井から氷柱が落下する氷の間 | boss_08 氷柱の大魔（＋enm_036 氷柱魔増援） | r5_hyochu_kairo_b2 | 勾玉・氷晶石（itm_071）大 | 設計のみ |
| r5_setchu_yashiro | D | 雪中の社 | 雪原の奥に鎮座する廃社ダンジョン。神域の結界が残る。W6火符で凍結した鳥居に符を貼り結界を解除 | enm_038 寒蝉・enm_040 雪だるまの付喪・enm_035 吹雪の精 | r5_sugi_hara / r5_setchu_yashiro_oku | 手控帳ページ・衣 | 設計のみ |
| r5_setchu_yashiro_oku | D | 雪中の社・御本殿 | 社の最奥。ボス「雪女の御霊（boss_09）」が封印された間 | boss_09 雪女の御霊（＋enm_034 雪女・enm_035 吹雪の精増援） | r5_setchu_yashiro / r5_setchu_yashiro_ura（撃破後解放） | 勾玉・鍵（itm_098 雪解けの鈴）・白貂の毛皮特上（itm_072） | 設計のみ |
| r5_setchu_yashiro_ura | D | 雪中の社・裏殿 | ボス撃破後に解放される隠し部屋。古文書と隠し収蔵品 | — | r5_setchu_yashiro_oku | 手控帳ページ・衣・氷晶石（itm_071） | 設計のみ |
| r5_fubuki_yashiro | 祠 | 吹雪の祠 | 吹雪野の中心に立つ小祠。セーブポイント兼回復スポット | — | r5_fubuki_no | 回復・セーブ | 設計のみ |
| r5_kori_yashiro | 祠 | 氷の祠 | 凍結した湖岸に建つ氷造りの祠。勾玉が奉納されている | — | r5_kori_no_hama | 勾玉 | 設計のみ |
| r5_yuki_yashiro | 祠 | 雪の祠 | 杉原の奥に隠れた小祠。手控帳ページが眠る | — | r5_sugi_hara | 手控帳ページ（itm_055） | 設計のみ |
| r5_hakuzan_yashiro | 祠 | 白山の祠 | 高原の最高点に立つ祠。全域を見渡せる絶景スポット | — | r5_reika_kougen | 衣・氷晶石（itm_071） | 設計のみ |

## 4. 導線設計

- **メインルート**: R4→r5_fubuki_no（解放入口・吹雪野を突破）→r5_setchu_mura（拠点・W6式符師に会う）→r5_shirogane_michi→r5_hyoumen_taira→r5_kori_no_hama→r5_hyochu_kairo→r5_hyochu_kairo_b2→r5_hyochu_bosu（boss_08 撃破）→r5_setchu_mura→r5_yukidamari_mori→r5_yukifuri_toge→r5_reika_kougen→r5_sugi_hara→r5_setchu_yashiro→r5_setchu_yashiro_oku（boss_09 撃破・itm_098 入手）→r5_sugi_no_iarou→R6解放。「南入口→W6式符入手→ボス撃破2体→R6への隘路」が一本道の骨格。
- **寄り道**: r5_fugaku_cho・r5_hokka_hiroba・r5_shirako_hatago（商店・旅籠）／r5_kiri_tsubo・r5_oshiro_ato・r5_umonuki_dori（廃城跡ルート）／r5_haku_gen・r5_tohyou_ga（西回りルート）。4か所の祠（r5_fubuki_yashiro・r5_kori_yashiro・r5_yuki_yashiro・r5_hakuzan_yashiro）でセーブ・回復・勾玉収集が可能。r5_fushimi_gura の隠し収蔵品も寄り道報酬。
- **スニーク/先取り**: r5_sugi_no_iarou は boss_09 撃破前でも踏み込める（凍結水路さえ火符で溶かせれば通過可能）。ただし R6 側の扉は R5 クリアフラグ（itm_098 所持）がないと開かない。r5_setchu_yashiro_ura は boss_09 撃破後のみ解放される隠し部屋であり、装備の先取りはできない設計。

## 5. 敵構成・難易度カーブ

R5 はすべての敵が Lv30〜40 帯に集中し、地域全体が同水準の脅威密度を持つ（前地域 R4 の Lv22〜32 から継続して圧力が高い）。

**敵8種の系統と配置方針（enm_033〜040）**:

| enm_id | 名称 | 系統 | 配置場所 | 弱点/付与 |
|---|---|---|---|---|
| enm_033 | 白狼の群れ | swarm/lunge | 野外全般（吹雪野・白銀の道・白原） | W4薙刀／鈍足(噛み) |
| enm_034 | 雪女 | ranged/debuff | 吹雪野・冷霞の高原・D深層 | W6式符(火符)/火／鈍足(凍結) |
| enm_035 | 吹雪の精 | debuff | 吹雪野・雪降り峠・雪中の社 | W3御鏡／眩み(吹雪) |
| enm_036 | 氷柱魔 | tank | 氷面平ら・氷柱の回廊系 | W2木槌(砕き)／縛り(凍結) |
| enm_037 | 白熊 | tank/lunge | 氷の浜・霧の壺地・D深層 | W4薙刀/W2木槌／付与なし |
| enm_038 | 寒蝉 | swarm/fly | 氷の浜・埋貫き通り・D | W7舞扇／縛り(麻痺) |
| enm_039 | 凍て蝙蝠 | fly/ambush | 白銀の道・白原・D | W5和弓／鈍足 |
| enm_040 | 雪だるまの付喪 | hop | 雪溜まりの森・杉原・雪中の社 | W6式符(溶解)/火／鈍足 |

**難易度カーブの骨子**:
- 序盤（r5_fubuki_no〜r5_shirogane_michi）: 視界制限＋鈍足付与でW6の必要性を体感させる。敵は enm_033/034/035 中心。
- 中盤（r5_hyoumen_taira〜r5_hyochu_kairo_b2）: 滑走・凍結床のギミック＋タンク系（enm_036/037）の耐久で、W2木槌と火符の組み合わせを習得させる。
- 終盤（r5_setchu_yashiro〜r5_sugi_no_iarou）: 雪中の社で状態異常（眩み・麻痺・鈍足）の複合を出し、お清め道具（itm_013〜024）の活用を促す。

**属性相性の配置方針**: R5 雑魚の大多数が W6式符（特に火符）に弱く、W3御鏡・W4薙刀が補助。W2木槌は氷/タンク系の特効として重要。W5和弓・W7舞扇は飛行系（enm_038/039）への対処に使う。

## 6. ボス・中ボス

| boss_id | 名称 | 配置マップ | ギミック概要 | 推奨武器/属性 |
|---|---|---|---|---|
| boss_08 | 氷柱の大魔（こおりばしらのだいま） | r5_hyochu_bosu | 【第1相】天井から氷柱を落下させ足場を破壊・冷気ブレスで鈍足・氷の檻で拘束。落下した氷柱をW2木槌で砕いて足場を確保しつつ戦う。【第2相】氷の鎧をまとい正面ガードを展開。W6火符(または火)で鎧を溶かすと弱点露出。眷属: enm_036 氷柱魔（回廊から呼び込む） | W2木槌(砕き)＋W6式符(火符)。火が弱点 |
| boss_09 | 雪女の御霊（ゆきおんなのみたま） | r5_setchu_yashiro_oku | 【第1相】冷気弾（遠隔）・吹雪で視界を遮断しながら鈍足付与。氷の分身（enm_034）を複数召喚して本体を隠す。W6火符で分身を溶かして本体を炙り出す。【第2相】本体が露出した後は blizzard 中心の高速攻撃。吹雪の精（enm_035）が増援として召喚。眷属: enm_034 雪女・enm_035 吹雪の精 | W6式符(火符)＋火一択。W3御鏡で吹雪の眩みを防ぐ |

## 7. 移動解放・進行ゲート

- **boss_09「雪女の御霊」撃破**で **r5_setchu_yashiro_oku** より `itm_098 雪解けの鈴` を入手。
- itm_098 を所持した状態で **r5_sugi_no_iarou** を通過すると **R6 黒洲（r6_kurosugi_iriguchi）** への扉が開く。これが「杉谷への隘路」（§1 コンセプトの正式名称）。
- なお boss_08 撃破はメインフラグとして必要だが、単独では R6 解放に直結しない。R5 の進行ゲートは「boss_08撃破＋boss_09撃破＋itm_098入手」の3条件を実質的に通過することで解放される。
- [PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md) に R5→R6 移行の詳細ルールを引き継ぐ。

## 8. 隣接地域・接続

| 方向 | 地域 | 接続マップ（R5側→相手側） | 解放条件 |
|---|---|---|---|
| 南（入口） | R4 霊峰の裾野 | r5_fubuki_no → r4_chojohotai | R4 クリア（r4_chojohotai でR5解放鍵入手） |
| 北（出口） | R6 黒洲 | r5_sugi_no_iarou → r6_kurosugi_iriguchi | R5 クリア（itm_098 雪解けの鈴所持） |
| 沿岸（船） | R2 瑠璃の多島海（沿岸港経由） | ——（船ルートは PROGRESSION_DESIGN §3 で確定） | 船解放済み（boss_01→港） |

## 9. 関連ID（相互参照）

- マップ: [MAP_LIST](../../10-lists/MAP_LIST.md) の R5 行（176〜209行目、30枚）
- 敵/ボス:
  - 雑魚: `enm_033` 白狼の群れ／`enm_034` 雪女／`enm_035` 吹雪の精／`enm_036` 氷柱魔／`enm_037` 白熊／`enm_038` 寒蝉／`enm_039` 凍て蝙蝠／`enm_040` 雪だるまの付喪（[ENEMY_LIST §1.5](../../10-lists/ENEMY_LIST.md)）
  - ボス: `boss_08` 氷柱の大魔／`boss_09` 雪女の御霊（[BOSS_LIST §1.5](../../10-lists/BOSS_LIST.md)）
- 特産/素材:
  - `itm_071` 氷晶（地域特産・W強化素材）／`itm_072` 白銀（地域特産・W強化素材）（[ITEM_LIST §1.7](../../10-lists/ITEM_LIST.md)）
  - `itm_098` 雪解けの鈴（イベントキー・R5→R6 解放）（[ITEM_LIST §1.9](../../10-lists/ITEM_LIST.md)）
  - `itm_055` 手控え帳・北雪の段（収集・R5 ページ）（[ITEM_LIST §1.6](../../10-lists/ITEM_LIST.md)）
- イベント: [EVENT_LIST](../../10-lists/EVENT_LIST.md) の R5 該当 ev_###（第一版で詳細化予定）
- 詳細設計: `design/30-detail/maps/hokusetsu/`（**第一版完・全30枚生成済**＝詳細設計続行プロジェクト Phase 4 で §0〜§10 を作成。数値ID採番のみ実装フェーズ繰延＝[ID_RESOLUTION_LEDGER](../../30-detail/ID_RESOLUTION_LEDGER.md)）
