#!/usr/bin/env python3
"""
remap_r7_enemy_lv.py  —  critic flag1〜3（R7 敵/ボスの Lv帯 旧スケール残存）消化スクリプト（決定的・冪等）

背景:
  turn-052 の remap_lvrange_bands.py は maps.json / MAP_LIST / 30-detail §0 / R7_homura §5 のみ
  R7 band(Lv42〜50) へ同期したが、**ENEMY_LIST / BOSS_LIST / 30-detail/enemies の敵・ボス詳細**は
  旧スケール(R7=Lv28〜38系・boss=Lv36〜38)のまま残存していた（critic flag1/2/3）。
  本スクリプトはそれらを remap_lvrange_bands.py と**同一の線形リスケール式**で band へ実数同期する。

対象（R7 のみ。R2砂丘 enm_061-063 / R10 enm_069-072・boss_19 は region で除外）:
  1. 10-lists/ENEMY_LIST.md
     - §1.9.2 見出しの （Lv28〜38・…） → （Lv42〜50・…）
     - 表の region 列 == 'R7' の行（enm_064〜068）の Lv帯セルを rescale
  2. 10-lists/BOSS_LIST.md
     - 表の region 列 == 'R7' の行（boss_17/18）の Lv帯セルを rescale
  3. 30-detail/enemies/{enm_064..068,boss_17,boss_18}.md
     - `| Lv帯 | LvXX〜YY |` を rescale
     - boss_17/18 の `| 出現地域 | …（Lv36〜46・背骨7番目） |` → （Lv42〜50・背骨7番目）

冪等性: Lv帯は is_oldscale(hi<=38) ガードで band 済をスキップ。
        見出し/出現地域は固定旧トークン(Lv28〜38 / Lv36〜46)の literal 置換＝再実行 identity。

usage:
  python3 remap_r7_enemy_lv.py            # dry-run
  python3 remap_r7_enemy_lv.py --apply    # 適用
"""
import re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.abspath(os.path.join(HERE, "..", ".."))   # design/
ENEMY_LIST = os.path.join(DESIGN, "10-lists", "ENEMY_LIST.md")
BOSS_LIST = os.path.join(DESIGN, "10-lists", "BOSS_LIST.md")
ENEMIES = os.path.join(DESIGN, "30-detail", "enemies")

# remap_lvrange_bands.py と同一の R7 band/old span・式
OLD = (28, 38)     # 旧 R7 個別 lv の span
BAND = (42, 50)    # rn-M4 canon R7 band（REGION_LIST §39 / regions.json）
LV = re.compile(r"Lv(\d+)〜(\d+)")

DETAIL_FILES = [
    "enm_064_hinoko_no_ayakashi.md",
    "enm_065_tetsusabi_no_oni.md",
    "enm_066_ryusen_no_hiru.md",
    "enm_067_shiroiwa_no_mushi.md",
    "enm_068_shonyu_no_kage.md",
    "boss_17_tetsuhami_no_oo_oni.md",
    "boss_18_homura_no_kishin.md",
]


def is_oldscale(lo, hi):
    return hi <= OLD[1]          # band 済(hi>38)はスキップ＝冪等


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
    """text 内の LvNN〜NN（旧スケールのみ）を band へ。新文字列と変更数。"""
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


def region_of_row(line):
    cells = line.split("|")
    return cells[2].strip() if len(cells) > 2 else None


def process_list(path, header_literal=None):
    """表の region 列=='R7' の行で Lv帯セルを rescale。header_literal があれば見出しも置換。"""
    lines = open(path, encoding="utf-8").read().split("\n")
    changes = []
    for i, line in enumerate(lines):
        # 見出し literal 置換（ENEMY_LIST §1.9.2）
        if header_literal and header_literal[0] in line:
            lines[i] = line.replace(header_literal[0], header_literal[1])
            if lines[i] != line:
                changes.append(("HEADER", line.strip()[:40], header_literal[1]))
            continue
        if not line.startswith("| "):
            continue
        if region_of_row(line) != "R7":
            continue
        new, c = rescale_token(line)
        if c:
            lines[i] = new
            mid = line.split("|")[1].strip()
            changes.append((mid, line.strip()[:0], f"x{c}"))
    return lines, changes


def process_detail(fn):
    fp = os.path.join(ENEMIES, fn)
    txt = open(fp, encoding="utf-8").read()
    out = []
    chg = 0
    for line in txt.split("\n"):
        nl = line
        # boss 出現地域の旧帯 Lv36〜46 → 正典 band
        if line.strip().startswith("| 出現地域 |") and "Lv36〜46" in line:
            nl = line.replace("Lv36〜46", "Lv42〜50")
            chg += 1
        # Lv帯セルを rescale（oldscale のみ）
        elif line.strip().startswith("| Lv帯 |"):
            nl, c = rescale_token(line)
            chg += c
        out.append(nl)
    return "\n".join(out), chg


def main():
    apply = "--apply" in sys.argv
    print(f"=== remap_r7_enemy_lv.py ({'APPLY' if apply else 'DRY-RUN'}) ===\n")

    # ENEMY_LIST（見出し + R7 行）
    el_lines, el_chg = process_list(
        ENEMY_LIST,
        header_literal=("R7 火群と白磐の地（Lv28〜38", "R7 火群と白磐の地（Lv42〜50"),
    )
    print(f"[ENEMY_LIST.md] {len(el_chg)} 行")
    for a, b, c in el_chg:
        print(f"    {a} {c}")
    if apply and el_chg:
        open(ENEMY_LIST, "w", encoding="utf-8").write("\n".join(el_lines))

    # BOSS_LIST（R7 行のみ）
    bl_lines, bl_chg = process_list(BOSS_LIST)
    print(f"\n[BOSS_LIST.md] {len(bl_chg)} 行")
    for a, b, c in bl_chg:
        print(f"    {a} {c}")
    if apply and bl_chg:
        open(BOSS_LIST, "w", encoding="utf-8").write("\n".join(bl_lines))

    # 30-detail/enemies の R7 詳細
    print("\n[30-detail/enemies] 詳細")
    total_d = 0
    for fn in DETAIL_FILES:
        new, c = process_detail(fn)
        total_d += c
        print(f"    {fn:36s} x{c}")
        if apply and c:
            open(os.path.join(ENEMIES, fn), "w", encoding="utf-8").write(new)

    print(f"\nTOTAL: ENEMY_LIST {len(el_chg)} / BOSS_LIST {len(bl_chg)} / detail {total_d} tokens")
    if not apply:
        print("(dry-run — re-run with --apply to write)")


if __name__ == "__main__":
    main()
