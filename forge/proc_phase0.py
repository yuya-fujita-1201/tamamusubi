#!/usr/bin/env python3
"""玉結び: Seiken-5.0 の raw 画像を SS=8 向けに再処理し public/assets へ出力する。

Seiken-5.0 の SS=3（タイル48px）から SS=8（タイル128px）へ、
fw/fh を 8/3 倍（round）にスケールして hdproc を呼び出す。
注: 和風新規生成（*_wa）に置き換わるタイル/プロップもフォールバックとして処理しておく。

使い方:
  python3 forge/proc_phase0.py            # 対象アセットをすべて処理
  python3 forge/proc_phase0.py --only id  # 指定IDのみ
"""
import json, os, subprocess, sys, argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
HDPROC = os.path.join(ROOT, "hdproc.py")
OUT_DIR = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")

# Seiken-5.0 の raw ディレクトリ
SEIKEN_RAW = os.path.join(
    os.path.dirname(GAME), "Seiken-5.0", "forge", "assets", "raw"
)

SCALE = 8 / 3  # SS=3 → SS=8

def s(v):
    """Seiken の fw/fh を SS=8 向けにスケール（round）"""
    return round(v * SCALE)

# mode, fw, fh, cols, rows（fw/fh は SS=5 換算済み）
# タイル系: 論理16px × SS=5 = 80px
# プロップ系: Seiken値 × 5/3
PROC = {
    # ---- タイル系（16論理px → 80px実寸）----
    "tile.grass":          dict(mode="tile",            fw=128, fh=128,  cols=1, rows=1),
    "tile.path_set":       dict(mode="tileset",         fw=128, fh=128,  cols=4, rows=4),
    "tile.water_edge_set": dict(mode="tileset",         fw=128, fh=128,  cols=4, rows=4),
    "tile.cliff_set":      dict(mode="tileset",         fw=128, fh=128,  cols=4, rows=4),
    "tile.grass_detail":   dict(mode="tileset_overlay", fw=128, fh=128,  cols=4, rows=4),
    "tile.flower_detail":  dict(mode="tileset_overlay", fw=128, fh=128,  cols=4, rows=4),
    "tile.forest_edge_set":dict(mode="tileset",         fw=128, fh=128,  cols=4, rows=4),
    # ---- プロップ系（fw/fh = Seiken値 × 5/3 = round）----
    # Seiken: obj.tree_oak   prop_large fw=168 fh=216 → 280×360
    "obj.tree_oak":        dict(mode="prop_large", fw=s(168), fh=s(216), cols=1, rows=1),
    # Seiken: obj.tree_pine  prop_large fw=144 fh=216 → 240×360
    "obj.tree_pine":       dict(mode="prop_large", fw=s(144), fh=s(216), cols=1, rows=1),
    # Seiken: obj.tree_blossom prop_large fw=168 fh=216 → 280×360
    "obj.tree_blossom":    dict(mode="prop_large", fw=s(168), fh=s(216), cols=1, rows=1),
    # Seiken: obj.grass_tuft prop fw=48 fh=48 cols=4 → 80×80
    "obj.grass_tuft":      dict(mode="prop",       fw=s(48),  fh=s(48),  cols=4, rows=1),
    # Seiken: obj.sign prop fw=48 fh=48 cols=1 → 80×80
    "obj.sign":            dict(mode="prop",       fw=s(48),  fh=s(48),  cols=1, rows=1),
    # Seiken: obj.chest prop fw=48 fh=48 cols=4 → 80×80
    "obj.chest":           dict(mode="prop",       fw=s(48),  fh=s(48),  cols=4, rows=1),
    # Seiken: obj.windmill prop_large fw=168 fh=216 → 280×360
    "obj.windmill":        dict(mode="prop_large", fw=s(168), fh=s(216), cols=1, rows=1),
    # ---- ドロップ・アイテム（fx として処理）----
    # Seiken: drop.gem fx fw=36 fh=36 cols=1 → 60×60
    "drop.gem":            dict(mode="fx", fw=s(36),  fh=s(36),  cols=1, rows=1),
    # Seiken: drop.heart fx fw=36 fh=36 cols=1 → 60×60
    "drop.heart":          dict(mode="fx", fw=s(36),  fh=s(36),  cols=1, rows=1),
    # Seiken: item.berry fx fw=66 fh=66 cols=1 → 110×110
    "item.berry":          dict(mode="fx", fw=s(66),  fh=s(66),  cols=1, rows=1),
    # ---- FX（fw/fh = Seiken値 × 5/3）----
    # Seiken: fx.slash fx fw=102 fh=102 cols=4 → 170×170
    "fx.slash":            dict(mode="fx", fw=s(102), fh=s(102), cols=4, rows=1),
    # Seiken: fx.thrust fx fw=108 fh=108 cols=4 → 180×180
    "fx.thrust":           dict(mode="fx", fw=s(108), fh=s(108), cols=4, rows=1),
    # Seiken: fx.hit fx fw=72 fh=72 cols=4 → 120×120
    "fx.hit":              dict(mode="fx", fw=s(72),  fh=s(72),  cols=4, rows=1),
    # Seiken: fx.poof fx fw=84 fh=84 cols=4 → 140×140
    "fx.poof":             dict(mode="fx", fw=s(84),  fh=s(84),  cols=4, rows=1),
    # Seiken: fx.charge fx fw=108 fh=108 cols=4 → 180×180
    "fx.charge":           dict(mode="fx", fw=s(108), fh=s(108), cols=4, rows=1),
    # Seiken: fx.heal fx fw=90 fh=90 cols=4 → 150×150
    "fx.heal":             dict(mode="fx", fw=s(90),  fh=s(90),  cols=4, rows=1),
    # Seiken: fx.explosion fx fw=168 fh=168 cols=4 → 280×280
    "fx.explosion":        dict(mode="fx", fw=s(168), fh=s(168), cols=4, rows=1),
    # ---- UI アイコン----
    # Seiken: ui.icon_sword fx fw=66 fh=66 cols=1 → 110×110
    "ui.icon_sword":       dict(mode="fx", fw=s(66),  fh=s(66),  cols=1, rows=1),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    args = ap.parse_args()
    only = set(args.only.split(",")) if args.only else None

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(GAME, "src", "data"), exist_ok=True)

    # 既存 assetmap を読み込む（マージ更新のため）
    assetmap = {}
    if os.path.exists(MAP_OUT):
        try:
            assetmap = json.load(open(MAP_OUT))
        except Exception:
            assetmap = {}

    done, skipped, failed = 0, 0, []
    for aid, cfg in PROC.items():
        if only and aid not in only:
            continue
        raw = os.path.join(SEIKEN_RAW, aid, "codex-imagegen.png")
        if not os.path.exists(raw):
            print(f"SKIP {aid:22s} (raw not found: {raw})")
            skipped += 1
            continue
        name = aid.replace(".", "_")
        tmp = os.path.join(ROOT, "assets", "hd_phase0", aid)
        cmd = [
            sys.executable, HDPROC, raw, tmp,
            "--mode", cfg["mode"],
            "--fw", str(cfg["fw"]),
            "--fh", str(cfg["fh"]),
            "--cols", str(cfg["cols"]),
            "--rows", str(cfg["rows"]),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"FAIL {aid}: {res.stderr.strip()[-300:]}")
            failed.append((aid, res.stderr.strip()[-200:]))
            continue
        strip = os.path.join(tmp, "o_strip.png")
        out = os.path.join(OUT_DIR, f"{name}.png")
        subprocess.run(["cp", strip, out], check=True)

        frames = cfg["cols"] * cfg["rows"]
        assetmap[aid] = {
            "file": f"{name}.png",
            "frameW": cfg["fw"],
            "frameH": cfg["fh"],
            "frames": frames,
            "cols": frames,
        }
        done += 1
        print(f"ok  {aid:25s} {cfg['mode']:14s} {cfg['fw']}x{cfg['fh']} x{frames}")

    # assetmap をマージ書き込み
    with open(MAP_OUT, "w") as f:
        json.dump(assetmap, f, indent=2, ensure_ascii=False, sort_keys=True)

    print(f"\nprocessed={done} skipped(no raw)={skipped} failed={len(failed)}")
    for fail in failed:
        print("FAIL", fail)
    print(f"assetmap -> {MAP_OUT} ({len(assetmap)} entries)")


if __name__ == "__main__":
    main()
