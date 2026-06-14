# checker/ — マップアート自動検査ツール群

『AIに“絵を描かせる”だけでなく、“絵を検査させる”』ための工程をコード化したもの。
人間が目視で見つけていた違和感のうち、ルール化できるものを機械で検出する。

> 品質保証システム全体の位置づけは [`../quality/README.md`](../quality/README.md) を参照。
> このフォルダは **3) 自動チェックできる検査項目** を担う「ツール」。

---

## クイックスタート

```bash
# 1コマンド（ダンプ→リント→レポート）
checker/run_check.sh tanada
checker/run_check.sh tanada path/to/screenshot.png   # 画像チェック込み

# npm 経由
npm run check:dump                                   # 全マップ or CHECK_MAP=tanada
npm run check:map -- --map tanada --screenshot s.png
```

出力は `checker/out/<map>/` に:

| ファイル | 内容 |
|---|---|
| `art_qa_report.md` | 総合スコア・ERROR/WARNING/INFO・修正指示 |
| `score.json` | 10軸スコア＋全 finding（機械可読） |
| `error_overlay.png` | ERROR セルを重ねた構造マップ |
| `warning_overlay.png` | WARNING セルを重ねた構造マップ |

※スクショ未指定時は、ground カテゴリを色分けした**スキーマ的構造マップ**を生成する（height/walkable の俯瞰確認に使える）。

---

## アーキテクチャ

マップは TypeScript の `MapBuilder` 関数で動的生成されるため、静的 `map.json` は存在しない。
そこで **TS→JSON ダンプ** を一度噛ませてから、純 Python の検査エンジンが解析する。

```
src/data/maps/*.ts (MapData)
        │  export/dump_map.dump.test.ts  (vitest・checker専用config)
        ▼
checker/_dump/<map>.json ──┐
checker/tile_contract.json ─┼──► lint/map_art_linter.py ──► out/<map>/{report,score,overlay}
(任意) screenshot.png ──────┤        ├─ lint/common.py     共有API(Finding/Ctx/復号/BFS)
(任意) heightmaps/<map>.json┘        ├─ lint/checks/*.py   各検査
                                     └─ lint/report.py     スコア/MD/overlay出力
```

- **ダンプは `npm test` を汚さない**: 本体の `vite.config.ts` は `tests/**` のみ対象。ダンプは `checker/checker.vitest.config.ts` を明示指定したときだけ走る。
- 画像解析は Python(PIL/numpy)。構造解析は TS の型に依存しない JSON 経由。

---

## 検査項目（lint/checks/）

| code | 内容 | 主な深刻度 |
|---|---|---|
| `HEIGHT` | 擁壁前面の真下に落ち影があるか / (heightmap時)高低差境界に段差表現 | ERROR |
| `STAIR` | 階段の上下に踊り場・左右に側壁 | ERROR/WARNING |
| `WATERFALL` | 滝の上に水源・下に滝壺/水路（単体オブジェクト化の禁止） | ERROR/WARNING |
| `BRIDGE` | 橋の下に川・両端に橋台・橋下影・道接続 | ERROR/WARNING |
| `SHRINE` | 鳥居/石段/社の導線・神域への棚田/川タイル流用禁止・鳥居の奥の通行性 | ERROR/WARNING |
| `RIVER` | 川岸の接地影（低い谷として見えるか） | WARNING |
| `REPEAT` | 同一タイルの長い連続（市松/切り貼り感。変種ありは長め許容） | WARNING/INFO |
| `WALK` | 到達不能な歩行域(浮き島)・ランドマーク到達性・通行不可率 | WARNING/INFO |
| `CONTACT` | プロップの接地（水面に浮いていないか）・建物の入口導線 | WARNING |
| `DENSITY` | 歩行域の装飾密度・主役周囲のクリアゾーン | WARNING/INFO |
| `SEAM` | 128pxグリッド境界の明度差（画像・要スクショ） | WARNING/INFO |
| `NOISE` | 歩行域の高周波ノイズ・25%縮小の構造保持（画像・要スクショ） | WARNING/INFO |

スコアは [`tile_contract.json`](./tile_contract.json) の `scoreAxes`（10軸 各0-5）を 100点換算。
合格条件は `thresholds.doneScoreMin / doneMaxErrors / doneMaxMajorWarnings`。

---

## Tile Contract（[tile_contract.json](./tile_contract.json)）

タイル/プロップに **意味**（カテゴリ・高さ・接続条件・通行可否・必須隣接）を与える単一ソース。
検査ロジックは見た目ではなくこの契約に従う。スキーマは [`tile_contract.schema.json`](./tile_contract.schema.json)。

新しいタイル/プロップを `src/field/tileset.ts` に足したら、ここにも 1 エントリ追記すること
（未登録は category=`other` として接続検査の対象外になる）。

---

## 高さマップ（任意・[heightmaps/](./heightmaps/)）

`checker/heightmaps/<map>.json` に H0/H1/H2 の2次元グリッドを置くと、
`HEIGHT` チェックが「全ての高低差境界に段差表現があるか」を宣言的に検査する。
無い場合は段差規律（影）のみを検査し、INFO で宣言を促す。形式は heightmaps/README.md を参照。

---

## CI/拡張のヒント

- 別マップを足したら `MAP_BUILDERS`（src/data/maps/index.ts）に登録 → そのまま `--map <id>` で検査可能。
- 新しい接続文法を足すときは「contract に意味を足す → checks に検査を足す → quality/TILE_GRAMMAR に明文化」の順。
- `--only HEIGHT,WATERFALL` で特定チェックだけ実行できる。
