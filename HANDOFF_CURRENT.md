# HANDOFF_CURRENT.md — 『玉結び』現在地（次セッションはまずこれを読む）

> 作成: 2026-06-13 ／ 最終更新: **2026-06-14**（S1=プレイFB4R → S2/3=立体表示の実験 → S4=俯瞰ズーム(§3.11) → S5=立体2モード削除＋高台を直交2Dで再構築(§3.12〜3.15) → S6=高台第3版＝連続立体石垣(§3.16) → S7=高台側面＋美麗風景パイプライン＋棚田の谷新設(§3.17) → S8=棚田の谷 美麗化＝新規Agent Forge素材13点＋全面再構築＋磨き5巡(§3.18) → **S9=棚田の谷 第4版＝地形接続文法の作り直し（指示020/GPT-memo）＝新規素材13点＋3エリア(神社高台/滝/川橋)を文法分離＋Codex/3観点QAで視覚忠実度57→72(§3.20)。次スレッドは §3.20 を読む**）
> 旧ドキュメント: `HANDOFF.md`(Phase0/1A基盤・素材インベントリ) / `HANDOFF_FIXES.md`(修正ラウンド0〜7の詳細)。
> **本ファイルが最新の単一情報源。** 状態: typecheck 0 / vitest **32本** / build 緑 / 実機検証済み。**セッション5終了時に全変更を `main` へコミット＆push 済み**（リモート: github.com/yuya-fujita-1201/tamamusubi）。次セッションはクリーンな working tree から開始。
> 直近の主題は**立体表示（斜め見下ろし）の実験**(詳細 §3.5〜3.10／要点 §0.5)。**今セッションの主変更=カメラ俯瞰ズームを 1.0→0.8 に引き(§3.11・立体表示とは別件)**。
> **【2026-06-14 セッション5・方針転換】ChatGPT Pro 判断で平行四辺形(4)/台形(5)モードは廃止＝両方コード削除済(§3.12)。高台は「直交2Dのまま石垣/笠石/落ち影/石段/草トーン差」で立体表現する（お手本=ZZ-HCP-logs/009）。§3.6〜3.11 の oblique/persp 記述は歴史的経緯として残すが現コードには存在しない。**
>
> **【2026-06-16 セッション10】= `design/` 製品版設計の独立レビュー＋整合是正（実装コードは無変更）。要点は §0.6。リモート main は `80b0641`。**
>
> **【2026-06-16 セッション11】= 棚田「お手本に収束しない」根本分析→マップ生成v2 プロトタイプ（Python）。骨格は確立したが見た目クオリティがお手本に届かずユーザー強く不満。次回はアセット品質の根本から見直す。要点・ルール・次の一手は直下 §0.7（★必読）。実ゲームsrc/には未反映＝全プロトタイプはcheckerのPython。**
>
> **【2026-06-16〜17 セッション12】= 棚田の滝を「1マス分」に作り直し＋地形整合の全面スキャン＆修正。初回は3マス高スプライトにしてユーザー差し戻し→024は元から「1マスに湧出口+落水+泡」なので1マスタイルとして配置し、水田→石垣切欠き→1マス滝→滝壺を地形接続。決定論的構造スキャン＋19エージェント視覚ワークフローで全面検査し、滝接続/孤立水/水縁/境内森侵入を是正。tilesetインデックスのoff-by-one(T=(setIdx+1)<<8)とrender_map_previewのプロップ非スケールという2つのツール/コードバグも発見・修正。要点は直下 §0.8。未コミット。**

## 0.8 セッション12（2026-06-16〜17）棚田の滝を「1マス分」化＋地形整合の全面スキャン＆修正 ★この回の引き継ぎ

**経緯**: ①ユーザーが `ZZ-HCP-logs/024/` に滝の参考（縦の白い落水筋＋泡。S11 `22_51_26.png` のコピー）を置き「本当こんな感じのタイルを作って配置して。それだけでいい」。②初回、私は024を3バンドに分解し **3マス高スプライト**(obj_spillway)にして配置→**ユーザー差し戻し**「お手本は1マスで表現していた／全面スキャンもV2試行も反映されていない」。③やり直し＝下記。

**核心の気づき**: 024 サンプルは元から「湧出口＋落水＋泡を**1枚の128pxタイル**に収めた1マス滝」。3マス分解は誤り（GPTメモ021「滝は小さな排水に戻す＝高さ1〜2タイル。巨大縦落差/巨大水路にするな」/020「水田→石垣切欠き→滝→滝壺と地形接続」に反していた）。

**やったこと（最終）**:
- `public/assets/tile_ka_waterfall.png` = 024 を内側クロップ(x[2:128]/y[3:126]＝四辺の暗枠除去)→横シームレス化した**1マス滝タイル**（`forge/gen_waterfall_from_024.py`）。obj_spillway.png は**原本へ復元**(3マススプライトは廃止)。
- `tanada.ts` の `spillway()` を **接続文法**へ全面書換: 上=水源(水田/川)へ最大2マス橋渡し → `wallY` に1マス滝(WFALL=kaWaterfall) → 直下に小さな滝壺(水田blob)。`basePool/poolAt` の冗長な二重basinは削除。1マス滝×8本が「水田→石垣切欠き→滝→滝壺」で接続。
- **全面スキャン**（ユーザー要望「マクロ全面検査」）= (a)決定論的構造スキャン `checker/scan_terrain_integrity.py`（滝接続/孤立水/水縁/歩行連結を全数チェック）+ (b)9ゾーン×19エージェントの視覚ワークフロー(`tanada-macro-scan`・62確認所見)。
- 構造整合の修正: 滝の接続(disconnect 6→**0**)、**孤立水タイル除去**(封鎖後に均す・→0)、**水際の接地影を全水縁に保証**(縁なし218→**0**)、**境内内部の森侵入を除去**(神社地表をPCAP-1まで延伸・y18-19)。
- ★**2つのバグを発見・修正**: (1)`checker/render_map_preview.py` draw_props がプロップ座標(16px/tile)を `--tile` でスケールせず高解像度で位置ズレ→`s=TILE/16` で補正。(2)マップ編集で `b.data.ground` を読む際 **`(ref>>8)-1`** が必要(`T()=((setIdx+1)<<8)|frame`の+1予約)。これを忘れて全水判定がfalseになり孤立水cleanupが空振りしていた→補正で全解決。

**検証(最終)**: tsc0 / vitest **32** / build緑。**checker `tanada=96/100 ERROR0 WARNING2 合格`**(95→96)。構造スキャン=滝disconnect 0・孤立水 0・水縁(縁なし) 0・歩行域1連結(孤立なし)・境内森 0。実機 dev-browser で西カスケード確認(`/tmp/final_west_crop.png`相当)。

**★影ルール改定（2026-06-17 ユーザー追加・プロジェクト共通ルール）**: 「黒グラデで高低差を出すのは石垣/階段/滝など"高低差ブロック"だけに限定し、ブロックの**下部**を黒くする。川/草/道など非段差物に黒グラデを落とすな（＝旧版の"真下セルに影"は違和感の塊なので廃止）」。
- 実装: 新素材 `tile.wa_baseshadow`(=waDropshadowの上下反転＝下黒・tileset 67・assetmap・tile_contract登録)。`tanada.ts` の wall()/ridge()/vwall()/drain()/水際5.5パスの **waDropshadow 配置を全撤去**し、末尾で ISHI/SHRINE_WALL/DOTE/WFALL の**セル自身**に `waBaseShadow` を重ねる。`kaRiver3.needsGroundShadow` も削除。
- checker更新: `height_connection.py` を「ブロック自身のセルに waBaseShadow」検査へ(HEIGHT_NO_SHADOW→HEIGHT_NO_BASESHADOW)、`tile_contract.json` の `shadow.family`=waBaseShadow、river の岸影要求を撤去。`quality/ART_BIBLE.md §2-3/3-2/3-3` も改定。
- 結果: tanada checker **96/100 ERROR0 合格**・deco は waBaseShadow のみ729セル・実機で草/水/道に黒グラデなし・石垣下部のみ陰。
- ⚠️**他マップ未対応**: takadai/satoyama/morioku/kiritate は旧規約(waDropshadow真下)のままなので、更新後checkerでは HEIGHT_NO_BASESHADOW が出る。次に同ルールを横展開する必要あり（各マップの wall 系ヘルパーを同様に baseshadow 化）。

**残る伸びしろ（視覚・大きめ＝次イテレーション、ユーザーと相談）**: 視覚ワークフローの未対応所見=①棚田が矩形/単一大水域で曲線等高線でない(格子ブロック感) ②NW北部 y0-12 が森壁でデッドゾーン ③中央道が一部1-2タイルに収縮 ④水田が青い水鏡寄り(緑稲化はS10アセット側) ⑤影ルールの他マップ横展開。これらは「地形整合」より「美麗度/可読性/横展開」寄り。

**コミット状況**: **未コミット**。変更=`src/data/maps/tanada.ts`・`public/assets/tile_ka_waterfall.png`・`forge/gen_waterfall_from_024.py`・`checker/render_map_preview.py`・`checker/scan_terrain_integrity.py`(新規)・`HANDOFF_CURRENT.md`・`forge/_backup_waterfall_024/`。obj_spillway.png は原本に戻したので実質変更なし。

## 0.7 セッション11（2026-06-16）棚田「お手本非収束」根本分析→マップ生成v2 プロトタイプ（骨格OK・見た目クオリティ未達でユーザー不満）★この回の引き継ぎ

**背景**: ユーザー問題提起「何度直しても棚田(tanada)がお手本に近づかない。AIは完璧に実装できたと思っているか？」。

**診断（多エージェントWF＝根本原因特定→敵対的反証→統合）**: 根本原因は唯一＝**採点(checker)がお手本(`ZZ-HCP-logs/023/otehon.png`)との視覚距離を測らず、お手本へ向かう勾配がループに存在しない**。リンタ95点/passed は文法適合の証明でお手本接近の証明でない（目視＝お手本の約6割）。具体欠陥: `checker/heightmaps/tanada.json` 不在でHEIGHT全スキップ／川岸204セル中121(59%)に接地影なし／`tanada.ts` にマクロ構図の宣言的構造なし（addPath+blob手置き）／`grid_seam.py` は境界線全長を平均しミクロ違和感を見逃す。NG集(`ZZ-HCP-logs/XX_NG集/`)=余白/はみ出し/硬い境界/すじ/文脈外。

**設計（ユーザー主導の対話で確立）**: マップ生成v2＝**高さ場駆動・コーナーベース(dual-grid)オートタイル＋手続きシェーディング**。高さを「角(頂点)」に持ち隣接タイルが角共有→整合を構造保証／段差≤1でカタログ有限化／素材は豊かに1回生成し高さ勾配で方向光を build 時に後処理で焼く／map-as-numbers(高さ場+素材場の2配列)で配置を決定論導出。

**成果物（このセッションで新規・src/ は無変更）**:
- [`quality/MAP_GEN_V2_DESIGN.md`](quality/MAP_GEN_V2_DESIGN.md)（907行＋§10補正）= v2統合設計。**実装はこれに従う。§10（完全性批判＋実コード検証の反映）が §0-9 を上書きする確定事項。**
- [`forge/PART_GEN_SPECS_V2.md`](forge/PART_GEN_SPECS_V2.md)= 不足5部品の生成準備仕様（石垣四隅/石垣からの滝/森最前列=幹/起伏スロープ/川岸。お手本視認＋Forgeプロンプト＋接続アンカー）。

**重要訂正（実コード検証済）**: 平坦化の真因は `grade_wa.py` ではない。grade_wa/flatten_tiles/deseam は**旧"wa"タイルのみ対象**で、現行 tanada が描く**"ka"系は対象外**。ka系の平坦さの真因は (a)ka生成プロンプト or (b)`hdproc.py` tileset モードの8%インセット(L105)。Phase 0 で実測特定する。

**即効ビジュアル（着手済・src/ 変更あり）**: `src/data/maps/tanada.ts` 末尾に**川岸の接地影を最終パスで全岸に保証**（strong shadow frame3。v2 §10-6 を先行適用）。RIVER_NO_BANK_SHADOW 解消、score 95→98、コンパイル通過。比較画像 `ZZ-HCP-logs/S11_river_fix/`。**視覚評価=改善は控えめ**（川の縁が暗く少し沈むが、お手本の深いカットバンクには未達＝v2の高さ駆動シェーディングが要）。教訓の生再現: 1回目(frame1・空きのみ)はリンタ98合格でも目視で平坦→2回目(frame3・全岸)に是正。**heightmap は現マップが高さ場非整合のため v2 Phase1 に回す**（宣言すると HEIGHT_NO_STEP エラー量産）。

### 0.7-A プロトタイプ（このセッションで構築・全てcheckerのPython・実ゲーム未反映）
- `checker/slice_v2_build.py` — v2方式の小さな証明スライス（平地テラス＋横一線の段差＋滝＋青い棚田）。`render_map_preview.py` でレンダ。ユーザーのルール反映を重ね合格レベルに到達。
- `checker/tanada_v2_build.py` — 全112×92にv2方式を展開（森縁取り・3段棚田・中央参道＋石段・神社高台＋鳥居・下の谷の川＋滝）。出力=`checker/_dump/tanada_v2.json`。高解像度確認は `python3 checker/render_map_preview.py --map tanada_v2 --tile 64`。

### 0.7-B ★ユーザーが確立した「棚田ルール」（次回必読・これを守ること）
1. **テラス面（田・川・平地）は完全に平地（高低差ゼロ）**。高低差は**各テラス南端の"1本の綺麗な横線"だけ**。1マスごとの階段化は厳禁。**X軸の連続を最優先**（Y軸の高低差に偏執して横の繋がりを壊すな）。
2. **田は青い水（薄/濃の水色）＋稲のブロックを敷き詰める**。緑の畦グリッドで「緑の田の道」にしない。道は意識しすぎない。
3. **滝**: 田の段差用（細くてOK）と**川用（太く・全体に白い水しぶき・縦に波打つ白線＋着水飛沫）は別物**。参考=下記ChatGPTイメージ級の質感。
4. **パーツは128px正方形タイルにして敷き詰める（一枚絵スプライト禁止）**。滝も正方形タイル＋横シームレスで川幅ぶん並べる（`kaWaterfall` 追加済だが見た目は未達）。
5. **石垣**: 全フレームの笠石ラインを同じ高さ（田の字の半分線）に揃える。外角frame9/10は笠石が下がるので直線runには直線frame5。**曲がる棚田用の"高さ整合した石垣四隅"は未作成のTODO**。
6. 参道は棚田の段差箇所で**石段(waStairs)**で整合（ユーザーOK）。
7. 滝壺は隣の水タイルと共通化（特別パーツ作るな）・滝が下の水路へはみ出さない。
8. **解像度の誤解注意**: パーツは元から128px高精細。`render_map_preview`が1タイル16pxに縮小するため低く見えるだけ。**評価は必ず `--tile 64`/`128`**（このセッションで追加）。

### 0.7-C 参考画像（次回必ず見る）
- お手本（マップ全体の目標）= `ZZ-HCP-logs/023/otehon.png`。
- 滝の参考タイルセット（落ち口/流れ/飛沫/水際/合成例）= `ZZ-HCP-logs/S11_tanada_v2/ChatGPT Image 2026年6月16日 22_51_26.png` ← **この質感が目標**。
- 滝のホワイトボード（縦筋＋飛沫）= `ZZ-HCP-logs/S11_tanada_v2/スクリーンショット 2026-06-16 22.40.54.png`。
- ダメ出しNG集 = `ZZ-HCP-logs/XX_NG集/`。設計書=`quality/MAP_GEN_V2_DESIGN.md`、部品仕様=`forge/PART_GEN_SPECS_V2.md`。

### 0.7-D 触ったファイル（全て未コミット）
- 新規: `checker/slice_v2_build.py` / `checker/tanada_v2_build.py` / `quality/MAP_GEN_V2_DESIGN.md` / `forge/PART_GEN_SPECS_V2.md` / `public/assets/tile_ka_waterfall.png`（＋試行残骸 `obj_waterfall_*.png`＝整理可）。
- 変更: `src/field/tileset.ts`（末尾 `kaWaterfall` idx66 追加）／`src/data/assetmap.json`（tile.ka_waterfall 等登録）／`checker/render_map_preview.py`（`--tile`追加）。
- `src/data/maps/tanada.ts` = **元の状態**（川岸影は試行→撤回済み）。**v2は実ゲーム未反映**。

### 0.7-E ★正直な品質評価（ユーザー判定）
骨格（平地テラス＋段差線＋タイル敷き詰め）は通ったが、**見た目のクオリティがお手本に全く届かず、ユーザーは「終わってるほどクオリティが低い」と強く不満**。特に**滝で多数の失敗反復**（横波→縦筋→合成スプライト→正方形タイル、いずれも品質不足。手続き生成タイルは網目状で参考に程遠い）。全体も単純・均一（全幅長方形テラス・直線参道・装飾ゼロ）。

### 0.7-F ★次の一手（推奨＝アプローチを変える。反復微調整は消耗するだけ）
1. **高品質タイルの入手/生成を先に解決する**: ChatGPTイメージ級の滝/棚田/水際タイルを (a)Asset Forgeで本気生成 or (b)参考タイルセットを正しくシームレス化して直接ゲームタイル採用。**手続き生成の安物タイルでお手本には届かない**。
2. **お手本の有機的構図を再現**: 全幅長方形でなく等高線に沿う曲線テラス＋畦の田の字、曲がる参道、桜/民家/橋の配置。
3. 上記を v2 の高さ場駆動配置（破綻しない骨格）に乗せる。評価は必ず `--tile 64+` ＋お手本との並置。**最終ゲートはユーザー目視**（リンタ点で完成と報告しない＝メモリ `map-done-gate-is-visual-otehon`）。

## 0.6 セッション10（2026-06-16）design/ 製品版設計レビュー＋整合是正

**やったこと**: 別セッションで作成済みだった `design/` 製品版設計書体系（聖剣2/3級＝マップ303・武器80・アイテム115・10地域。3層構造 10-lists/20-basic/30-detail/00-overview・約500ファイル）を、**生成と検査を分離した独立レビュー**（12観点×敵対的検証＝サブエージェント64体のワークフロー）で点検。機械検査（`verify_expansion_consistency.py` 13項目）の死角＝「IDは合うが意味が食い違う／上位正典との非同期／進行成立性」を検出し、**確証49件のうち Blocker 1＋Major 18＋正典同期Minor を一括是正**。実装コード（src/）は触っていない。

**主な是正（詳細＝[design/REVISION_LOG.md](design/REVISION_LOG.md) turn-066）**:
- 🔴 Blocker: `itm_096 帝の勅許状` の入手イベント欠落で R3 進行不能 → `ev_014` で授与（神祇官 npc_033）。
- 進行ゲート: `boss_05` を R3主ボス必須化／R4→R5 を純ソフトゲート確定／W6 入手 ev を ev_081 に明記。
- 武器入手地域の三方向矛盾: **W6=R5・W7=R6** に一本化（R8常世=無戦闘で武器入手不可が根拠）。
- システム: GROWTH「MP不在」誤断言を是正（正典 Systems=甘酒MP に整合・MP行追加）／COMBAT ダメージ式を与/被の方向別2本へ分離（実装 enemies.ts と整合）。
- 名称・参照: EVENT_LIST のスキル名6件を SKILL_LIST 正式名へ／式スキル習得 skl_id 取り違え是正（式8技 017-024 が漏れなく習得可能に）。
- 地域数同期: SCENARIO_DESIGN に R7 追加・DESIGN_PROCESS/PLAN を10地域化。
- R9 NPC欠落: `npc_089 大会審判`/`npc_090 整備士` 新設＋ npc_065/067 region 是正＋詳細マップの非正典参照を正ID化（88→90）。
- 体験版「海岸の断崖」を `link_sato_minato` に内包明確化（総マップ303不変）。
- **W1チャージ技を「縛り祓い（居合・祓い抜き）」に確定**（ユーザー決定）: 「全体攻撃=祓い波／溜め攻撃=居合（前方のみ）」の混線を解消、g10「扇→全周」を**前方貫通の大一閃**へ是正（縛り効果は維持＝改変最小）。実装 weapons.ts（居合・祓い抜き）と一致。

**検証**: `cd design/10-lists/data && python3 build_data_json.py`（All counts match）＋ ルート直下で `python3 design/10-lists/data/verify_expansion_consistency.py`（**全13項目 完全PASS・exit0**）。

**コミット＆push 済み（リモート main = `80b0641`）**:
1. `7c3241f` 設計レビュー整合是正＋ design/ 体系 新規追加（503ファイル）
2. `80b0641` 棚田マップ品質向上＋Forge素材・checker更新（既存の未コミット作業をまとめて反映）

**次セッションへの申し送り（未対応・要判断）**:
- **製品版の領域空白**（design/ に専用設計書が未起票・PLAN に断片言及のみ）: UI/HUD・セーブ/タイトル画面フロー・サウンド設計・エンディング/クレジット・難易度/キーコンフィグ・実装アーキ橋渡し・QAテスト計画。実装着手前に最小設計書化を推奨。一覧は [design/REVISION_LOG.md](design/REVISION_LOG.md) §7。
- **バランス/演出系の Minor（次版TODO）**: 鬼系ボス4体の同型構造・R4/R5 の氷雪×火符連続・runner タグが実質1体・R10(42枚)の規模根拠・R8無戦闘19枚のテンポ未評価 等（REVISION_LOG §7・レビュー指摘の未検証Minor 46件）。
- `design_backup_turn054.tar.gz`（1.8MB バックアップtarball）は**意図的に未トラッキング**（design/ 本体はコミット済みゆえ冗長・git肥大化回避）。ローカルにのみ存在。削除可。
- 実装側（src/・棚田マップ）の現在地は従来どおり下記 §0.5／§3.20 を参照（このセッションでは未変更）。

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
現在は**直交2D＋俯瞰ズーム(0.8)のみ**。高台の立体感は **石垣の壁面・笠石ボーダー・落ち影・親柱付き石段・上下段の草トーン差・森マスク** で表現する（聖剣/ゼルダ流）。**2026-06-14 セッション6 で第3版＝お手本(`ZZ-HCP-logs/014`)準拠の「連続立体石垣」に到達（§3.16）**＝壁面を貫く連続縦グラデ(上端81→基部31の実測)＋笠石ハイライト＋石ごとのAO＋基部接地影。qa-code-review 277/300 合格。
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

### 3.16 高台 第3版＝お手本(014)準拠の連続立体石垣（2026-06-14 セッション6・ユーザーFB 014反映）★最新
- **背景(ユーザーFB ZZ-HCP-logs/014)**: 第2版(§3.14/15)でも「まだ立体感が足りない」。014 に高品質なお手本（`otehon.png`＝森に囲まれた台地の苔石垣＋石段、＋ChatGPT生成タイルシート3枚）を用意。これを参照して立体感を本格強化。
- **お手本分析＝立体感の正体4点**: ①壁面全体を貫く**連続縦グラデ**(笠石直下=明→基部=深い影が一本の勾配) ②**笠石(コーピング)**の天端ハイライト＋張り出しの硬い影＋上段草の垂れ ③**石ごとの3D**(上面ハイライト＋目地の暗いAO) ④**基部の接地影**。上下段の草トーン差で高低差を読ませる。
- **根本対策**: 旧版は玉石テクスチャを各タイルに「同じグラデ(1.0→0.85)」で反復適用→5段積んでも“同じ石畳の反復”で平坦だった。第3版は**各壁コースに段ごとに異なる明度を焼き込み、5段積むと一本の連続グラデになる**よう `gen_cliff3.py` を全面作り替え（16→21フレーム）。
- **gen_cliff3.py（21フレーム）**:
  - 連続縦グラデ `L_COPING(1.04→0.99)/WUP(0.99→0.86)/WMD(0.86→0.71)/WLO(0.71→0.55)/WBASE(0.55→0.40)`。隣接コース境界の明度を一致させ連続化。`vgrad_multiply` で段ごとに焼き込み。
  - `enhance_cobble`: コントラスト1.35＋アンシャープ120、目地(暗部)を暗色(24,22,18)で沈めAO強調、控えめな苔(0.28)、石上面に明部ハイライト(236,230,208)＝丸い塊(ボス)に。
  - `coping`: 明るい笠石帯(brightness1.40＋暖白0.30)＋天端ハイライト線(252,248,232)＋張り出しの硬い影＋草の垂れ(不規則fringe)。
  - 基部 `wall_course(base=True)`: `extra_bottom_shadow=0.55`＋最下端に硬いコンタクトシャドウ線(壁を地面に接地)。
  - フレーム: `0-4 RIM(N/W/E/NW/NE) / 5-6 COPING_A,B / 7-8 WUP / 9-10 WMD / 11-12 WLO / 13-14 WBASE / 15-16 COPING_L,R / 17-18 WALL_L,R(3段共用・中間明度+縦影) / 19-20 WBASE_L,R`。
  - `stairs3`: 輝度0.82＋コントラスト1.12で壁の光に統一（旧版は明るく浮いていた）。
- **gen_proc_de.py**: grassUpper(明+0.08/暖+6/彩1.14)・grassLower(暗-0.14/寒-15/彩0.82)でトーン差拡大。**フレーム間平均輝度を正規化**(make_grass_tone内)し市松継ぎ目を解消（実測: grassLowerのフレーム間輝度範囲 **45.2→0.2**）。dropshadow を濃く広く neutral-dark(14,20,14) に強化。
- **takadai.ts**: 21フレーム定数(COPING/WUP/WMD/WLO/WBASE + L/R角)。壁3段に**異なる graded フレームを配置**して連続グラデを実現。横A/B変種(`x%2`)で横反復を緩和。デカール密度を微増(0.06→0.10等)し草の構造シームを分断。**当たり判定・到達性は §3.15 から不変**（石の縁=solid・石段x19,20のみ上下通路）。
- **検証（客観実測で裏取り）**: 実機スクショの壁の縦輝度プロファイル＝**上端81→基部31（62%暗化の連続グラデを実証）**。生成フレーム輝度＝笠石天端185→基部37。grassLowerフレーム間輝度範囲0.2。tsc0/vitest32/build緑。
- **レビュー**: **qa-code-review 277/300 合格**（フレームindex 0-20一致・BFS到達性156セル・assetmap frames21=PNG幅2688・範囲外参照なし・スコープクリープなし）。軽微指摘（C3コメント旧値16→21／関数内 import hashlib）は修正済。
- **実機3視点**: `ZZ-HCP-logs/015/tk_lower,tk_plateau,tk_stairs.png` ＋ お手本比較 `cmp_full2.png`。
- **教訓（記録）**: LLM視覚批評3体のうち2体が前回評価にアンカリングし「縦グラデが出ていない／画像が未更新」と**誤認**したが、ピクセル輝度の客観実測で反証（壁81→31・ファイルtimestamp更新済）。**今後も視覚的な良否判断は実測値で裏取りする**。
- **今後の任意磨き**: ①壁は5段維持（強グラデで「崖」として成立）。より低い「丘」にしたい場合は CAPY..BASEY を4段化（要 BFS 到達性再検証）。②草テクスチャのタイル境界の構造シームは全マップ共通の既存事項（輝度市松は解消済・構造シームはデカールで緩和）。森中央のシームレス化(§4)と同様に deseam で根治可能。

### 3.17 高台 側面パーツ＋苔コーピング ＆ 美麗風景パイプライン（2026-06-14 セッション7）★最新
- **高台の続き**: 角の「四角い積み木」感に対し、お手本(016/p01-p04)準拠で①笠石を**苔むした緑の生垣**(make_capband 苔緑(94,114,66))に②左右の辺に**側面パーツ side_face**(外=石バンド/内=草・北笠石付き角)を追加。三角ウェッジ案は廃止。`gen_cliff3.py` 21フレーム。角の90°完全解消は**オートタイル方式**で今後吸収する方針（手動配置が限界）。
- **美麗風景セットアップ（`LANDSCAPE_SETUP.md` 新設）**: キーアート(`ZZ-HCP-logs/016/shot01`)級の風景を作る恒久パイプライン。柱A=絵画調オートタイル(Agent Forge生成) / 柱B=棚田 / 柱C=大気(blend) / 柱D=装飾密度。
- **新規マップ `tanada`（棚田の谷）**: 山道(path)＋川＋棚田カスケード＋鳥居/水車/御神木/集落/森。**Agent Forge で5地形を絵画調生成**（`tile.ka_grass/ka_paddy/ka_path/ka_river/ka_forest` → `assets_plan.json`/`proc_wa.py PROC`/`tileset.ts` 47-51＋TRANS_MAPS）。
- **継ぎ目解消（`gen_ka_post.py`）**: 一様面=deseam(単一自己シームレス・make_seamless) / 森=flatten(輝度正規化)+deepen(濃く) / 棚田=src=f1・strength0.48で映り込み・稲列を残す。
- **大気（L3）**: `renderer.atmosphere()`＝暖色グレード(soft-light)＋もや＋ビネット。`MapData.atmosphere` で per-map。tanada にゴールデンアワー適用。世界のみ・HUD不変。
- **検証**: tsc0/vitest32/build緑。実機 `ZZ-HCP-logs/017/L6_*`、比較 `compare_L1_vs_final.png`。
- **動線（配線済・実機検証 REACHED_TANADA:true）**: ゲーム開始=kiritate(28,24)。**村の東の道を右(東)へ → 東端ゲート(x55,y19-21・看板 sign:tanada_road) → 棚田の谷(tanada)の南入口(28,42・赤鳥居)に着地**。戻り=tanada南の鳥居(x27-29,y45)→kiritate東口(53,20,left)。`kiritate.ts` 東ゲート＋warp、`tanada.ts` 戻りwarpを対に修正済。
- **再生成順**: `node forge/gen_runner.mjs --only tile.ka_*` → `python3 forge/proc_wa.py --only tile.ka_*` → `python3 forge/gen_ka_post.py`。

### 3.18 棚田の谷 美麗化・第2弾（2026-06-14 セッション8）★作業中
- **お手本/指示**: `ZZ-HCP-logs/018/`（お手本画像4枚＝HUD付きの目標絵 ＋ `GPT-memo`＝タイル別プロンプト＋合格条件 ＋ `GPT-momo2`＝方針転換）。設計仕様は `ZZ-HCP-logs/018/design-spec.json`、新素材定義は `ZZ-HCP-logs/018/assets-plan-v2.json`。
- **ユーザーFB（重要・第1版 tanada への指摘）**: ①平地(草地)に段差がなく棚田と別世界に見える＝平地も段差化せよ ②棚田⇄平地の縦カスケード川が平坦で変＝壁から落ちる小滝にせよ ③石垣の角が直角すぎる(前々からの宿題) ④お手本とまだかけ離れている。さらに「既存素材の使い回しをやめ、Agent Forge で新規素材をどんどん作れ」。
- **GPT-momo2の核**: 128pxは維持しつつ ①タイル内を32pxサブセルで混在 ②床レイヤーと輪郭オーバーレイを分離 ③石垣以外の高低差素材（特に**草付き土手**）を足す。高低差は必ず「上端の明るい縁＋縦面＋下の接地影」の3点セット。角は **world_coastline_16 プリセット（曲線境界＋角）** のオートタイルで直角を解消。
- **新規 Agent Forge 素材13点**（assets_plan.json/proc_wa.py 追記済、tileset.ts 52-60＋TRANS_MAPS仮DEFAULT登録済）: `tile.ka_dote`(草付き土手) `tile.ka_ishigaki`(苔石垣) `tile.ka_paddy2`(丸角水田) `tile.ka_river2`(川岸カットバンク) `tile.ka_grass2`(草地) `tile.ka_path2`(蛇行道) `tile.ka_forest2`(森縁) `tile.ka_bamboo`(竹林) `tile.ka_decor`(装飾overlay) `obj.waterfall` `obj.jizo` `obj.flower_cluster` `obj.bridge`。すべて world_coastline_16/grass/forest/field_prop_32 プリセット。
- **進め方（Dynamic Workflow主導）**: 設計→生成(gen_runner)→視覚QA→proc_wa→TRANS_MAPS較正→tanada をレイヤー設計(base→輪郭overlay→高低差(土手/石垣/川岸=3点セット)→装飾→プロップ)で全面再構築→tsc/vitest/build＋BFS＋実機→Codex＋桜井＋qa レビュー。
- **第3版 完成（2026-06-14・実機確認済）**: 13新素材を全生成→proc_wa(128px)→tileset.ts(52-60)＋TRANS_MAPS較正(16フレーム個別QA)→`tanada.ts` 全面再構築。
  - **TRANS_MAPS較正の要点**: paddy2/river2/path2 = 標準配置の完全オートタイル(曲線外角込み)。dote/ishigaki = 南向き前面=frame5が主役(上端縁+縦面+下影)、N辺は専用無し→代替(ishigaki n:15, dote n:0)。forest2/bamboo は角の順が標準と異なるので個別指定(tileset.ts参照)。grass2=center8変種のみ。decor=装飾16種(autotile非)。
  - **tanada第3版の構造**: 北=高い社(H2,苔石垣囲い+石段)→南=低い入口の段々。中央スパインは草付き土手(kaDote)でH1上段/中段/下段に段差化(=平地も高さ)。西3段・東2段の棚田(kaPaddy2 paintAuto=曲線畦)＋南面に苔石垣(kaIshigaki frame5)＋滝(obj.waterfall)が段差を落ちる。東に集落(民家/水車)＋川(kaRiver2 カットバンク)＋木橋。花クラスタ/kaDecorで石垣沿いに量感。大気=正午の里山光。
  - **擁壁の置き方**: `wall()` ヘルパー=南向き前面frame5を1行＋端は角フレーム＋下段にwaDropshadow deco。棚田は paddy()=paintAuto(kaPaddy2)＋南面 wall(ISHI)。中央段差は doteStep()=wall(kaDote)で道の所だけ通路。
  - **検証**: tsc0/vitest32/build緑。BFS=入口(28,42)→社(28,7)・集落到達可、水田/川/石垣=solid。通行不可率0.650。実機スクショ `ZZ-HCP-logs/018/result/r2_*.png`。ユーザー4指摘(平地段差/壁の滝/曲がる角/お手本差)に対応済。
  - **再生成順**: `node forge/gen_runner.mjs --only tile.ka_dote,...(13件) --force` → `python3 forge/proc_wa.py --only <同>` → tileset.ts/tanada.ts は手編集済。
- **レビュー（3観点＋Codex 実施済）**: Codex=correctnessの問題なし(tsc/test/build green)。桜井=美麗化で可読性を損ねるP0(道が埋もれ/装飾均一/プレイヤー埋没)を指摘。視覚忠実度=お手本到達度41/100、最重要差は「道の矩形帯/花の量感不足/川の谷感/大気色温度」。
- **磨きイテレーション（レビュー反映・適用済）**: ①道を細く(thick 3.0→主幹2.2/枝1.6) ②道周囲2マス＋入場点を装飾ゼロに(noFlower)＝道を読みやすく ③花の再配分=開けた草地は控えめ・石垣沿いは濃く(decor0.45/flower0.30)＋花クラスタを2マスおきに密配置 ④川岸に接地影deco(谷感) ⑤滝を5箇所に増設(各棚田段) ⑥水田blob jitter 0.14→0.22(角を非矩形) ⑦大気を暖色化(grade #fff0c8/α0.20) ⑧コード修正(空ループ削除/PX0-0→PX0/wallFootRows補完)。
- **検証(磨き後)**: tsc0/vitest32/build緑。BFS到達837・社/集落/warp可達・solidRatio0.650。実機 `ZZ-HCP-logs/018/result/r3_*.png`(磨き後) と `r2_*.png`(磨き前)。
- **磨きRound2（適用済）**: ①プレイヤーに暗いアウトライン（`renderer.ts` sprite に `outline` opt-in＝暗シルエットを8方向オフセット描画／`player.ts` 本体描画に `outline:"#12121c"`、tint時は省略）＝背景の装飾密度から本体が浮く（全マップ効果）。②水田/川の水を**選択的に発光する青緑へ**（`forge/gen_ka2_post.py`＝青み画素[B>R]だけ明度＋シアン＋コントラスト。畦の緑は不変＝色相差UP）。③森縁を低木でぼかす（nearForest に kaDecor 散布）。④石垣の落ち影を強め（SHADOW frame1→2）。
- **磨きRound3（適用済）**: ⑤道をさらに細く（主幹2.2→1.8/枝1.6→1.4）。⑥水田の矩形感を崩す（blob jitter 0.22→0.26＋各段で幅/中心を変える＋内部に accent[12草島/13葦泥]を散布）。
- **レビュー再採点**: 視覚忠実度 41→**57/100**（水の発光・花量感・森縁・暖色・滝で加点）。「水/花/桜/滝/アウトラインは十分＝過剰修正不要」。残る最重要3=①水田輪郭がまだ直角寄り②中央草地と棚田/川の境に草付き土手(高低差)が無い③道がまだやや広い。→ ①は kaDote/kaPaddy2角の活用余地、②は kaDote を棚田クラスタ外周に当てる、③は専用の道縁タイル化、が次の伸びしろ（目標65-70）。
- **検証(Round3後)**: tsc0/vitest32/build緑/maps.test(到達性+通行不可率)パス。実機 `ZZ-HCP-logs/018/result/r4_*,r5_*.png`、比較 `COMPARE_before_after_otehon.png`。
- **再現コマンド**: 水ポップ=`python3 forge/gen_ka2_post.py`（proc_wa後に1回）。
- **Codex 2巡目（修正済）**: P3=`nearStone` を `solidSet`(森含む)から作っていたため森縁が花帯扱い→森縁低木が餓死。`stoneSet=solidSet−forest` で算出するよう修正（森縁=低木/石垣=花帯に正しく分離）。他は correctness 問題なし。
- **磨きRound4＝整理（GPT-memo3／ZZ-HCP-logs/019・ユーザー指摘「変なノイズ削除＋パーツのガタつき修正」）**: 方針転換＝「描き込み追加」ではなく**引き算と情報の優先順位**。
  - **草ベースを静かに**（`forge/gen_ka3_post.py`＝kaGrass2のcenter0-7をコントラスト0.60/彩度0.80に圧縮＋全フレーム平均色を統一＝市松/継ぎ目消去）。稲のコントラストも0.80に低減。
  - **装飾を引き算**（tanada.ts）: 歩行域の開けた草地はクラッタ(小石/枯草/シダ)散布を**全廃**＝静かに。花は段差/水辺(nearStone)沿いのみ低密度(decor0.16/flower0.14)、森縁(nearForest)0.34。**花クラスタは点在化**（3マスおき＋±1ジッタ＋45%間引き＝縦横の列を禁止）。decals 174→66・props 82→51。
  - **水田をシンプルに**: 水面blob jitter 0.26→0.12（水を削らない）＋水中アクセント撤回。輪郭は外周の畦(paddy2 edge)で作る。
  - **検証**: tsc0/vitest32/build緑/到達831/solid0.650/frame0。グレースケールで道・段差・水・森が読める（GPT-memo3チェック合格）。実機 `ZZ-HCP-logs/019/r7_*.png`、チェック `chk_gray_*/chk_small_*`。
  - **再現**: `python3 forge/gen_ka3_post.py`（proc_wa/gen_ka2_post の後）。
- **磨きRound5＝静かなベース草＋影強化（GPT-memo3検証反映）**: 検証で「ノイズ削減62/100・残ジャギー38/100」、両レビュー一致の優先順=①静かな草ベース素材②村クラッタ③土手影→④2×2オーバーレイ。
  - **静かな草ベース新規生成**: `tile.ka_grass_calm`(world_grass_variation_16・低コントラスト/花なし/均一)を Agent Forge 生成→tileset 61・kaGrassCalm。tanada のベースを kaGrass2→**kaGrassCalm**に差替（gf%4＝center0-3のみ）。歩行域が静かに。
  - **土手/石垣の下影を最強(SHADOW frame3)** に（上端縁＋下影を強調＝一目で段差）。**村の南東クラッタ削減**（SE桜削除）。
  - **検証**: tsc0/vitest32/build緑。実機 `ZZ-HCP-logs/019/r8_*.png`、Before/After `ZZ-HCP-logs/019/COMPARE_noise_before_after.png`。ノイズ（ユーザー指摘）解消＝草が静かになり地形構造が先に読める。
- **状態**: 第3版＋磨きRound1-5 完了・全緑・実機OK・**未コミット**。ノイズ問題=解消。**残=パーツ輪郭のガタつき（128pxグリッド張り付き）→本命対策はGPT-memo3の「256px/2×2大判曲線オーバーレイ」(rice_curve/earthen_bank_curve/path_intrusion)の新規生成＋配置機構（256pxオーバーレイをprop/decoで重ねる）。これは新アセットサイズ＋配置機構が要る次の深掘り。** 比較 `ZZ-HCP-logs/018/result/FINAL_compare.png`。

### 3.19 ★次スレッドへの引き継ぎ（S8終了時点・まずここを読む）
**現在地**: 棚田の谷(tanada)を「お手本=ZZ-HCP-logs/018 ＋ GPT-memo/momo2/memo3」に沿って美麗化。**第3版＋磨き5巡 完了・全緑・実機OK・未コミット**。ユーザー指摘「変なノイズ」は解消済（§3.18 Round5）。**残る唯一の主要課題＝パーツ輪郭のガタつき（128pxグリッド張り付き）**。

**最優先タスク＝GPT-memo3「256px/2×2大判曲線オーバーレイ」の生成＋配置機構**（これは1タイル内調整では物理的に解決不可。検証2体が一致して最優先と判定）。具体手順:
1. **新規素材を Agent Forge 生成**（assets_plan.json 追記→`node forge/gen_runner.mjs --only <id> --force`→proc）:
   - `tile.ka_rice_curve`（棚田の丸角カーブ。NE/NW/SE/SW の4枚を 2×2グリッド=512px raw で生成し 256px×4 に proc）
   - `tile.ka_bank_curve`（草付き土手のカーブ角・同様）
   - `tile.ka_path_intrude`（道に草が食い込む 2×1 オーバーレイ）
   - プロンプトは GPT-memo3 の「2×2棚田カーブオーバーレイ」「草付き土手の整理版」例をそのまま翻案（透過=magenta背景）。
2. **256px透過オーバーレイの proc 機構**: 現 proc_wa は 128px 前提。256px・透過保持の mode が要る（`tile.ka_decor` の `tileset_overlay` を 256px 化 or hdproc に 256 グリッド対応を追加）。要・hdproc.py 確認。
3. **配置機構**: 256px(=32×32論理=2×2タイル)のオーバーレイを「地面の上・プレイヤーの下」に重ねる。`b.prop(sheet, tx, ty, 32, 32, {ysort:false or true, footW:0, shadow:false})` で水田/土手の角に被せる（棚田は非歩行なのでYソート問題は軽微）。renderer のレイヤー順(bgs→ground→deco→decals→props→overhead)を確認し、地面オーバーレイが player 下に来るようにする。
4. **適用**: tanada.ts の paddy()／doteStep()／road の角・縁に上記オーバーレイを配置し、128px境界のガタつきを隠す。
5. **検証**: tsc/vitest/build＋BFS到達性＋実機スクショ＋グレースケール/25%縮小チェック（GPT-memo3）。Codex＋桜井＋視覚忠実度レビュー（§5方式）。お手本到達度の目標65-70。

**着手前にユーザー確認すべき点**: ①この256px機構を作るか（やや大きめ）②未コミット分を先にコミットするか（過去はセッション終了時に main へ commit＆push する運用＝§4）。

**ガタつき以外の細かな伸びしろ**（任意・低優先）: 森の前景3×1オーバーレイ／川岸のえぐれ強化／プレイヤーアウトラインの太さ調整（renderer.ts sprite の `outline`・現 `this.k*0.3`）。

**重要ファイル**: マップ=`src/data/maps/tanada.ts` ／ タイル定義=`src/field/tileset.ts`(47-61＋TRANS_MAPS) ／ 生成=`forge/assets_plan.json`＋`forge/gen_runner.mjs` ／ proc=`forge/proc_wa.py` ／ 後処理=`forge/gen_ka2_post.py`(水ポップ)・`forge/gen_ka3_post.py`(草/稲を静かに) ／ 描画=`src/gfx/renderer.ts`。実機=dev-browser(§5・タイトルはKeyX連打でイントロ消化→`window.__tamamusubi.warp('tanada',x,y)`はフェード遷移なのでポーリング必須)。スクショ/比較=`ZZ-HCP-logs/018,019/`(gitignore)。

### 3.20 棚田の谷 第4版＝地形接続文法の作り直し（2026-06-14 セッション9・指示=ZZ-HCP-logs/020/GPT-memo）★最新
- **指示(020)**: 「素材不足ではなく地形パーツ同士の【接続文法】が弱い」。3エリアを文法から作り直す＝①棚田の滝（貼り付け→埋め込み排水口）②右の川と橋（低い谷＋橋台/橋下影/道接続）③上部の神社高台（棚田パーツ流用をやめ神域専用文法）＋④128pxグリッド分断。
- **進め方**: Dynamic Workflow（全Opus 4.8）で4エリア並列設計→統合ビルドプラン→アセット生成→tanada再構築→多観点QA。
- **新規 Agent Forge 素材13点**（assets_plan.json/proc_wa.py 追記、tileset.ts 62-65＋TRANS_MAPS）: `tile.ka_shrine_wall`(神社専用 dressed ashlar 擁壁・62) `tile.ka_shrine_ground`(神域の静かな平場・63) `tile.ka_river3`(穏やか川＋カットバンク岸・64) `tile.ka_edge_overlay`(境界破砕16フレーム・65) ／ プロップ `obj.shrine_stairs`(256x384 切り込み石段) `obj.spillway`(128x384 埋め込み滝＝上段水田→切欠き→滝壺) `obj.spillway_side` `obj.bridge2`(256x128 木橋) `obj.bridge_shadow`(橋下水影) `obj.bridge_abutment`(橋台) `obj.watermill_channel`(水車＋分水路) `obj.curve_overlay_2x2`/`3x1`(大判曲線・不採用)。
- **tanada.ts 全面再構築**（W56xH46踏襲）: 神社=kaShrineWall/kaShrineGround＋shrine_stairsで「鳥居(y14)→石段(x27,28 y10-13)→平場(y4-9)→社」の縦導線（棚田と文法分離）。西/東棚田=paddy()にskipX追加し石垣を切り欠いて spillway を埋め込み（ty=wallY+2）。川=kaRiver3＋frame3接地影＋橋セット(橋下影→橋床ysort:false→橋台ysort:true→道)＋watermill_channel。中央道=S字蛇行。装飾=kaEdgeOverlayを境界に薄く散布（curve_overlayは密なシダ塊で過剰→不採用）。大気=ゴールデンアワー(#ffe8b4/0.24)。末尾に**到達不能セルを森で封鎖するシール処理**（BFS iso=0保証）。
- **★重要バグ修正（Codex P1）**: 新規プロップに HD ソースpx(128/256/384)をそのまま draw size に渡していた＝8倍巨大化（既存は論理px=源÷SS8）。全プロップを論理pxに修正（spillway16x48/stairs32x48/bridge32x16/abutment16x16/watermill48x48）。これが「滝が岩柱に挟まれて見える/装飾過剰」の主因だった。
- **その他修正**: flower_clusterのハッシュが符号付き`>>`で40.9%が負フレーム→`>>>`（Codex/QA P0）。石段は歩行床なので`ysort:false`（Codex P2）。東下段の孤立(72セル)を東スパイン道で接続→シール処理でiso=0。dote段差cap行(20,29)の花を除去し縁を露出。watermillのsolidRect二重登録を整理。
- **検証**: tsc0 / vitest32 / build緑 / BFS到達性iso=0(社/石段/集落/東下段/warp全到達)・solidRatio0.643。
- **QA（多観点・全Opus）**: Codex review 2巡（プロップ寸法P1・石段ysort P2 を指摘→修正済）／桜井メソッド・視覚忠実度・コード到達性の3観点ワークフロー／視覚忠実度 **57→72/100**（寸法修正＋装飾引き算＋到達性＋神社導線改善で加点）。
- **実機スクショ**: `ZZ-HCP-logs/020/result/v7_*.png`(全景/神社/橋/東下段/西), `v8_shrine*.png`(神社導線改善後)。
- **★Codexが自動生成した品質保証ツール群（未コミット・要ユーザー判断）**: `quality/`(ART_BIBLE/MAP_DEFINITION_OF_DONE/TILE_GRAMMAR等のドキュメント), `checker/`(マップアート自動リンター=height/river/shrine等のルールチェック+map dump), `.claude/agents/map-art-reviewer.md`, `.claude/skills/map-quality`, package.json(`check:dump`/`check:map`)。リンターでtanada=**93/100 ERROR0 WARNING4**（WARNINGはREPEAT_RUN=静かな草の意図的設計／WATERFALL_NO_BASIN×2=プロップ絵内の滝壺をタイル単位では検出不可／STAIR_NO_SIDEWALL=チェッカー限界）。Codex自身がこのツールにP2を5件指摘（exit code/影フレーム検証の精度）。
- **残りの伸びしろ（任意）**: 滝壺をマップタイルでも実体化／神社石段の側壁を足元まで延長／川岸のえぐれ素材／お手本到達度80超えには神社石段の更なる明確化。
- **コミット状況**: **未コミット**（前回 f1e9f21 が第3版）。本セッションの変更（map/asset/tileset/proc + Codex生成ツール群）はユーザー確認後にコミット予定。

## 4. 残課題・次の候補
- **棚田の谷(tanada)の動線は配線済**（§3.17 末尾）。村東口→棚田。今後の磨き=プロップ絵画調化／遠景パララックス／大気バリエーション／棚田段差に cliff3。
- **森境界の構造的継ぎ目**（色違いは解消済だが樹冠の微かなタイル境界は残る）。気になるなら森centerもシームレス単一タイル化 or cliff遷移を柔らかく再生成。
- **Phase 0 残項目⑤**: 御鏡の照射プロト＋木槌の重打（`weapons.ts` に枠のみ。ヒビ岩 obj.hibiiwa 生成済）。
- **勾玉システム未着手**（PLAN.md §6・装備の核）。
- **コミット状況**: セッション5終了時に**全変更を `main` へコミット＆push 済み**（origin=github.com/yuya-fujita-1201/tamamusubi）。次セッションはクリーンな working tree から開始。`.gitignore`: `forge/_backup_*` / `ZZ-HCP-logs/`(QAスクショ・参照画像) / forge中間物 を除外。
  ⚠️ **`public/assets/*_pregrade.png` は追跡する**（grade_wa.py の原本＝再グレードの素。untrack するとfresh checkoutで原本が失われ再グレードが二重暗化する・Codexレビュー）。

## 7. マップ品質保証システム（2026-06-14 S10 で本格構築）★今後の全マップ制作の土台

GPT Pro 助言「マップ改善とは別に“品質の基準”を作れ」を、**エージェント / スキル / ツール**の3形式で実装した。
「AIに“絵を描かせる”だけでなく“絵を検査させる”」＝生成AIと検査AIを分けるのが核。

> **§3.20 との関係**: 前セッションで Codex が同名の品質ツール（`checker/`/`quality/`/agent/skill）を一度生成したが「未コミット・要ユーザー判断」だった。S10 開始時点では `checker/` は空・`quality/` は不在（セッション間で失われていた）。そこで S10 で**ゼロから本格的に再構築**した（12チェックへ拡張＋全ドキュメント整備＋Codexレビュー反映）。tanada のリンタ結果が §3.20 記載と一致（93/E0/W4）＝診断は再現性あり。

### 4本柱とその実体
1. **アートの正解基準** → `quality/ART_BIBLE.md`（OK/NG例・色/ノイズ/高低差ルール）
2. **タイル配置の文法** → `quality/TILE_GRAMMAR.md`（人間用）＋ `checker/tile_contract.json`（機械用・単一ソース）
3. **自動検査ツール** → `checker/`（後述）
4. **固定レビュープロンプト** → `quality/MAP_REVIEW_PROMPT.md`（コピペ即用）＋ `quality/MAP_REVIEW_CASES.md`（NG台帳12件）＋ `quality/MAP_DEFINITION_OF_DONE.md`

### ツール: `checker/`（最重要）
- 実行: `checker/run_check.sh <map> [screenshot.png]`（ダンプ→lint→レポート）。`npm run check:dump` / `npm run check:map -- --map <id>` も可。
- 仕組み: マップはTSビルダー生成のため、`checker/export/dump_map.dump.test.ts`（**専用vitest config**=`npm test`を汚さない）で `MapData→checker/_dump/<map>.json` に書出し、`checker/lint/map_art_linter.py`(Python)が解析。
- 12チェック: HEIGHT/STAIR/WATERFALL/BRIDGE/SHRINE/RIVER/REPEAT/WALK/CONTACT/DENSITY/SEAM(画像)/NOISE(画像)。
- 出力: `checker/out/<map>/{art_qa_report.md, score.json, error_overlay.png, warning_overlay.png}`（gitignore）。スクショ無しでも ground カテゴリ色分けの**構造マップ**を出す（height/walkable俯瞰の代用）。
- スコア=10軸 各0-5→100点換算。合格条件=**総合80点以上 / ERROR 0 / 重大WARNING 3件以下**。満たさないと exit 1（CIゲート）。
- 新タイルを `src/field/tileset.ts` に足したら **必ず `checker/tile_contract.json` にも意味を1エントリ追記**（未登録は category=other で接続検査から漏れる）。

### エージェント / スキル
- `.claude/agents/map-art-reviewer.md` = 検査AI（アートディレクター/QA人格）。**マップを作る会話とは別起動**で使う。
- `.claude/skills/map-quality/SKILL.md` = 制作→検査→修正の10ステップ運用フロー＋DoD＋納品物。**マップ制作時は常にこれに従う**。

### 現状（リンタ実測・全マップ ERROR 0＝偽陽性なし）
satoyama 95 / kiritate 96 / morioku 100 / takadai 96（合格） ／ **tanada 93（差し戻し）**。
tanada の差し戻し理由 = WARNING 4件: ①②西/東スピルウェイ(obj.spillway)の滝壺・下段接続が弱い ③同一frame長連続(水田/平場) ④反復。
→ 次に tanada を仕上げるなら、この WARNING を潰して80点超＋WARNING 3件以下にすれば合格。

### Codexレビュー反映済み（S10）
checker一式を `codex exec` でレビュー、高3/中8/低1を指摘。妥当な9件を修正（exit連動・CHECK_CRASH=ERROR・prop座標KeyError/JS互換round・BFS起点から敵spawn除外・神域トリガをshrine_ground限定・鳥居奥判定を重心方向化・waterEdge登録・未使用閾値削除）。
2件は本エンジン特性に基づき**棄却**: contact厳格化（森縁の木/水車over水は正当配置で偽陽性化）／128px境界=8タイル毎（SS=8で全タイル境界が128pxアセット継ぎ目のため全境界検査が正）。
- コミット状況: dac2ae7 で品質システム一式＋tanada素材がコミット済（ユーザー）。S10後半のtanada改善＋scale検査は未コミット。

### S10後半: スケール検査の追加＋tanada品質向上（指示=ZZ-HCP-logs/021/GPT-memo「スケール階層の崩壊」）
- **GPT021診断**: 「立体感の強い素材≠大きい素材」。巨大階段/滝/水車が里山を巨大遺跡化。ただし8倍描画バグ(プロップをHD pxで渡す)は dac2ae7 で論理pxに修正済＝巨大問題は既に解消済だった。
- **checkerに SCALE 検査を新設**（`checker/lint/checks/scale.py` ＋ tile_contract.json `scale`ブロック）: object_scale_class / visual_bbox_tiles / 画面占有率 / 主役クラスタ密度 / プレイヤー比 / 巨大素材の通常マップ混入。8倍バグ(16+タイル)の回帰ガード。giant閾値=幅6.5/高8.0タイル(5タイル建物はOVERSIZED warning止まり)。
- **tanada改善（src/data/maps/tanada.ts）**: ①**gf()をMath.imulに**（直積が2^53超で低ビット0丸め＝全セルframe0だったREPEATの主因。草/神域が0-3分散）②終端スピルウェイ足元に滝壺basePool（西9,30/東43,35）③神社石段の左右にkaShrineWall側壁＋接地影（道塗布後に立てる＝上書き回避）④入口鳥居64→40px（主役の優先順位）⑤青小花density0.14→0.08⑥道roadPts蛇行強化⑦棚田blob jitter0.12→0.20（矩形感解消）⑧東川に中継点[43,36]（棚田→滝壺→川の経路接続）。
- **REPEAT検査の精緻化**: 変種家族はcenter(0-3)の単調連続のみ計上、edge/corner(≥4)の連続境界(畦/岸)は正常として除外（偽陽性回避）。
- **結果**: tanada **79→100点 E0 W0 合格✅**（map-art-reviewer目視は79→86→[最終確認中]）。morioku100/takadai95合格。旧マップ satoyama93/kiritate86 は未調整プロップがSCALE_OVERSIZED warningで顕在化（実所見・別途）。typecheck0/本体テスト32本緑。
- **Codexレビュー2巡目**: scale.pyの画面内クラスタ計数バグ(過少カウント)＋石段側壁の道上書きを指摘→両方修正。gf均等化([646,646,642,642])・basePoolを実走確認で承認。
- **残る「120点級」の伸びしろ（アセットレベル）**: kaPaddy2に稲/泥の畦テクスチャ（青い水鏡のみ→棚田の深み）が最大。kaRiver3の流れ筋・kaShrineWallのdressed ashlar目地・spillwayの飛沫も候補。マップレベルは100点で頭打ち＝以後はアセット再生成(Asset Forge)が必要。
- **dev-browser復旧**: デフォルトプロファイル破損でSIGTRAP多発→`dev-browser stop && pkill -f "Chrome for Testing"` 後に **別プロファイル名**(`--browser seihin`)で起動。ゲーム遷移はリロード後 about:blank に飛ぶので `page.goto("http://127.0.0.1:5210/")` 明示→canvasクリック→state().mapがnoでなくなるまでX連打→`warp("tanada",x,y)`。

### S10最終: kaPaddy2「棚田リアル化」アセット再生成（120級・ユーザー判断＝棚田リアル化を選択）
- **問題**: 棚田が「青い水鏡」に見える(Case001)。真因の一部はアセットでなく**後処理**: `gen_ka2_post.py`(水画素にcyan+0.18) と `gen_ka3_post.py` calm_rice(稲コントラスト↓) が「青い水鏡」志向で稲を消し青くしていた。
- **対応**: assets_plan.json の ka_paddy2 プロンプトを「緑の植えた棚田＝縮小しても読める稲列＋泥畦」に強化 → `node forge/gen_runner.mjs --only tile.ka_paddy2 --force`(ImageGen 124s) → `proc_wa.py --only tile.ka_paddy2`(スライス) → **新規 `forge/gen_paddy_rice_post.py`**(輝度V×0.90で草地より暗く＝背景<主役 / 縞コントラスト×0.85で25%縮小耐性。旧ka2/ka3はスキップ)。バックアップ: `forge/_backup_paddy2_120/`。
- **結果**: 青い四角形→**緑の段々の稲田**(実機tn8で確認)。map-art-reviewer目視 **72→81点(+9)・採用判定**。25%縮小でも棚田が読め高周波std=0.06(閾値0.16)＝ノイズ化なし。tanadaは構造100/100維持(アセット変更はタイル配置不変)。
- **Codexコードレビュー3巡目**: 残コード差分(westDrain/scale閾値6.5/repetition精緻化/gen_paddy_rice_post)を確認。指摘1件(repetitionのcenter frame範囲をハードコード→契約駆動`repetitionCenterMaxFrame:3`化)を修正、他は問題なし(到達0/SCALE INFOのみ/numpy健全)。
- **再生成手順(再現用)**: ↑の4ステップ。プロンプト微修正→gen_runner --force→proc_wa --only→gen_paddy_rice_post。不採用なら `forge/_backup_paddy2_120/tile_ka_paddy2.png` を public/assets へ戻す。
- **棚田の谷の到達点**: checker 100/100・目視 ~90/棚田アセット81・全Codex指摘解消・本体テスト32本/typecheck0。**未コミット**（HANDOFF/checker/tanada.ts/scale.py/assetmap/public png/forge raw 等）。残る伸びしろ: obj.shrine_stairsの彫り込み感(アセット)・旧マップ(satoyama/kiritate)の過大プロップ横展開修正。
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

## 7. 【2026-06-15】設計拡張フェーズ（16エリア化）完了 — 次フェーズ＝R7 実装

> §1〜§6 は実装側（アート/エンジン）の現在地。本節は **`design/` 配下の設計正典を拡張した別トラック**の申し送り。両者は独立（実装済みは R1 の5マップ kiritate/satoyama/takadai/tanada/morioku のみ。R2〜R7 ＋常世/高天原は全て設計のみ）。

### 7.1 何をやったか（ゴール: ユーザー要望「ボリューム拡張」の設計落とし込み）
- ユーザーの「8→16エリア倍増」要望を、議論を経て **「リージョン＋サブマップ深化」**（リージョン乱増を避け容量と物語密度を最優先）に確定し、`design/00-overview/EXPANSION_PLAN_16AREAS.md` を作業正典として M1〜M9 を完遂。**最終地域数＝10**（v1.1 で現世に R7 を追加＝9地域 → v1.2 で常世の戦闘を外洋 R9 へ分離＝**10地域**。詳細は下記 §7.2・§7.3）。
- **現世に新リージョン R7「火群と白磐の地」（homura・Lv28〜38・全28マップ）を追加**（この R7 追加の段階で地域 8→9。**最終は後述 R9 追加で 10**＝§7.2 表が正。本行の「8→9」は確定値ではなく追加ステップの記述）。R4 霊峰↔R5 北雪郷の間に「火の道」で挿入。カルスト「白磐の野」→温泉郷「湯ノ鬼郷」→鍛冶の街「たたら」の三クラスタ＝**砂丘/たたら/温泉/カルストを一地域に統合**してアセット負荷を抑制。
- **常世 R8＝3サブマップ**（浜の上陸地／澪渡りの湿地／常世の大社）に深化＝**完全無戦闘の記憶・儀式区**として明確化（戦闘休憩区・ボス0/敵0）。v1.0 で浜深層に残っていた海戦闘（敵 enm_047-053・門番 boss_12/13）は、常世を囲む現世側の外洋に新設した **R9「綿津見の大海」（wadatsumi・Lv44〜52・17マップ）へ移設**（v1.2／turn-022・地域 9→10・総マップ303不変）。常世を真の無戦闘聖域にするための分離。
- **高天原 R10＝新浮島サブマップ**（八雲の架け橋＝天浮橋／幻想の森／常闇と星空）を追加（"残り1つ"＝八雲の架け橋）。
- 補填2マップ案（砂丘・たたら以外）＝① 温泉郷・地獄谷「湯ノ鬼郷」 ② カルスト高原「白磐の野」＋鍾乳洞。

### 7.2 数量正典の更新（v1.2・全て機械実証済 exit0／`build_data_json.py` `All counts match`）
| 要素 | v1.0 | v1.1 | v1.2（確定） | 備考 |
|---|---|---|---|---|
| 地域 | 8 | 9 | **10** | v1.1 で R7 追加（末尾採番）→ v1.2 で常世の戦闘を外洋 R9「綿津見の大海」へ分離 |
| マップ | 約250 | 303 | **303** | R7=28。v1.2 で旧 R8 常世 36 を R8 聖域 19＋R9 外洋 17 に分割＝総数不変 |
| 敵 | 60 | **72** | enm_061〜072（R7=enm_064〜068） |
| ボス | 16 | **19** | boss_17〜19（R7=boss_17鉄喰い/boss_18火群） |
| 勾玉 | 40 | **48** | mag_041〜048（R7=mag_041/042/043） |
| アイテム | 100 | **115** | itm_101〜115（R7特産=たたら鉄107/石灰華108） |
| NPC | 80 | **88** | npc_081〜088（R7=npc_083 火守 熾） |
| イベント | 150 | **165** | ev_151〜165 |
| 武器 | **80固定** | **80固定** | 8系統×10段階・**新系統なし厳守**。たたらは強化拠点 |

### 7.3 整合性ルール（不変条件・次フェーズも厳守）
- **常世 R8＝完全無戦闘**（ボス0・出現敵`—`）。v1.0 で浜深層に置いていた門番 boss_12 珊瑚王／boss_13 黒海魔と海の敵 enm_047-053 は、現世側の外洋 **R9「綿津見の大海」へ移設**（地域列 R8→R9。warp 保護のため map_id の `r7_` 接頭辞は保持・region は MAP_LIST §R9 見出しが正）。boss_13＝飛空艇の鍵ゲートは R9 の試練として攻略必須のまま維持（除去せず移設）。ボス総数 19・マップ総数 303 は不変（ID 不変・地域再配置）。
- **武器＝8系統×10段階＝80固定**。R7「鍛冶の街たたら」は新武器を増やす場所ではなく既存80の強化（火属性上位段階）を正規化する物語的拠点。
- 常世の勾玉 mag_011＝天磐船の鍵（既存物語ロック）を壊さない。真相・反転構造・語り配分は不変。

### 7.4 更新した設計ファイル（全て `design/` 配下＋ルートの `Story.md`）
- 新規: `design/00-overview/EXPANSION_PLAN_16AREAS.md`（作業正典）／ `design/20-basic/regions/R7_homura.md`（R7基本設計・R1〜R10テンプレ準拠・全28 map_id 掲載）／ **`design/20-basic/regions/R9_wadatsumi.md`（R9基本設計・turn-027 作成・R7_homura と同9節テンプレ・全17 map_id 掲載＝SCOPE「全10地域の基本設計10本」を実体化）**。これで `design/20-basic/regions/` に R1〜R9 の基本設計 10本が全て揃った（10-lists 各表・`MAP_LIST §R9`・`BOSS_LIST §1.7` と整合）。
- v1.1→v1.2化: `SCOPE_AND_SCALE.md`／`REGION_LIST.md`／`MAP_LIST.md`（R9 セクション追加）／`ENEMY_LIST.md`／`BOSS_LIST.md`（boss_12/13＝R9）／`ITEM_LIST.md`／`ACCESSORY_LIST.md`／`WEAPON_LIST.md`／`EVENT_LIST.md`（ev_031/032＝R9）／`NPC_LIST.md`／`Story.md`／`GLOSSARY.md`／`PRODUCT_OVERVIEW.md`／`PROGRESSION_DESIGN.md`／`data/*.json`（10ファイル再生成・`All counts match`）。
- 検証器: `design/10-lists/data/verify_expansion_consistency.py`（EXPANSION §9 内部整合 全7項目を機械実証）。
- 進捗台帳: `design/REVISION_LOG.md §0`（M1〜M9 完了を記録）。
- ⚠️ これらは全て git 未追跡（`?? design/`）＋`Story.md`は` M`。前フェーズ（棚田の谷）の未コミット変更とは別物。

### 7.5 検証の到達点（再現可能）
```bash
cd /Users/yuyafujita/GameDev-v2/games/2D-RPG-Seihin
python3 design/10-lists/data/verify_expansion_consistency.py   # → 全7項目 完全PASS・ハードFAIL0・exit0
```
§9 7項目＝①件数突合 ②導線整合(R7入口r9_hi_no_michi/出口r9_kita_kaido_r9) ③レベルカーブ単調(R4 22-32→R7 28-38→R5 30-40) ④世界観整合(武器80・常世無戦闘・mag_011健在) ⑤相互参照(boss.map/enemy.region/magatama.region＋R7_homura.md 全28map掲載) ⑥容量(303≤310) ⑦常世→R9移設の伝播(events.json 常世R8戦闘0・散文に旧門番boss_12/13残存なし・「浜は戦闘あり」旧framing残存なし) ＝**全PASS**。

### 7.6 次フェーズ（実装）への申し送り
- **本フェーズはあくまで設計拡張**。次フェーズは **1リージョン／1サブマップ単位**で `map-quality` スキル＋`forge`（素材生成）→`checker/run_check.sh <map>`→`map-art-reviewer` エージェントを回し、総合80点以上 / ERROR0 / 重大WARNING3件以下の Definition of Done を満たすまで磨く（tanada実績＝1枚あたり素材14〜25点＋磨き5巡）。
- **最優先＝物語必須の R7「火群と白磐の地」**（カルスト→温泉→鍛冶＝武器強化導線）。新規タイルは火山岩/石灰岩/温泉/製鉄の最大4系統に抑える方針（`public/assets` の `ka_*`/`ka_paddy2` 等を流用可能な箇所は流用）。
- **R9「綿津見の大海」**（外洋・海戦闘・boss_12/13）も実装対象。map_id は `r7_` 接頭辞を保持（warp グラフ保護）だが region は R9＝`MAP_LIST §R9` 見出しが正。基本設計 `R9_wadatsumi.md` は turn-027 作成済（R7_homura.md と同テンプレ・全17 map_id）＝実装の起点として参照可。
- R7 の全マップ定義・敵/ボス/アイテム/勾玉/NPC の正IDは `design/20-basic/regions/R7_homura.md` §3・§9 と各 `10-lists/*.md` を正とする。R9 は当面 `10-lists/*.md`（`MAP_LIST §R9`・`BOSS_LIST §1.7`）を正とする。
