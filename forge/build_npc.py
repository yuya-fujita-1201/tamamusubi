#!/usr/bin/env python3
"""村人 NPC の 4コマ idle strip 組立（玉結び・村人バリエーション）。

raw（1行×4セル）を読み込み build_mito と同じ流儀で:
  1. マゼンタ除去 → despeckle → 各セル bbox トリム
  2. 「bbox高さの中央値」基準で均一スケール（target_h へ）
  3. 水平センタリング（重心）＋下端接地で 200x200 セルへ
  4. 800x200 strip を public/assets へ出力し assetmap.json を更新（npc.suzushiro と同形式）

target_h を下げると小柄（子供）になる。表示は field.ts の NPC_SZ=28論理px なので、
target_h=190 ≈ ミト体高(26論理px)相当、150 ≈ 子供（やや小さい）。

使い方: python3 forge/build_npc.py            # 全村人
        python3 forge/build_npc.py villager_a # 指定のみ
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(ROOT)
OUT = os.path.join(GAME, "public", "assets")
MAP_OUT = os.path.join(GAME, "src", "data", "assetmap.json")

CELL = 240  # ミトと同じ高解像度（原画443px/セルから縮小）。等身を合わせた際の見栄え向上。
# name -> (raw id, 出力ファイル, assetmapキー, 体の目標高さ[240セル内px])
# target_h はセルの約94%。スレンダー化(3.5等身)後も全体高は表示28px側で揃う。
NPCS = {
    "villager_a": ("npc.villager_a", "npc_villager_a.png", "npc.villager_a", 226),
    "villager_b": ("npc.villager_b", "npc_villager_b.png", "npc.villager_b", 230),
    "villager_c": ("npc.villager_c", "npc_villager_c.png", "npc.villager_c", 196),
    "suzushiro":  ("npc.suzushiro",  "npc_suzushiro.png",  "npc.suzushiro",  220),
}


def is_bg(r, g, b):
    return r > 175 and b > 160 and g < 120


def chroma_key(im):
    im = im.convert("RGBA")
    px = im.load(); w, h = im.size
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


def centroid_x(im):
    px = im.load(); w, h = im.size
    sx = sw = 0.0
    for y in range(h):
        for x in range(w):
            a = px[x, y][3]
            if a:
                sx += x * a; sw += a
    return sx / sw if sw else w / 2.0


def median(xs):
    s = sorted(xs)
    return s[len(s) // 2]


def build(name):
    raw_id, outname, key, target_h = NPCS[name]
    raw = os.path.join(ROOT, "assets", "raw", raw_id, "codex-imagegen.png")
    if not os.path.exists(raw):
        print(f"SKIP {name}: raw not found ({raw})")
        return False
    im = despeckle(chroma_key(Image.open(raw)))
    W, H = im.size
    cw = W // 4
    frames = []
    for i in range(4):
        cell = im.crop((i * cw, 0, (i + 1) * cw, H))
        bb = cell.getbbox()
        frames.append(cell.crop(bb) if bb else cell)
    med_h = median([f.size[1] for f in frames])
    scale = target_h / med_h
    pad_bottom = 4
    strip = Image.new("RGBA", (CELL * 4, CELL), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        nw = max(1, round(f.size[0] * scale))
        nh = max(1, round(f.size[1] * scale))
        f = f.resize((nw, nh), Image.BOX)
        if nh > CELL - 2:
            f = f.resize((round(nw * (CELL - 2) / nh), CELL - 2), Image.BOX)
            nw, nh = f.size
        cx = centroid_x(f)
        x = i * CELL + round(CELL / 2 - cx)
        x = max(i * CELL, min(x, i * CELL + (CELL - nw)))
        y = CELL - pad_bottom - nh
        strip.alpha_composite(f, (x, max(0, y)))
    strip.save(os.path.join(OUT, outname))
    am = json.load(open(MAP_OUT)) if os.path.exists(MAP_OUT) else {}
    am[key] = {"file": outname, "frameW": CELL, "frameH": CELL, "frames": 4, "cols": 4}
    with open(MAP_OUT, "w") as fp:
        json.dump(am, fp, indent=2, ensure_ascii=False, sort_keys=True)
    print(f"ok  {name:12s} med_h={med_h} scale={scale:.3f} -> {outname} assetmap[{key}]")
    return True


targets = sys.argv[1:] or list(NPCS.keys())
for t in targets:
    if t in NPCS:
        build(t)
    else:
        print(f"unknown npc: {t}")
print("[build_npc] done")
