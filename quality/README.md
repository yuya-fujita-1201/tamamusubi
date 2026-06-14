# quality/ — 品質保証システム全体地図

玉結び(TAMAMUSUBI)マップ制作における品質保証の全体像をまとめたインデックス。

> GPT Pro診断（[GPT-adv.md](../GPT-adv.md)）の根本結論:
> **「素材不足ではなく、地形パーツ同士の【接続文法】が弱い」**
> だから品質保証の中心は「描き込み量の増加」ではなく「接続ルールの明文化と自動検査」に置く。

---

## 1. 全体像 — GPT Pro 4本柱とシステム3形式の対応表

### GPT Pro 4本柱

| # | 柱 | 担当ドキュメント/ツール | 一言説明 |
|---|---|---|---|
| 1 | アートの正解基準 | [ART_BIBLE.md](./ART_BIBLE.md) | 色・光・ノイズ・密度の数値基準 |
| 2 | タイル配置の文法 | [TILE_GRAMMAR.md](./TILE_GRAMMAR.md) + [tile_contract.json](../checker/tile_contract.json) | どのタイルが隣接してよいか・段差の作り方 |
| 3 | 自動検査 | [checker/](../checker/) | 12チェックの自動リンタ(map_art_linter.py) |
| 4 | AIレビュー用固定プロンプト | [MAP_REVIEW_PROMPT.md](./MAP_REVIEW_PROMPT.md) | 検査AIに渡す質問セット(再現性のある評価) |

### システム3形式への落とし込み

| 形式 | パス | 役割 |
|---|---|---|
| エージェント | `.claude/agents/map-art-reviewer.md` | 構造マップとスコアを受け取り10軸で採点・修正指示を出す検査AI |
| スキル | `.claude/skills/map-quality/` | 制作→検査→修正の10ステップフローを1コマンドで実行 |
| ツール | `checker/` | 接続文法・構造・画像を機械的に検査。人間・AIを問わず呼び出せる |

---

## 2. 各ドキュメントへのリンクと1行説明

| ドキュメント | 1行説明 |
|---|---|
| [ART_BIBLE.md](./ART_BIBLE.md) | 色・明度・ノイズ・密度の数値基準。「もっと自然に」を排し数字で判断する |
| [TILE_GRAMMAR.md](./TILE_GRAMMAR.md) | タイル接続・高低差・水・橋・神社の配置文法。tile_contract.jsonの人間可読版 |
| [MAP_DEFINITION_OF_DONE.md](./MAP_DEFINITION_OF_DONE.md) | 合格条件の定義。総合スコア80点以上 / ERROR 0件 / 重大WARNING 3件以下 |
| [MAP_REVIEW_CASES.md](./MAP_REVIEW_CASES.md) | 過去の差し戻し事例集。原因・修正箇所・修正前後のスコア差を記録 |
| [MAP_REVIEW_PROMPT.md](./MAP_REVIEW_PROMPT.md) | 検査AIに渡す固定プロンプト。10評価軸+12チェックコードに対応した質問セット |
| [checker/ (README)](../checker/README.md) | 自動リンタのクイックスタート・アーキテクチャ・12チェック表 |

---

## 3. 制作フロー — 10ステップ

> 「生成AI（絵を描く）」と「検査AI（絵を検査する）」は必ず別プロンプト・別ターンで動かす。
> 装飾は最後。地形構造から始める。

```
Step 1  目的を決める
         マップ名・サイズ・検証したい地形文法を1文で書く。
         例: 「棚田の谷(56×46) — 棚田/滝/橋/神社高台の接続文法を固める」

Step 2  高さレイヤを決める (H0/H1/H2)
         H0=低地(川・谷・南入口) / H1=中段(山道・棚田・集落) / H2=高所(神域)。
         高さ境界には必ず段差表現(retaining_wall/earth_bank/stair/waterfall)を置く。

Step 3  主導線を通す
         南入口→山道(kaPath2)→棚田スパイン→神社鳥居→社 を最初に確保。
         導線が通らない限りランドマーク・装飾を置かない。

Step 4  接続文法を適用する
         各地形のルールを tile_contract.json の grammar セクション準拠で適用:
         - 棚田(kaPaddy2): needsRetainingWall=true → 南面に kaIshigaki(frame5)
         - 滝(obj.spillway): requiresAbove=[water_surface/river/earth_bank/retaining_wall]
                             requiresBelow=[river/water_surface/ground_grass/path]
         - 橋(obj.bridge2): requiresBelow=[river] + 両端 obj.bridge_abutment + obj.bridge_shadow + 道接続
         - 神社高台: kaShrineWall(dressed ashlar) + kaShrineGround(神域平場) + obj.shrine_stairs
                     棚田パーツ(kaPaddy2/kaRiver3)の流用禁止 (forbiddenAdjacency)

Step 5  プロップを接地させる
         全プロップは needsGroundContact=true → 地面に浮かせない。
         建物(obj.minka_a/obj.watermill_channel)は needsEntrancePath=true → 入口導線を繋ぐ。

Step 6  構造チェック (チェックコード: HEIGHT/STAIR/WATERFALL/BRIDGE/SHRINE/RIVER/WALK)
         $ checker/run_check.sh tanada
         ERROR 0件になるまでStep 4-5に戻る。

Step 7  装飾を置く
         kaDecor/grassDetail/flowerDetail/kaEdgeOverlay の順。
         歩行域の装飾密度 ≤ 30% (decorDensityWalkableMax=0.30)。
         プレイヤースポーン周囲 ≤ 10% (decorDensityNearPlayerSpawnMax=0.10)。
         128px境界には seam_breaker(kaEdgeOverlay / obj.curve_overlay_2x2 / obj.curve_overlay_3x1) を散布。

Step 8  ノイズチェック (チェックコード: REPEAT/DENSITY/SEAM/NOISE)
         同一タイル連続が repetitionRun=3 を超えないことを確認。
         スクリーンショットがあれば SEAM/NOISE チェックも実行。
         WARNING 3件以下になるまでStep 7に戻る。

Step 9  AIレビュー (MAP_REVIEW_PROMPT.md)
         検査AIに score.json + art_qa_report.md + MAP_REVIEW_PROMPT.md を渡す。
         10軸 × 0-5 で採点させ、80点未満の軸を特定する。
         「どの座標を・どのタイルで・どのフレームに直すか」を具体指示として受け取る。

Step 10 修正ループ
         Step 9の指示に従い tanada.ts を修正 → Step 6に戻る。
         総合スコア80点以上 / ERROR 0件 / 重大WARNING 3件以下 で完了。
```

詳細は map-quality スキル (`.claude/skills/map-quality/`) を参照。

---

## 4. 役割分担表

同一のClaude Code インスタンスでも、プロンプト上は別人格として扱う。
生成AIと検査AIを同じプロンプトに混在させない。

| 役割 | プロンプト上の人格 | 担う作業 |
|---|---|---|
| Claude A — マップ作成者 | 「棚田の谷を組み立てる職人」 | `src/data/maps/tanada.ts` の TypeScript を書く |
| Claude B — アートディレクター・QA | 「接続文法の検査員」 | `checker/run_check.sh` を実行し score.json を解釈。MAP_REVIEW_PROMPT で採点 |
| Claude C — 素材生成者 | 「絵師」 | `forge/` の asset-forge スキル経由で新タイル/プロップ画像を生成 |
| Claude D — 実装・接続ルール係 | 「tile_contract 管理者」 | `checker/tile_contract.json` と `src/field/tileset.ts` の整合を維持 |

---

## 5. 人間がやること / AI・ツールに委ねること

| 判断・作業 | 人間 | AI/ツール |
|---|---|---|
| どんな地形体験をプレイヤーに届けたいか | 決定する | 提案はできるが決定権なし |
| 高さ境界(H0/H1/H2)の配置 | 最初に決める | tile_contract.json の grammar に基づき検査する |
| 新しいタイル/プロップの発注 | 依頼する(asset-forge) | C が画像を生成。D が contract に登録 |
| 接続ルールの違反検出 | 確認・承認 | `map_art_linter.py` が自動検出 (12チェック) |
| ノイズ・シームの計測 | 最終確認 | SEAM/NOISE チェックが閾値(gridSeamDeltaLumaWarn=14.0 / noiseHighFreqStdWarn=0.16)で警告 |
| 修正箇所の特定 | 指示を読んで承認 | B が「座標・タイル名・フレーム番号」で具体指示を出す |
| TypeScript の編集 | 任意で直接編集可 | A が `tanada.ts` を書く |
| 合格判定 | 最終GO/NG を出す | checker がスコア/ERROR/WARNING 件数で自動判定 |
| tile_contract.json の更新 | 新文法の方針を決める | D が1エントリ追記。未登録タイルは `category=other` で検査外になる |
| 「もっと自然に」系の指示 | 出してはいけない | 「座標X・タイルY・フレームZ に直せ」と具体化する |

---

## 検証マップ: 棚田の谷 現在ステータス

- ファイル: `src/data/maps/tanada.ts`
- 最新リンタ結果: **93点 / ERROR 0 / WARNING 4 → 差し戻し**
  - WARNING①②: 西・東 obj.spillway の滝壺/下段接続が弱い
  - WARNING③: 東側に到達できない歩行ポケット 72 セル (`WALK` チェック)
  - WARNING④: 水田/平場の同一フレーム長連続 (`REPEAT` チェック)
- 合格条件: 総合スコア 80 点以上 / ERROR 0 件 / 重大 WARNING 3 件以下
  - ※ 現在は WARNING 4 件のため未達。Step 4・7・8 に戻る。

---

## このシステムが存在する理由

> 「AIは放っておくと『描き込み量』で違和感を解決しようとする（寂しい→花を増やす等）。
> 必要なのは描き込みではなく『構造が読める/高さが読める/歩ける場所が読める/
> 主役と背景の優先順位/タイル境界が目立たない』。」

tile_contract.json が定義する `categories` / `grammar` / `thresholds` は、
この原則を機械可読な形に落としたものである。
人間が目視で発見していた違和感を、コードで再現性よく検出し、
「どこを・どのタイルで・どのフレームに直すか」まで自動で指摘するのがこのシステムの目的。
