#!/usr/bin/env python3
"""rename_r6_kurosu.py — R6 リージョン改名（下流③ / rn-M4 B 相当）

ユーザー指示「R6：黒洲（クロス）」を確定適用する。
旧: slug=kurosugi / 表示名=黒杉の幽谷  →  新: slug=kurosu / 表示名=黒洲

【設計原則】外科的・冪等・決定的（何度実行しても同じ結果＝rn 並行編集に強い）。

保護対象（置換しない）:
  - 黒杉材 / 黒杉炭 / 黒杉高台 / 黒杉岩盤 / 黒杉林 / 黒杉谷 / 黒杉色 / 黒杉根 /
    黒杉大槌 / 黒杉縦線 / 黒杉の樹海 …（黒杉＝黒い杉材を指す地名・素材名）
  - 黒杉（itm_073）等の素材アイテム参照
  - map_id 接頭辞 r6_ ／ マップディレクトリ maps/kurosugi/ ／ kurosugi_ 系の合成ID
    （warp グラフ保護のため接頭辞・ディレクトリは固定。REGION_LIST §0.x の決定1と同方針）
  - REVISION_LOG.md（履歴台帳：「R6黒杉→R6黒洲へ同期」等の記録自体が正）
  - REGION_RENUMBER_MAP.md（計画台帳：old slug=kurosugi の記録が正）

使い方:
  python3 rename_r6_kurosu.py           # dry-run（変更ファイルと件数のみ表示・無書込）
  python3 rename_r6_kurosu.py --apply   # 実適用 ＋ 20-basic/regions/R6_kurosugi.md → R6_kurosu.md リネーム
"""
import os
import re
import sys

# このファイルは design/10-lists/data/ にある → 3つ上が design/
DESIGN_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APPLY = "--apply" in sys.argv

EXCLUDE_FILES = {"REVISION_LOG.md", "REGION_RENUMBER_MAP.md"}
PROCESS_EXT = (".md", ".json")

# 黒杉の直後に来たら「地名・素材名」とみなして保護する文字（リージョン参照ではない）
PROTECT_AFTER = "のクロ材炭高林岩色根大縦谷密と杉"


def transform(text):
    """テキストを新表記へ変換し、(新テキスト, 変更件数) を返す。冪等。"""
    total = 0
    # 0) 基本設計ファイル名参照 R6_kurosugi → R6_kurosu（bare-kurosugi 規則より先に処理）
    text, c = re.subn(r"R6_kurosugi", "R6_kurosu", text); total += c
    # 1) リージョン正式名（"の幽谷"完全一致＝地名/素材と曖昧性ゼロ）
    text, c = re.subn(r"黒杉の幽谷", "黒洲", text); total += c
    # 2) 進行チェーン矢印 黒杉→ （素材/地名は→を取らない＝リージョン参照のみ）
    text, c = re.subn(r"黒杉(?=[ 　]*→)", "黒洲", text); total += c
    # 3) リージョン略称 R6[空白]黒杉（直後が地名/素材文字でない場合のみ）
    text, c = re.subn(r"(?<=R6)([ 　]?)黒杉(?![" + PROTECT_AFTER + r"])",
                      r"\1黒洲", text); total += c
    # 4) slug: 単独トークンの kurosugi のみ（maps/kurosugi・kurosugi/・kurosugi_・_kurosugi は保護）
    text, c = re.subn(r"(?<![/\w])kurosugi(?![/\w])", "kurosu", text); total += c
    return text, total


def iter_target_files():
    for dirpath, dirnames, filenames in os.walk(DESIGN_ROOT):
        for fn in filenames:
            if not fn.endswith(PROCESS_EXT):
                continue
            if fn in EXCLUDE_FILES:
                continue
            yield os.path.join(dirpath, fn)


def main():
    changed = []
    for path in sorted(iter_target_files()):
        try:
            with open(path, encoding="utf-8") as f:
                src = f.read()
        except (UnicodeDecodeError, OSError):
            continue
        new, n = transform(src)
        if n > 0 and new != src:
            rel = os.path.relpath(path, DESIGN_ROOT)
            changed.append((rel, n))
            if APPLY:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)

    # 20-basic/regions/R6_kurosugi.md → R6_kurosu.md のリネーム
    old_region = os.path.join(DESIGN_ROOT, "20-basic", "regions", "R6_kurosugi.md")
    new_region = os.path.join(DESIGN_ROOT, "20-basic", "regions", "R6_kurosu.md")
    rename_note = None
    if os.path.exists(old_region):
        if APPLY:
            os.rename(old_region, new_region)
            rename_note = "RENAMED  20-basic/regions/R6_kurosugi.md -> R6_kurosu.md"
        else:
            rename_note = "WILL RENAME  20-basic/regions/R6_kurosugi.md -> R6_kurosu.md"
    elif os.path.exists(new_region):
        rename_note = "already renamed (R6_kurosu.md exists)"
    else:
        rename_note = "WARN: neither R6_kurosugi.md nor R6_kurosu.md found"

    mode = "APPLY" if APPLY else "DRY-RUN"
    print(f"=== rename_r6_kurosu.py [{mode}] ===")
    print(f"design root: {DESIGN_ROOT}")
    print(f"変更ファイル数: {len(changed)} / 総置換件数: {sum(n for _, n in changed)}")
    for rel, n in changed:
        print(f"  {n:4d}  {rel}")
    print(f"[rename] {rename_note}")
    if not APPLY:
        print("\n(dry-run。実適用は --apply を付与)")


if __name__ == "__main__":
    main()
