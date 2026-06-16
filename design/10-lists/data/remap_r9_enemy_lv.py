#!/usr/bin/env python3
"""
remap_r9_enemy_lv.py  —  R9 綿津見の大海の敵 lv_range 旧スケール残存の消化（決定的・冪等）

背景:
  enm_047〜053 は v1.2（turn-022）で旧 R8 常世の海戦闘から R9 綿津見の大海へ移設されたが、
  個別 lv_range は旧スケール（Lv42〜52系）のまま残存し、R9 正典 band（Lv48〜56）を逸脱していた。
  これは critic flag1〜3（R7）と同一クラスの未同期で、turn-063 で新設する verify 項目12
  （ENEMY/BOSS lv_range ⊆ 地域band）が検出する。remap_r7_enemy_lv.py / remap_lvrange_bands.py
  と同一の線形リスケール式で band へ実数同期する。

対象（R9 のみ。R9 ボス boss_12/13 は既に band 内＝対象外）:
  1. 10-lists/ENEMY_LIST.md
     - §1.7 見出し （Lv44〜52・…） → （Lv48〜56・…）
     - 表の region 列 == 'R9' の行（enm_047〜053）の Lv帯セルを rescale
  2. 30-detail/enemies/enm_047〜053.md
     - `| Lv帯 | LvXX〜YY |` を rescale（出現地域行に Lv 帯は無い）

冪等性: Lv帯は is_oldscale(hi<=52) ガードで band 済をスキップ。見出しは固定旧トークン
        literal 置換＝再実行 identity。

usage:
  python3 remap_r9_enemy_lv.py            # dry-run
  python3 remap_r9_enemy_lv.py --apply    # 適用
"""
import re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.abspath(os.path.join(HERE, "..", ".."))
ENEMY_LIST = os.path.join(DESIGN, "10-lists", "ENEMY_LIST.md")
ENEMIES = os.path.join(DESIGN, "30-detail", "enemies")

OLD = (42, 52)     # 旧 R9（旧常世の海）個別 lv の span
BAND = (48, 56)    # rn-M4 canon R9 band（REGION_LIST §41 / regions.json）
LV = re.compile(r"Lv(\d+)〜(\d+)")

DETAIL_FILES = [
    "enm_047_tokoyo_ningyo.md",
    "enm_048_okurage.md",
    "enm_049_sangogani.md",
    "enm_050_shinkaigyo.md",
    "enm_051_uzushio_no_sei.md",
    "enm_052_tokoyo_cho.md",
    "enm_053_kokukaima_no_kenzoku.md",
]
HEADER = ("R9 綿津見の大海（Lv44〜52", "R9 綿津見の大海（Lv48〜56")


def is_oldscale(lo, hi):
    return hi <= OLD[1]


def remap(lo, hi):
    olo, ohi = OLD; blo, bhi = BAND
    span = ohi - olo; bspan = bhi - blo
    def m(v):
        return round(blo + (v - olo) * bspan / span)
    nlo, nhi = m(lo), m(hi)
    nlo = max(blo, min(bhi, nlo)); nhi = max(blo, min(bhi, nhi))
    if nhi < nlo: nhi = nlo
    return nlo, nhi


def rescale_token(text):
    n = [0]
    def sub(mo):
        lo, hi = int(mo.group(1)), int(mo.group(2))
        if not is_oldscale(lo, hi):
            return mo.group(0)
        nlo, nhi = remap(lo, hi)
        if (nlo, nhi) == (lo, hi):
            return mo.group(0)
        n[0] += 1
        return f"Lv{nlo}〜{nhi}"
    return LV.sub(sub, text), n[0]


def process_enemy_list():
    lines = open(ENEMY_LIST, encoding="utf-8").read().split("\n")
    changes = []
    for i, line in enumerate(lines):
        if HEADER[0] in line:
            lines[i] = line.replace(HEADER[0], HEADER[1])
            if lines[i] != line:
                changes.append(("HEADER", "x1"))
            continue
        if not line.startswith("| "):
            continue
        cells = line.split("|")
        if len(cells) <= 2 or cells[2].strip() != "R9":
            continue
        new, c = rescale_token(line)
        if c:
            lines[i] = new
            changes.append((line.split("|")[1].strip(), f"x{c}"))
    return lines, changes


def process_detail(fn):
    fp = os.path.join(ENEMIES, fn)
    txt = open(fp, encoding="utf-8").read()
    out = []
    chg = 0
    for line in txt.split("\n"):
        if line.strip().startswith("| Lv帯 |"):
            nl, c = rescale_token(line)
            chg += c
            out.append(nl)
        else:
            out.append(line)
    return "\n".join(out), chg


def main():
    apply = "--apply" in sys.argv
    print(f"=== remap_r9_enemy_lv.py ({'APPLY' if apply else 'DRY-RUN'}) ===\n")
    el_lines, el_chg = process_enemy_list()
    print(f"[ENEMY_LIST.md] {len(el_chg)} 行")
    for a, c in el_chg:
        print(f"    {a} {c}")
    if apply and el_chg:
        open(ENEMY_LIST, "w", encoding="utf-8").write("\n".join(el_lines))
    print("\n[30-detail/enemies] 詳細")
    total_d = 0
    for fn in DETAIL_FILES:
        new, c = process_detail(fn)
        total_d += c
        print(f"    {fn:36s} x{c}")
        if apply and c:
            open(os.path.join(ENEMIES, fn), "w", encoding="utf-8").write(new)
    print(f"\nTOTAL: ENEMY_LIST {len(el_chg)} / detail {total_d} tokens")
    if not apply:
        print("(dry-run — re-run with --apply to write)")


if __name__ == "__main__":
    main()
