#!/usr/bin/env python3
"""
fix_detail_map_links.py  —  critic flag5（30-detail の `../maps/{slug}/` 相対リンク破損）消化（決定的・冪等）

背景:
  rn が map ディレクトリへ `r0X_` 接頭辞を付与（satoyama → r01_satoyama … takamagahara → r10_takamagahara、
  ただし wadatsumi は `r09wadatsumi`＝アンダースコア欠落の実ディレクトリ名）してリネームしたが、
  30-detail/{enemies,characters,events,weapons}/ の本文リンク `../maps/{slug}/...` が旧 slug のまま残り、
  リンク切れになっていた（critic flag5・本ターン scan で 225 occurrence）。

方式:
  - 実在 map ディレクトリ名から slug→dir 辞書を構築（r\\d+_?(.+) の接尾辞が slug）。
    例: r01_satoyama→satoyama / r09wadatsumi→wadatsumi（欠落 quirk をそのまま採用＝実dirに一致）。
  - 30-detail/ 配下（maps/ 自身を除く）の .md 本文で `../maps/{slug}/` → `../maps/{dir}/` を literal 置換。
  - 既に `r0X_` 接頭辞付き（`../maps/r07_homura/`）は bare slug にマッチせず＝再実行 identity（冪等）。

usage:
  python3 fix_detail_map_links.py            # dry-run（ファイル別件数）
  python3 fix_detail_map_links.py --apply    # 適用
"""
import os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.abspath(os.path.join(HERE, "..", ".."))
DETAIL = os.path.join(DESIGN, "30-detail")
MAPS = os.path.join(DETAIL, "maps")


def build_slug2dir():
    s2d = {}
    for d in sorted(os.listdir(MAPS)):
        if not os.path.isdir(os.path.join(MAPS, d)):
            continue
        m = re.match(r"r\d+_?(.+)$", d)   # r01_satoyama / r09wadatsumi 両対応
        if m:
            s2d[m.group(1)] = d
    return s2d


def target_files():
    files = []
    for fp in glob.glob(os.path.join(DETAIL, "**", "*.md"), recursive=True):
        # maps/ 自身（マップ間相対リンク）は対象外
        if os.path.commonpath([fp, MAPS]) == MAPS:
            continue
        files.append(fp)
    return sorted(files)


def main():
    apply = "--apply" in sys.argv
    s2d = build_slug2dir()
    # bare slug == dir（接頭辞なし R1 satoyama 等は dir も同名なら置換不要）は除外
    repl = {slug: d for slug, d in s2d.items() if slug != d}
    print(f"=== fix_detail_map_links.py ({'APPLY' if apply else 'DRY-RUN'}) ===")
    print(f"slug→dir マッピング: {repl}\n")
    total = 0
    nfiles = 0
    for fp in target_files():
        txt = open(fp, encoding="utf-8").read()
        new = txt
        fcount = 0
        for slug, d in repl.items():
            pat = f"../maps/{slug}/"
            sub = f"../maps/{d}/"
            c = new.count(pat)
            if c:
                new = new.replace(pat, sub)
                fcount += c
        if fcount:
            total += fcount
            nfiles += 1
            print(f"    {os.path.relpath(fp, DESIGN):46s} x{fcount}")
            if apply:
                open(fp, "w", encoding="utf-8").write(new)
    print(f"\nTOTAL: {total} occurrences in {nfiles} files")
    if not apply:
        print("(dry-run — re-run with --apply to write)")


if __name__ == "__main__":
    main()
