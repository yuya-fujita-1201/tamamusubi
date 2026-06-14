---
name: map-quality
description: 玉結び(TAMAMUSUBI)のマップを「品質を担保しながら」制作・改善するための運用フロー。地形構造→導線→高低差→建物→装飾の順で作り、checker(map_art_linter)で自己検査し、map-art-reviewerで採点し、Definition of Doneを満たすまで修正ループを回す。トリガー: 「マップを作って/改善して」「棚田の谷を直して」「新しいマップを追加して」「品質基準で作って」「装飾を増やして(→構造から見直す合図)」等。マップアートの生成・修正・レビュー時は常にこのスキルに従う。
---

# map-quality — マップ品質保証の運用フロー

「綺麗なマップを作って」ではなく、**この文法に従って作り、このチェックで自己評価し、違反を直し、
合格条件を満たすまで完了扱いにしない**ためのスキル。AIに美的センスを期待するのではなく、
美的センスを構造化して失敗パターンを潰す。

## 基準の在処（4本柱）

| 柱 | 実体 |
|---|---|
| ① アートの正解基準 | [quality/ART_BIBLE.md](../../../quality/ART_BIBLE.md) |
| ② タイル配置の文法 | [quality/TILE_GRAMMAR.md](../../../quality/TILE_GRAMMAR.md) ＋ [checker/tile_contract.json](../../../checker/tile_contract.json) |
| ③ 自動検査 | [checker/](../../../checker/README.md)（`map_art_linter.py`） |
| ④ 固定レビュープロンプト | [quality/MAP_REVIEW_PROMPT.md](../../../quality/MAP_REVIEW_PROMPT.md) ／ エージェント `map-art-reviewer` |

完成条件は [quality/MAP_DEFINITION_OF_DONE.md](../../../quality/MAP_DEFINITION_OF_DONE.md)。

## 鉄の原則

- **生成AIと検査AIを分ける**。マップを作る会話の中で自分の絵を自分で褒めない。検査は `map-art-reviewer` エージェント（別人格・別起動）に出す。
- **制作順序を必ず守る**: 地形構造 → 導線 → 高低差 → 建物 → 装飾。**最初に装飾を置かない**。
- 違和感を「描き込み量」で解決しない（寂しい→花を増やす、をやらない）。構造・高さ・導線・優先順位で解決する。
- 修正指示は常に具体（どの場所を・どの素材で・どの接続ルールで）。

## 10ステップ・パイプライン

1. **目的を決める**（`map_goal.md`）。例: 神社前の導入 / 戦闘エリア / 村 / 川沿い / 洞窟入口。プレイ体験を1文で。
2. **高さマップ**（H0/H1/H2）を先に決める。新規マップは [checker/heightmaps/](../../../checker/heightmaps/README.md) に宣言（装飾の前に高さ）。
3. **導線**を決める。プレイヤーがどう歩くか。warp/入口→主要動線→各エリア。
4. **地形文法を当てる**。[TILE_GRAMMAR](../../../quality/TILE_GRAMMAR.md) の棚田/神社/川/橋/森/道の必須セットを置く。
5. **タイル配置**。まず**装飾なしで**地形が成立するか。`src/data/maps/<map>.ts` を `MapBuilder` で組む。
6. **構造チェック**（装飾前）: `checker/run_check.sh <map>` で高さ・通行・接続(HEIGHT/STAIR/WATERFALL/BRIDGE/SHRINE/WALK)の ERROR を 0 にする。
7. **装飾追加**。草・花・岩・木・影を、段差/水辺/森縁に寄せて控えめに。歩行域と主役周囲はクリアに。
8. **ノイズチェック**: スクショを撮り `checker/run_check.sh <map> shot.png`。25%縮小・グレースケールでも地形が読めるか。SEAM/NOISE/DENSITY を確認。
9. **AIレビュー**: `map-art-reviewer` エージェントに投げ、[MAP_REVIEW_PROMPT](../../../quality/MAP_REVIEW_PROMPT.md) で100点採点させる。
10. **修正ループ**: 指摘を分類→修正→再レビュー。**Definition of Done を満たすまで完了扱いにしない**。

## マップごとの納品物（固定）

`map_goal.md` / 高さマップ(`checker/heightmaps/<map>.json`) / walkable_overlay(`checker/out/<map>/*_overlay.png`) /
`src/data/maps/<map>.ts` / `screenshot.png` / `screenshot_25percent.png` / `grayscale_check.png` /
`checker/out/<map>/art_qa_report.md` / `known_issues.md` / `fix_plan.md`。
特に **高さマップ・walkable_overlay・25%縮小・art_qa_report の4点**があれば、人手が見なくてもAIが自己検査できる。

## 役割分担（同一Claudeでもプロンプト上は別人格として扱う）

- **作成担当**: マップを組む（このスキル）。
- **アートディレクター/QA**: `map-art-reviewer` エージェント（検査専任）。
- **素材生成担当**: `asset-forge` スキル（新規タイル/プロップの生成）。新タイルを足したら `checker/tile_contract.json` にも意味を1エントリ追記する。
- **実装・接続ルール担当**: `MapBuilder` の文法ヘルパ（wall/paddy/spillway/bridge等）を整備する。

## 完了の言い方（重要）

「綺麗にできました」ではなく、**「art_qa_report 総合◯点 / ERROR 0 / 重大WARNING ◯件、DoDの各項目 [✓/✗]、未解決は known_issues.md」**と、
検証した事実で報告する。未確認を完了と言わない。
