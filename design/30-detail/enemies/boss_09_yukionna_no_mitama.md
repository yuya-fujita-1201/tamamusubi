# boss_09 雪女の御霊（ゆきおんなのみたま）詳細設計

> 版: v1.0 / 最終更新: 2026-06-16 / 状態: 第一版完
> 出典: [BOSS_LIST](../../10-lists/BOSS_LIST.md) の `boss_09` 行（§1.5 R5・北雪郷）／ 実装の正典 [`src/data/enemies.ts`](../../../src/data/enemies.ts)
> 相互参照: [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md)（フレーム/数値・EnemyBehavior enum）／ [WEAPON_LIST](../../10-lists/WEAPON_LIST.md)（弱点8系統）／ [ITEM_LIST](../../10-lists/ITEM_LIST.md)（付与状態/ドロップ素材）／ [ACCESSORY_LIST](../../10-lists/ACCESSORY_LIST.md)（勾玉/衣）／ [MAP_LIST](../../10-lists/MAP_LIST.md)（出現map_id）／ [EVENT_LIST](../../10-lists/EVENT_LIST.md)（戦闘トリガ ev_022）／ 眷属 [ENEMY_LIST](../../10-lists/ENEMY_LIST.md) enm_034・enm_035

---

## 0. 敵メタ

| 項目 | 値 |
|---|---|
| ID | boss_09 |
| 表示名（読み） | 雪女の御霊（ゆきおんなのみたま） |
| 種別 | ボス（R5 主ボス・雪中の社の御本殿に封印された御霊） |
| 妖の系統 | 御霊（社に祀られた雪の女神の御霊。穢れで悲嘆に凍て、吹雪と分身で社を閉ざす） |
| アーキタイプ | ranged→debuff（2相） |
| 出現地域 | R5 北雪郷（Lv30〜40） |
| Lv帯 | Lv36〜40 |
| 出現map_id | [`r5_setchu_yashiro_oku`](../../10-lists/MAP_LIST.md)（雪中の社・御本殿／封印の間） |
| 実装キー | 未実装（設計のみ。behavior=`ranged`/`debuff` を相で切替） |
| 状態 | 設計のみ |

## 1. 位置づけ・正体（穢れの背景）

R5 北雪郷の **雪中の社**（r5_setchu_yashiro 系）の御本殿に祀られた、雪の女神の**御霊**。本来は雪原に灯りと恵みをもたらす守り神であったが、玉結び（世界を結ぶ縁）の綻びで穢れと悲嘆を溜め、自らを御本殿に封じて吹雪を絶やさず、社を白闇に閉ざした。**R5 の主ボス・攻略必須**（[PROGRESSION_DESIGN §1.10](../../20-basic/systems/PROGRESSION_DESIGN.md) で `boss_09`＝攻略必須・R5クリア／落とす「裏殿の鍵」が R6 への隘路フラグ開通条件の一つ）にあたり、R5 の主題である**冷気・視界遮断・分身のさばき**を、フェーズ3で手に入る **W6 式符（火符）で分身を溶かし本体を炙り出す**主題で総仕上げする。雑魚 enm_034（雪女）・enm_035（吹雪の精）で予習した「火符で冷気/吹雪を払う」をボス規模に拡張する。撃破は討伐ではなく**祓い（浄化）**であり、穢れが祓われると御霊は本来の慈悲深い姿に戻り、雪原の灯りが戻る（§7）。氷柱の回廊の主 [boss_08](boss_08_kooribashira_no_daima.md) とは ev_022「二体の主と対峙」で連なる、R5 の二大主の片翼であり、その**正ルートの締め**を担う。

## 2. 行動アーキタイプと攻撃パターン

> [ENEMY_LIST §0.2](../../10-lists/ENEMY_LIST.md) の `EnemyBehavior` タグを核に挙動を具体化。実数（射程/CT/ダメージ）は [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md) が正本。

| 攻撃名 | 種別 | テレグラフ | 効果（付与/移動） | 推奨カウンター |
|---|---|---|---|---|
| 冷気弾 | 遠隔（飛び道具） | 袖を払い氷片を集める | 複数の冷気弾を放射・被弾で鈍足（凍結） | 弾の合間を縫って接近／遮蔽物を盾にする |
| 吹雪（視界遮断） | 範囲（持続・第1相） | 社の灯が陰り白気が満ちる | 画面が白み視界を奪う＋鈍足を撒く | W6 式符の火符で吹雪を払い視界を回復 |
| 氷の分身 | 召喚（第2相） | 本体が薄れ複数に分かれる | 同形の分身を生成・本体が紛れる | **W6 式符の火符で分身を溶かす**→残った本体を炙り出して攻める |
| 悲嘆の冷気 | 範囲（debuff・第2相） | うずくまり冷気を絞り出す | 周囲に鈍足・眩み（吹雪）を同時に撒く | 距離を取り火符で払う／付与をお清め（itm_013〜024）で解く |

- **基底挙動**: 第1相=ranged（冷気弾・吹雪で間合いと視界を支配）／第2相=debuff（氷の分身で本体を隠し、鈍足・眩みの付与に特化）。
- **enum拡張要否**: 実装済 `ranged`／追加 `debuff`（[ENEMY_LIST §0.2](../../10-lists/ENEMY_LIST.md)）を相で切替えれば表現可。吹雪の視界遮断・氷の分身は状態/演出ギミック（§B.2）として処理し、火符で解除・看破可能とする。

## 3. ステータス指針

> 数値インフレ禁止（[SCOPE §4](../../00-overview/SCOPE_AND_SCALE.md)）。実数は COMBAT_DESIGN／`src/data/enemies.ts` が確定。本節は同Lv帯内の相対指針のみ。

| 指標 | 相対指針 | 備考 |
|---|---|---|
| HP | 中〜高（R5主ボス） | 水増しせず2相＋分身/視界遮断ギミックで構成。本体HPは控えめで「見つけて当てる」設計 |
| 攻撃 | 中（手数と付与で削る） | 1発は軽め・鈍足/眩みの蓄積と視界不利で脅威を作る |
| 防御/耐性 | 第1相=遠隔主体で柔／第2相=分身で実体が隠れる | 火/火符で分身を溶かすと本体が露出（弱点露出） |
| 速度/機動 | 中（浮遊し間合いを取り直す）／第2相は分身で位置を錯覚させる | テレグラフ猶予は明確に取る |

## 4. 弱点・付与状態

> 武器8系統（[WEAPON_LIST](../../10-lists/WEAPON_LIST.md)）・状態8系統（[ITEM_LIST §1.2](../../10-lists/ITEM_LIST.md)）と直交。BOSS_LIST §1.5 と一致。

- **弱点（武器）**: [W6 式符](../../10-lists/WEAPON_LIST.md)（火符で吹雪を払い・氷の分身を溶かして本体を炙り出す）＋火（松明 [itm_043](../../10-lists/ITEM_LIST.md) 等の火の手段）。本体露出後は W1 祓い刀・W5 和弓など遠近の主力で削る。「火で偽りを払い本体を暴く」型（[BOSS_LIST §1.10](../../10-lists/BOSS_LIST.md)）。
- **特効品**: 火の手段（松明 [itm_043](../../10-lists/ITEM_LIST.md)／W6 式符の火符段階）。御霊系のため鬼特効（炒り豆）は無効。付与対策に お清め系（[ITEM_LIST §1.2](../../10-lists/ITEM_LIST.md) itm_013〜024）。
- **耐性/無効**: 冷気主体のため氷属性は通りにくい想定。第2相の分身は実体を持たず、本体以外への攻撃は無効（火符で溶かして判別）。
- **与えてくる付与状態**: 鈍足（冷気弾・吹雪／[COMBAT_DESIGN §6](../../20-basic/systems/COMBAT_DESIGN.md) `donsoku`）・眩み（吹雪・悲嘆の冷気／`kurami`）。視界遮断と組み合わせ、立ち位置と判断を乱す設計。
- **プレイヤーの対処**: W6 式符の火符で吹雪を払い視界を確保し、第2相は分身を火符で溶かして本体を露出させ、露出した本体を遠近の主力で攻める。鈍足・眩みは距離を取りつつお清めで解く。

## 5. ドロップ・報酬

> 基底2系統（`心` dropHeart／`勾玉・銭` dropGem）は全敵共通。主報酬の正IDは §B.5・[ITEM_LIST](../../10-lists/ITEM_LIST.md)／[ACCESSORY_LIST](../../10-lists/ACCESSORY_LIST.md)が所有。

| ドロップ | 区分 | 確率指針 | 用途（クラフト先） |
|---|---|---|---|
| 裏殿の鍵 | 鍵（進行） | 確定（ボス） | r5_setchu_yashiro_ura（裏殿）の解放＋R6 への隘路フラグ開通条件の一つ。正IDは [ITEM_LIST](../../10-lists/ITEM_LIST.md) が所有 |
| 白貂の毛皮（特上） | レア | 確定（ボス） | 北雪郷系の最上防具/衣の素材。正IDは [ITEM_LIST](../../10-lists/ITEM_LIST.md) が所有 |
| 北雪郷の勾玉（[mag_007 氷柱の勾玉](../../10-lists/ACCESSORY_LIST.md) 系） | レア | 高 | R5 の勾玉。氷属性化の祓い波。正IDは [ACCESSORY_LIST](../../10-lists/ACCESSORY_LIST.md) が所有 |

## 6. 出現条件・配置

- **出現map_id**: [`r5_setchu_yashiro_oku`](../../10-lists/MAP_LIST.md)（雪中の社・御本殿／封印の間）固定1体。直前は r5_setchu_yashiro（雪中の社／神域の結界が残る廃社ダンジョン）。
- **エンカウント方式**: ダンジョン固定ボス。[ev_022](../../10-lists/EVENT_LIST.md)「二体の主と対峙」（前提=ev_021）の連戦の片翼・正ルートの締めとして戦闘開始。
- **密度・湧き**: 単体。第2相で眷属 enm_034・enm_035 を増援スポーン／氷の分身を併用（§B.3）。
- **出現トリガ**: 雪中の社（r5_setchu_yashiro 系）を踏破し御本殿の封印の間へ到達（ev_022 トリガ）。

## 7. 浄化演出・フレーバー

最後の一撃で穢れが祓われると、吹雪が止み、白闇に閉ざされていた御本殿に灯りが戻る。雪女の御霊は悲嘆の冷気を解き、片膝をついて**本来の慈悲深い雪の女神**の姿に還る。赤黒い穢れが胸から抜け、淡い金の光となって御本殿の天井へほどけていく。氷の分身は溶けて雪片に還り、社の鈴がかすかに鳴る。長い台詞は与えず、雪のやむ静けさと一筋の光だけを残す（Story.md §7「説明しすぎない」）。御霊が落とす「裏殿の鍵」で隠し部屋（裏殿）が開き、雪原の灯りが戻って R6 への道が拓ける。プレイヤーは「倒した」ではなく「還した」手応えを得る。

## 8. 実装接続

- **`src/data/enemies.ts`**: 未実装（設計のみ）。第1相 behavior=`ranged`・第2相 behavior=`debuff` を HP閾値で切替。吹雪の視界遮断フラグ・氷の分身の生成/実体判定フラグ（火符で溶解＝本体露出）・鈍足/眩みの付与フラグを保持。
- **数値の委譲先**: [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md)（HP/各相の攻撃/冷気弾の弾数・射程・CT/吹雪の視界遮断量と持続/氷の分身の数と寿命/鈍足・眩みの蓄積量）。
- **AI/行動実装メモ**: 吹雪と氷の分身は火属性（W6 式符の火符 等）で払う/溶かす＝「火で偽りを払い本体を暴く」設計を強制。分身は本体と同モーションで動かし、火符ヒットで溶ける分身判定を持たせる。眷属 enm_034/035 は同テレグラフ規約を流用し予行を活かす。

## B. ボス派生節（ボス/中ボス/ラスボス専用）

### B.1 フェーズ構成

| 相 | 移行条件 | 弱点武器 | 主要攻撃 | 追加ギミック |
|---|---|---|---|---|
| 第1相（吹雪） | 戦闘開始 | W6 式符（火符で吹雪を払う）＋火（松明 itm_043） | 冷気弾／吹雪（視界遮断） | 視界遮断＋鈍足で間合いを奪う（火符で払う） |
| 第2相（分身） | HP約5割 | W6 式符（火符で分身を溶かす）→露出本体へ W1/W5 | 氷の分身／悲嘆の冷気（鈍足＋眩み） | 分身に本体が紛れる・分身以外は無効（火符で看破） |

### B.2 地形ギミック

ボス部屋 `r5_setchu_yashiro_oku` は神域の結界が残る御本殿。御霊が**吹雪**を起こすと画面が白み視界を奪うため、プレイヤーは火の手段（[W6 式符](../../10-lists/WEAPON_LIST.md) の火符 等）で吹雪を払い視界を回復する。第2相の**氷の分身**も火符で溶かして本体を炙り出す。「数値で殴る」のではなく「火で偽りを払い・本体を見つけて当てる」設計＝[BOSS_LIST §0.1-2](../../10-lists/BOSS_LIST.md)。撃破後は「裏殿の鍵」で隣接の隠し部屋 [`r5_setchu_yashiro_ura`](../../10-lists/MAP_LIST.md)（裏殿）が開く。詳細レイアウトは [`../maps/r05_hokusetsu/r5_setchu_yashiro_oku.md`](../maps/r05_hokusetsu/r5_setchu_yashiro_oku.md) が所有。

### B.3 眷属（増援）

> 新規雑魚は作らず ENEMY_LIST の既存種を流用（[BOSS_LIST §0.1-4](../../10-lists/BOSS_LIST.md)）。

| 眷属 | enm_id | 役割 | 出現相 |
|---|---|---|---|
| 雪女 | [enm_034](enm_034_yukionna.md) | 第1〜2相で遠隔の冷気弾と鈍足。本体の弾幕を補強 | 第1〜2相 |
| 吹雪の精 | [enm_035](enm_035_fubuki_no_sei.md) | 第2相で眩み（吹雪）を撒き視界を奪う。分身戦の妨害 | 第2相 |

### B.4 移動解放ゲート（節目ボスのみ）

**R5 の主ボス・攻略必須**（[PROGRESSION_DESIGN §1.10](../../20-basic/systems/PROGRESSION_DESIGN.md)・[BOSS_LIST §1.5](../../10-lists/BOSS_LIST.md)）。撃破で「裏殿の鍵」を獲得し、雪原の灯りが戻る。この鍵は **R6 黒洲への隘路フラグ開通条件の一つ**（ev_024 R6到達は依代×3＝隘路フラグ・[EVENT_LIST](../../10-lists/EVENT_LIST.md)）。R5→R6 のハードゲートそのもの（凍結水路の W6 式符解錠）は [PROGRESSION_DESIGN §1.6](../../20-basic/systems/PROGRESSION_DESIGN.md) が所有し、本ボスはその開通条件の一翼を担う。攻略順の所有は [PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md)＝本節は「裏殿が開き R6 への道が拓く」ことのみ。

### B.5 主報酬と撃破後の進行

- **主報酬**: 裏殿の鍵（[ITEM_LIST](../../10-lists/ITEM_LIST.md) が正IDを所有・裏殿解放＋R6隘路フラグの一つ）／白貂の毛皮（特上）（[ITEM_LIST](../../10-lists/ITEM_LIST.md) が正IDを所有）／北雪郷の勾玉（[mag_007 氷柱の勾玉](../../10-lists/ACCESSORY_LIST.md) 系・[ACCESSORY_LIST](../../10-lists/ACCESSORY_LIST.md) が正IDを所有）。
- **撃破後の進行**: [ev_022](../../10-lists/EVENT_LIST.md) 完了＝R5 主ボス撃破。続く [ev_023](../../10-lists/EVENT_LIST.md)（無台詞・雪原の灯が戻る／父の痕跡・北雪の段）へ進み、依代の隘路フラグを満たして [ev_024](../../10-lists/EVENT_LIST.md)（R6 黒洲到達）へ繋がる。

## 9. 関連ID（相互参照）

- 一覧: [BOSS_LIST](../../10-lists/BOSS_LIST.md) の `boss_09`
- 弱点武器/特効: [WEAPON_LIST](../../10-lists/WEAPON_LIST.md) W6 式符（火符で吹雪払い/分身溶解）・W1 祓い刀・W5 和弓（露出本体へ）／ [ITEM_LIST](../../10-lists/ITEM_LIST.md) itm_043 松明（火）・お清め itm_013〜024
- ドロップ素材/主報酬: [ITEM_LIST](../../10-lists/ITEM_LIST.md) 裏殿の鍵・白貂の毛皮（特上）／ [ACCESSORY_LIST](../../10-lists/ACCESSORY_LIST.md) 北雪郷の勾玉（mag_007 系）
- 出現面: [MAP_LIST](../../10-lists/MAP_LIST.md) `r5_setchu_yashiro_oku`（撃破後 `r5_setchu_yashiro_ura` 解放）／ 詳細 [`../maps/r05_hokusetsu/r5_setchu_yashiro_oku.md`](../maps/r05_hokusetsu/r5_setchu_yashiro_oku.md)
- 関連イベント: [EVENT_LIST](../../10-lists/EVENT_LIST.md) ev_022 二体の主と対峙（前提 ev_021・連戦）／ev_023（無台詞・雪原の灯）／ev_024（R6到達）
- 眷属: [ENEMY_LIST](../../10-lists/ENEMY_LIST.md) [enm_034](enm_034_yukionna.md) 雪女・[enm_035](enm_035_fubuki_no_sei.md) 吹雪の精
- 連戦の相方: [boss_08](boss_08_kooribashira_no_daima.md) 氷柱の大魔（R5 任意ボス）
- 数値/実装の正本: [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md)／[`src/data/enemies.ts`](../../../src/data/enemies.ts)
