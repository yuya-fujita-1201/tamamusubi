# ev_003 結びの手 詳細設計

> 版: v1.0 / 最終更新: 2026-06-15 / 状態: 第一版完
> 出典: [Story.md](../../../Story.md) 序幕「式鳥の帰還」 ／ [EVENT_LIST](../../10-lists/EVENT_LIST.md) の ev_003 行
> 相互参照: [SCENARIO_DESIGN](../../20-basic/systems/SCENARIO_DESIGN.md) ／ [PROGRESSION_DESIGN（依代ゲート）](../../20-basic/systems/PROGRESSION_DESIGN.md) ／ [SKILL_LIST](../../10-lists/SKILL_LIST.md)

---

## 0. イベントメタ

| 項目 | 値 |
|---|---|
| event_id | ev_003 |
| 種別 | メイン |
| 地域/マップ | R1 / `satoyama`（最初の崩れた依代・里山の野外） |
| 関連NPC | [npc_002 鈴代](../../10-lists/NPC_LIST.md)（指南役・声で補助） |
| 前提フラグ | `祓い波チュートリアル完`（ev_002 完了。次版 flg_102 予定） |
| 結果フラグ | [skl_002 結びの手](../../10-lists/SKILL_LIST.md) 習得 ／ [flg_300 依代灯数](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md) +1（=1。体験版でも到達） |
| 報酬 | skl_002 結びの手（注連縄を結び直して依代を灯す中核アクション）／ 地図に依代1点が点灯 |

## 1. 概要・位置づけ

本作の探索・進行の根幹「結びの手で依代を灯す」を最初に体験させるシーン。崩れた注連縄を張り直して依代を灯すと、地図に光点が一つ点く＝**進行カウンタ flg_300 が世界の進行ゲートを兼ねる**ことを実感させる（[PROGRESSION_DESIGN](../../20-basic/systems/PROGRESSION_DESIGN.md)）。祓い波（攻撃）に対し結びの手（修復）という、本作の二輪を揃える。

## 2. トリガー条件

- ev_002 完了後、`satoyama` 野外に配置された**最初の崩れた依代**に触れる（インタラクト）で発火。
- 前提=祓い波チュートリアル完（序幕シーケンス）。依代は里の出口付近に固定配置（見落とし防止のため光のパーティクルで誘導）。

## 3. 進行シーケンス

1. 崩れた依代（垂れた注連縄・くすんだ御幣）にミトが触れる。鈴代の声がガイド（「結ぶんだ。あんたの手で」）。
2. [skl_002 結びの手](../../10-lists/SKILL_LIST.md) のチュートリアル: 注連縄の結び目を順番になぞる簡単な入力（最初は1結びのみ）。
3. 結び直すと依代に光が戻り、淡い波紋が里山へ広がる（世界がわずかに息を吹き返す＝環境演出）。
4. 画面端の地図に**依代の光点が1つ点灯**。flg_300=1。「灯した数」が旅の道標であることを提示。
5. 鈴代の声「ひとつ、灯ったね。……まだ、いくつもある」。世界に散る依代の存在を示唆し、探索動機を付与。

## 4. 分岐

分岐なし（一本道）。結びの入力は成功するまでリトライ可（難所にしない＝チュートリアル）。

## 5. 結果・報酬

- skl_002 結びの手を恒久習得（以後すべての依代・案山子の依代修復＝[ev_052](../../10-lists/EVENT_LIST.md) 等で使用）。
- flg_300（依代灯数カウンタ）=1。**この数値が交通解放・第二幕移行のゲートを兼ねる**（[EVENT_SYSTEM_DESIGN §1.2](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)）。体験版では最大2まで（[EVENT_SYSTEM §1.4](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)）。
- 後続: [ev_004 穢れとの初遭遇](./ev_004_hatsu_kegare.md)（里の外で初戦闘）。

## 6. 関連ID（相互参照）

- 一覧: [EVENT_LIST](../../10-lists/EVENT_LIST.md) の ev_003
- 登場NPC: [npc_002 鈴代](../../10-lists/NPC_LIST.md)
- 発火マップ: [MAP_LIST](../../10-lists/MAP_LIST.md) `satoyama` ／ 詳細 [30-detail/maps/satoyama/satoyama.md](../maps/r01_satoyama/satoyama.md)
- 習得スキル: [skl_002 結びの手](../../10-lists/SKILL_LIST.md)
- 進行フラグ: [flg_300 依代灯数](../../20-basic/systems/EVENT_SYSTEM_DESIGN.md)
- 前後イベント: 前提=[ev_002](./ev_002_suzushiro_kokoroe.md) ／ 後続=[ev_004](./ev_004_hatsu_kegare.md)
