# ev_007 岩鬼の王 詳細設計

> 版: v1.0 / 最終更新: 2026-06-15 / 状態: 第一版完
> 出典: [Story.md](../../../Story.md) 第一幕「地上の祓い」 ／ [EVENT_LIST](../../10-lists/EVENT_LIST.md) の ev_007 行
> 相互参照: [BOSS_LIST boss_01](../../10-lists/BOSS_LIST.md) ／ [COMBAT_DESIGN](../../20-basic/systems/COMBAT_DESIGN.md) ／ [PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md)

---

## 0. イベントメタ

| 項目 | 値 |
|---|---|
| event_id | ev_007 |
| 種別 | メイン（ボス戦） |
| 地域/マップ | R1 / `ne_no_hora_boss`（根の洞・最奥のボス間＝森の最奥） |
| 関連NPC | なし（ボス戦。前演出のみ） |
| 前提フラグ | `森ダンジョン開放`（ev_006 完了。次版 flg_110 予定） |
| 結果フラグ | [flg_010 R1主ボス撃破](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)（**確定フラグ**）／ ev_007後に [flg_350 船入手](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md) の導線が有効化（[npc_020](../../10-lists/NPC_LIST.md)） |
| 報酬 | [mag_002 勾玉](../../10-lists/ACCESSORY_LIST.md)／[itm_085 鬼の角(大)](../../10-lists/ITEM_LIST.md)／封印の鍵 |

## 1. 概要・位置づけ

R1の節目ボス戦。穢れの源＝[boss_01 岩鬼の王](../../10-lists/BOSS_LIST.md)と対峙し祓う。ボス前演出は**「……祓う」のみ**（5%枠のボス前後演出・多弁にしない＝[Story.md §7](../../../Story.md)）。本作の武器ギミック戦闘（殻を砕いて弱点を露出させる型）を最初に本格提示する。撃破で flg_010 が立ち、移動解放（港/船）のゲート（[PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md)）に接続する。

## 2. トリガー条件

- ev_006 で森ダンジョン（根の洞）を踏破し、`ne_no_hora_boss` のボス間へ進入で発火。
- 前提=森ダンジョン開放。封印の柱を背にした岩鬼の王が起動する（[BOSS_LIST §1.1](../../10-lists/BOSS_LIST.md)）。

## 3. 進行シーケンス

> 戦闘は2相構成（[BOSS_LIST boss_01](../../10-lists/BOSS_LIST.md) の `tank→lunge`）。

1. ボス間進入。短いボス前演出「……祓う」（ミトの一言のみ・無BGM転調）。岩鬼の王が起動。
2. **第1相（tank）**: 岩鎧で正面ガード＋岩石叩きつけ。封印の柱を背に落石を起こす。正面物理は弾かれる。
   - 攻略: [W2 木槌](../../10-lists/WEAPON_LIST.md)の「殻砕き」で岩鎧を破砕、または[W3 御鏡](../../10-lists/WEAPON_LIST.md)の光で背後の封印を照らすと怯む。[itm_014 炒り豆](../../10-lists/ITEM_LIST.md)（鬼特効）でダメージ補強。
3. 道中で[enm_008 岩鬼の眷属](../../10-lists/ENEMY_LIST.md)が増援。落石を避けつつ眷属を祓う。
4. **第2相（lunge）**: 鎧を砕くと突進化。素早い突進をいなして祓い波の隙を作る。HPを削り切る。
5. 撃破。岩鬼の王が砕け散り（序盤演出段階）、穢れが解ける。封印の鍵を残す。ev_008（鳥居の光・無台詞演出）へ直結。

## 4. 分岐

分岐なし（一本道のボス戦）。敗北時はボス間入口に戻し再戦可（封印の柱の位置は固定）。

## 5. 結果・報酬

- [boss_01 岩鬼の王](../../10-lists/BOSS_LIST.md)撃破で **flg_010（R1主ボス撃破）** が立つ。
- 報酬: [mag_002 勾玉](../../10-lists/ACCESSORY_LIST.md)・[itm_085 鬼の角(大)](../../10-lists/ITEM_LIST.md)（[W2強化素材](../../10-lists/WEAPON_LIST.md)）・封印の鍵。
- ev_007後、海女頭らの導線で [flg_350 船入手](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)（[npc_020](../../10-lists/NPC_LIST.md)）が有効化＝R2 多島海への交通解放（[PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md)）。※体験版では船入手を留保（[EVENT_SYSTEM §1.4](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)）。
- 後続: [ev_008 鳥居の光](./ev_008_torii_no_hikari.md)（flg_010 を前提に自動発火）。

## 6. 関連ID（相互参照）

- 一覧: [EVENT_LIST](../../10-lists/EVENT_LIST.md) の ev_007
- ボス: [boss_01 岩鬼の王](../../10-lists/BOSS_LIST.md) ／ 眷属 [enm_008 岩鬼の眷属](../../10-lists/ENEMY_LIST.md)
- 発火マップ: [MAP_LIST](../../10-lists/MAP_LIST.md) `ne_no_hora_boss` ／ 詳細 [30-detail/maps/satoyama/ne_no_hora_boss.md](../maps/r01_satoyama/ne_no_hora_boss.md)
- 武器ギミック: [W2 木槌](../../10-lists/WEAPON_LIST.md)・[W3 御鏡](../../10-lists/WEAPON_LIST.md)（[詳細 W2/W3](../weapons/)）
- 確定フラグ: [flg_010 R1主ボス撃破](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)
- 前後イベント: 前提=[ev_006](./ev_006_chinju_no_mori.md) ／ 後続=[ev_008](./ev_008_torii_no_hikari.md)
