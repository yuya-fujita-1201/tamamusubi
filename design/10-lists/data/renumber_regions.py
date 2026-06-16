#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""renumber_regions.py — リージョンID(大文字 R{n})の決定的リナンバリング（M3 step1）

正典: design/00-overview/REGION_RENUMBER_MAP.md
  旧→新 permutation（R1〜R5 は不変・R6 は番号不変）:
    R6→R6（kurosugi・番号据置／slug・名称変更は本スクリプトの対象外＝別ステップB）
    R7→R8（tokoyo 常世）
    R8→R10（takamagahara 高天原）
    R9→R7（homura ホムラ）
    R10→R9（wadatsumi 和田津見）

設計（安全性の核）:
  - 置換は「大文字 R に続く 6..10 のリージョントークン」のみを対象とする。
    正規表現 (?<![A-Za-z0-9_])R(10|[6-9])(?![0-9]) で
      * 小文字 map_id 接頭辞 r{n}_（例 r9_funki_ban）は絶対に触れない（case 区別）。
      * R10 を R1+0 に誤分解しない（"10" を先に評価＋桁数ガード）。
      * R9_homura（番号付ファイル名/見出し）も '_' の手前で number だけ置換する。
  - permutation は重複を含むが、re.sub は各マッチを1回だけ置換し置換後テキストを
    再走査しない → 一時トークン二相置換なしで単一パスで安全に同時適用できる。
  - 冪等性: 適用後に sentinel(.region_renumber_applied)を書く。再実行は --force 無しで abort。
    （新番号も 6..10 に入るため、ガード無しの再実行は二重permutationになるため必須。）

対象外（除外）:
  - design/REVISION_LOG.md            … 変更履歴ログ＝当時の記録として保全（REGION_RENUMBER_MAP §4.4）
  - design/00-overview/REGION_RENUMBER_MAP.md … 旧↔新を意図的に併記する仕様書本体
  - *.json                            … build_data_json.py で md から再生成（直接編集しない）
  - *.py                              … verify は旧番号にセマンティック結合（M4で別途改修）
  - R6 の slug(kurosugi→kurosu)/表示名(黒杉の幽谷→黒洲) … map_id r6_kurosugi_* 衝突回避のため別ステップB

使い方:
  python3 design/10-lists/data/renumber_regions.py            # dry-run（既定・変更しない）
  python3 design/10-lists/data/renumber_regions.py --apply    # 適用
  python3 design/10-lists/data/renumber_regions.py --apply --force  # sentinelを無視して再適用（危険）
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# ワークスペース直下（.../2D-RPG-Seihin）
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
DESIGN = os.path.join(ROOT, "design")
SENTINEL = os.path.join(HERE, ".region_renumber_applied")

# 旧→新 permutation（文字列キー）
PERM = {"6": "6", "7": "8", "8": "10", "9": "7", "10": "9"}

# 大文字 R リージョントークン（map_id 小文字 r{n}_ は case で除外）
TOKEN_RE = re.compile(r"(?<![A-Za-z0-9_])R(10|[6-9])(?![0-9])")

# 除外（現役だが再採番対象外）
EXCLUDE_REL = {
    "REVISION_LOG.md",
    os.path.join("00-overview", "REGION_RENUMBER_MAP.md"),
    os.path.join("10-lists", "data", "README.md"),  # data層の説明（番号思想の記述は手で同期）
}

# region 基本設計ファイルのリネーム（旧名→新名）。slug は不変、先頭 R{n}_ のみ更新。
REGION_FILE_RENAMES = [
    ("20-basic/regions/R9_homura.md",        "20-basic/regions/R7_homura.md"),
    ("20-basic/regions/R7_tokoyo.md",        "20-basic/regions/R8_tokoyo.md"),
    ("20-basic/regions/R8_takamagahara.md",  "20-basic/regions/R10_takamagahara.md"),
    ("20-basic/regions/R10_wadatsumi.md",    "20-basic/regions/R9_wadatsumi.md"),
]


def repl(m):
    return "R" + PERM[m.group(1)]


def iter_target_md():
    """対象 md（design配下 + ルート Story.md/HANDOFF_CURRENT.md）を yield。"""
    for dirpath, _dirs, files in os.walk(DESIGN):
        for fn in files:
            if not fn.endswith(".md"):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, DESIGN)
            if rel in EXCLUDE_REL:
                continue
            yield full
    for extra in ("Story.md", "HANDOFF_CURRENT.md"):
        p = os.path.join(ROOT, extra)
        if os.path.isfile(p):
            yield p


def main():
    apply = "--apply" in sys.argv
    force = "--force" in sys.argv

    if apply and os.path.exists(SENTINEL) and not force:
        print(f"ABORT: sentinel exists ({SENTINEL}). 既に適用済みの可能性。--force で上書き可。")
        sys.exit(2)

    total_files = 0
    total_repl = 0
    changed_files = []
    for path in sorted(iter_target_md()):
        with open(path, encoding="utf-8") as f:
            src = f.read()
        new, n = TOKEN_RE.subn(repl, src)
        if n:
            total_files += 1
            total_repl += n
            rel = os.path.relpath(path, ROOT)
            changed_files.append((rel, n))
            if apply and new != src:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)

    # ファイルリネーム（番号付き region 基本設計）
    rename_plan = []
    for old_rel, new_rel in REGION_FILE_RENAMES:
        old_p = os.path.join(DESIGN, old_rel)
        new_p = os.path.join(DESIGN, new_rel)
        if os.path.isfile(old_p):
            rename_plan.append((old_rel, new_rel, "rename"))
            if apply:
                if os.path.exists(new_p):
                    print(f"  !! rename collision: {new_rel} 既存。スキップ。")
                    continue
                os.rename(old_p, new_p)
        elif os.path.isfile(new_p):
            rename_plan.append((old_rel, new_rel, "already-renamed"))
        else:
            rename_plan.append((old_rel, new_rel, "MISSING-both"))

    mode = "APPLY" if apply else "DRY-RUN"
    print("=" * 70)
    print(f"renumber_regions [{mode}] — permutation R7→8, R8→10, R9→7, R10→9 (R6不変)")
    print("=" * 70)
    print(f"対象md: {total_files} files / 置換トークン: {total_repl}")
    for rel, n in changed_files:
        print(f"  [{n:>3}] {rel}")
    print("-" * 70)
    print("region 基本設計ファイル rename:")
    for old_rel, new_rel, st in rename_plan:
        print(f"  [{st}] {old_rel}  ->  {new_rel}")
    print("=" * 70)

    if apply:
        with open(SENTINEL, "w", encoding="utf-8") as f:
            f.write("region renumber applied (R7->8,R8->10,R9->7,R10->9). "
                    "REGION_RENUMBER_MAP.md §1.1 / build_data_json.py で再生成すること。\n")
        print(f"APPLIED. sentinel: {os.path.relpath(SENTINEL, ROOT)}")
        print("次: cd design/10-lists/data && python3 build_data_json.py で JSON 再生成。")
    else:
        print("DRY-RUN のみ。適用は --apply。")


if __name__ == "__main__":
    main()
