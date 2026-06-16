# 10-lists/data — 機械可読ミラー（自動生成）

このディレクトリの `*.json` は、`design/10-lists/*.md`（一覧図）の **機械可読ミラー**です。
将来ゲーム本体や `checker/` から読み込むことを想定しています。

## 重要：正典は Markdown、JSON は生成物

- **正典（source of truth）= `../*.md`**（人間が編集する一覧表）。
- **`*.json` は手で編集しない。** `build_data_json.py` が Markdown 表を解析して生成する派生物です。
- 一覧を更新したら、必ず再生成して JSON を追従させてください。

## 再生成コマンド

```bash
cd design/10-lists/data
python3 build_data_json.py
```

- 標準ライブラリのみで動作（追加依存なし）。
- 出力は**決定的**（タイムスタンプ等の非決定要素を含めない）ため、内容に変化が無ければ git 差分も出ません。
- 各一覧の件数が目標値（v1.2: regions 10 / maps 303 / weapons 80 / items 115 / enemies 72 / bosses 19 / 勾玉 48 + 衣 11 / npcs 88 / skills 24 / events 165）と一致するか自動検証し、不一致なら exit 1 で停止します。

## 生成されるファイル

| ファイル | 元一覧 | ルートキー | 件数 | 備考 |
|---|---|---|---|---|
| `regions.json` | REGION_LIST.md | `regions` | 10 | |
| `maps.json` | MAP_LIST.md | `maps` | 303 | `region`（R1〜R10/LINK）をセクション見出しから注入 |
| `weapons.json` | WEAPON_LIST.md | `stages` | 80 | `series`/`grade` を ID から派生（8系統×10段階） |
| `items.json` | ITEM_LIST.md | `items` | 115 | |
| `enemies.json` | ENEMY_LIST.md | `enemies` | 72 | |
| `bosses.json` | BOSS_LIST.md | `bosses` | 19 | |
| `accessories.json` | ACCESSORY_LIST.md | `magatama` / `koromo` | 48 + 11 | 勾玉と衣を 2 配列で保持 |
| `npcs.json` | NPC_LIST.md | `npcs` | 88 | |
| `skills.json` | SKILL_LIST.md | `skills` | 24 | |
| `events.json` | EVENT_LIST.md | `events` | 165 | |
| `characters.json` | CHARACTER_LIST.md | `characters` | 7 | **soft 検証**（中核キャラ。NPC/敵/ボスとは別カウント。件数不一致でも exit 1 で停止せず警告のみ） |

## JSON 共通形

```jsonc
{
  "schemaVersion": 1,
  "source": "design/10-lists/<元の.md>",
  "generatedBy": "design/10-lists/data/build_data_json.py",
  "count": <件数>,
  "<ルートキー>": [ { "id": "...", ... }, ... ]
}
```

- キーは snake_case 英語（`id`/`name`/`region`/`status` 等）。値は Markdown のセル文字列を
  クリーニング（`[text](url)`→`text`、`**bold**`→`bold`、バッククォート除去）したもの。
- `weapons.json` は `seriesCount`、`accessories.json` は `count.{magatama,koromo}` を併記。

## 解析の仕組み（保守時の注意）

`build_data_json.py` は各一覧の **データ表を ID 正規表現＋列数一致で抽出**します。
そのため一覧 Markdown 側で以下を崩すと取りこぼし得ます（崩す場合は生成器側も更新すること）：

- データ行の第 1 セルが ID（例 `itm_001`／`W1_haraitou_g1`／`r3_xxx`）であること。
- データ表の列数が生成器の `keys` 定義と一致すること（同一ファイル内の別表は列数で識別・除外）。
- MAP_LIST の地域は `### R{n} …` / `### 連絡…` 見出しで区切られていること。

詳細な列→キー対応は `build_data_json.py` の各 `parse_rows(...)` 呼び出しを参照。
