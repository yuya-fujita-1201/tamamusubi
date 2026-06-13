# HANDOFF_CURRENT.md — 『玉結び』現在地（次セッションはまずこれを読む）

> 作成: 2026-06-13 ／ 最終更新: **2026-06-14**（S1=プレイFB4R → S2/3=立体表示の実験 → S4=俯瞰ズーム(§3.11) → **S5=立体2モード削除＋高台を直交2Dで再構築(§3.12〜3.15)**）
> 旧ドキュメント: `HANDOFF.md`(Phase0/1A基盤・素材インベントリ) / `HANDOFF_FIXES.md`(修正ラウンド0〜7の詳細)。
> **本ファイルが最新の単一情報源。** 状態: typecheck 0 / vitest **32本** / build 緑 / 実機検証済み。**セッション5終了時に全変更を `main` へコミット＆push 済み**（リモート: github.com/yuya-fujita-1201/tamamusubi）。次セッションはクリーンな working tree から開始。
> 直近の主題は**立体表示（斜め見下ろし）の実験**(詳細 §3.5〜3.10／要点 §0.5)。**今セッションの主変更=カメラ俯瞰ズームを 1.0→0.8 に引き(§3.11・立体表示とは別件)**。
> **【2026-06-14 セッション5・方針転換】ChatGPT Pro 判断で平行四辺形(4)/台形(5)モードは廃止＝両方コード削除済(§3.12)。高台は「直交2Dのまま石垣/笠石/落ち影/石段/草トーン差」で立体表現する（お手本=ZZ-HCP-logs/009）。§3.6〜3.11 の oblique/persp 記述は歴史的経緯として残すが現コードには存在しない。**

## 0. 最短の始め方
```bash
cd /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin
npm run dev          # → http://127.0.0.1:5210/（村スタート）
npx tsc --noEmit && npx vitest run   # 緑・32本
```
操作: 移動=WASD/矢印 ／ Z=祓う(長押し→**居合**) ／ Shift=フロントステップ(中盤でZ→**ステップ斬り**) ／ C=祓い波 ／ X=調べる・会話 ／ 2=飛行カメラ ／ 3=暗闇テスト。**（4=平行四辺形・5=台形パースは 2026-06-14 に削除＝無効）**
ヘッドレス検証: `window.__tamamusubi`。常設(engine.ts): `step(n)` / `key(action,down)` / `shot()` / `engine` / `audio`。**FieldScene が active な時のみ追加**(field.ts enter): `state()` / `warp(map,tx,ty)` / `field` / `game`。

## 0.5 立体表示の現在地（2026-06-14 セッション5で決着）★まずここ

**決着: 平行四辺形(4)・台形(5)は両方廃止＝コード削除済(§3.12)。** ChatGPT Pro 判断「マップ変形/カメラ疑似遠近はすべきでない。直交(四角)マップのまま高台を作るべき」。
現在は**直交2D＋俯瞰ズーム(0.8)のみ**。高台の立体感は **石垣の壁面・笠石ボーダー・落ち影・親柱付き石段・上下段の草トーン差・森マスク** で表現する（聖剣/ゼルダ流。お手本=`ZZ-HCP-logs/009/`）。**takadai 改修を実施中**（アセット生成→tileset統合→マップ直交再構築→QA/Codex）。
↓以下 §3.6〜3.10 は **削除済み機能の歴史記録**（現コードには無い。読み飛ばし可）。

斜め見下ろしの立体感を**2つのトグルで実験していた**（※削除済）。詳細 §3.6〜3.10。

| キー | 方式 | 仕組み | 状態 |
|---|---|---|---|
| **4** | オブリーク（平行四辺形） | 横シア＋縦圧縮の`setTransform`一発。`renderer.ts oblique` | 見た目リアル。だが**B案トレードオフ**＝移動は画面まっすぐ優先で世界Xがずれ、長距離の純キーでは狭い門に届きにくい（門は3→7マス拡張で部分緩和済）。縁見切れは**カメラクランプで解消済**。 |
| **5** | 台形パース（遠近） | ワールドを等倍でオフスクリーン描画→**固定の台形ワープ**で一括変形。`renderer.ts persp`/`beginPersp`/`endPersp` | **推奨方向**。横シア無し→**移動は通常座標（ドリフト無し・ワープ門も通常通り）**、固定ワープで**ウニョウニョ無し**、バッファがカメラクランプ済みで**見切れ無し**（上隅のみ細いレターボックス）。 |

**結論/推奨**: 台形パース(5)が、これまで平行四辺形(4)で潰してきた問題（ドリフト／門到達／ウニョウニョ／見切れ）を**原理的に回避**できており本命。

**次セッションで決める/やる候補**:
1. **本採用の決定**: 4と5どちらを正式採用するか（または両方残し設定で選ばせるか）。現状の体感はユーザー実機確認待ち。
2. **台形の見た目調整**: `PERSP_FAR=0.58`（下げると台形が強い）／プレイヤーが中央で常時≈0.79倍に縮む点を等倍化（t=0.5でscale=1の正規化）／縦も前縮みさせる本格Mode-7化（アスペクト厳密化）。
3. **対策2（保留中）**: 「中央に道＋左右に厚い森」の意匠（ZZ-HCP-logs/006-007のスケッチ）。見切れ自体はカメラクランプで解消済なので任意。採用時はマップ毎にプレイアブル領域とprop/NPC/spawn調整。
4. 立体表示を一旦保留し、ゲーム内容（勾玉システム等 §4）に進むのも可。

すべて**ユーザー実機FBで反復中**。各変更後に QA（tsc/vitest/build）＋Codex＋qa-code-review を回す運用（§5）。

## 1. セッション1で直したこと（プレイFB 4ラウンド・全て実機確認済み）

**進行・マップ**
- 🐛**村へ行けないバグを修正**＋**村スタート化**: `title.ts` で `kiritate(28,24)` 開始。satoyama北↔kiritate南の warp を **3マス幅**化、道を `paintAuto+solid(false)` で明示クリア、鳥居の門を拡張。村↔平原の往復を実機確認。
- 🐛**ゲームオーバー文言** 「リオン」(前作)→「**ミト**」(`gameover.ts`)。「Z/X で村から再開」表記に。

**ミト**
- 立ち絵: 足を肩幅に。歩行/待機の刀を左腰固定（`build_mito.py` の水平整列を**重心(centroid)基準**に変更=刀の突出で本体がブレない。攻撃/居合は bbox 維持）。
- 溜め居合: 上下動を除去（`player.ts` charging を単一フレーム f1 固定）。
- 後ろ向き攻撃: 片手→**両手の簡潔な背面チョップ**で再生成（刀身を強調せず違和感解消）。正面攻撃も両手振り下ろし。
- 居合エフェクト: `flipX:true` で弧の凸が進行方向を向く（通常斬り fx.slash は元から正しいので不変）。

**戦闘仕様**
- **ステップ斬り**(ダッシュ斬り)に威力補正 `DASH_CUT_DMG_MUL=1.4`（通常<ステップ斬り<弱チャージ<強チャージ が全レベルの整数丸め後も厳密成立。`dashCutSwing` でそのスイングのみ識別）。前方/横の踏み込みのみ補正（後退ステップは対象外）。
- ステップ斬りモーション中(windup/active)は**スーパーアーマー**: 被弾しても hurt にならず斬りを出し切る（HP・無敵・弱ノックバックは適用、HP0は死亡優先）。

**村・NPC**
- 家(minka_a/b)・水車(suisha)を**正面向き(正投影)**で再生成（鳥居と同じ face-on）。家サイズ拡大（扉≒ミト身長）。
- NPCをミト等身に: 村人(villager_a女/b男)は**ミトを reference 参照**して体格一致、巫女(suzushiro)は頭を小さく、子供(villager_c)は表示 `drawSize:21` で小柄に。村人3種＋巫女で多彩化（`NpcDef.drawSize` 追加）。

**タイル・背景**
- 草: 笹/尖った和風に再生成＋トーン正規化で継ぎ目解消（`flatten_tiles.py`）。
- 水(池): 水際を滑らかに再生成＋中央タイルを**単一自己シームレスタイル**化（`deseam_tiles.py`）でグリッド継ぎ目を解消。
- 森(境界): 中央タイルをトーン正規化で色違いグリッド解消。木プロップは和グレーディング強化(K=1.4)。

## 2. アセット生成・処理パイプライン（★重要 gotcha 集）

生成: `node forge/gen_runner.mjs --only <id,...> [--force]`（Codex ImageGen・並列3・raw は `forge/assets/raw/<id>/codex-imagegen.png`）。
**処理の正しい順序**: `proc_wa.py`(タイル/プロップ) または `build_*.py`(キャラ) → `grade_wa.py`(和グレード) → `deseam_tiles.py`(水/森継ぎ目) → `flatten_tiles.py`(草継ぎ目)。

- ⚠️**pregrade の罠**: `grade_wa.py` は `*_pregrade.png`(原本退避)があればそれを原本に使う。**プロップ/タイルを再生成したら、必ず旧 `public/assets/<name>_pregrade.png` を削除してから grade** しないと旧素材に戻る。
- ⚠️**grade 後に deseam/flatten を当て直す**: grade は pregrade から再生成するので継ぎ目処理が消える。再生成時は最後に deseam→flatten を再実行（どちらも概ね冪等）。
- ⚠️`MapBuilder.paintAuto(set,...,solid=false)` は **collision をクリアしない**（solid時のみ=1）。道を通すには `b.solid(x,y,false)` を別途当てる。
- ⚠️プロップ footprint は `ty - footH`。マップの「クリア帯」と看板等の footprint が干渉しないこと（看板を帯外へ置く等）。
- `build_mito.py`: 歩行/待機=重心整列, 攻撃/居合=bbox整列。`build_npc.py`: CELL=240, villager_a/b/c + suzushiro。`build_prop.py`: minka等の一枚絵プロップ。
- villager の `reference` はミト raw(`forge/assets/raw/mito.walk8_down/...`)で体格一致。
- オートタイル center frame: water={1,2,12,13,15} / cliff(森)={0,1,2,3,12,13}（`src/field/tileset.ts` TRANS_MAPS と一致させる。deseam_tiles はここだけ触る）。

## 3. ツール / スクリプト
| スクリプト | 役割 |
|---|---|
| `forge/gen_runner.mjs` | Codex ImageGen 並列生成 |
| `forge/build_mito.py [walk\|idle\|atk\|iai\|all]` | ミト32コマ組立（重心/ bbox整列） |
| `forge/build_npc.py [villager_a\|b\|c\|suzushiro]` | NPC 4コマ組立（CELL240） |
| `forge/build_prop.py [minka_a\|minka_b]` | 一枚絵プロップ組立 |
| `forge/proc_wa.py [--only id]` | 和タイル/プロップ処理 |
| `forge/grade_wa.py [--strength K]` | 和カラーグレード（K_OVERRIDE: 草1.35/木1.4/桜1.1等） |
| `forge/deseam_tiles.py` | 水=単一シームレス化 / 森=center トーン正規化 |
| `forge/flatten_tiles.py [--strength K]` | 草(横ストリップ)の平均色正規化で継ぎ目低減 |

## 3.5 立体表現の実験（2026-06-13 追加・方式A）
ユーザーFB「斜め見下ろし＋高低差で立体感」（参考=聖剣LoM/SoM）。方式A=正射影エンジン維持＋崖面/段差アートで高低差を表現（スプライトは直立）。
- **新マップ `takadai`（高台）** `src/data/maps/takadai.ts`: 横一文字の石積み擁壁(崖)で上段台地/下段平地を分割、石段で接続。村(kiritate)北の鳥居→3マス幅warp→高台。実機で立体感・徒歩到達を確認。
- **新タイルセット**: `waCliff`(tile.wa_cliff_set: row1=リム0-3/row2=壁面4-7/row3=基部8-11) と `waStairs`(縦タイル積みで石段)。`tileset.ts` index 37/38。proc_wa・grade_wa に追加済。
- 崖の作り方: 上段南縁に rim(y10,歩行可)→face(y11,solid)→base(y12,solid) を敷き、石段列(x19,20)だけ waStairs で歩行可に。森(paintAuto cliff solid)で周囲を囲みクリアリング化（solid率調整）。
- これは**実験/プロトタイプ**。本採用するなら既存マップ(satoyama等)にも崖/段差を導入、側面(東西)向きの崖フレームや overhead レイヤーでの前後遮蔽を足すと完成度が上がる。

## 3.6 オブリーク立体表示トグル（2026-06-13 追加・方式B「平行四辺形」）
ユーザーFB「マップ平面を平行四辺形に変形して立体感を出す（After スケッチ）」。**トグル方式**で実装（既定OFF＝既存無傷）。
- **操作**: フィールドで **4キー** でON/OFF。`obliquePref`(module-level)でマップ遷移をまたいで保持。
- **renderer.ts**: `oblique`/`obliqueShear`(0.34)/`obliqueYScale`(0.80)。`toScreen()` は oblique時のみ位置を `obXform`(横シア＋縦圧縮、ピボット=画面中央)で変換→スプライト/図形は「傾いた位置に直立」。`tile()` は oblique時 `ctx.setTransform` のシア行列でタイル画像ごと平行四辺形化（同一アフィン）。**off時は完全に従来描画（回帰ゼロ）**。
- **field.ts**: 世界描画中だけ `r.oblique=true`、HUD前に `false`（HUDは直立）。`drawSlabEdge()` でマップ底辺にスラブの厚み（土の側面）。
- 実機確認: 地面=平行四辺形・キャラ/建物/NPC/HUD=直立・マップ間維持。ゲームロジック/当たり判定は2Dのまま不変。
- パラメータ(shear/yScale)は renderer.ts で調整可。
- QA反映済み: スプライトは**足元(下端中央)を接地点にオブリーク変換**（背の高い絵が影/footprintからズレない・Codex P2）／タイルのカリングをオブリーク時に拡張（端の空白防止・Codex P3）／暗闇の光源を縦圧縮の楕円化（地面と整合）。
- **改良(ユーザーFB反映)**:
  - #1 縦移動の直進化: シアを**ワールドY固定**(`screenX=(x-cam.x)*k - OBLIQUE_SHEAR*k*y`)にして縦スクロールで地面が泳がない剛体化＋`followCamera`でカメラXを`playerX - shear*playerY`基準に補正＝プレイヤーが画面中央に留まり縦キーで画面上をまっすぐ進む。`OBLIQUE_SHEAR/YSCALE`は renderer.ts でexport、tile行列の e項も`-shear*k*cam.y`で一致。
  - #2 高さ=垂直/奥行き=斜め: `VERTICAL_TILES`(tile.wa_cliff_set / tile.wa_stairs)は床のシア位置に**軸平行(直立)**で描画（崖の壁面・石段は鳥居のように垂直）。床(grass等)はシア行列で平行四辺形。プロップ(木/家/鳥居)は元々sprite=直立。
- 既知の許容事項: 四隅に outsideColor 余白／崖の rim/face/base 行間にシア由来の僅かなオフセット（本採用時は崖を「壁オブジェクト」として基部1ラインから直立ビルボードで立てる設計にすると完全）。

### 3.7 オブリーク追補（2026-06-13 セッション3）— B案確定・全移動の直進化・エフェクト整列
- **移動方式=B案で確定**（ユーザー選択）: 「画面まっすぐ移動・論理地形とのズレ許容」。正方マップ＋描画シアでは「見た目まっすぐ」と「論理地形(階段/扉)との一致」は両立しないため、見た目を優先。階段は見た目斜めでも"まっすぐ登れない＝縁に沿ってスライド"でOK（ユーザー許容）。
- **全方向移動を画面まっすぐに統一**: `player.ts` に `tryMoveOb(dx,dy)=tryMove(dx+obliqueShear*dy, dy)` ヘルパー追加。歩行(handleMove)に加え **dash(チャージ突進) / dodge(Shift回避・2箇所) / iai(縮地) / stepMomentum(ステップ斬り慣性)** を全て tryMoveOb 経由に。obliqueShear=0(通常時)で従来と完全一致＝回帰ゼロ。実測: 歩き/ダッシュとも画面Xドリフト0px。
- **追従エフェクトの右ズレ修正**（ユーザー報告: 上攻撃・通常攻撃のエフェクトが右にずれる）: 原因=オブリーク横シアが「エフェクト自身のワールドY(プレイヤーより上)」基準で掛かり、足元基準の本体より右へ最大~10-15px ずれていた。修正=`anchor` に `shearY`(=足元Y)を追加、`DrawOpts.obShearY` で**横シア基準だけ足元Yに固定**（縦圧縮は描画Y基準のまま）。`fx.ts` drawOne が追従fxに `obShearY=follow.shearY` を渡す。実測: 上攻撃のfx画面X=プレイヤー足元と完全一致(diff 0px)。
- **Codex P2修正**: ダメージ数字が `n.x-cam.x` 素の座標でオブリーク非変換だった→`r.toScreen()/r.k` で地面と同変換に（通常時は従来と一致）。`fx.ts` draw。
- **Codex P3修正**: `.gitignore` に `ZZ-HCP-logs/`(QAスクショ/参照画像)追加。
- **「ラグ」の正体＝カリングバグ（性能低下ではない）**: ユーザー報告で**通常もオブリークも60fps**(=vsync上限で確定・性能問題なし)。真の症状は「**通常平原(satoyama)だけ右端が緑(outsideColor)に侵食され、深く進むほど増える**」。
  - **根本原因**（数式特定＋Codex P2が独立に同一指摘＋ユーザー実測の3点一致）: `tilemap.ts drawLayer` のオブリークカリングが**行シア未考慮**。オブリーク時 `cam.x` はシア空間原点(=x-shear*y)なのに、固定マージン obMX=ceil(shear*viewH/TILE)+2 で左右を広げるだけ。深い行(大worldY)では可視worldXが `x=cam.x+shear*y` ずれ、`shear*cam.y` 分(cam.yに比例)右にずれる→右側のタイルが取りこぼされ緑が透ける。satoyamaはH=64(1024px)で最も縦長＝最も顕著。
  - **修正**: ty0/ty1(縦圧縮obMY込み)を先に決め、`tx0=floor((cam.x+shear*ty0*TILE)/TILE)-2`, `tx1=ceil((cam.x+viewW+shear*ty1*TILE)/TILE)+2` と**行シアで左右端を算出**。非オブリーク時は従来式に分岐＝回帰ゼロ。装飾(drawDecals)も同様に横シア込み画面X判定＋縦マージン拡張。
  - **検証**: satoyama深部(y=58タイル・横中央)・オブリークで右端緑=**全行0%**(実測)。旧式 tx1=44(704px)はtile44〜57を取りこぼし=右半分緑だった→新式 tx1=61(976px)で可視右端を完全カバー。スクショ目視でも右側は草/森で完全充填。
  - 残known: マップの実際の右端付近(横方向)に近づくと四隅の三角余白は残る(本来の地形端=別問題)。satoyamaはW=88と広く通常は到達しない。
- 性能補足: 描画CPU実時間は両モードほぼ同一(通常0.51ms/オブリーク0.50ms)。canvas drawImageのGPUラスタ実コストはCPU計測に出ない点は留保だが、ユーザー実機60fps固定＝vsync上限で性能影響なしと確認済み。

### 3.8 ワープ門の拡張（2026-06-14）— B案ドリフトでも門に届きやすく（部分緩和・ユーザー選択）
- **背景**: Codex P2再指摘＝B案(画面まっすぐ移動)は世界座標Xを毎回ずらすため、世界座標で狭い縦ワープ門が純上/下キーでは通りにくい（上=左ドリフト/下=右ドリフト）。ユーザーは「主要ワープ通路を広げて緩和（長距離ドリフトは残る）」を選択。
- **実装**（全ゲートを3→7マス幅へ＋ドリフト方向にバイアス＋鳥居柱の当たり判定撤去）:
  - kiritate北門(→takadai): 通路/warp x24-30(左寄り)。鳥居柱solid撤去。看板(30,8)→(32,8)。
  - kiritate南門(→satoyama): 通路/warp x27-33(右寄り)。
  - takadai戻り門(→kiritate): warp x19-25(右寄り)。下段x5-34は元々歩行可。
  - satoyama北門(→kiritate): 通路/warp x40-46(左寄り)。大鳥居柱solid撤去。
  - satoyama南門(→morioku): 通路/warp x44-50(右寄り)＋carve追加(単タイル→7幅)。
- **検証（実測）**: クリーン地形は門から**約15マス以内**なら純上/下キーで到達・ワープ成功（takadai下段 tx18/20/22 全成功、satoyama y18成功/y24はx38で停止）。**遠距離(15マス超)はドリフトが拡張幅も超えて手前停止**＝承知済みの残存制約。村は西側建物群でさらに到達距離が短い（村スタートからの純上は門に届かない）。実プレイでは「広くなった門へ向けて上+右で操舵」すれば容易。
- **残課題（次セッション判断）**: 純上/下キーで“常に”門到達を保証するには、未採用の「縦通路での自動中央スナップ(option3)」or「本格2.5D(option4)」が必要。オブリークはデフォルトOFFの実験トグルなので現状は許容範囲。村の門を確実化したい場合は北/南通路の西/東側にスライド用の連続壁を足す村側の動線整備が有効。

### 3.9 台形パース表示の新設（2026-06-14・キー5）— 平行四辺形の代替案・ドリフト問題なし
- **背景/動機**: 平行四辺形(横シア=片側ドリフト)の代替として、ユーザー提案＝「カメラを斜め上に傾け、奥(画面上)ほど幅が狭い台形(遠近)」＝HD-2D的。**最大の利点: 左右対称収束で横シアが無い→移動は論理座標のまま(ドリフト無し)→当たり判定・ワープ門は通常と完全同一**。平行四辺形で苦しんだ門到達問題が原理的に発生しない。
- **実装方式（2026-06-14 改訂・最重要）**: 初版は「床タイルを行ごとに横スケール」する Mode-7式だったが、ユーザーFB「**台形がウニョウニョして画面酔いする／レンダリングが入るのが気持ち悪い**」＝**タイル個別変形がカメラ相対スケール＋per-tile丸めでフレーム毎にチラつく**のが原因。→ **「固定台形ワープ」方式に全面作り替え**:
  1. パース時は `r.beginPersp()` で描画先をオフスクリーンバッファに差し替え、**ワールドを等倍(真上)で剛体描画**（＝通常モードと同一＝歪み/チラつき無し）。
  2. `r.endPersp(outsideColor)` で**毎フレーム同一の固定台形ワープ**（96帯に分割し各帯を中央寄せで横スケール `hs=perspFar+(1-perspFar)*(yc/H)`、上端=perspFar倍/下端=1.0倍）で本キャンバスへ一括転送。台形外の上隅は outsideColor で塗る。
  - ＝平行四辺形(setTransform一発)と同じく**形が画面に固定、中の世界が滑らかにスクロールするだけ**。タイル個別の再スケールが無いのでウニョウニョしない。
  - `renderer.ts`: `ctx` を可変化(+`mainCtx`)、`perspCanvas`/`perspCtx`、`beginPersp`/`endPersp`、`PERSP_FAR=0.58`。旧 `perspScaleAt`/`PERSP_YSCALE`/per-tile分岐は撤去。`toScreen`/`tile`/`sprite` はパース時 等倍描画（変換なし）。
  - `tilemap.ts`: パース用カリングは撤去（バッファ等倍描画＝通常カリングで正しい）。
- **トグル**: `field.ts` skill5(Digit5)。4(オブリーク)と**排他**。`perspPref`でマップ間保持。draw()は地面描画前に `beginPersp`、暗闇の後・フラッシュ前に `endPersp`、HUDは本画面。移動は obliqueShear=0 のまま＝**通常移動（ドリフト無し・ワープ門も通常通り）**。
- **検証(実測)**: typecheck0/vitest32/build緑。takadaiで台形(左右森が上で収束・上隅は余白色)を確認、render実時間0.366ms、60fps、移動ドリフト0。結果スクショ: `ZZ-HCP-logs/005/result_takadai_fixed_trapezoid.png`。
- **調整**: `PERSP_FAR`を下げると台形が強く。横スケールのみ（縦圧縮なし）＝スプライトは上ほど僅かに横長に圧縮される。アスペクト厳密化や縦前縮みは別途Mode-7化で可能（要望次第）。

### 3.10 マップ縁の見切れ対策（2026-06-14・キー4/5共通）
- **背景**: ユーザーFB「立体表示でマップの端(outsideColorの暗い縁)が見えてしまう」。対策2案の依頼: ①そもそも端を見せない ②サイドに侵入不可の森を厚く。
- **対策1 第1版（撤去済）= 端タイル延長**: drawLayerでマップ外を最寄り端タイルで延長描画したが、**オートタイルの"縁"フレームが複製され縁が二重化・歪む**（ユーザーFB ZZ-HCP-logs/007）。撤去。
- **対策1 第2版（採用・実装済）= カメラクランプ**: `field.ts followCamera()` のオブリーク分岐で、**平行四辺形ビューがマップ矩形内に必ず収まるよう cam.x/cam.y を制限**。＝マップ外が原理的に画面へ入らない（暗い縁・二重化・黒帯すべて消滅）。`vExtra=(viewH/2)*(1/OBLIQUE_YSCALE-1)`、cam.y∈[vExtra, pxH-viewH-vExtra]、cam.x∈[-sh*(cy-vExtra), pxW-viewW-sh*(cy+viewH+vExtra)]（空なら中央寄せ）。端付近ではプレイヤーがオフセンターに寄り、森(マップ内)が端を埋める。drawLayer はクランプ範囲描画に復帰。
- **台形(キー5)の隅**: `endPersp` は台形外(上隅)を bg(outsideColor)で塗る＝レターボックス。バッファは通常クランプで off-map 無し。台形は今回のカメラクランプ対象外(別経路)。
- **検証(実測)**: satoyama端4箇所(右/上/隅/左下)で平坦outsideColor=ほぼ0%(0〜0.4%)、スクショで端は森で埋まり暗い縁/二重化/黒帯なし。結果 `ZZ-HCP-logs/007/result_parallelogram_cameraclamp.png`。typecheck0/vitest32/build緑。
- **対策2（森サイド・保留）**: ユーザー選択「まず対策1で実機確認」。対策1（カメラクランプ）で見切れは普遍的に解消したため対策2は意匠面の任意強化として保留。
- **レビュー対応（2件・修正済）**: ①qa B1=オブリーク時カメラクランプが cam.y を上書きし**縦揺れ(shakeY)消失**→`camera.shakeY`公開＋揺れ抜き基準でクランプ後に再加算。②Codex P3=オブリーク時**ダメージ数字が浮上(n.y変化)でシア横滑り**→命中点を固定アンカー化し浮上を画面空間オフセット`riseY`に分離。両方 typecheck0/vitest32/build緑。
- **調整ポイント(今後)**: `PERSP_FAR`を下げると収束が強まる。現状はプレイヤーが画面中央(t≈0.5)で常に約0.79倍に縮小される(中央=中距離扱い)。プレイヤーを等倍に保ちたいなら「t=0.5でscale=1」になる正規化に変更可。床タイルは行ごと矩形近似のため、強い収束時は行境界に微小段差(奥→近の後描き重ねで軽減済)。完全平滑化はサブストリップ分割で可能。

### 3.11 カメラ俯瞰ズーム（2026-06-14・立体表示とは別件）★今セッションの主変更
- **背景**: ユーザーFB「今はズームで寄りすぎ。もう少し俯瞰で、キャラ/オブジェクトが大きく映りすぎているので引き気味に＝全体が若干小さく」。**立体表現(4/5)とは独立の純粋なカメラ引き**。
- **実装（1ノブ・既存ズーム機構を流用）**: `constants.ts` に `export const FIELD_ZOOM = 0.8;` を新設。`field.ts` で ①`zoomCur` 初期値を `FIELD_ZOOM`（入場時の寄り→引きアニメ回避）②非飛行の `zoomTarget = this.flight ? 0.28 : FIELD_ZOOM` に変更。**それだけ**。
- **なぜこれで正しいか**: 既に飛行モード(skill2=0.28)用にズーム配管が全系統に通っている。世界描画 `r.zoom=zoomCur`(k=SS×zoom)／カメラ可視域 `viewW=LOGICAL_W/zoomCur`／tilemapカリング `LOGICAL_W/r.zoom`／fx `/k`／オブリーククランプの `viewW/viewH` が全て zoom 追従。`viewW*k = LOGICAL_W*SS = CANVAS_W`(3200) は恒等で**キャンバス解像度は不変**。
- **効果(zoom=0.8)**: 可視 25×14 → **約31×17.5タイル**（世界25%増・キャラ約20%小）。HUDは `r.zoom=1` 固定で**サイズ不変**（世界だけ引く）。
- **性能**: 同一キャンバス(3200×1792)＝GPU fill rate 不変。タイル描画数のみ約55%増だがCPU微増（元0.5ms級）。**実機ライブfps=120**（zoom0.8・移動描画中、dev-browser実測）＝回帰なし。
- **トレードオフ**: HDアート(タイル128px原寸)が canvas内で k=6.4 の最近傍縮小(128→約102px)になる。高精細なので実用上問題なし（飛行0.28の実績あり）。1:1厳密化が要るならキャンバス拡大(SS維持)が必要だがHUD座標(LOGICAL基準)が連動するため非採用。
- **値の決定**: 村スタートで 1.0/0.85/0.8/0.75 をスクショ比較（`ZZ-HCP-logs/008/`）。**ユーザー選択=0.80**。立体モード(4/5)とも0.8で正常描画を確認（`ZZ-HCP-logs/008/`内 verify_*）。
- **再調整**: `FIELD_ZOOM` の数値1つを変えるだけ。下げると引き(0.75=33タイル)、上げると寄り(0.85=29.5タイル/1.0=従来)。
- **QA**: typecheck0 / vitest32 / build緑。

### 3.12 立体表示2モードの削除（2026-06-14 セッション5）— 直交2Dへ回帰
- **背景**: ユーザー＋ChatGPT Pro 判断「平行四辺形・台形・カメラ疑似遠近はすべて廃止。元の正方(直交)マップをベースに高台を作る」。
- **削除内容（回帰ゼロで実施・Opusワークフロー＋検証）**:
  - `renderer.ts`: `OBLIQUE_SHEAR/OBLIQUE_YSCALE/PERSP_FAR` export・`VERTICAL_TILES`・`DrawOpts.obFoot/obShearY`・oblique/persp 各フィールド・`beginPersp/endPersp`・`mainCtx`/可変ctx・`rawScreen`を削除。`toScreen/tile/sprite/darknessOverlay` を直交のみに簡約。
  - `field.ts`: oblique/persp フィールド・`obliquePref/perspPref`・skill4/skill5 トグル・followCamera のオブリーククランプ・`drawSlabEdge`・draw() の beginPersp/endPersp 等を削除。
  - `tilemap.ts`: drawLayer/drawDecals のオブリークカリング分岐を削除し素のカリングへ。`drawProp` の obFoot 撤去。
  - `player.ts`: `obliqueShear`・`tryMoveOb`・anchor.shearY を削除、全6箇所 `tryMove` に戻す。
  - `fx.ts`: follow.shearY/obShearY 撤去（riseY=画面空間浮上は直交でも有効なので存置）。`boss.ts`/`enemy.ts`/`tilemap.ts` の `obFoot:true` も波及除去。
  - **残したもの**: 俯瞰ズーム(`FIELD_ZOOM`/`r.zoom`/`k`)、飛行(skill2)、暗闇(skill3)、riseY。
- **検証**: tsc0 / vitest32 / build緑 / 残存コード参照ゼロ(grep) / 実機スモーク=旧4/5キー押下で非クラッシュ・高台ワープ・直交描画OK(`ZZ-HCP-logs/...smoke_takadai_ortho`)。
- 操作から **4/5 キーは無効化**（§0 の操作説明から削除済）。

### 3.13 高台の直交リニューアル（2026-06-14 セッション5）— お手本準拠の石垣/笠石/石段
- **お手本**: `ZZ-HCP-logs/009/ChatGPT Image ....png`（森に囲まれた長方形の高台＝上段草地を笠石で縁取り、手前に高い苔石垣＋中央に石段、下段に暗い草地）。聖剣/ゼルダ流の直交2D高低差。
- **新規アセット（asset-forge 生成3＋手続き生成3。Opusワークフロー）**:
  - `tile.wa_ishigaki_set`(野面積み石垣 4x4: 0-3笠石ｷｬｯﾌﾟ/4-7上段壁/8-11下段壁/12-15基部) ／ `tile.wa_kasaishi_set`(笠石ボーダー 0-3直線/4-7外角/8-11内角/12-15苔・**初回に柱状アーティファクト→プロンプト改善で再生成し解消**) ／ `tile.wa_stairs2_set`(側壁付き苔石段 0-3上端/4-7上中/8-11下中/12-15下端)。preset=world_coastline_16/grass。
  - 手続き(Pillow): `tile.wa_dropshadow`(半透明落ち影4段) ／ `tile.grass_upper`(明・暖色) ／ `tile.grass_lower`(暗・青み)。既存 `tile_grass_wa` から色変換。
  - 処理: proc_wa.py PROC に追記→gen_runner→proc→**新規ファイル名で pregrade 罠回避**→grade(石材K=0.4-0.5)。assetmap.json に6key追記。森は既存 `tile.forest_wa`(cliff) 流用。
- **tileset.ts**: index 39-44 追加（waIshigaki/waKasaishi/waStairs2/waDropshadow/grassUpper/grassLower）。autotileは使わず**マップで明示フレーム配置**（崖の旧waCliff/waStairs(37/38)は残置・未使用）。
- **takadai.ts 全面書換**（W40×H32）: 上段草地(grassUpper,y4-9)を笠石(北/西/東＋外角)で縁取り→前縁=石垣笠石ｷｬｯﾌﾟ(y10,歩行可)→壁上段/下段(y11-12,solid)→基部(y13,solid)→落ち影(y14,deco半透明)→下段草(grassLower)。中央 x19-20 を石段(waStairs2,y10-13歩行可)で接続。周囲は森(solid)。御神木/松/桜/石灯籠2基/竹/桜＋花デカール。**戻りワープを oblique時代の7マス→3マス(x19-21,y28)に復帰**。草フレームはハッシュ散布で市松化回避。
- **手続きアセットの再現**: 影/草トーンは `forge/gen_proc_de.py`（既存pngから加工。raw非ベースなので proc_wa の PROC には載らない＝意図的。再生成はこのスクリプトを実行）。
- **検証**: tsc0/vitest32/build緑。実機スクショ3視点(`ZZ-HCP-logs/010/result_takadai_stairs/plateau/lower`)でお手本に近い構図を確認（上段=笠石縁取り草地＋木/灯籠、手前=苔石垣＋中央石段＋落ち影、下段=暗草＋鳥居、森縁取り）。アセット4x4グリッドも `ZZ-HCP-logs/010/asset_*`。
- **入退場**: kiritate北門→takadai(20,27)入場(下段)。石段で上段へ。戻りはtakadai南鳥居(x19-21,y28)→kiritate(28,4)。到達性シミュレーション済(全経路solid=false)。
- **最終レビュー対応（2026-06-14）**:
  - **Codex P2（実バグ・修正済）**: 俯瞰ズーム(FIELD_ZOOM=0.8)時、`fx.ts` のダメージ数字が `osx/r.k` を SS固定の font.draw に渡すためカメラ原点から距離比例でズレていた（最大~50-60px）。`osx/SS`（命中点の実キャンバスpx）に修正。zoom=1では従来と完全一致。実機検証=プレイヤー直上に数字が正しく表示。
  - **Codex P3（修正済）**: 削除済みの Digit4/Digit5→skill4/skill5 マッピングが `input.ts` KEY_MAP と `types.ts` InputAction に残存（デッドキー・preventDefault）。両方除去。`grep skill4|skill5|oblique|persp|Digit4|Digit5` で src 完全クリーン。
  - **qa-code-review 270/300 合格**: index/key整合・衝突判定・到達性・フレーム範囲すべて正常（バグなし）。指摘=手続きアセットの再現性→`gen_proc_de.py` で対応済。
- **今後の任意磨き**: kasaishi/ishigaki笠石の色味完全統一、石段側壁を専用フレーム化(STAIR4列化)、kiritate/satoyamaのワープ幅も7→3に戻す（oblique残骸・任意）。

### 3.14 高台 第2版＝不透明3D石垣(cliff3)（2026-06-14 セッション5・ユーザーFB 011反映）
- **背景(ユーザーFB ZZ-HCP-logs/011)**: 第1版(§3.13)の不具合 — (a)角に**緑余白＋反転ブロック**(笠石/石垣の角フレームが透明部を含み下地草が透ける＋形状不良)、西縁の縦断絶、(b)背の**謎の線**。加えて「もっと立体的に・素材自体が台形/3Dに見えるパーツを作って配置」の要望。
- **根本原因**: tile_wa_ishigaki/kasaishi/stairs2 が**透明部あり**(alpha 0-255)→マップ下地(grassLower)が透けて緑余白。AIオートタイルの角フレーム(f0/f3=78%不透明・アーチ形状)が破綻。
- **対策＝手続き合成(AIオートタイルの角を捨てる)**: `forge/gen_cliff3.py` — 既存ishigakiの**不透明フレーム**(f1笠石/f5,f6壁/f12,f13基部=100%不透明)を再利用し、`enhance_cobble`(コントラスト1.18＋上方光AOで石を立体化)＋面取り`bevel`(天端ハイライト/外側に段差影)で、**完全不透明**(putalpha 255/flatten)の `tile_wa_cliff3.png`(16フレーム) と `tile_wa_stairs3.png`(stairs2不透明化)を生成。assetmap に tile.wa_cliff3_set/tile.wa_stairs3_set 追記。
  - 16フレーム: 0 rim_N / 1 rim_W / 2 rim_E / 3 rim_NW / 4 rim_NE（N/W/E=細い面取り笠石縁＋外角）／ 5 cap_h / 6,7 wall / 8,9 base ／ 10 cap_SW / 11 cap_SE / 12 wall_L / 13 wall_R / 14 base_L / 15 base_R。
  - ※top-down-front 視点では北/側面はキャップのみ・前面のみ高い壁が正しい（お手本009も同様）。3D感は前面壁＋角の陰影＋面取りで出す。
- **tileset.ts**: waCliff3(45)/waStairs3(46) 追加。第1版の waIshigaki/waKasaishi/waStairs2(39-41) は未使用へ。
- **takadai.ts 再構築**: 前面=笠石cap(CAPY10,歩行可)→**壁3段**(WUY/WMY/WLY=11/12/13,solid)→基部(BASEY14,solid)。N/W/E=RIM縁＋外角。中央x19-20=石段(CAPY..BASEY 5行,歩行可)。落ち影(SHY15,deco半透明)。下段草(grassLower,y15-29)。入場(20,27)/戻り(x19-21,y28)不変。フレーム定数で明示配置。
- **結果**: 緑余白・反転・断絶・背の線すべて解消、3段壁で堂々とした立体感。実機3視点 `ZZ-HCP-logs/012/result2_takadai_*`＋角比較 `compare_SWcorner_ref_vs_mine.png`。tsc0/vitest32/build緑。
- **再生成**: `python3 forge/gen_cliff3.py`（ishigaki/grass_upper/lower から合成）。
- **最終レビュー（合格）**: Codex=**指摘ゼロ**（PNG不透明・フレーム範囲内・collision/到達性OK・前回のfx/skill削除も妥当を実検証）。qa-code-review=**280/300**（フレーム定数16個が gen_cliff3 と takadai で完全一致、衝突/到達性/不透明性すべて正常）。qa low指摘=`rim_corner`の未使用cx引数→**修正済**(cx削除、出力不変)。
- **今後の任意磨き**: 玉石の丸み/陰影をさらにお手本級に（再生成 or より強いAO）、石段側壁の専用フレーム化、笠石縁の厚み(LW)調整。

### 3.15 玉石テクスチャ再生成＋石の縁の当たり判定（2026-06-14 セッション5・ユーザーFB追加）
- **要望**: ①「お手本の石の丸みを突き詰めたい」→テクスチャ再生成 ②「石段脇から侵入できる／石の縁の描写がある所はミトが入れないように」。
- **①玉石再生成**: `tile.wa_ishigaki2`（assets_plan に丸い河原石=玉石/野面積みの強プロンプト、強い3D丸み・上面ハイライト・隙間影を指示）を asset-forge 生成→proc_wa→grade(K=0.35)。`gen_cliff3.py` のソースを `tile_wa_ishigaki.png`→**`tile_wa_ishigaki2.png`** に切替えて cliff3 再生成。結果は丸い玉石でお手本に肉薄（比較 `ZZ-HCP-logs/013/compare_cobble_ref_vs_mine.png`）。cliff3 alpha=(255,255) 不透明維持。
- **②当たり判定（takadai.ts）**: 「石の縁＝侵入不可」原則で、笠石の縁(RIM_N/W/E/NW/NE)と前面の笠石キャップ(CAP, y=CAPY 非石段)を **`b.solid(true)`** に変更。歩けるのは**上段草の内側・下段草・石段のみ**。石段(x19,20, CAPY..BASEY)だけが上下の通路。
  - **headless検証**: rim/cap/wall/base=solid、石段=歩行可、入場(20,27)→上段草(BFS)到達=true（石段経由で上下連結・孤立なし）。石段上端(x19/20,y10)隣のキャップ(x18/x21)=solid＝石段脇からの侵入(=「石段1個目の侵入バグ」)を解消。
- **検証**: tsc0/vitest32/build緑。実機 `ZZ-HCP-logs/013/result3_*`。
- **最終レビュー（合格）**: Codex=**回帰なし**（到達性・横遮断・フレーム範囲・不透明性・typecheck/test を自身で実行検証）。qa-code-review=**280/300・issuesゼロ**（BFSで646セル到達・上段↔下段は石段のみ連結・孤立なし、縁/キャップ/壁=solidで石段脇侵入経路なしを実証）。low指摘（gen_cliff3.pyの with-open / docstring）は**修正済**。
- **アセット系譜**: 石垣の最終ソース＝`tile_wa_ishigaki2`（丸い玉石）→`gen_cliff3.py`が不透明3D石垣`tile_wa_cliff3`に合成→takadaiが使用。旧 ishigaki/kasaishi/stairs2/cliff/stairs は未使用。

## 4. 残課題・次の候補
- **森境界の構造的継ぎ目**（色違いは解消済だが樹冠の微かなタイル境界は残る）。気になるなら森centerもシームレス単一タイル化 or cliff遷移を柔らかく再生成。
- **Phase 0 残項目⑤**: 御鏡の照射プロト＋木槌の重打（`weapons.ts` に枠のみ。ヒビ岩 obj.hibiiwa 生成済）。
- **勾玉システム未着手**（PLAN.md §6・装備の核）。
- **コミット状況**: セッション5終了時に**全変更を `main` へコミット＆push 済み**（origin=github.com/yuya-fujita-1201/tamamusubi）。次セッションはクリーンな working tree から開始。`.gitignore`: `forge/_backup_*` / `ZZ-HCP-logs/`(QAスクショ・参照画像) / forge中間物 を除外。
  ⚠️ **`public/assets/*_pregrade.png` は追跡する**（grade_wa.py の原本＝再グレードの素。untrack するとfresh checkoutで原本が失われ再グレードが二重暗化する・Codexレビュー）。
  ※ `ZZ-HCP-logs/` は gitignore のためお手本画像(009/011)もリポジトリ外。次セッションで参照が要る場合はローカルに残す。
- 既知の軽微: 水面に微かなフェザー十字パターン（許容）。dev-browser は SIGTRAP 多発（下記復旧手順）。

## 5. 品質保証の進め方（このセッションの方式・継続推奨）
ユーザー指示「何度もQC・Codex・サブエージェント」。各バッチ後に `tsc --noEmit` + `vitest run` + `vite build`。仕上げに:
- **Codex**: `codex review --uncommitted`（PROMPT併用不可・デフォルト指示で未コミット差分をレビュー）。
- **サブエージェント**: `qa-code-review`（3軸300点・差分とテストを検証）。
- **実機**: dev-browser。**SIGTRAP で落ちたら** `dev-browser stop` → `rm -rf ~/.dev-browser/browsers/default/chromium-profile` → サンドボックス外で再実行。入力は**実キーボード(page.keyboard)**が確実。決定論捕捉は `engine.stop()` + `step(n)` + 実keyboard.down/up。スクショは `page.locator('#game').screenshot()`。

## 6. 変えてはいけない確定事項
- ミト正典=`art/01_mito.png`。明るいトーン／和（抹茶・苔・笹）／移動の連続性（マップジャンプ禁止）。
- 居合（納刀溜め→抜刀の前方一閃・縮地）＋フロントステップ＋ステップ斬りは確定仕様。
- 通常戦闘はフィールド曲継続／バトル曲=ボス専用。BGM共通サウンドID凍結。
- SS=8（canvas3200・タイル128px実寸）＝Retina実画素のほぼ上限。
