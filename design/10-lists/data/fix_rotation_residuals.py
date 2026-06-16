#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_rotation_residuals.py — turn-054 接頭辞ローテーションの取りこぼし残存を外科的に修正する。

背景:
  rotate_map_id_prefixes.py の regex lookahead `(?![\\w])` は Python3 の Unicode `\\w` が
  日本語文字（漢字/かな）も単語文字とみなすため、`r9_hi_no_michi接続` のように map_id 直後に
  区切り無しで日本語が続くトークンを誤ってブロックし、旧 map_id を一部回転し漏らした。

なぜ prefix 方式の再実行ではダメか:
  prefix blanket（r8_→r10_, r9_→r7_）は二重適用で**非冪等**。再実行すると回転後の新 r8_(tokoyo)/
  r9_(wadatsumi) を更に回してしまう。

本スクリプトの方式（冪等・安全）:
  現在のディレクトリ名から **OLD→NEW 完全 map_id 辞書**を再構築する：
    homura/r7_*    ← old r9_*   /  tokoyo/r8_*  ← old r7_*
    wadatsumi/r9_* ← old r7_*   /  takamagahara/r10_* ← old r8_*
  新 id 群（r7_funki…/r8_shirasuna…/r9_sango…/r10_takama…）と旧 id 群（r9_funki…/r7_shirasuna…/
  r7_sango…/r8_takama…）は **suffix が地域横断で重複しない＝素集合**。よって OLD id だけを exact 一致で
  置換すれば、既に回転済の NEW id には決して当たらず、残存だけを拾える（再実行で 0 件＝冪等）。
  境界は **ASCII のみ**（lookbehind `(?<![A-Za-z0-9])`＝`ev_` 埋め込み許容／lookahead `(?![a-z0-9_])`＝
  日本語直後も正しく区切りと判定）。REVISION_LOG.md は履歴保全のため除外。

実行: dry-run（既定） / 適用は --apply
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.normpath(os.path.join(HERE, "..", ".."))
APPLY = "--apply" in sys.argv
EXCLUDE = {"REVISION_LOG.md"}

# 現ディレクトリ名 → (現接頭辞, 旧接頭辞)
DIRS = {"homura": ("r7_", "r9_"), "tokoyo": ("r8_", "r7_"),
        "wadatsumi": ("r9_", "r7_"), "takamagahara": ("r10_", "r8_")}

OLD2NEW = {}
for d, (newp, oldp) in DIRS.items():
    ddir = os.path.join(DESIGN, "30-detail", "maps", d)
    for f in os.listdir(ddir):
        if f.startswith(newp) and f.endswith(".md"):
            new_id = f[:-3]
            suffix = new_id[len(newp):]
            old_id = oldp + suffix
            OLD2NEW[old_id] = new_id

# 旧 id と新 id が素集合であることを検証（冪等性の前提）
assert not (set(OLD2NEW) & set(OLD2NEW.values())), "FATAL: OLD/NEW id が重複（冪等性が崩れる）"
print(f"[mapping] OLD→NEW 完全 id 辞書: {len(OLD2NEW)} 件（素集合検証 OK）")

# 長い id を先に評価（部分一致回避）＋ ASCII 境界
alt = "|".join(re.escape(k) for k in sorted(OLD2NEW, key=len, reverse=True))
RES_RE = re.compile(r"(?<![A-Za-z0-9])(" + alt + r")(?![a-z0-9_])")

total, files = 0, 0
for root, _dirs, fs in os.walk(DESIGN):
    for f in fs:
        if not f.endswith(".md") or f in EXCLUDE:
            continue
        p = os.path.join(root, f)
        src = open(p, encoding="utf-8").read()
        new, n = RES_RE.subn(lambda m: OLD2NEW[m.group(1)], src)
        if n:
            total += n
            files += 1
            if not APPLY:
                print(f"  [residual] {os.path.relpath(p, DESIGN)}: {n} 件")
            else:
                open(p, "w", encoding="utf-8").write(new)
print(f"[summary] 残存修正: {total} 箇所 / {files} ファイル")
print("== APPLIED ==" if APPLY else "== DRY-RUN ==")
