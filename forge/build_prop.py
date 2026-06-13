#!/usr/bin/env python3
"""単一プロップ（民家など）の raw → 透過・トリム・縮小 → public/assets 登録。

raw（マゼンタ背景の1枚絵）を chroma_key + despeckle し、内容 bbox でトリム、
指定の最大高さへ等比縮小して保存。assetmap に実寸 frameW/frameH(cols=1,frames=1)で登録。

mito/npc と同じ chroma ロジック。グレーディングは別途 grade_wa.py（要 pregrade 削除）。

使い方: python3 forge/build_prop.py            # 既定の全プロップ
        python3 forge/build_prop.py minka_a   # 指定のみ
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
OUT = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")

# name -> (raw id, 出力ファイル, assetmapキー, 目標高さpx)
PROPS = {
    "minka_a": ("obj.minka_a", "obj_minka_a.png", "obj.minka_a", 360),
    "minka_b": ("obj.minka_b", "obj_minka_b.png", "obj.minka_b", 360),
}


def is_bg(r, g, b):
    return r > 175 and b > 160 and g < 120


def chroma_key(im):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            po[x, y] = (0, 0, 0, 0) if (a == 0 or is_bg(r, g, b)) else (r, g, b, 255)
    return out


def despeckle(im):
    px = im.load(); res = im.copy(); pr = res.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 150 and b > 140 and g < 130 and (r - g) > 40 and (b - g) > 30:
                pr[x, y] = (0, 0, 0, 0)
    return res


def build(name):
    raw_id, outname, key, target_h = PROPS[name]
    raw = os.path.join(ROOT, "assets", "raw", raw_id, "codex-imagegen.png")
    if not os.path.exists(raw):
        print(f"SKIP {name}: raw not found"); return False
    im = despeckle(chroma_key(Image.open(raw)))
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    w, h = im.size
    nw = max(1, round(w * target_h / h))
    im = im.resize((nw, target_h), Image.BOX)
    im.save(os.path.join(OUT, outname))
    am = json.load(open(MAP_OUT)) if os.path.exists(MAP_OUT) else {}
    am[key] = {"file": outname, "frameW": im.width, "frameH": im.height, "frames": 1, "cols": 1}
    with open(MAP_OUT, "w") as fp:
        json.dump(am, fp, indent=2, ensure_ascii=False, sort_keys=True)
    print(f"ok {name}: -> {outname} {im.width}x{im.height} aspect={im.width/im.height:.3f} assetmap[{key}]")
    return True


targets = sys.argv[1:] or list(PROPS.keys())
for t in targets:
    if t in PROPS:
        build(t)
    else:
        print(f"unknown prop: {t}")
print("[build_prop] done")
