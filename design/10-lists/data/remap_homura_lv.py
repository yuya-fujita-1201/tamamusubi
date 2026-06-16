#!/usr/bin/env python3
"""remap_homura_lv.py — ホムラ(R7)詳細マップの内部Lv帯を新背骨へ同期（決定的・冪等）

背景:
    リージョンID再採番（REGION_RENUMBER_MAP）でホムラ「火群と白磐の地」は
    旧 R4↔R5 間（Lv28-38）から終盤の武器強化拠点 R7（Lv42-50）へ移設された。
    rn 並行プロセスは地域ラベル（「R7 火群と白磐の地」）までは更新したが、
    各詳細マップ §1 メタ表の「推奨Lv帯」および本文中の「LvXX〜YY想定/向け」が
    旧値（Lv28-38帯）のまま残存し、region基本設計(R7=Lv42-50)と矛盾していた。
    （map_id 接頭辞 r9_ は warp グラフ保護のため意図的に固定＝本スクリプトでは不変）

写像規則:
    旧区間 [28,38] を新区間 [42,50] へ線形写像し四捨五入。
        new(x) = round(42 + (x - 28) * (50 - 42) / (38 - 28)) = round(42 + (x-28)*0.8)
    homura/ に実在する 6 種の Lvレンジ文字列のみを対象（単独Lvトークンは無し＝
    grep -hoE "Lv[0-9]+〜[0-9]+" で全列挙済・衝突なし）。置換キーは全て旧帯(28-38始)、
    置換値は全て新帯(42-50)で重複しないため、適用順非依存かつ再実行で冪等。

使い方:
    python3 remap_homura_lv.py --dry-run   # 変更プレビュー（書き込みなし）
    python3 remap_homura_lv.py             # 適用
"""
import sys
import pathlib

# このスクリプトは design/10-lists/data/ に置かれる。homura/ は design/30-detail/maps/homura/
HERE = pathlib.Path(__file__).resolve().parent
HOMURA_DIR = HERE.parent.parent / "30-detail" / "maps" / "homura"

# 旧Lvレンジ文字列 -> 新Lvレンジ文字列（線形写像 round(42+(x-28)*0.8) を端点へ適用）
#   28->42 29->43 30->44 31->44 32->45 34->47 35->48 36->48 37->49 38->50
LV_REMAP = {
    "Lv28〜31": "Lv42〜44",  # 進入（火の道）
    "Lv29〜35": "Lv43〜48",
    "Lv30〜36": "Lv44〜48",
    "Lv32〜36": "Lv45〜48",
    "Lv34〜38": "Lv47〜50",
    "Lv37〜38": "Lv49〜50",  # 地獄谷ボス前
}


def main() -> int:
    dry = "--dry-run" in sys.argv
    if not HOMURA_DIR.is_dir():
        print(f"ERROR: homura dir not found: {HOMURA_DIR}", file=sys.stderr)
        return 2
    files = sorted(HOMURA_DIR.glob("r9_*.md"))
    total_repl = 0
    changed_files = 0
    for f in files:
        text = f.read_text(encoding="utf-8")
        new_text = text
        per_file = 0
        for old, new in LV_REMAP.items():
            c = new_text.count(old)
            if c:
                new_text = new_text.replace(old, new)
                per_file += c
        if per_file:
            changed_files += 1
            total_repl += per_file
            print(f"  {f.name}: {per_file} 置換")
            if not dry:
                f.write_text(new_text, encoding="utf-8")
    mode = "DRY-RUN（未書込）" if dry else "適用済"
    print(f"[{mode}] files={len(files)} changed={changed_files} replacements={total_repl}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
