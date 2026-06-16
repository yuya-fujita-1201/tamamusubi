#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rotate_map_id_prefixes.py — map_id 接頭辞ローテーションの決定的・冪等な移行スクリプト。

背景（critic flag1-4 の終結）:
  リージョンID再採番（R6-R10）は rn-M3/M4 で完了したが、map_id 接頭辞（小文字 r{n}_）は
  「warp 保護」を理由に旧値のまま固定されていた。結果 region と接頭辞が乖離していた：
    R7 ホムラ=r9_ / R8 常世=r7_(tokoyo) / R9 和田津見=r7_(wadatsumi) / R10 高天原=r8_
  計画（plan.md M2/M3/M4）は接頭辞ローテーション（r9→r7, tokoyo r7→r8, wadatsumi r7→r9,
  r8→r10）を明示要求しており、独立 critic も毎ターン未実行を指摘していた。本スクリプトで実行する。

ローテーション規則（new接頭辞 = r{region番号}_。region は再採番済なので結果は prefix==region）:
  - r9_*  → r7_*   （homura は R7・r9_ は homura 専用なので blanket）
  - r8_*  → r10_*  （takamagahara は R10・r8_ は takamagahara 専用なので blanket）
  - r7_*  → r8_*（tokoyo 系／第2セグメントで判定）または r9_*（wadatsumi 系）
            r7_ は tokoyo(R8)/wadatsumi(R9) で共有されるため、map_id の第2セグメント
            （例 r7_kaigan_kita の "kaigan"）で所属を判定する。両集合は重複なし（先頭で検証）。

なぜ安全か:
  - region は既に再採番済（maps.json の region が正本）。回転後の接頭辞は region 番号と一致＝整理整頓。
  - 置換は接頭辞を 1 個ずつ判定する単一パスコールバック。re.sub は置換後を再走査しないため
    カスケード二重適用（r9→r7 直後に r7→r8 の連鎖）が起きない。
  - lookbehind `(?<![A-Za-z0-9])` は英数字直後を除外しつつ `_` 直後は許容＝`ev_r8_...`
    `entered_r9_...` 等の埋め込み接頭辞も region 単位で一律回転（部分回転による不整合を防ぐ）。
  - REVISION_LOG.md は履歴台帳（§4.4 保全原則）につき内容回転の対象外（旧 id を当時の記録として温存）。

実行:
  dry-run（既定・無変更・レポートのみ）:  python3 design/10-lists/data/rotate_map_id_prefixes.py
  適用:                                   python3 design/10-lists/data/rotate_map_id_prefixes.py --apply

冪等性: 適用後は旧接頭辞が canon から消えるため再実行で置換0・rename0（決定的に再実行可能）。
"""
import json
import os
import re
import subprocess
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = HERE
DESIGN = os.path.normpath(os.path.join(HERE, "..", ".."))           # .../design
MAPS_JSON = os.path.join(DATA, "maps.json")
APPLY = "--apply" in sys.argv

# 履歴保全のため内容回転から除外するファイル（basename 一致）
EXCLUDE_BASENAMES = {"REVISION_LOG.md"}

# ── 1) maps.json から r7_ の tokoyo/wadatsumi 第2セグメント集合を構築 ──────────
maps = json.load(open(MAPS_JSON, encoding="utf-8"))["maps"]
TOKOYO_SEG2, WADATSUMI_SEG2 = set(), set()
rot_ids = {}                                     # 旧 full id -> 新 full id（rename とサニティ用）
for m in maps:
    mid, reg = m["id"], (m.get("region") or "")
    if mid[:3] not in ("r7_", "r8_", "r9_"):
        continue
    if not re.fullmatch(r"R\d+", reg):
        continue
    seg2 = mid.split("_")[1] if mid.count("_") >= 1 else ""
    if mid.startswith("r7_"):
        if reg == "R8":
            TOKOYO_SEG2.add(seg2)
        elif reg == "R9":
            WADATSUMI_SEG2.add(seg2)
    new = f"r{reg[1:]}_{mid.split('_', 1)[1]}"
    if new != mid:
        rot_ids[mid] = new

overlap = TOKOYO_SEG2 & WADATSUMI_SEG2
assert not overlap, f"FATAL: r7_ 第2セグメントが tokoyo/wadatsumi で重複: {overlap}"
# rename サニティ: 新 id 重複・既存衝突なし
tg = list(rot_ids.values())
assert len(tg) == len(set(tg)), "FATAL: 新 map_id に重複"
exist = {m["id"] for m in maps}
assert not [n for o, n in rot_ids.items() if n in exist and n not in rot_ids], "FATAL: 新id衝突"
print(f"[mapping] rotate対象 map: {len(rot_ids)} 枚 / tokoyo seg2={len(TOKOYO_SEG2)} wadatsumi seg2={len(WADATSUMI_SEG2)} 重複0 衝突0")

# ── 2) 接頭辞回転コールバック（単一パス） ────────────────────────────────────
TOKEN_RE = re.compile(r"(?<![A-Za-z0-9])r([789])_([a-z0-9_]+?)(?![\w])")
unresolved = Counter()

def rotate(match):
    pref, rest = match.group(1), match.group(2)
    if pref == "9":
        return f"r7_{rest}"
    if pref == "8":
        return f"r10_{rest}"
    # pref == "7": tokoyo(→r8_) か wadatsumi(→r9_) を第2セグメントで判定
    seg2 = rest.split("_")[0]
    if seg2 in TOKOYO_SEG2:
        return f"r8_{rest}"
    if seg2 in WADATSUMI_SEG2:
        return f"r9_{rest}"
    unresolved[f"r7_{rest}"] += 1
    return match.group(0)                        # 解決不能は無変更（誤爆防止）

# ── 3) 対象 .md 収集（REVISION_LOG 除外） ────────────────────────────────────
md_files = []
for root, _dirs, files in os.walk(DESIGN):
    for f in files:
        if f.endswith(".md") and f not in EXCLUDE_BASENAMES:
            md_files.append(os.path.join(root, f))
md_files.sort()

# ── 4) 内容置換 ──────────────────────────────────────────────────────────────
changed_files, total_subs = 0, 0
for path in md_files:
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    new_src, n = TOKEN_RE.subn(rotate, src)
    if n and new_src != src:
        total_subs += n
        changed_files += 1
        if APPLY:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(new_src)

# ── 5) 詳細マップファイルの物理 rename（106枚） ──────────────────────────────
RENAME_DIRS = {"homura": ("r9_", "r7_"), "tokoyo": ("r7_", "r8_"),
               "wadatsumi": ("r7_", "r9_"), "takamagahara": ("r8_", "r10_")}
renames = []
for d, (oldp, newp) in RENAME_DIRS.items():
    ddir = os.path.join(DESIGN, "30-detail", "maps", d)
    if not os.path.isdir(ddir):
        continue
    for f in sorted(os.listdir(ddir)):
        if f.startswith(oldp) and f.endswith(".md") and f[:-3] in rot_ids:
            newf = rot_ids[f[:-3]] + ".md"
            renames.append((os.path.join(ddir, f), os.path.join(ddir, newf), f, newf))

for src_p, dst_p, of, nf in renames:
    if APPLY:
        r = subprocess.run(["git", "mv", src_p, dst_p], cwd=DESIGN,
                           capture_output=True, text=True)
        if r.returncode != 0:
            os.rename(src_p, dst_p)
        print(f"  [rename✔] {of} -> {nf}")

# ── 6) サマリ＆安全チェック ──────────────────────────────────────────────────
print(f"[summary] 内容置換: {total_subs} 箇所 / {changed_files} ファイル（REVISION_LOG除外）")
print(f"[summary] ファイル rename: {len(renames)} 枚")
if unresolved:
    print(f"[WARN] r7_ で tokoyo/wadatsumi 未解決の第2セグメント {len(unresolved)} 種（無変更で温存）:")
    for t, c in unresolved.most_common():
        print(f"        {t}  x{c}")
else:
    print("[ok] r7_ 未解決トークン: 0（全 r7_ が tokoyo/wadatsumi に解決）")
print("== APPLIED ==" if APPLY else "== DRY-RUN（無変更）。適用は --apply を付けて再実行 ==")
