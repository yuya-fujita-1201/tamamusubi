# HANDOFF_FIXES.md — 『玉結び』指摘修正セッション用引き継ぎ

> 作成: 2026-06-13 深夜 ／ **このセッションの目的＝ユーザーが実機を見て出す追加指摘の修正**
> 全体像は `HANDOFF.md`（§0/0-b/0-c に今夜の全実装）。本ファイルは「次にどこを・どう直すか」に特化。
> Phase 0＋Phase 1A前半は実装・検証済み（typecheck/vitest 30本/build 緑・実機60fps）。コードは**未コミット**（ブランチ codex/overnight-rpg-foundation・未追跡68ファイル）。

## 0. 最短の始め方（3分）

```bash
cd /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin
npm run dev          # → http://127.0.0.1:5210/
npx tsc --noEmit && npx vitest run   # 現状: 緑・30本
```

操作: 移動=WASD/矢印 ／ Z=祓う(長押し→**居合**) ／ Shift=**フロントステップ**(中盤でZ→**ステップ斬り**) ／ C=祓い波 ／ X=調べる・会話 ／ 2=飛行ズーム検証 ／ 3=夜・多光源検証。
ヘッドレス検証: `window.__tamamusubi`（step/key/shot/state）。dev-browser が SIGTRAP で落ちたら `dev-browser stop` → `rm -rf ~/.dev-browser/browsers/default/chromium-profile` → 再実行（サンドボックス外＝dangerouslyDisableSandbox。今夜2回再発・両回これで即復旧）。スクショ等倍クロップでQAすること（縮小プレビューは当てにならない）。

## 1. ユーザー実機確認待ち＝指摘が出そうな箇所と「直し方」

今夜の実装はユーザーがまだ細かく触っていない。以下は「OK/NG判断 → NGなら即ここを触る」early-return 表。

| 確認ポイント | 調整ファイル:場所 | 振り方 |
|---|---|---|
| **居合の手触り**（溜め→抜刀の重さ・縮地距離・出の速さ） | `src/field/player.ts:58-64` の `IAI_*` | 出が遅い→`IAI_HIT_FROM`↓ / 縮地強める→`IAI_LUNGE_SPEED`(2.8)↑・`IAI_LUNGE_F`(8)↑ / 硬直短く→`IAI_F`(30)↓・`IAI_MOVE_CANCEL`(22)↓ / 判定の広さ→`getActiveHit()` L166-178 の reach/width/depth |
| **ステップ斬りの爽快感**（ステップの速さ・斬りに繋ぐ間合い） | `src/field/player.ts:48-54` の `DODGE_*` | キャンセル早く→`DODGE_ATK_CANCEL`(7)↓ / 連発したい→`DODGE_COOL`(F+16)↓ / 移動量→`DODGE_SPEED`(3.6) / 慣性→`applyStepMomentum()` の係数2.4 |
| **祓い波の気持ちよさ・威力** | `src/scenes/field.ts:63-65` | `HARAI_WAVE_R`(150)半径 / `HARAI_DMG_MUL`(3.2)倍率 / 溜め=`player.ts:42 HARAI_WINDUP_F`(18) |
| **ミトの等身・細さ・サイズ感** | `forge/build_mito.py:26-31` の `ANIMS`（体高208/セル240・320） | 数値変えて `python3 forge/build_mito.py all` 即再組立（**raw再生成不要**）。基準=前向き歩き |
| **草原・背景の色味**（まだ明るい場合） | `forge/grade_wa.py:32-35` の `K_OVERRIDE` | `python3 forge/grade_wa.py --strength 1.2` で全体強め / 草だけ→`tile_grass_wa.png`(1.35)↑。*_pregrade.png から毎回原本適用なので何度でも振り直せる |
| **居合モーションのインゲーム見た目**（抜刀の演技が見えるか） | （要・等倍クロップ確認） | 演技が弱ければ `mito.iai8_*` のプロンプト調整→`gen_runner.mjs --only ... --force`→`build_mito.py iai` |
| **ボス戦バランス**（強さ・2フェーズの手応え） | `src/combat/boss.ts` の `BOSS_DEFS.gankinoou` | HP/テレグラフF/行動間隔。相性付けるなら `src/data/weapons.ts:AFFINITY` に `gankinoou:{...}` |
| **杜の奥が明るすぎ/暗すぎ** | `src/data/maps/morioku.ts:91 darkness`(0.32) + 石灯籠光源数 | |
| **和フォントの見え方**（筆/明朝が効いているか） | `src/gfx/font.ts:WA_FONT`（Klee→ヒラギノ明朝） | macに Klee 無ければ明朝にフォールバック。別フォント指定可 |
| 新規アート品質（鈴代/民家/祠/唐傘/木霊/ボス） | `forge/assets_plan.json` の該当 prompt | NGなら `gen_runner.mjs --only <id> --force` → `proc_wa.py`/個別hdproc |

## 2. 既知の残課題（ユーザー未指摘・こちらで把握している要対応）

- **水車小屋の看板に「水車小屋」の文字が焼き込まれている**（obj.suisha raw）。気になるなら prompt に "no text on the sign" 追記で再生成
- **ボスのスキ誘導が未実装**: tele_rock/tele_stomp 中に攻撃を当てやすくする等の戦闘設計がまだ薄い（近接でチャージが被弾解除されるのは仕様＝リスクだが、スキの可視化が無い）
- **歩行の左右ブレ僅少**（ユーザー許容済み・対応不要）
- **Phase 0 残項目⑤**: 御鏡の照射プロト＋木槌の重打（`src/data/weapons.ts` に hammer/mirror 枠だけ定義済み・シートは刀流用）。**ヒビ岩 obj.hibiiwa(4F) は生成済み**＝木槌の破壊対象にすぐ使える
- **勾玉システム未着手**（PLAN.md §6・装備の核。`src/state/game.ts` に kegare は実装済みだが勾玉スロットは未）

## 3. アート再生成・再調整の手順（コマンド早見）

```bash
# 生成（raw が無い/作り直す）: forge/assets_plan.json を編集してから
node forge/gen_runner.mjs --only <id1>,<id2> [--force]   # 並列3・600sタイムアウト・--reference でキャラ固定
# ミト組立（raw→32コマstrip・遊離ノイズ自動除去・等身正規化）
python3 forge/build_mito.py [all|walk|idle|atk|iai]
# 和タイル/プロップ処理（既存assetmapキーへ上書き）
python3 forge/proc_wa.py [--only <id>]
# Seiken由来素材をSS=8再処理
python3 forge/proc_phase0.py
# 和カラーグレーディング（背景のみ・*_pregrade.png から原本適用）
python3 forge/grade_wa.py [--strength 1.0]
# 影マゼンタ/黒つぶれ除去ロジックは grade_wa.py 適用前に手動 or fix_shadows.py 参照
```

サイズ規格（SS=8）: タイル128px / ミト歩行・待機セル240px(体高208) / 攻撃・居合セル320px / FX 160-448px / ボス570px。**raw(443px級)→BOX縮小**を守る（拡大禁止＝二重劣化。antipatterns §A）。

## 4. 確定事項（変えない・確認してから変える）

- ミトの正典＝`art/01_mito.png`。スプライトの参照チェーン基準＝`forge/assets/raw/mito.walk8_down`（前向き歩き＝等身の正）
- **居合**（納刀溜め→抜刀の前方一閃・縮地。回転斬り廃止）／**フロントステップ＋ステップ斬り**は確定仕様
- 体格＝聖剣5.0と同じ身長感（モンスター比でデカくしない）／色彩＝抹茶・苔側（明るすぎ・ビビッドNG）／木＝和松・御神木・竹・桜（モミ/杉様の西洋風NG）
- BGM共通サウンドID凍結／明るいトーン／移動の連続性（マップジャンプ禁止）／語り薄め（Story.md §7）
- SS=8 の canvas 3200px ≈ Retina 実画素でほぼ表示上限。現行ディスプレイではこれ以上の解像度UPは視認不可

## 5. 今夜のQAで修正済み（再発させない）

マルチエージェントレビューで確定バグ5件を修正済み（`HANDOFF.md §0-c 項目9`）: ①stepMomentum被弾リーク ②**相打ち時ボス撃破フラグ漏れ（致命）** ③ボス相性未適用 ④morioku宝箱が崖上 ⑤鳥居柱solidのズレ。マップ・ボス・player を触る時は warp整合（着地点が通行可・往復ループなし）と swingHit リセットに注意。
