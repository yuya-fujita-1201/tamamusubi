#!/usr/bin/env python3
"""プロップの焼き込み接地影の馴染み補正＋マゼンタ残り除去（実機FB対応）。

1) shadow モード: 画像下部の「紫がかった影」「真っ黒すぎる影」を
   半透明ニュートラル（地面色に乗算で馴染む暗色）へ置換する。
   - 紫影: b > g+12 かつ r > g+4（彩度が紫に寄った暗部）
   - 黒影: 輝度 < 52 かつ 彩度低（トランクの暗褐色は r>g>b 勾配で除外）
   本体（幹・壁）を侵食しないよう、画像の下から shadow_band 割合のみ走査する。

2) magenta モード: チョークキー残り（紫ピンクの点）を近傍の非マゼンタ色で埋める。

使い方:
  python3 forge/fix_shadows.py shadow  obj_tree_oak.png [...]
  python3 forge/fix_shadows.py magenta tile_forest_edge_set.png [...]
"""
import sys, os
from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets")

SHADOW_RGBA = (18, 22, 28)      # ニュートラルな影色
SHADOW_ALPHA = 88               # 約35%: 下の地面色が透ける


def is_purple(r, g, b):
    return b > g + 12 and r > g + 4 and max(r, g, b) < 170


def is_too_black(r, g, b):
    lum = (r * 3 + g * 6 + b) / 10
    sat = max(r, g, b) - min(r, g, b)
    return lum < 52 and sat < 28


def fix_shadow(path, band=0.28):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    W, H = im.size
    n = 0
    y0 = int(H * (1 - band))
    for y in range(y0, H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_purple(r, g, b) or is_too_black(r, g, b):
                px[x, y] = (*SHADOW_RGBA, min(a, SHADOW_ALPHA))
                n += 1
    im.save(path)
    return n


def is_magenta(r, g, b):
    return r > 110 and b > 100 and g < r * 0.72 and g < b * 0.78


def fix_magenta(path):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    W, H = im.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0 or not is_magenta(r, g, b):
                continue
            # 近傍の非マゼンタ色の平均で置換
            acc = [0, 0, 0, 0]
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        nr, ng, nb, na = px[nx, ny]
                        if na > 0 and not is_magenta(nr, ng, nb):
                            acc[0] += nr; acc[1] += ng; acc[2] += nb; acc[3] += 1
            if acc[3]:
                px[x, y] = (acc[0] // acc[3], acc[1] // acc[3], acc[2] // acc[3], a)
            else:
                px[x, y] = (40, 44, 36, a)
            n += 1
    im.save(path)
    return n


def fix_holes(path):
    """シルエット内部の透明穴（クロマキー/despeckle の食われ）を近傍色で埋める。
    外周から到達できる透明領域はそのまま（= 正しい透過）。フレーム毎に処理する。"""
    im = Image.open(path).convert("RGBA")
    px = im.load()
    W, H = im.size
    fw = H  # 正方フレームの横一列 strip 前提
    frames = W // fw
    total = 0
    for f in range(frames):
        x0 = f * fw
        # 外周からフラッドフィル（透明領域）
        outside = set()
        stack = []
        for x in range(fw):
            for y in (0, H - 1):
                if px[x0 + x, y][3] == 0: stack.append((x, y))
        for y in range(H):
            for x in (0, fw - 1):
                if px[x0 + x, y][3] == 0: stack.append((x, y))
        while stack:
            x, y = stack.pop()
            if (x, y) in outside or not (0 <= x < fw and 0 <= y < H): continue
            if px[x0 + x, y][3] != 0: continue
            outside.add((x, y))
            stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
        # 囲まれた透明 = 穴 → 近傍の不透明色平均で埋める
        holes = [(x, y) for y in range(H) for x in range(fw)
                 if px[x0 + x, y][3] == 0 and (x, y) not in outside]
        for _ in range(6):  # 大きい穴は外側から数パスで埋まる
            remaining = []
            for (x, y) in holes:
                acc = [0, 0, 0, 0]
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < fw and 0 <= ny < H:
                            r, g, b, a = px[x0 + nx, ny]
                            if a > 200:
                                acc[0] += r; acc[1] += g; acc[2] += b; acc[3] += 1
                if acc[3] >= 2:
                    px[x0 + x, y] = (acc[0] // acc[3], acc[1] // acc[3], acc[2] // acc[3], 255)
                    total += 1
                else:
                    remaining.append((x, y))
            holes = remaining
            if not holes: break
    im.save(path)
    return total


def lighten_shadow(path, max_alpha=40):
    """すでにニュートラル化済みの焼き込み影（18,22,28 系）の不透明度をさらに下げる"""
    im = Image.open(path).convert("RGBA")
    px = im.load()
    W, H = im.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0: continue
            if abs(r - 18) <= 8 and abs(g - 22) <= 8 and abs(b - 28) <= 8 and a <= 100:
                px[x, y] = (r, g, b, min(a, max_alpha)); n += 1
    im.save(path)
    return n


def main():
    mode = sys.argv[1]
    fns = {"shadow": fix_shadow, "magenta": fix_magenta, "holes": fix_holes, "lighten": lighten_shadow}
    for name in sys.argv[2:]:
        path = os.path.join(ASSETS, name)
        if not os.path.exists(path):
            print("skip (not found):", name); continue
        n = fns[mode](path)
        print(f"{mode} {name}: {n} px fixed")


if __name__ == "__main__":
    main()
