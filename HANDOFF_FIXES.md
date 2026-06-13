# HANDOFF_FIXES.md — 『玉結び』指摘修正セッション用引き継ぎ

> ⚠️ **現在地のサマリは `HANDOFF_CURRENT.md`（次セッションはまずそれ）。** 本ファイルは修正ラウンド0〜7の詳細記録。

> 作成: 2026-06-13 深夜 ／ **このセッションの目的＝ユーザーが実機を見て出す追加指摘の修正**
> 全体像は `HANDOFF.md`（§0/0-b/0-c に今夜の全実装）。本ファイルは「次にどこを・どう直すか」に特化。
> Phase 0＋Phase 1A前半は実装・検証済み（typecheck/vitest 30本/build 緑・実機60fps）。コードは**未コミット**（ブランチ codex/overnight-rpg-foundation・未追跡68ファイル）。

## ★ 2026-06-13 第7ラウンド（タイル継ぎ目＋ダッシュ斬りSA・実施済み）

最終 typecheck 0 / vitest **32本** / build 緑。実機で池・森境界の継ぎ目改善を確認。Codex＋qa-code-reviewサブエージェント実施。

- **タイル継ぎ目の解消**（ユーザーがスクショに赤丸: 池の水グリッド／森境界の色違い。`ZZ-HCP-logs/001`）:
  - **新規 `forge/deseam_tiles.py`**。水(tile_water_edge_wa)の center {1,2,12,13,15} を**単一の自己シームレスタイル**で置換（中央frame平均→`np.roll`半分オフセットで端の継ぎ目を内側へ→中央十字フェザー）。pond内部のハードなグリッドが消え連続水面に。森(tile_forest_wa)の center {0,1,2,3,12,13} を平均色へトーン正規化（樹冠の色違いグリッド解消）。
  - center frame index は `src/field/tileset.ts` の TRANS_MAPS と一致させること（water={1,2,12,13,15}, cliff={0,1,2,3,12,13}）。遷移(edge/corner)frameは岸・境界の形が必要なので触らない。
  - **パイプライン順序**: proc_wa → grade_wa → **deseam_tiles → flatten_tiles**（grade後に最後に当てる。冪等寄り）。
  - ※「木」はオブジェクトの木ではなく**境界エリアのタイル**を指していた（前ラウンドの誤解を訂正）。
- **ダッシュ斬りのスーパーアーマー**（仕様）: `player.ts takeDamage()`。ダッシュ斬りの windup/active 中（swingId===dashCutSwing）に被弾しても **hurt に遷移させず斬りを出し切る**（HP・無敵・弱ノックバックは適用。HP0は死亡優先）。ダッシュで敵に当たっても斬りがキャンセルされない＝爽快感を維持。

## ★ 2026-06-13 第6ラウンド（プレイ指摘3回目＋村スタート化・実施済み）

最終 typecheck 0 / vitest **31本** / build 緑。実機(dev-browser)で村↔平原往復・村スタート・水車/池・後ろ攻撃を確認。Codex review＋qa-code-review サブエージェント実施。

- **【バグ】村へ行けない＋村スタート化**: satoyama北の道は鳥居柱(42,9)(45,9)＋地形ノイズで塞がり最上端の単一warpに身体が届かなかった。→ satoyama北(x43-45,y0-10)・kiritate南(x27-29,y34-39)を `paintAuto+solid(false)` で明示クリア、**warpを各3マス幅化**、鳥居柱を(42,9)(46,9)へ。開始を `title.ts` で **kiritate(28,24) スタート**に変更（intro文言も「霧立の里の朝は…」）。実機で村↔平原の往復を確認。
  - ⚠️ 注意: `paintAuto(set,...,solid=false)` は **collision をクリアしない**（solid時のみ=1にする）。歩行可能化には `b.solid(x,y,false)` を別途当てること。
- **後ろ向き攻撃の違和感解消**: `mito.atk8_up` を「純粋な背面ビュー＋両手保持＋刀身は見せない簡潔な前方チョップ（頭上振りかぶり廃止・胴をひねらない）」で再生成。片手/逆手/胴見えすぎを解消。
- **村人の縮尺再調整**: round2で細くしすぎた → 大人(villager_a/b)は **ミトrawを `reference` 参照**して体格・頭身を一致(細すぎ解消)。巫女suzushiroは「3頭身・頭小さめ」で再生成(canon ref維持)。子供villager_cは再生成せず **表示 drawSize:21** に縮小（NpcDef.drawSize 追加・field.ts対応）。
- **家・水車を正面向き**: 水車 `obj.suisha` を「正面正投影・水車を正面face-on」で再生成（家は第5ラウンドで対応済）。
- **木の和グレーディング強化**: `grade_wa.py` K_OVERRIDE に和松/御神木/竹=1.4・桜=1.1 を追加し輪郭線を馴染ませる。
- **水際の滑らか化**: `tile.water_edge_wa` を「ソフトな草混じりの岸グラデ・滑らかな水面・硬い岩境界なし」で再生成→proc_wa→pregrade削除→grade。継ぎ目/硬さを低減。
- パイプライン順序の鉄則: **再生成プロップ/タイルは旧 `*_pregrade.png` を削除してから grade_wa**（消し忘れると旧素材に戻る）。grass は grade 後に **flatten_tiles を最後に再適用**。

## ★ 2026-06-13 第5ラウンド（プレイ指摘2回目＋致命バグ・実施済み）

最終 typecheck 0 / vitest **31本** / build 緑。実機(dev-browser)で村・家・ゲームオーバーを目視確認。Codex review＋qa-code-review サブエージェントを実施。

- **【致命バグ】ゲームオーバー文言**: `src/scenes/gameover.ts` の「リオンは倒れてしまった…」（前作Seikenの主人公）→「**ミトは倒れてしまった…**」。実機確認済み。src全体の表示文字列に他の前作名なし（ルシア/ロックシェルは内部コメント/フィールド名のみ）。
- **ミト後ろ向き攻撃を両手振りに**: `mito.atk8_up` プロンプトを「TWO-HANDED VERTICAL OVERHEAD CHOP（両手で頭上から振り下ろし・両肘が頭の両脇に見える）」へ→再生成→`build_mito.py atk`。片手振りを解消。
- **村人の等身をミトに**: 村人プロンプトを「3.5等身・頭小さめ・スレンダー（NOT chibi/big-head）」へ→再生成。`build_npc.py` の CELL 200→**240**（高解像度化）。ミトと頭身が揃った。
- **家を正面向き(正対)に**: minka_a/b プロンプトを「STRICT FLAT FRONT ELEVATION（鳥居と同じ完全正面・斜め画角禁止）」へ→再生成→**新規 `build_prop.py`**（raw→chroma+トリム+縮小→assetmap登録）→pregrade削除→`grade_wa.py`。斜め画角を解消。
- **草タイルの継ぎ目低減**: **新規 `forge/flatten_tiles.py`**。16バリアントの平均色を全体平均へ寄せ（加算シフト・strength0.9）、輝度std 15.1→1.5・範囲43→4。テクスチャは保持しパッチワークのグリッドを解消。※パイプライン順 proc_wa→grade_wa→**flatten_tiles**（grade後に必ず再適用。冪等）。森(cliff)はオートタイルのため対象外。
- **Codex指摘反映[P2]**: `DASH_CUT_DMG_MUL` 1.5→**1.4**。1.5だと整数丸めで全レベルのatk(7,9等)が弱チャージと同値になり「弱チャージ未満」が崩れる。1.4なら実atk値域(6,7,9,11,13,16,19,23)で 通常<ステップ斬り<弱チャージ が厳密成立。combat.test を実ダメージ序列の検証に強化。
- **新規スクリプト**: `forge/build_npc.py`(村人) / `forge/build_prop.py`(民家) / `forge/flatten_tiles.py`(継ぎ目)。`forge/_backup_r2_*` は .gitignore 済み。

## ★ 2026-06-13 第4ラウンド（プレイ指摘の反映・実施済み）

ユーザーのプレイFB10項目をすべて反映。最終 typecheck 0 / vitest **31本** / build 緑、実機(dev-browser)で村・居合を目視確認済み。
品質保証として **Codex review（codex review --uncommitted）＋ qa-code-review サブエージェント（273/300合格）** を実施し、指摘を反映済み。

**ミト**
- (a) 立ち絵: 足を肩幅に開く → `assets_plan.json` の `mito.idle8_*` プロンプト強化（STANCE RULE: 足首間に明確な隙間）→再生成→`build_mito.py idle`。足間ギャップ ~13px(240セル中)を確認。
- (a) 刀の左右ブレ/ガタつき → ① `build_mito.py` の水平整列を **bbox中心→重心(centroid_x)** に変更（歩行/待機のみ。攻撃/居合はbbox維持＝伸びる刃で本体後退を防ぐ）。頭部xブレ: 横歩き18.8→8.0px、後歩き5.4→3.4pxに低減（定量確認）。② `mito.walk8_*` プロンプトに SWORD RULE（左腰固定・毎コマ同位置）追加→再生成。後歩きの刀が安定。
- (b) 溜め居合の上下動 → `player.ts` draw の `charging` を **f0/f1トグル廃止→f1単一フレーム固定**（張り詰めはtint脈動のみ）。腰を落とした構えで上下しない。
- (c) 居合エフェクト左右逆 → `player.ts` releaseCharge の `fx.iai_wa` spawn に **`flipX: true`**。凸(出っ張り)が全方向で進行方向を向くことを定量(重心ドット積)＋実機で確認。**通常斬り fx.slash は元々正しい向きなので不変**（だからユーザーは居合だけ指摘した）。

**仕様変更: ダッシュ斬り(ステップ斬り)に攻撃補正**
- `weapons.ts` に `DASH_CUT_DMG_MUL = 1.5`（通常1.0超・弱チャージ1.6未満のボーナス帯）。
- `player.ts`: `ActiveHit.dashCut` / `dashCutSwing` でステップ斬りの active 判定だけ識別。`field.ts` で敵/ボス両方に倍率＋手応え演出(「斬り込み!」/ヒットストップ+3/揺れ/穢れ多め)。
- **Codex指摘反映**: 真後ろへの後退ステップ斬りには補正を乗せない（`dodgeForward` フラグ。前方/横の踏み込みのみ報酬）。combat.test に序列テスト追加。

**村（kiritate）**
- (a) 家サイズ: `minka_a/b` 描画 56×42→**82×62（面積≈2倍）**、footW3→4。扉≈30-34論理px（ミト体高26pxに対し「人が通れる少し高い扉」で整合）。
- (b) NPC(老巫女)が巨大 → `field.ts` の NPC描画 40→**28論理px**（体高≈26＝ミト相当）。解像度(原画200px)は不変。
- (c) 同じ見た目のNPCが2人 → **村人スプライト3種を新規生成**（`npc.villager_a`農婦 / `villager_b`農夫 / `villager_c`子供。`build_npc.py` で組立）。kiritate のNPCを差し替え＋2人追加（計5 NPC）。

**グラフィック**
- (a) タイル解像度: **生成は高解像度(~313–443px/セル)→128px(16論理×SS8)へBOX縮小**して表示・保存。128pxがRetina実画素のほぼ上限。ネイティブ128px生成は縮小より粗くなるので現行(縮小)が最適＝今のまま。
- (b) 草を笹・和へ: `tile.grass_wa`/`tile.detail_wa` プロンプトを「丸いクローバー禁止・尖った笹/ススキのブレード」に改訂→再生成→`proc_wa.py`→**`grade_wa.py`で抹茶トーン**（※`proc_wa`再生成後は古い`*_pregrade.png`を削除してから grade を回す＝旧素材に戻る罠に注意）。

**残課題/メモ**
- ミト歩行は刀固定が改善したが、AI生成由来のコマ間差は残る（横歩き頭部x ~8-11px）。さらに詰めるなら walk raw 再生成 or build の頭部基準アライン強化。
- バックアップ `forge/_backup_*` と `public/assets/*_pregrade.png` は `.gitignore` 済み（コミット対象外）。
- dev-browser は SIGTRAP 多発。`dev-browser stop` → `rm -rf ~/.dev-browser/browsers/default/chromium-profile` → サンドボックス外で再実行。入力は**実キーボード(page.keyboard)**が確実（`__tamamusubi.key`注入はタイミング不安定。決定論は `engine.stop()`＋`step()`＋実keyboard.down/up）。

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
