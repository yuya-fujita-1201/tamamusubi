# LANDSCAPE_SETUP.md — 玉結び「美麗風景」パイプライン設計

> 作成: 2026-06-14 ／ 目的: キーアート(`ZZ-HCP-logs/016/shot01.png`)級の、**滑らかで美しい風景**をゲーム内マップで表現するための恒久セットアップ。
> 高台(takadai)は「序の口」。最終目標は **棚田の谷・山道・川・赤鳥居・水車・御神木・霞む山々** を暖かい絵画調で描くこと。

## 0. ゴール画像（キーアート分析）
`shot01.png` の構成要素＝今後の地形/プロップの目録:
- **棚田(たなだ)**: 水を湛えた段々の田。空を映す水鏡。畦(あぜ)の緑。谷をカスケード。【署名要素】
- **山道(やまみち)**: 石/土の蛇行路。苔・小石の縁。階段状の高低差。
- **川(かわ)**: 谷を流れる水。浅瀬・飛沫。
- **プロップ**: 赤鳥居、茅葺き家、水車、御神木(巨木)、桜、石灯籠、柵。
- **大気**: 霞む遠山、ゴールデンアワーの暖光、木漏れ日、奥行き。

## 1. 現状 → ギャップ
- 現状: 128px チャンキータイル、ハードなグリッド、平面的、大気感なし。手動配置で角がカクつく(高台)。
- ギャップ: ①絵画調の柔らかさ ②滑らかな辺/角 ③奥行き(遠景) ④水鏡 ⑤霞・光。

## 2. エンジンの活用可能機能（調査済・2026-06-14）
| 機能 | 実体 | 風景での用途 |
|---|---|---|
| レイヤー | `bgs → ground → deco → decals → props(Yソート) → overhead → 暗闇` (`tilemap.ts`) | 遠景/地面/装飾/前景の重ね |
| **オートタイル** | `TRANS_MAPS` = center/N/S/W/E/NW/NE/SW/SE の16タイル (`tileset.ts`/`paintAuto`) | **辺・角を自動接続＝90°カクつきの本質的解決** |
| 背景 | `data.bgs` + `drawBackground` | 遠山・空のパララックス1枚絵 |
| blend | `DrawOpts.blend`(globalCompositeOperation)/alpha/tint (`renderer.ts`) | 色グレード・霞・光・水鏡のオーバーレイ |
| decals/props | `scatterDecals` / `prop`(footprint・影・Yソート) | 高密度の描き込み |
| Agent Forge | `forge/gen_runner.mjs`→asset-forge CLI→Codex ImageGen→`proc_wa.py`(128px) | 絵画調タイル/プロップ生成 |

## 3. セットアップ 4本柱

### 柱A — 絵画調オートタイル・ライブラリ（Agent Forge 生成）
各地形を **16タイルのオートタイルセット**（row1=center×4 / row2=N,S,W,E / row3=NW,NE,SW,SE / row4=accent）で生成し、`paintAuto` に載せる。
→ オートタイラーが辺/角を自動配置するので **90°のカクつきが原理的に消える**（＝高台の角問題の正攻法）。
- 生成対象: 草地(畦草)・棚田の畦・石/土の山道・石垣崖・川/水鏡・浅瀬・苔石・桜林・茅葺き屋根。
- プロンプト指針: キーアート＋p01-p04参照。暖色・苔・空の水鏡・柔らかい光。`common_avoid` 継承。STRICT 4x4 / 各128px / tileable を明記（既存 `assets_plan.json` の `world_coastline_16` 形式に倣う）。
- 既存の高台アセット(cliff3/ishigaki2)はこの体系に吸収（崖も autotile 化）。

### 柱B — 棚田システム（署名要素）
段々の水田を **「段ごとに ①畦(低い土手 autotile) ②水鏡(反射 water) ③稲(deco/prop)」** で構成。
- 高低差＝既存の石垣(cliff3)を**低く(1〜2段)**して流用、上段ほど明るく下へカスケード。
- **水鏡**＝空/雲色を反射する半透明 water レイヤー＋さざ波アニメ（`animFps`）。畦で縁取り。
- マップは俯瞰(FIELD_ZOOM)で段々が見えるレイアウト。

### 柱C — 大気・奥行き（renderer の blend を活用）
- **色グレード**: 暖かいゴールデンアワーのフルスクリーン・オーバーレイ（multiply/soft-light 風）。
- **霞/もや**: 遠景へ向かう白〜青の縦グラデを bgs か overlay で。
- **光**: 木漏れ日/god ray（`blend:"lighter"` の放射グラデ、控えめ）。
- **遠景**: `bgs` に絵画調の遠山＋空（Agent Forge 1枚絵）を緩いパララックスで。
- ビネット＋わずかな bloom。

### 柱D — 装飾密度（グリッド分断）
草tuft/花クラスタ/小石/落ち葉/苔/水草/稲株を decals＋props で**高密度散布**。キーアートの描き込み感を再現し、タイル境界を視覚的に消す。

## 4. ロードマップ（段階）— 進捗 2026-06-14
- **Phase L0（基盤）**: 高台＝立体感(連続グラデ)＋苔コーピング(生垣)＋左右側面パーツまで改善。角の完全オートタイル化は L 系の autotile 方式で今後吸収。色グレードは L3 で実装。
- ✅ **Phase L1（新規マップ骨格）**: 「棚田の谷」(`tanada`) を既存アセットで構築 — 山道(path)＋川＋棚田カスケード＋鳥居/水車/御神木/集落/森。俯瞰構図を確定（ユーザー承認）。
- ✅ **Phase L2（絵画調タイル）**: Agent Forge で **5地形**(ka_grass/ka_paddy/ka_path/ka_river/ka_forest)を生成→proc_wa→tileset/オートタイル→tanada に統合（柱A/B）。
- ✅ **Phase L3（大気＋仕上げ）**: `renderer.atmosphere()`＝暖色グレード＋もや＋ビネット（柱C）。装飾密度UP（草株/木/花＝柱D）。
- ✅ **継ぎ目解消**: `gen_ka_post.py` — 一様面=deseam(単一シームレス)／森=flatten(輝度正規化)+deepen／棚田=src=1の緩めシームレス(映り込み・稲列を残す)。
- **今後**: プロップ絵画調化／遠景パララックス(bgs)／大気バリエーション／棚田段差に cliff3。

### 実装ファイル（再現の起点）
- 生成定義: `forge/assets_plan.json`（tile.ka_*）／処理: `forge/proc_wa.py`(PROC)→`forge/gen_ka_post.py`（継ぎ目）。
- 描画: `src/gfx/renderer.ts#atmosphere` / `src/field/tilemap.ts MapData.atmosphere`。
- タイル: `src/field/tileset.ts`(kaGrass47/kaPaddy48/kaPath49/kaRiver50/kaForest51 ＋ TRANS_MAPS)。
- マップ: `src/data/maps/tanada.ts`（+ `index.ts` 登録）。
- 再生成順: `node forge/gen_runner.mjs --only <id...>` → `python3 forge/proc_wa.py --only <id...>` → `python3 forge/gen_ka_post.py`。

## 5. 品質ループ
生成 → PNG目視QA(Read) → 配置 → 実機スクショ(dev-browser) → キーアートと比較 → 反復。各段で tsc/vitest/build 緑＋到達性BFS。

## 6. 最初の一歩（推奨）
1. **新規マップ `tanada`（棚田の谷）の骨格**を既存アセット(path/water/cliff/grass)で構築＋遠景bgsを置き、俯瞰で「山道→川→段々の棚田」の構図を確定（生成なしで即・可視化）。
2. 並行して Agent Forge で**棚田の畦＋水鏡**のオートタイル1セットを生成し、パイプライン疎通を確認。
3. 良ければ柱A各地形を順次生成して差し替え（L2）、最後に大気(L3)。
