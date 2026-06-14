#!/usr/bin/env bash
# map_art_linter ワンショット実行: ダンプ生成 → リント → レポート。
#
#   checker/run_check.sh tanada                      # 構造チェックのみ
#   checker/run_check.sh tanada path/to/shot.png     # 画像チェック込み
#   checker/run_check.sh all                         # 全マップ（構造のみ）
#
set -euo pipefail
cd "$(dirname "$0")/.."   # → プロジェクトルート

MAP="${1:-tanada}"
SHOT="${2:-}"

echo "[1/2] ダンプ生成: CHECK_MAP=$MAP"
CHECK_MAP="$MAP" npx vitest run --config checker/checker.vitest.config.ts >/dev/null

run_one() {
  local m="$1"
  if [[ -n "$SHOT" ]]; then
    python3 checker/lint/map_art_linter.py --map "$m" --screenshot "$SHOT" --no-dump
  else
    python3 checker/lint/map_art_linter.py --map "$m" --no-dump
  fi
}

echo "[2/2] リント"
if [[ "$MAP" == "all" ]]; then
  for f in checker/_dump/*.json; do
    m="$(basename "$f" .json)"
    run_one "$m" || true
  done
else
  run_one "$MAP"
fi
