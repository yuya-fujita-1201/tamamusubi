#!/usr/bin/env python3
"""
remap_lvrange_bands.py  —  flag4（Lv帯）消化スクリプト（決定的・冪等）

目的: R7 ホムラ / R8 常世 / R9 綿津見の個別 lv_range が旧スケールのまま残存し、
REGION_LIST canon の地域band と乖離している問題（critic flag4）を解消する。
個別 lv_range を地域band へ「線形リスケール」で実数同期する（band＝canon を個別へ反映）。

方式:
- MAP_LIST.md … maps.json の region フィールドを正本に id 単位で Lv セルのみ置換
  （R4 等の旧Lv28系を誤爆しないよう region で厳密に限定）
- 30-detail/maps/{tokoyo,wadatsumi}/*.md … ディレクトリ→region で §0「推奨Lv帯」行を置換
  （homura §0 は turn-048 で band 済＝旧スケール検出で自動スキップ＝冪等）
- 20-basic/regions/R7_homura.md … §5 クラスタ別数値Lv表（（LvXX〜YY）見出し）を置換

冪等性: 旧スケール検出（is_oldscale）で band 済トークンはスキップ。再実行は identity。

usage:
  python3 remap_lvrange_bands.py            # dry-run（差分表示のみ）
  python3 remap_lvrange_bands.py --apply    # 適用
"""
import json, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.abspath(os.path.join(HERE, "..", ".."))   # design/
MAPS_JSON = os.path.join(HERE, "maps.json")
MAP_LIST = os.path.join(DESIGN, "10-lists", "MAP_LIST.md")
DETAIL = os.path.join(DESIGN, "30-detail", "maps")
HOMURA_REGION = os.path.join(DESIGN, "20-basic", "regions", "R7_homura.md")

BANDS = {"R7": (42, 50), "R8": (46, 54), "R9": (48, 56)}
OLD   = {"R7": (28, 38), "R8": (42, 52), "R9": (42, 52)}
DIR2REGION = {"tokoyo": "R8", "wadatsumi": "R9"}  # homura は band 済（冪等スキップ）

LV = re.compile(r"Lv(\d+)〜(\d+)")          # 範囲トークン
LV1 = re.compile(r"Lv(\d+)(?![\d〜])")        # 単独 LvNN（範囲でない）

def is_oldscale(region, lo, hi):
    olo, ohi = OLD[region]
    return hi <= ohi  # band 済は hi>ohi になるので False（冪等）

def remap(region, lo, hi):
    olo, ohi = OLD[region]; blo, bhi = BANDS[region]
    span = ohi - olo; bspan = bhi - blo
    def m(v):
        return round(blo + (v - olo) * bspan / span)
    nlo, nhi = m(lo), m(hi)
    nlo = max(blo, min(bhi, nlo)); nhi = max(blo, min(bhi, nhi))
    if nhi < nlo: nhi = nlo
    return nlo, nhi

def remap_range_token(region, text):
    """text 内の LvNN〜NN トークンを band へ（旧スケールのみ）。変更後文字列と変更数。"""
    n = [0]
    def sub(mo):
        lo, hi = int(mo.group(1)), int(mo.group(2))
        if not is_oldscale(region, lo, hi):
            return mo.group(0)
        nlo, nhi = remap(region, lo, hi)
        if (nlo, nhi) == (lo, hi):
            return mo.group(0)
        n[0] += 1
        return f"Lv{nlo}〜{nhi}"
    return LV.sub(sub, text), n[0]

def load_region_by_id():
    d = json.load(open(MAPS_JSON, encoding="utf-8"))
    return {m["id"]: m.get("region") for m in d["maps"]}

def process_map_list(apply):
    reg = load_region_by_id()
    lines = open(MAP_LIST, encoding="utf-8").read().split("\n")
    changes = []
    for i, line in enumerate(lines):
        if not line.startswith("| "):
            continue
        cells = line.split("|")
        if len(cells) < 4:
            continue
        mid = cells[1].strip()
        region = reg.get(mid)
        if region not in BANDS:
            continue
        # Lv を含むセルだけを対象（lv_range 列＝セル全体が Lv トークン）
        changed = False
        for ci, cell in enumerate(cells):
            s = cell.strip()
            mo = LV.fullmatch(s)
            if not mo:
                continue
            lo, hi = int(mo.group(1)), int(mo.group(2))
            if not is_oldscale(region, lo, hi):
                continue
            nlo, nhi = remap(region, lo, hi)
            if (nlo, nhi) == (lo, hi):
                continue
            cells[ci] = cell.replace(f"Lv{lo}〜{hi}", f"Lv{nlo}〜{nhi}")
            changed = True
            changes.append((mid, region, f"Lv{lo}〜{hi}", f"Lv{nlo}〜{nhi}"))
        if changed:
            lines[i] = "|".join(cells)
    if apply and changes:
        open(MAP_LIST, "w", encoding="utf-8").write("\n".join(lines))
    return changes

def process_detail(apply):
    changes = []
    for d, region in DIR2REGION.items():
        ddir = os.path.join(DETAIL, d)
        if not os.path.isdir(ddir):
            continue
        for fn in sorted(os.listdir(ddir)):
            if not fn.endswith(".md"):
                continue
            fp = os.path.join(ddir, fn)
            txt = open(fp, encoding="utf-8").read()
            # §0「推奨Lv帯」行のみ対象
            new_lines = []
            fchg = 0
            for line in txt.split("\n"):
                if line.strip().startswith("| 推奨Lv帯 |"):
                    nl, c = remap_range_token(region, line)
                    fchg += c
                    new_lines.append(nl)
                else:
                    new_lines.append(line)
            if fchg:
                changes.append((fn, region, fchg))
                if apply:
                    open(fp, "w", encoding="utf-8").write("\n".join(new_lines))
    return changes

def process_homura_region(apply):
    """§5 クラスタ別数値Lv表（（LvXX〜YY）見出し）を band へ。"""
    region = "R7"
    txt = open(HOMURA_REGION, encoding="utf-8").read()
    changes = []
    new_lines = []
    for line in txt.split("\n"):
        # §5 表の行: 「| 火の道（Lv28〜31） | ... |」形式のみ（cells[1] に （LvXX〜YY））
        if line.startswith("| ") and "（Lv" in line and "）" in line:
            nl, c = remap_range_token(region, line)
            if c:
                changes.append((line.split("|")[1].strip()[:18], c))
            new_lines.append(nl)
        else:
            new_lines.append(line)
    if apply and changes:
        open(HOMURA_REGION, "w", encoding="utf-8").write("\n".join(new_lines))
    return changes

def main():
    apply = "--apply" in sys.argv
    print(f"=== remap_lvrange_bands.py ({'APPLY' if apply else 'DRY-RUN'}) ===\n")
    ml = process_map_list(apply)
    print(f"[MAP_LIST.md] {len(ml)} cells")
    for mid, r, a, b in ml:
        print(f"    {r} {mid:28s} {a} -> {b}")
    de = process_detail(apply)
    print(f"\n[30-detail tokoyo/wadatsumi §0] {sum(c for _,_,c in de)} tokens in {len(de)} files")
    for fn, r, c in de:
        print(f"    {r} {fn} x{c}")
    hr = process_homura_region(apply)
    print(f"\n[R7_homura.md §5 cluster] {sum(c for _,c in hr)} tokens")
    for label, c in hr:
        print(f"    {label} x{c}")
    total = len(ml) + sum(c for _,_,c in de) + sum(c for _,c in hr)
    print(f"\nTOTAL tokens remapped: {total}")
    if not apply:
        print("(dry-run — re-run with --apply to write)")

if __name__ == "__main__":
    main()
