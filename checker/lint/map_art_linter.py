#!/usr/bin/env python3
"""map_art_linter — 2DアクションRPG タイルマップのアート品質リンター。

『AIに“絵を描かせる”だけでなく“絵を検査させる”』ための自動検査エンジン。
人間が目視で見つけていた違和感のうち、ルール化できるものをコードで検出する。

入力:
  - checker/_dump/<map>.json     ← TS の MapData をダンプしたもの（npm の dump で生成）
  - checker/tile_contract.json   ← タイル/プロップの意味（カテゴリ・接続条件）
  - (任意) screenshot.png        ← 画像系チェック（128px境界・ノイズ）用
  - (任意) checker/heightmaps/<map>.json ← 宣言的な H0/H1/H2 グリッド

出力（checker/out/<map>/）:
  - art_qa_report.md / score.json / error_overlay.png / warning_overlay.png

使い方:
  python3 checker/lint/map_art_linter.py --map tanada
  python3 checker/lint/map_art_linter.py --map tanada --screenshot shot.png
  （ダンプが無ければ自動で vitest を呼ぶ。--no-dump で抑止）
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import common  # noqa: E402
import report  # noqa: E402
from checks import ALL_CHECKS  # noqa: E402


def ensure_dump(map_id, root, allow_build):
    dump_path = os.path.join(root, "checker", "_dump", f"{map_id}.json")
    if os.path.exists(dump_path):
        return dump_path
    if not allow_build:
        sys.exit(f"[error] ダンプが見つかりません: {dump_path}\n  先に: CHECK_MAP={map_id} npx vitest run --config checker/checker.vitest.config.ts")
    print(f"[dump] {map_id} のダンプが無いので生成します…")
    env = dict(os.environ, CHECK_MAP=map_id)
    r = subprocess.run(
        ["npx", "vitest", "run", "--config", "checker/checker.vitest.config.ts"],
        cwd=root, env=env, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(dump_path):
        sys.exit(f"[error] ダンプ生成に失敗:\n{r.stdout}\n{r.stderr}")
    return dump_path


def load_height(root, map_id):
    p = os.path.join(root, "checker", "heightmaps", f"{map_id}.json")
    if not os.path.exists(p):
        return None
    data = common.load_json(p)
    # 形式1: {"w","h","levels":[[...],[...]]}  形式2: {"grid":[...flat...],"w","h"}
    if "levels" in data:
        return data["levels"]
    if "grid" in data and "w" in data:
        w = data["w"]
        g = data["grid"]
        return [g[y * w:(y + 1) * w] for y in range(len(g) // w)]
    return None


def main():
    ap = argparse.ArgumentParser(description="map_art_linter")
    ap.add_argument("--map", default="tanada", help="マップID（既定 tanada）")
    ap.add_argument("--dump", help="ダンプJSONを直接指定（--map より優先）")
    ap.add_argument("--contract", help="tile_contract.json パス")
    ap.add_argument("--screenshot", help="スクリーンショットPNG（画像系チェック）")
    ap.add_argument("--heightmap", help="高さマップJSON（宣言的 H0/H1/H2）")
    ap.add_argument("--out", help="出力ディレクトリ")
    ap.add_argument("--px-per-tile", type=float, help="スクショの1タイルあたりpx（未指定=画像幅/マップ幅）")
    ap.add_argument("--no-dump", action="store_true", help="ダンプ自動生成を抑止")
    ap.add_argument("--only", help="指定チェックのみ（カンマ区切り code）")
    args = ap.parse_args()

    root = common.project_root()
    map_id = args.map

    dump_path = args.dump or ensure_dump(map_id, root, not args.no_dump)
    dump = common.load_json(dump_path)
    map_id = dump["id"]

    contract_path = args.contract or os.path.join(root, "checker", "tile_contract.json")
    contract = common.load_json(contract_path)

    image = None
    if args.screenshot:
        image = common.load_image(args.screenshot)
        if image is None:
            print("[warn] スクリーンショットを読めません（PIL/numpy未導入?）。画像系チェックはスキップ。")

    if args.heightmap:
        height = _load_height_file(args.heightmap)
    else:
        height = load_height(root, map_id)

    ctx = common.Ctx(dump, contract, image=image, px_per_tile=args.px_per_tile, height=height)

    only = set(args.only.split(",")) if args.only else None
    findings = []
    for mod in ALL_CHECKS:
        code = getattr(mod, "CODE", mod.__name__)
        if only and code not in only:
            continue
        try:
            res = mod.run(ctx) or []
            for f in res:
                if not f.check:
                    f.check = code
            findings.extend(res)
        except Exception:
            # 検査不能を WARNING で見逃すと「合格」になり得るので ERROR 扱い（必ず不合格にする）。
            findings.append(common.Finding(
                common.ERROR, "CHECK_CRASH", f"checkが例外で実行不能: {code}",
                detail=traceback.format_exc().splitlines()[-1], check=code))

    sc = report.score(findings, ctx.thresholds)
    out_dir = args.out or os.path.join(root, "checker", "out", map_id)
    md_path, score_path = report.write_report(ctx, findings, sc, out_dir)
    overlays = report.write_overlays(ctx, findings, out_dir)

    # コンソール要約
    print()
    print(f"━━ map_art_linter: {ctx.name} ({map_id}) ━━")
    print(f"  総合 {sc['total']}/100   ERROR {sc['errors']}  WARNING {sc['warnings']}  INFO {sc['infos']}   "
          + ("✅ 合格" if sc["passed"] else "❌ 差し戻し"))
    for f in sorted([x for x in findings if x.severity == common.ERROR], key=lambda x: x.code)[:10]:
        print(f"  [E] {f.code}: {f.title}")
    print(f"  → {md_path}")
    for o in overlays:
        print(f"  → {o}")
    # 合格条件(score>=doneScoreMin / ERROR 0 / 重大WARNING<=上限)を満たさなければ非ゼロ終了（CIゲート）。
    sys.exit(0 if sc["passed"] else 1)


def _load_height_file(path):
    if not path or not os.path.exists(path):
        return None
    data = common.load_json(path)
    if "levels" in data:
        return data["levels"]
    if "grid" in data and "w" in data:
        w = data["w"]
        g = data["grid"]
        return [g[y * w:(y + 1) * w] for y in range(len(g) // w)]
    return None


if __name__ == "__main__":
    main()
