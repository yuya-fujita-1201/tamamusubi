import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";

// 棚田の谷（たなだのたに）
// 2026-06-16 pass7: 023参照に合わせ、旧56x46から112x92へ拡張。
// ミト1マスに対して橋・川・神社高台・棚田段が小さすぎたため、構図を4画面ぶんの谷として再設計する。

const GRASS = TS.kaGrassCalm as number;
const PADDY = TS.kaPaddy2 as number;
const PADDY_KEY = "kaPaddy2";
const RIVER = TS.kaRiver3 as number;
const PATH = TS.kaPath2 as number;
const FOREST = TS.kaForest2 as number;
const BAMBOO = TS.kaBamboo as number;
const DOTE = TS.kaDote as number;
const ISHI = TS.kaIshigaki as number;
const SHRINE_WALL = TS.kaShrineWall as number;
const SHRINE_GROUND = TS.kaShrineGround as number;
const BASESHADOW = TS.waBaseShadow as number; // 段差ブロックの下部影（下が黒い半透明グラデ）
const WFALL = TS.kaWaterfall as number;

const FACE = 5;
const ISHI_L = 10, ISHI_R = 9;
const DOTE_L = 4, DOTE_R = 6;
const SHRINE_L = 10, SHRINE_R = 9;

export function buildTanada(): MapData {
  const W = 112, H = 92;
  const b = new MapBuilder("tanada", "棚田の谷", W, H, "field", "#2f5a2c", 11);
  const idx = (x: number, y: number) => y * W + x;
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const solidSet = new Set<number>();
  const stoneWallCells = new Set<number>();
  const noFlower = new Set<number>();

  const gf = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h >>> 0) % 8;
  };
  const grassFrame = (x: number, y: number) => [0, 1, 2, 3][gf(x, y) % 4] as number;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.ground(x, y, GRASS, grassFrame(x, y));

  const markStone = (tile: number, x: number, y: number) => {
    if (tile === ISHI || tile === SHRINE_WALL) stoneWallCells.add(idx(x, y));
  };
  const wall = (tile: number, x0: number, x1: number, y: number,
                lEnd: number, rEnd: number, skip?: (x: number) => boolean) => {
    let segStart: number | undefined;
    const flush = (segEnd: number) => {
      if (segStart === undefined || segEnd < segStart) return;
      for (let x = segStart; x <= segEnd; x++) {
        if (!inb(x, y)) continue;
        const f = x === segStart ? lEnd : x === segEnd ? rEnd : FACE;
        b.ground(x, y, tile, f);
        b.solid(x, y, true);
        solidSet.add(idx(x, y));
        markStone(tile, x, y);
      }
    };
    for (let x = x0; x <= x1; x++) {
      if (!inb(x, y) || (skip && skip(x))) {
        flush(x - 1);
        segStart = undefined;
        continue;
      }
      segStart ??= x;
    }
    flush(x1);
  };

  const paddyAccent = (cells: Set<number>, salt: number, pct = 8) => {
    const frames = [0, 1, 2, 3];
    for (const i of cells) {
      const x = i % W, y = Math.floor(i / W);
      if (!cells.has(idx(x, y - 1)) || !cells.has(idx(x, y + 1)) ||
          !cells.has(idx(x - 1, y)) || !cells.has(idx(x + 1, y))) continue;
      const h = (Math.imul(x + salt * 17, 1103515245) ^ Math.imul(y + salt * 31, 12345)) >>> 0;
      if (h % 100 < pct) b.ground(x, y, PADDY, frames[(h >>> 8) % frames.length] as number);
    }
  };
  const paddy = (cx: number, cy: number, rx: number, ry: number, x0: number, x1: number, wallY: number,
                 spillX?: number, salt = 1) => {
    const cells = b.blob(cx, cy, rx, ry, 0.08);
    b.paintAuto(cells, PADDY, PADDY_KEY, "ground", true);
    for (const i of cells) solidSet.add(i);
    wall(ISHI, x0, x1, wallY, ISHI_L, ISHI_R, spillX !== undefined ? (x) => x === spillX : undefined);
    paddyAccent(cells, salt, 6);
    return cells;
  };
  const ridge = (pts: [number, number][], thick = 0.85, tile = DOTE, key = "kaDote") => {
    const cells = b.path(pts, thick);
    b.paintAuto(cells, tile, key, "ground", true);
    for (const i of cells) {
      const x = i % W, y = Math.floor(i / W);
      solidSet.add(i); markStone(tile, x, y);
    }
    return cells;
  };
  const vwall = (tile: number, x: number, y0: number, y1: number, frame: number) => {
    for (let y = y0; y <= y1; y++) {
      if (!inb(x, y)) continue;
      b.ground(x, y, tile, frame);
      b.solid(x, y, true);
      solidSet.add(idx(x, y));
      markStone(tile, x, y);
    }
  };
  // タイル参照は T()=((setIdx+1)<<8)|frame なので setIdx は (ref>>8)-1（空(0)は -1）。
  const tileAt = (x: number, y: number) => (inb(x, y) ? (((b.data.ground[idx(x, y)] ?? 0) >> 8) - 1) : -2);
  const isWater = (x: number, y: number) => { const t = tileAt(x, y); return t === PADDY || t === RIVER; };
  const setWater = (x: number, y: number) => {
    if (!inb(x, y)) return;
    b.ground(x, y, PADDY, 1); b.solid(x, y, true); solidSet.add(idx(x, y));
  };
  // 棚田の滝＝024準拠の「1マス分」正方形タイル(kaWaterfall)。
  // 「水田 → 石垣の切り欠き → 小さな滝 → 滝壺」と地形接続させる
  // （巨大な縦落差/門柱化はしない＝GPTメモ020/021。高さは実質1マス）。
  const spillway = (x: number, wallY: number) => {
    for (let dy = 1; dy <= 2; dy++) {            // 上: 水源(水田/川)へ最大2マス橋渡し
      if (isWater(x, wallY - dy)) break;
      setWater(x, wallY - dy);
    }
    b.ground(x, wallY, WFALL, 0); b.solid(x, wallY, true); solidSet.add(idx(x, wallY)); // 1マス滝
    if (!isWater(x, wallY + 1)) {                // 下: 直下が川でなければ小さな滝壺を1つだけ作る
      setWater(x, wallY + 1);
      const pool = b.blob(x, wallY + 2, 2.0, 1.1, 0.08);
      b.paintAuto(pool, PADDY, PADDY_KEY, "ground", true);
      for (const i of pool) solidSet.add(i);
    }
  };
  const drain = (pts: [number, number][], thick = 1.2) => {
    const cells = b.path(pts, thick);
    b.paintAuto(cells, RIVER, "kaRiver3", "ground", true);
    for (const i of cells) solidSet.add(i);
    return cells;            // 川岸への黒グラデ影は廃止（ユーザールール: 非段差物に影を落とさない）
  };

  // 1) 歩ける谷床の大きなシルエット。参照のように複数画面ぶんの谷を森で囲う。
  let meadow = b.blobUnion([
    [56, 86, 15, 5, 0.14],
    [54, 73, 18, 8, 0.14],
    [57, 58, 18, 9, 0.14],
    [55, 43, 17, 8, 0.14],
    [56, 27, 16, 8, 0.14],
    [25, 38, 17, 9, 0.14],
    [25, 61, 18, 9, 0.14],
    [31, 82, 15, 7, 0.14],
    [83, 25, 18, 10, 0.15],
    [82, 47, 18, 10, 0.14],
    [88, 70, 18, 9, 0.14],
  ]);
  const road = new Set<number>();
  const addPath = (pts: [number, number][], thick: number) => {
    for (const c of b.path(pts, thick)) road.add(c);
  };
  addPath([[56, 90], [56, 84], [50, 78], [59, 70], [52, 62], [58, 54], [53, 46], [59, 38], [56, 30], [56, 18], [56, 12]], 1.7);
  addPath([[54, 66], [43, 63], [34, 58], [23, 56], [15, 60]], 1.15);
  addPath([[54, 45], [43, 42], [31, 38], [20, 36]], 1.1);
  addPath([[59, 32], [70, 31], [80, 31], [91, 34], [101, 35]], 1.25);
  addPath([[99, 35], [101, 40], [101, 44]], 0.95);
  addPath([[58, 57], [70, 58], [80, 63], [92, 68]], 1.1);
  addPath([[56, 79], [43, 83], [31, 84]], 1.05);
  addPath([[58, 79], [72, 81], [88, 84]], 1.05);
  for (const c of road) meadow.add(c);
  meadow = b.refine(meadow);

  const forest = b.invert(meadow);
  b.paintAuto(forest, FOREST, "kaForest2", "ground", true);
  for (const i of forest) solidSet.add(i);
  for (let y = 0; y <= 2; y++) for (let x = 0; x < W; x++) {
    if (forest.has(idx(x, y))) b.ground(x, y, BAMBOO, gf(x, y) % 4);
  }

  // 2) 西の大棚田。旧版より各田を2倍級にし、滝筋も複数画面に分散する。
  paddy(21, 20, 11, 3.0, 10, 34, 24, 22, 1); spillway(22, 24);
  ridge([[13, 20], [20, 19], [29, 20]], 0.7);
  paddy(19, 32, 14, 3.7, 7, 36, 37, 16, 2); spillway(16, 37);
  ridge([[9, 31], [18, 30], [31, 32]], 0.75);
  paddy(16, 45, 11, 4.0, 6, 30, 50, 17, 3); spillway(17, 50);
  ridge([[8, 45], [16, 44], [25, 45]], 0.75);
  paddy(27, 57, 12, 3.7, 13, 41, 63, 28, 4); spillway(28, 63);
  ridge([[17, 56], [28, 55], [38, 57]], 0.75);
  paddy(19, 75, 10, 3.0, 8, 33, 79, 19, 5); spillway(19, 79);
  ridge([[11, 75], [20, 74], [29, 75]], 0.7);
  paddy(43, 84, 7.0, 2.1, 34, 51, 88, 42, 13); spillway(42, 88);
  ridge([[37, 84], [43, 83], [49, 84]], 0.6);
  drain([[20, 53], [23, 62], [18, 73], [13, 87]], 1.2);

  // 3) 東の棚田、縦川、橋、集落。橋はミト基準で4タイル以上の幅にする。
  paddy(85, 20, 12, 3.4, 71, 99, 27, 85, 6);
  ridge([[75, 20], [85, 19], [95, 20]], 0.7);
  paddy(77, 36, 13, 3.6, 63, 94, 43, 78, 7); spillway(78, 43);
  ridge([[66, 36], [77, 35], [90, 36]], 0.75);
  paddy(91, 53, 13, 3.8, 75, 106, 59, 92, 8); spillway(92, 59);
  ridge([[78, 53], [91, 52], [103, 53]], 0.75);
  paddy(80, 69, 12, 3.4, 65, 98, 75, 81, 9); spillway(81, 75);
  ridge([[68, 68], [80, 67], [94, 69]], 0.75);
  paddy(94, 83, 9, 2.7, 80, 107, 87, undefined, 10);
  ridge([[85, 83], [94, 82], [103, 83]], 0.7);
  paddy(70, 84, 7.2, 2.0, 62, 80, 89, 71, 14); spillway(71, 89);
  ridge([[64, 84], [70, 83], [77, 84]], 0.6);

  const river = drain([[78, 1], [76, 13], [79, 25], [78, 33], [82, 45], [78, 57], [83, 69], [80, 82], [78, 91]], 3.2);
  drain([[85, 28], [82, 34], [78, 43]], 1.05);
  drain([[92, 62], [86, 66], [82, 70]], 1.05);

  wall(ISHI, 68, 76, 29, ISHI_L, ISHI_R);
  wall(ISHI, 82, 91, 29, ISHI_L, ISHI_R);
  vwall(ISHI, 73, 30, 33, 11);
  vwall(ISHI, 86, 30, 33, 8);
  b.prop("obj.bridge_shadow", 79, 31, 32, 16, { footW: 0, shadow: false, ysort: false, id: "bridge_shadow:tanada_big" });
  b.prop("obj.bridge2", 79, 31, 64, 24, { footW: 0, shadow: false, ysort: false, id: "bridge:tanada_big" });
  b.prop("obj.bridge_abutment", 74, 31, 20, 20, { footW: 0, shadow: false, ysort: false, id: "bridge_abutment:l" });
  b.prop("obj.bridge_abutment", 84, 31, 20, 20, { footW: 0, shadow: false, ysort: false, id: "bridge_abutment:r" });
  for (let y = 30; y <= 32; y++) for (let x = 72; x <= 86; x++) {
    b.solid(x, y, false); solidSet.delete(idx(x, y)); noFlower.add(idx(x, y));
  }
  for (let y = 30; y <= 32; y++) {
    for (let x = 69; x <= 73; x++) b.ground(x, y, PATH, gf(x, y) % 4);
    for (let x = 85; x <= 89; x++) b.ground(x, y, PATH, gf(x, y) % 4);
  }
  // 4) 北中央の神社高台。正面石垣を大きくし、石段と鳥居を橋同様にキャラ比で読めるサイズへ。
  const PX0 = 44, PX1 = 68, GY0 = 7, GY1 = 17, PCAP = 20;
  const isStair = (x: number) => x >= 55 && x <= 57;
  const shrineFloor = (x: number, y: number) => {
    if (y === GY0 && (x <= PX0 + 1 || x >= PX1 - 1)) return false;
    if (y === GY0 + 1 && (x === PX0 || x === PX1)) return false;
    if (y === GY1 && (x === PX0 || x === PX1)) return false;
    return true;
  };
  // 境内地表は前面石垣(PCAP)の直前 y=PCAP-1 まで敷く。
  // （y=18-19 が森のままだと境内が森で上下断絶する＝全面スキャンERROR(52,18)を解消）
  for (let y = GY0; y <= PCAP - 1; y++) for (let x = PX0; x <= PX1; x++) {
    if (!shrineFloor(x, y)) continue;
    const onApproach = Math.abs(x - 56) <= 1;
    b.ground(x, y, onApproach ? PATH : SHRINE_GROUND, onApproach ? gf(x, y) % 4 : gf(x, y));
    b.solid(x, y, false); solidSet.delete(idx(x, y));
  }
  wall(SHRINE_WALL, PX0 - 2, PX1 + 2, PCAP, SHRINE_L, SHRINE_R, isStair);
  for (let y = GY0 + 1; y <= PCAP; y++) {
    for (const x of [PX0, PX1]) {
      b.ground(x, y, SHRINE_WALL, x === PX0 ? 6 : 7);
      b.solid(x, y, true); solidSet.add(idx(x, y)); markStone(SHRINE_WALL, x, y);
    }
  }
  for (const x of [PX0 + 1, PX1 - 1]) { b.ground(x, GY0, SHRINE_WALL, 4); b.solid(x, GY0, true); solidSet.add(idx(x, GY0)); markStone(SHRINE_WALL, x, GY0); }
  b.prop("obj.shrine_stairs", 56, 27, 48, 56, { footW: 0, shadow: false, ysort: false, id: "stairs:tanada_big" });
  for (let sy = 20; sy <= 28; sy++) for (let sx = 55; sx <= 57; sx++) {
    b.solid(sx, sy, false); solidSet.delete(idx(sx, sy)); noFlower.add(idx(sx, sy));
  }

  // 5) 谷床の段差。広いマップでも高さが読めるよう、中心道を複数の段で分節する。
  const doteStep = (capY: number, x0: number, x1: number) => {
    wall(DOTE, x0, x1, capY, DOTE_L, DOTE_R,
      (x) => road.has(idx(x, capY)) || road.has(idx(x, capY - 1)) || road.has(idx(x, capY + 1)));
  };
  doteStep(38, 41, 72);
  doteStep(55, 36, 74);
  doteStep(72, 34, 78);
  doteStep(80, 20, 43);
  doteStep(82, 70, 96);

  b.paintAuto(road, PATH, "kaPath2", "ground");
  for (const i of road) {
    const x = i % W, y = Math.floor(i / W);
    b.solid(x, y, false); solidSet.delete(i); noFlower.add(i);
  }
  const walkPatch = (x0: number, y0: number, x1: number, y1: number, tile = GRASS) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inb(x, y)) continue;
      b.ground(x, y, tile, tile === PATH ? gf(x, y) % 4 : tile === GRASS ? grassFrame(x, y) : gf(x, y));
      b.solid(x, y, false);
      solidSet.delete(idx(x, y));
    }
  };
  const walkBlob = (cx: number, cy: number, rx: number, ry: number, tile = GRASS) => {
    for (const i of b.blob(cx, cy, rx, ry, 0.16)) {
      const x = i % W, y = Math.floor(i / W);
      b.ground(x, y, tile, tile === PATH ? gf(x, y) % 4 : tile === GRASS ? grassFrame(x, y) : gf(x, y));
      b.solid(x, y, false);
      solidSet.delete(i);
    }
  };
  walkBlob(100, 42, 6.2, 3.2);
  walkBlob(100, 38, 3.8, 2.2, PATH);
  walkBlob(90, 79, 4.0, 2.0);
  walkPatch(87, 82, 90, 84, PATH);
  const carveLatePath = (pts: [number, number][], thick: number) => {
    for (const i of b.path(pts, thick)) {
      const x = i % W, y = Math.floor(i / W);
      b.ground(x, y, PATH, gf(x, y) % 4);
      b.solid(x, y, false);
      solidSet.delete(i);
      noFlower.add(i);
    }
  };
  carveLatePath([[56, 86], [68, 86], [79, 81], [90, 78]], 1.15);
  for (let y = 30; y <= 32; y++) for (let x = 76; x <= 82; x++) {
    b.ground(x, y, RIVER, gf(x, y) % 4);
    b.solid(x, y, false);
    solidSet.delete(idx(x, y));
    noFlower.add(idx(x, y));
  }

  // 神社石段側壁は道塗布後に戻す。
  for (let sy = 21; sy <= 26; sy++) {
    for (const [sx, f] of [[54, 6], [58, 7]] as const) {
      b.ground(sx, sy, SHRINE_WALL, f); b.solid(sx, sy, true); solidSet.add(idx(sx, sy)); markStone(SHRINE_WALL, sx, sy);
    }
  }

  const addThicket = (specs: [number, number, number, number, number?][], tile = FOREST, key = "kaForest2") => {
    const roadBuffer = b.expand(road, 2);
    const cells = b.blobUnion(specs);
    const safe = new Set<number>();
    for (const i of cells) {
      if (solidSet.has(i) || roadBuffer.has(i) || noFlower.has(i)) continue;
      safe.add(i);
    }
    b.paintAuto(safe, tile, key, "ground", true);
    for (const i of safe) {
      solidSet.add(i);
      forest.add(i);
    }
    return safe;
  };
  addThicket([
    [39, 28, 4.2, 5.0, 0.18],
    [72, 27, 4.6, 5.2, 0.18],
    [47, 39, 3.5, 2.8, 0.16],
    [66, 41, 3.8, 2.8, 0.16],
    [49, 84, 2.8, 2.0, 0.14],
    [64, 85, 2.8, 2.0, 0.14],
    [46, 78, 4.2, 3.0, 0.16],
    [66, 77, 4.0, 3.0, 0.16],
    [73, 86, 4.4, 2.6, 0.16],
    [91, 32, 3.2, 4.0, 0.18],
    [103, 54, 3.4, 5.0, 0.18],
  ]);
  addThicket([
    [49, 66, 2.4, 3.4, 0.12],
    [98, 74, 2.6, 4.2, 0.12],
    [13, 82, 2.8, 3.0, 0.12],
  ], BAMBOO, "kaBamboo");

  // 6) 境界・草・石垣の装飾。参照の密度に寄せるが、主要道は空ける。
  for (const i of b.expand(road, 2)) noFlower.add(i);
  for (let y = 83; y <= 91; y++) for (let x = 50; x <= 62; x++) if (inb(x, y)) noFlower.add(idx(x, y));

  const inMeadow = (i: number) => !solidSet.has(i) && !forest.has(i);
  const meadowCells = new Set<number>();
  for (let i = 0; i < W * H; i++) if (inMeadow(i) && !noFlower.has(i)) meadowCells.add(i);
  const stoneSet = new Set<number>(stoneWallCells);
  const nearStone = new Set<number>();
  for (const i of b.expand(stoneSet, 1)) if (meadowCells.has(i)) nearStone.add(i);
  const nearForest = new Set<number>();
  for (const i of b.expand(forest, 1)) if (meadowCells.has(i) && !nearStone.has(i)) nearForest.add(i);
  const roadEdge = new Set<number>();
  for (const i of b.expand(road, 1)) if (!road.has(i) && meadowCells.has(i)) roadEdge.add(i);
  const riverEdge = new Set<number>();
  for (const i of b.expand(river, 1)) if (!river.has(i) && !solidSet.has(i)) riverEdge.add(i);
  const quietMeadow = new Set<number>();
  for (const i of meadowCells) if (!roadEdge.has(i) && !nearStone.has(i) && !nearForest.has(i)) quietMeadow.add(i);

  b.scatterDecals(0.10, [6, 11, 15], nearForest, "tile.ka_decor_set");
  b.scatterDecals(0.06, [2, 6, 11], nearStone, "tile.ka_decor_set");
  b.scatterDecals(0.02, [2, 6], quietMeadow, "tile.ka_decor_set");
  const flowerSource = new Set<number>(nearStone);
  for (const i of flowerSource) {
    if (!meadowCells.has(i) || road.has(i)) continue;
    const x = i % W, y = Math.floor(i / W);
    const h = (Math.imul(x + 17, 73856093) ^ Math.imul(y + 23, 19349663)) >>> 0;
    if (h % 100 >= 1) continue;
    b.prop("obj.flower_cluster", x + ((h >>> 7) % 3 - 1) * 0.18, y + ((h >>> 11) % 3 - 1) * 0.18, 24, 24, {
      frame: (h >>> 5) % 4, footW: 0, shadow: false, id: `fc:${x}_${y}`,
    });
  }

  b.prop("obj.curve_overlay_3x1", 25, 78, 48, 16, { footW: 0, shadow: false, ysort: false, id: "curve:sw_terrace" });
  b.prop("obj.curve_overlay_2x2", 49, 72, 32, 32, { footW: 0, shadow: false, ysort: false, id: "curve:center_lower" });
  b.prop("obj.curve_overlay_3x1", 82, 75, 48, 16, { footW: 0, shadow: false, ysort: false, id: "curve:east_terrace" });

  // 7) ランドマーク。広い谷で各ランドマークが1画面に詰まらないよう配置する。
  b.prop("obj.torii", 56, 31, 56, 48, { footW: 0, shadow: false });
  b.prop("obj.hokora", 56, 10, 48, 56, { footW: 2, id: "hokora:tanada" });
  b.prop("obj.tree_oak", 43, 10, 72, 96, { footW: 2 });
  b.prop("obj.tree_blossom", 68, 11, 64, 82, { footW: 2 });
  b.prop("obj.tree_blossom", 48, 30, 56, 72, { footW: 1, id: "sakura:shrine_west" });
  b.prop("obj.tree_blossom", 65, 31, 52, 68, { footW: 1, id: "sakura:shrine_east" });
  b.prop("obj.lantern", 51, 30, 24, 40, { footW: 1 });
  b.prop("obj.lantern", 62, 30, 24, 40, { footW: 1 });
  b.prop("obj.jizo", 66, 29, 28, 36, { footW: 1 });

  b.prop("obj.minka_a", 96, 35, 56, 56, { footW: 2 });
  b.prop("obj.minka_b", 101, 43, 56, 56, { footW: 2 });
  b.prop("obj.minka_b", 33, 84, 56, 52, { footW: 2, id: "minka:tanada_southwest" });

  b.prop("obj.tree_blossom", 28, 26, 64, 82, { footW: 2 });
  b.prop("obj.tree_blossom", 44, 58, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 93, 67, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 66, 86, 52, 68, { footW: 1, id: "sakura:south_path" });
  b.prop("obj.bamboo", 46, 67, 48, 72, { footW: 1 });
  b.prop("obj.bamboo", 99, 76, 48, 72, { footW: 1 });
  b.prop("obj.sign", 59, 84, 16, 16, { footW: 1, id: "sign:tanada" });

  // 道幅を締めたあとも、右岸集落は入口まで歩けるように最後に導線を戻す。
  carveLatePath([[79, 31], [89, 32], [96, 35], [101, 43]], 1.25);
  carveLatePath([[91, 34], [96, 37], [101, 44]], 0.9);
  carveLatePath([[94, 36], [98, 38], [101, 44]], 0.85);
  walkBlob(96, 35, 2.8, 1.5, PATH);
  walkBlob(101, 44, 3.0, 1.4, PATH);

  for (const wx of [54, 55, 56, 57, 58]) b.warp(wx, 91, "kiritate", 53, 20, "left");


  // 到達不能な歩行セルを森で封鎖。開始点はkiritateからの着地座標。
  {
    const seen = new Uint8Array(W * H);
    const start = idx(56, 86);
    const stack = [start]; seen[start] = 1;
    while (stack.length) {
      const i = stack.pop() as number, x = i % W, y = Math.floor(i / W);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const j = idx(nx, ny);
        if (seen[j] || b.data.collision[j]) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    const unreachable = new Set<number>();
    for (let i = 0; i < W * H; i++) {
      if (!b.data.collision[i] && !seen[i]) {
        unreachable.add(i);
      }
    }
    if (unreachable.size > 0) {
      b.paintAuto(unreachable, FOREST, "kaForest2", "ground", true);
      for (const i of unreachable) {
        const x = i % W, y = Math.floor(i / W);
        solidSet.add(i);
        forest.add(i);
        noFlower.add(i);
        b.data.deco[i] = 0;
        b.solid(x, y, true);
      }
      b.data.decals = b.data.decals.filter((d) => !unreachable.has(idx(Math.round(d.x), Math.round(d.y))));
    }
  }

  // 封鎖で橋の歩行河川などが森化され水路が分断された後に、残った孤立小水面を森へ均す
  // （地形接続のない浮き水＝全面スキャン「孤立水」(85,28)等を最終的に解消する）。
  {
    const isW = (i: number) => { const t = ((b.data.ground[i] ?? 0) >> 8) - 1; return t === PADDY || t === RIVER || t === WFALL; };
    const seenW = new Uint8Array(W * H);
    for (let s = 0; s < W * H; s++) {
      if (seenW[s] || !isW(s)) continue;
      const comp: number[] = []; const stack = [s]; seenW[s] = 1;
      while (stack.length) {
        const i = stack.pop() as number; comp.push(i);
        const x = i % W, y = Math.floor(i / W);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx, ny = y + dy;
          if (!inb(nx, ny)) continue;
          const j = idx(nx, ny);
          if (!seenW[j] && isW(j)) { seenW[j] = 1; stack.push(j); }
        }
      }
      if (comp.length < 5) {                       // 孤立した小水面＝森へ均す（接続のある水域は不変）
        b.paintAuto(new Set(comp), FOREST, "kaForest2", "ground", true);
        for (const i of comp) {
          b.solid(i % W, Math.floor(i / W), true); solidSet.add(i);
          b.data.deco[i] = 0;
        }
      }
    }
  }

  // 高低差は「段差ブロックの下部だけ」を黒グラデにする（ユーザールール）。
  // 対象＝石垣(ISHI/SHRINE_WALL)・草付き土手(DOTE)・滝(WFALL)。水/草/道へは一切落とさない。
  // ブロックのセル自身に下が黒いグラデ(waBaseShadow)を重ね、ブロックの足元が陰になる。
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = tileAt(x, y);
    if (t === ISHI || t === SHRINE_WALL) b.deco(x, y, BASESHADOW, 2);
    else if (t === DOTE) b.deco(x, y, BASESHADOW, 1);
    else if (t === WFALL) b.deco(x, y, BASESHADOW, 0);
  }

  const data = b.done();
  data.outsideColor = "#2a4a20";
  data.atmosphere = {
    grade: "#ffe8b4", gradeAlpha: 0.16, gradeBlend: "soft-light",
    mistColor: "228,206,166", mistAlpha: 0.08,
    vignette: 0.24,
  };
  return data;
}
