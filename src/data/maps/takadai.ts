import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";

// 高台（たかだい）— 2026-06-14 第2版。直交2Dのまま「不透明3D石垣」で高低差を表現（お手本=ZZ-HCP-logs/009）。
// 第1版の不具合(緑余白/角の反転/西縁の断絶)は、透明部のない手続き合成タイル(waCliff3)で解消。
//   前面=高い玉石壁(笠石cap→壁2段→基部) ／ N/W/E=細い面取り笠石縁＋外角 ／ 角=立体的に巻く
//   中央=石段(waStairs3) ／ 下段=暗い草地 ／ 周囲=鎮守の森

const GU = TS.grassUpper as number;
const GL = TS.grassLower as number;
const C3 = TS.waCliff3 as number;   // 不透明3D石垣（16フレーム）
const ST = TS.waStairs3 as number;  // 不透明石段
const SHADOW = TS.waDropshadow as number;
const FOREST = TS.cliff as number;  // 鎮守の森の樹冠

// waCliff3 フレーム定数
const RIM_N = 0, RIM_W = 1, RIM_E = 2, RIM_NW = 3, RIM_NE = 4;
const CAP_H = 5, WALL = 6, WALL2 = 7, BASE = 8, BASE2 = 9;
const CAP_SW = 10, CAP_SE = 11, WALL_L = 12, WALL_R = 13, BASE_L = 14, BASE_R = 15;

export function buildTakadai(): MapData {
  const W = 40, H = 32;
  const b = new MapBuilder("takadai", "高台", W, H, "field", "#24401c", 7);
  b.fill(GL, [0, 1, 2, 3]);

  const PX0 = 6, PX1 = 33;
  const PNY = 3;
  const GY0 = 4, GY1 = 9;
  const CAPY = 10, WUY = 11, WMY = 12, WLY = 13, BASEY = 14; // 前面壁=3段（高い擁壁）
  const SHY = 15;
  const LX0 = 4, LX1 = 35;
  const LY0 = 15, LY1 = 29;
  const STAIR = [19, 20];
  const isStair = (x: number) => STAIR.includes(x);

  const gf = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return h % 4;
  };

  // ── 上段草地 ──
  for (let y = GY0; y <= GY1; y++)
    for (let x = PX0 + 1; x <= PX1 - 1; x++) b.ground(x, y, GU, gf(x, y));

  // ── N/W/E の面取り笠石縁＋外角。石の縁＝通行不可(solid)。歩けるのは内側の草のみ ──
  b.ground(PX0, PNY, C3, RIM_NW); b.solid(PX0, PNY, true);
  b.ground(PX1, PNY, C3, RIM_NE); b.solid(PX1, PNY, true);
  for (let x = PX0 + 1; x <= PX1 - 1; x++) { b.ground(x, PNY, C3, RIM_N); b.solid(x, PNY, true); }
  for (let y = GY0; y <= GY1; y++) {
    b.ground(PX0, y, C3, RIM_W); b.solid(PX0, y, true);
    b.ground(PX1, y, C3, RIM_E); b.solid(PX1, y, true);
  }

  // ── 前面の高い石垣（笠石cap→壁3段→基部）。石段列は除く ──
  for (let x = PX0; x <= PX1; x++) {
    if (isStair(x)) continue;
    const onL = x === PX0, onR = x === PX1;
    b.ground(x, CAPY, C3, onL ? CAP_SW : onR ? CAP_SE : CAP_H);
    b.solid(x, CAPY, true); // 前縁の笠石キャップ＝石の縁なので通行不可（石段だけが上下の通路）
    for (const wy of [WUY, WMY, WLY]) {
      b.ground(x, wy, C3, onL ? WALL_L : onR ? WALL_R : ((x + wy) % 2 ? WALL : WALL2));
      b.solid(x, wy, true);
    }
    b.ground(x, BASEY, C3, onL ? BASE_L : onR ? BASE_R : (x % 2 ? BASE : BASE2)); b.solid(x, BASEY, true);
  }

  // ── 石段（CAPY→BASEY を接続・歩行可。不透明 waStairs3。壁3段ぶん中段フレームを反復）──
  for (let i = 0; i < STAIR.length; i++) {
    const sx = STAIR[i] as number;
    const left = i === 0;
    b.ground(sx, CAPY, ST, left ? 1 : 2);    // 上端
    b.ground(sx, WUY, ST, left ? 5 : 6);     // 上中段
    b.ground(sx, WMY, ST, left ? 9 : 10);    // 中段
    b.ground(sx, WLY, ST, left ? 9 : 10);    // 中段（反復）
    b.ground(sx, BASEY, ST, left ? 13 : 14); // 下端
    for (let y = CAPY; y <= BASEY; y++) b.solid(sx, y, false);
  }

  // ── 落ち影（石垣の下端・下段草の上に半透明で重ねる。石段の足元は避ける）──
  for (let x = PX0; x <= PX1; x++) {
    if (isStair(x)) continue;
    b.deco(x, SHY, SHADOW, 3);
  }

  // ── 周囲の森 ──
  const inPlateau = (x: number, y: number) => x >= PX0 && x <= PX1 && y >= PNY && y <= BASEY;
  const inLower = (x: number, y: number) => x >= LX0 && x <= LX1 && y >= LY0 && y <= LY1;
  const forest = new Set<number>();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inPlateau(x, y) && !inLower(x, y)) forest.add(y * W + x);
  }
  b.paintAuto(forest, FOREST, "cliff", "ground", true);

  // ── デカール（花・草）──
  const upper = new Set<number>(), lower = new Set<number>();
  for (let y = GY0; y <= GY1; y++) for (let x = PX0 + 1; x <= PX1 - 1; x++) upper.add(y * W + x);
  for (let y = LY0 + 2; y <= LY1; y++) for (let x = LX0 + 1; x <= LX1 - 1; x++) lower.add(y * W + x);
  b.scatterDecals(0.08, [0, 1, 2, 3, 4, 5, 6, 7], upper);
  b.scatterDecals(0.06, [0, 1, 2, 3, 4, 5, 6, 7], lower);
  b.scatterDecals(0.04, [0, 1, 2, 3], upper, "tile.flower_detail");
  b.scatterDecals(0.03, [0, 1, 2, 3], lower, "tile.flower_detail");

  // ── ランドマーク（お手本準拠）──
  b.prop("obj.tree_oak", 10, 7, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 31, 6, 48, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 27, 8, 56, 72, { footW: 2 });
  b.prop("obj.lantern", 17, 9, 24, 40, { footW: 1 });
  b.prop("obj.lantern", 22, 9, 24, 40, { footW: 1 });
  b.prop("obj.bamboo", 7, 26, 48, 72, { footW: 1 });
  b.prop("obj.tree_blossom", 33, 24, 56, 72, { footW: 2 });
  b.prop("obj.sign", 24, 27, 16, 16, { footW: 1, id: "sign:takadai" });

  // ── 戻りの鳥居（下段南・kiritateへ。3マス幅）──
  b.prop("obj.torii", 20, 28, 64, 48, { footW: 0, shadow: false });
  for (const wx of [19, 20, 21]) b.warp(wx, 28, "kiritate", 28, 4, "down");

  const data = b.done();
  data.outsideColor = "#24401c";
  return data;
}
