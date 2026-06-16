# ev_005 里長の書状 詳細設計

> 版: v1.0 / 最終更新: 2026-06-15 / 状態: 第一版完
> 出典: [Story.md](../../../Story.md) 序幕「式鳥の帰還」 ／ [EVENT_LIST](../../10-lists/EVENT_LIST.md) の ev_005 行
> 相互参照: [SCENARIO_DESIGN](../../20-basic/systems/SCENARIO_DESIGN.md) ／ [PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md) ／ [NPC_LIST](../../10-lists/NPC_LIST.md)

---

## 0. イベントメタ

| 項目 | 値 |
|---|---|
| event_id | ev_005 |
| 種別 | メイン |
| 地域/マップ | R1 / `sato_yakuba`（玉結びの里・役場） |
| 関連NPC | [npc_009 里長 為造](../../10-lists/NPC_LIST.md)（序盤クエスト拠点） |
| 前提フラグ | `戦闘導入完`（ev_004 完了。次版 flg_104 予定） |
| 結果フラグ | [flg_001 序幕完](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)（**確定フラグ**） |
| 報酬 | [itm_094 里長の書状](../../10-lists/ITEM_LIST.md)入手（外界への紹介状） |

## 1. 概要・位置づけ

序幕の締め。里長・為造が世情（各地で依代が崩れ穢れが満ちつつあること）を語り、外界へ出るための紹介状を託す。ここで **flg_001（序幕完）** が立ち、第一幕の完全自由攻略（R1〜R6 を任意順で）が解禁される（[Story.md §6 第一幕](../../../Story.md)・[PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md)）。物語上の「旅立ち」を担う。

## 2. トリガー条件

- ev_004 完了後、`sato_yakuba`（役場）で里長 為造に会う（会話）。
- 前提=戦闘導入完（序幕シーケンス）。序幕は一本道のため、ここまでの ev_001〜004 を順に消化していることが前提。

## 3. 進行シーケンス

1. 役場。為造が里の長として世情を語る: 各地の依代が崩れ、潮の道・神楽・登拝路が次々に止まっていること（**世界の異変の全体像を概観**。ただし真相＝天鎖・世界の呼吸は語らない＝[Story.md §7](../../../Story.md)）。
2. 父・廻人が結び師として各地を巡っていたことに触れる（[npc_018 ごんすけ](../../10-lists/NPC_LIST.md) の語り ev_006圏 へ接続する伏線）。
3. 為造が [itm_094 里長の書状](../../10-lists/ITEM_LIST.md) を託す。「これがありゃ、よその里でも話が通る。……行っといで」。
4. 旅立ちの演出（里の門へ向かうミトを里人が見送る短いカット）。
5. **flg_001（序幕完）** 成立。第一幕（ev_006/009/013/017/021）の地域メインと、R1サブクエスト群（[ev_049/053](../../10-lists/EVENT_LIST.md)等）が解禁。

## 4. 分岐

分岐なし（一本道）。書状受領で確定。以後の攻略順は完全自由（分岐ではなく開放）。

## 5. 結果・報酬

- itm_094 里長の書状を入手。[ev_053 門番権三](../../10-lists/EVENT_LIST.md)（街道の通行手形確認・R2/R3案内）の前提アイテムになる。
- **flg_001 序幕完** が立つ。これを前提に ev_006（鎮守の森）ほか第一幕が解禁。NPC会話ではなくフラグで進行ゲートを構成する原則を守る（[EVENT_SYSTEM_DESIGN §2](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)）。
- 後続: [ev_006 鎮守の森](./ev_006_chinju_no_mori.md)（R1メイン本筋）／自由攻略の各地域到達イベント。

## 6. 関連ID（相互参照）

- 一覧: [EVENT_LIST](../../10-lists/EVENT_LIST.md) の ev_005
- 登場NPC: [npc_009 里長 為造](../../10-lists/NPC_LIST.md)
- 発火マップ: [MAP_LIST](../../10-lists/MAP_LIST.md) `sato_yakuba`
- 報酬アイテム: [itm_094 里長の書状](../../10-lists/ITEM_LIST.md)
- 確定フラグ: [flg_001 序幕完](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)
- 前後イベント: 前提=[ev_004](./ev_004_hatsu_kegare.md) ／ 後続=[ev_006](./ev_006_chinju_no_mori.md)
