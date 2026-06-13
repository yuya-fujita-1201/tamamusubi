#!/usr/bin/env python3
"""和風新規生成素材（*_wa / 和プロップ）を SS=8 向けに処理し、既存 assetmap キーへ上書き登録する。

ユーザーFB(2026-06-13): 西洋風の草原・モミの木をやめ、濃緑の和パレットへ統一。
タイル=128px(16論理×SS8)、木=384-448×576(48-56×72論理)、小物=128px。

使い方: python3 forge/proc_wa.py [--only id1,id2]
"""
import json, os, subprocess, sys, argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
HDPROC = os.path.join(ROOT, "hdproc.py")
OUT_DIR = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")

# raw id → (mode, fw, fh, cols, rows, 出力ファイル名, assetmapキー[複数可])
PROC = {
    "tile.grass_wa":      dict(mode="tileset",         fw=128, fh=128, cols=4, rows=4, out="tile_grass_wa.png",      keys=["tile.grass"]),
    "tile.path_wa":       dict(mode="tileset",         fw=128, fh=128, cols=4, rows=4, out="tile_path_wa.png",       keys=["tile.path_set"]),
    "tile.forest_wa":     dict(mode="tileset",         fw=128, fh=128, cols=4, rows=4, out="tile_forest_wa.png",     keys=["tile.cliff_set"]),
    "tile.water_edge_wa": dict(mode="tileset",         fw=128, fh=128, cols=4, rows=4, out="tile_water_edge_wa.png", keys=["tile.water_edge_set"]),
    "tile.detail_wa":     dict(mode="tileset_overlay", fw=128, fh=128, cols=4, rows=4, out="tile_detail_wa.png",     keys=["tile.grass_detail", "tile.flower_detail"]),
    "obj.matsu":          dict(mode="prop_large", fw=384, fh=576, cols=1, rows=1, out="obj_matsu.png",      keys=["obj.tree_pine"]),
    "obj.goshinboku":     dict(mode="prop_large", fw=448, fh=576, cols=1, rows=1, out="obj_goshinboku.png", keys=["obj.tree_oak"]),
    "obj.bamboo":         dict(mode="prop_large", fw=384, fh=576, cols=1, rows=1, out="obj_bamboo.png",     keys=["obj.bamboo"]),
    "obj.suisha":         dict(mode="prop_large", fw=448, fh=576, cols=1, rows=1, out="obj_suisha.png",     keys=["obj.windmill"]),
    "obj.sign_wa":        dict(mode="prop", fw=128, fh=128, cols=1, rows=1, out="obj_sign_wa.png",  keys=["obj.sign"]),
    "obj.tsuzura":        dict(mode="prop", fw=128, fh=128, cols=4, rows=1, out="obj_tsuzura.png",  keys=["obj.chest"]),
    "obj.tuft_wa":        dict(mode="prop", fw=128, fh=128, cols=4, rows=1, out="obj_tuft_wa.png",  keys=["obj.grass_tuft"]),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    args = ap.parse_args()
    only = set(args.only.split(",")) if args.only else None

    am = json.load(open(MAP_OUT)) if os.path.exists(MAP_OUT) else {}
    done, failed = 0, []
    for aid, cfg in PROC.items():
        if only and aid not in only:
            continue
        raw = os.path.join(ROOT, "assets", "raw", aid, "codex-imagegen.png")
        if not os.path.exists(raw):
            print(f"SKIP {aid:22s} (raw not found)")
            continue
        tmp = os.path.join(ROOT, "assets", "hd_wa", aid)
        cmd = [sys.executable, HDPROC, raw, tmp,
               "--mode", cfg["mode"], "--fw", str(cfg["fw"]), "--fh", str(cfg["fh"]),
               "--cols", str(cfg["cols"]), "--rows", str(cfg["rows"])]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            failed.append(aid)
            print(f"FAIL {aid}: {r.stderr[-200:]}")
            continue
        src = os.path.join(tmp, "o_strip.png")
        dst = os.path.join(OUT_DIR, cfg["out"])
        subprocess.run(["cp", src, dst], check=True)
        frames = cfg["cols"] * cfg["rows"]
        for key in cfg["keys"]:
            am[key] = {"file": cfg["out"], "frameW": cfg["fw"], "frameH": cfg["fh"],
                       "frames": frames, "cols": frames}
        done += 1
        print(f"ok  {aid:22s} {cfg['mode']:16s} {cfg['fw']}x{cfg['fh']} x{frames} -> {cfg['out']}")
    json.dump(am, open(MAP_OUT, "w"), indent=2, ensure_ascii=False, sort_keys=True)
    print(f"\nprocessed={done} failed={len(failed)} assetmap={len(am)} entries")


if __name__ == "__main__":
    main()
