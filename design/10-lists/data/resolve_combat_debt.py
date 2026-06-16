#!/usr/bin/env python3
"""turn-051: COMBAT_DESIGN §6 付与元同期に伴う敵ファイルの整合債務マーカー消化。

対象は「COMBAT_DESIGN §6 付与元/付与源リストへの追記」債務のみ（18体）。
MAP_LIST 固有名ラベルの別債務（enm_059/060 §73）は対象外（別途処理）。
冪等: 既に「消化済」化された行は再マッチしない。
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / "30-detail" / "enemies"

# enm_id -> (status_key, 表示名)
TARGETS = {
    "enm_032": ("shibari", "雪解け岩鬼"),
    "enm_036": ("shibari", "氷柱魔"),
    "enm_038": ("shibari", "寒蝉"),
    "enm_043": ("shibari", "杉の付喪"),
    "enm_061": ("shibari", "砂蜘蛛"),
    "enm_063": ("shibari", "砂塵の大蜘蛛"),
    "enm_065": ("shibari", "鉄錆の鬼"),
    "enm_045": ("kurami", "影狼"),
    "enm_052": ("kurami", "常世蝶"),
    "enm_056": ("kurami", "光の残響"),
    "enm_062": ("kurami", "風塵の妖"),
    "enm_068": ("kurami", "鍾乳の影"),
    "enm_069": ("kurami", "星屑の妖"),
    "enm_051": ("donsoku", "渦潮の精"),
    "enm_072": ("donsoku", "天狗"),
    "enm_066": ("doku", "硫泉の蛭"),
    "enm_064": ("hidoki", "火の粉の妖"),
    "enm_070": ("konran", "夜啼鳥の影"),
}

DRY = "--apply" not in sys.argv
changes = 0
files_touched = 0

for enm, (key, name) in TARGETS.items():
    matches = list(BASE.glob(f"{enm}_*.md"))
    if not matches:
        print(f"[MISS] {enm}: file not found")
        continue
    path = matches[0]
    text = path.read_text(encoding="utf-8")
    orig = text
    file_changes = []

    # 1) §4 blockquote 債務マーカー行（> ... 整合債務 ... 付与元|付与源 ...）を消化済へ。
    #    MAP_LIST固有名ラベル債務（固有名/出現敵構成 を含む行）は除外。
    def repl_block(m):
        line = m.group(0)
        if "固有名" in line or "出現敵構成" in line:
            return line  # MAP_LIST ラベル債務は対象外
        if "付与元" not in line and "付与源" not in line:
            return line
        new = (f"> ✅ **整合（M8消化済・turn-051）**: "
               f"[COMBAT_DESIGN §6](../../20-basic/systems/COMBAT_DESIGN.md) の "
               f"`{key}` 行「主な付与元」へ本敵 {enm} {name} を掲載済（ENEMY_LIST 定義と同期）。")
        file_changes.append(("block", line.strip()[:40]))
        return new

    text = re.sub(r"^>.*整合債務.*$", repl_block, text, flags=re.MULTILINE)

    # 2) §4 inline 付与状態行の債務クローズを掲載済へ（3変種）。
    subs = [
        (rf"※付与元への {enm} 追記は整合債務（本書 §4 注記）",
         f"※付与元へ {enm} 掲載済（turn-051）"),
        (r"※付与元リストへの追記が整合債務",
         f"※付与元へ {enm} 掲載済（turn-051）"),
        (rf"\*\*付与元へ {enm} 追記が整合債務\*\*",
         f"付与元へ {enm} 掲載済（turn-051）"),
    ]
    for pat, rep in subs:
        new_text, n = re.subn(pat, rep, text)
        if n:
            text = new_text
            file_changes.append(("inline", pat[:30]))

    if text != orig:
        files_touched += 1
        changes += len(file_changes)
        print(f"[{'DRY' if DRY else 'APPLY'}] {path.name}: {len(file_changes)} change(s) -> {file_changes}")
        if not DRY:
            path.write_text(text, encoding="utf-8")
    else:
        print(f"[SKIP] {path.name}: no debt marker matched (already resolved?)")

print(f"\n{'DRY-RUN' if DRY else 'APPLIED'}: {files_touched} files, {changes} changes")
