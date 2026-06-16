# enm_014 潮の精（しおのせい）詳細設計

> 版: v1.0 / 最終更新: 2026-06-16 / 状態: 第一版完
> 出典: [ENEMY_LIST](../../10-lists/ENEMY_LIST.md) の `enm_014` 行（§1.2 R2）／ 実装の正典 [`src/data/enemies.ts`](../../../src/data/enemies.ts)
> 相互参照: [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md)（フレーム/数値・EnemyBehavior enum）／ [WEAPON_LIST](../../10-lists/WEAPON_LIST.md)（弱点8系統）／ [ITEM_LIST](../../10-lists/ITEM_LIST.md)（付与状態/ドロップ素材）／ [MAP_LIST](../../10-lists/MAP_LIST.md)（出現map_id）

---

## 0. 敵メタ

| 項目 | 値 |
|---|---|
| ID | enm_014 |
| 表示名（読み） | 穢れ潮の精（けがれしおのせい） |
| 種別 | 雑魚 |
| 妖の系統 | 精霊（水・潮） |
| アーキタイプ | ranged |
| 出現地域 | R2 瑠璃の多島海 |
| Lv帯 | Lv11〜16 |
| 出現map_id | r2_shio_kaze_michi／r2_kita_no_shima／r2_shio_no_yashiro_mae／r2_hana_no_seto／r2_kawakou／r2_kaishoku_do_2f／r2_shio_no_yashiro_1f |
| 実装キー | 未実装（実装済 ranged を流用） |
| 状態 | 設計のみ |

## 1. 位置づけ・正体（穢れの背景）

潮の流れに宿る水の精霊が穢れて荒ぶったもの。本来は海神（潮神）の眷属で、社の近くほど多い。R1 木霊（enm_003・ranged）の海版で、**水弾の遠隔＋水流で足を取る鈍足**という、遠隔＋移動阻害の複合を R2 で教える。後の R4 風の刃・R3 暴走式神など ranged 系の布石。

## 2. 行動アーキタイプと攻撃パターン

| 攻撃名 | 種別 | テレグラフ | 効果（付与/移動） | 推奨カウンター |
|---|---|---|---|---|
| 水弾 | 遠隔 | 掌に水球を溜める | 直線の水弾ダメージ | 遮蔽・横回避→W6式符で打ち消し |
| 渦流 | 設置（足元） | 足元に渦の波紋 | 鈍足付与＋短い拘束 | 渦の外へ抜ける／生姜湯で耐性 |

- **基底挙動**: ranged。距離を保ち水弾を撃ちつつ、接近されると渦で足を奪う。
- **enum拡張要否**: 実装済 `ranged` を流用可。渦の足止めは状態付与で表現。

## 3. ステータス指針

| 指標 | 相対指針 | 備考 |
|---|---|---|
| HP | 低〜中 | 接近できれば脆い |
| 攻撃 | 中＋鈍足 | 鈍足で接近を妨げる立ち回り敵 |
| 防御/耐性 | 物理柔・霊体寄りで式符が通る | W6式符が刺さる |
| 速度/機動 | 並（後退維持） | カイト型。距離管理が肝 |

## 4. 弱点・付与状態

- **弱点（武器）**: W6 式符（霊体に有効・弾打ち消し）。
- **特効品**: 該当なし。
- **耐性/無効**: 純物理近接は当てにくい（浮遊・後退）。
- **与えてくる付与状態**: 鈍足（渦流）。
- **プレイヤーの対処**: 活力の生姜湯 itm_020 で鈍足解除＋耐性。式符で弾を消しつつ距離を詰める。

## 5. ドロップ・報酬

| ドロップ | itm_id | 区分 | 確率指針 | 用途（クラフト先） |
|---|---|---|---|---|
| 清水 | itm_089 | クラフト素材 | 中 | お清め・薬・霊力系クラフトの基礎素材 |

- 基底2系統（心 dropHeart／勾玉・銭 dropGem）は全敵共通。

## 6. 出現条件・配置

- **出現map_id**: r2_shio_kaze_michi／r2_kita_no_shima／r2_shio_no_yashiro_mae／r2_hana_no_seto／r2_kawakou／r2_kaishoku_do_2f／r2_shio_no_yashiro_1f（MAP_LIST 出現敵ラベル「潮の精」）。
- **エンカウント方式**: 社周辺・水路の浮遊シンボル。
- **密度・湧き**: 1〜3体。社（潮の社）の内部ほど密度が高い。
- **出現トリガ**: 常時。満潮時に活性化（数・攻撃頻度増）。

## 7. 浄化演出・フレーバー

祓うと荒ぶった黒い水気が澄み、透き通った潮の精の姿に戻って海へ溶けるように消える。潮神への祈りの気配が残り、社の近くでは鈴の音が小さく響く。

## 8. 実装接続

- **`src/data/enemies.ts`**: 未実装。実装済 ranged を流用。渦流は地形効果＋鈍足付与で表現。
- **数値の委譲先**: COMBAT_DESIGN（HP/水弾威力・速度/渦の鈍足量/Lvスケーリング）。
- **AI/行動実装メモ**: 距離が詰まると渦流を優先し再び距離を取るカイトAI。式符による弾打ち消しを成立させるため水弾の判定を破壊可能に。

## B. ボス派生節（ボス/中ボス/ラスボス専用）

該当なし（雑魚）。ボス「潮神の化身」（r2_shio_no_yashiro_2f）の眷属として本種が随伴する想定（[BOSS_LIST](../../10-lists/BOSS_LIST.md) 参照）。

## 9. 関連ID（相互参照）

- 一覧: [ENEMY_LIST](../../10-lists/ENEMY_LIST.md) の `enm_014`
- 弱点武器: [WEAPON_LIST](../../10-lists/WEAPON_LIST.md) W6 式符
- 付与対処/ドロップ素材: [ITEM_LIST](../../10-lists/ITEM_LIST.md) itm_020 活力の生姜湯（鈍足解除）／ itm_089 清水
- 出現面: [MAP_LIST](../../10-lists/MAP_LIST.md) r2_shio_no_yashiro_1f ／ 詳細 [`../maps/r02_tatoukai/r2_shio_no_yashiro_1f.md`](../maps/r02_tatoukai/r2_shio_no_yashiro_1f.md)
- 数値/実装の正本: [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md)／[`src/data/enemies.ts`](../../../src/data/enemies.ts)
