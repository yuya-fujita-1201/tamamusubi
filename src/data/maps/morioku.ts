import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";
import { game } from "../../state/game";

// 杜の奥（40×32）— Phase 1A ボス前域。
// 鎮守の杜の深部。薄暗く、石灯籠の光が点在する。
// 中央に開けた円形広場（ボスアリーナ予定）。道中に穢れた精霊が潜む。
// 奥に勾玉の祠（宝箱）。

export function buildMorioku(): MapData {
  const W = 40, H = 32;
  const b = new MapBuilder("morioku", "杜の奥", W, H, "mori", "#1a2a18", 13);
  b.fill(TS.grass as number, [0, 1, 2, 3]); // 杜の下草（暗闇0.32で深い森に見せる）

  // ── 歩ける領域（道と広場を blob で彫る）──────────────────────────
  let walkable = b.blobUnion([
    [20, 15, 11, 10, 0.15],  // 中央の円形広場（ボスアリーナ）
    [20,  5,  5,  4, 0.14],  // 北の入口通路
    [ 9, 15,  5,  4, 0.13],  // 西の支道
    [31, 15,  5,  4, 0.13],  // 東の支道
    [20, 26,  5,  3, 0.14],  // 南の行き止まり（祠前）
  ]);

  // 北から広場への曲がり道
  for (const c of b.path([[20, 1], [19, 6], [21, 10], [20, 15]], 3.0)) walkable.add(c);
  // 南の祠への道
  for (const c of b.path([[20, 20], [21, 24], [20, 28]], 2.8)) walkable.add(c);
  // 東西の脇道
  for (const c of b.path([[20, 15], [11, 14], [ 9, 15]], 2.5)) walkable.add(c);
  for (const c of b.path([[20, 15], [29, 16], [31, 15]], 2.5)) walkable.add(c);

  walkable = b.refine(walkable);

  // 外周を森の壁で埋める
  const outside = b.invert(walkable);
  b.paintAuto(outside, TS.cliff as number, "cliff", "ground", true); // 鎮守の森の樹冠

  // ── 床タイル（杜の床=forest）────────────────────────────────────
  // walkable 内は forest タイルで上書き
  for (const c of walkable) {
    const x = c % W, y = Math.floor(c / W);
    b.ground(x, y, TS.grass as number, Math.floor(Math.random() * 4));
  }

  // ── デカール散布 ─────────────────────────────────────────────
  b.scatterDecals(0.06, [0, 1, 2, 3], walkable);

  // ── 石灯籠（光源兼ランドマーク）────────────────────────────────
  const lanterns: [number, number][] = [
    [16, 12], [24, 12], [12, 18], [28, 18], [20, 24],
  ];
  for (const [lx, ly] of lanterns) {
    b.prop("obj.lantern", lx, ly, 16, 32, { footW: 1, shadow: false });
  }

  // ── 御神木と竹 ─────────────────────────────────────────────
  b.prop("obj.tree_oak", 10, 10, 56, 72, { footW: 2 });
  b.prop("obj.tree_oak", 30, 10, 56, 72, { footW: 2 });
  b.prop("obj.bamboo",   10, 22, 48, 72, { footW: 1 });
  b.prop("obj.bamboo",   30, 22, 48, 72, { footW: 1 });

  // ── 草むら ────────────────────────────────────────────────
  const tufts: [number, number][] = [
    [17, 8], [23, 8], [13, 16], [27, 16],
  ];
  for (const [tx, ty] of tufts) {
    b.prop("obj.grass_tuft", tx, ty, 16, 16, { id: `grass:m${tx}_${ty}`, footW: 0, shadow: false });
  }

  // ── 祠（勾玉の宝箱）─────────────────────────────────────────
  b.prop("obj.hokora", 20, 29, 40, 48, { footW: 2, id: "hokora:morioku_magatama" });
  b.prop("obj.chest", 22, 28, 16, 16, {
    id: "chest:morioku_magatama",
    frame: game.flags.has("chest:morioku_magatama") ? 3 : 0,
  });

  // ── 敵（道中に少数）─────────────────────────────────────────
  b.spawn("kodama", 14, 14);
  b.spawn("kodama", 26, 14);
  b.spawn("kitsunebi", 11, 18);
  b.spawn("kitsunebi", 29, 18);

  // ── warp ───────────────────────────────────────────────────
  // 北端 → 始まりの里山郷（satoyama）南の杜口。
  // 着地点は satoyama のwarp(44,52)より1マス手前（y=51）
  b.warp(20, 0, "satoyama", 44, 51, "up");

  // ── 光源（石灯籠の位置に）────────────────────────────────────
  const data = b.done();
  data.darkness = 0.32;
  data.lights = [
    { x: 16 * 16, y: 12 * 16, r: 80 },
    { x: 24 * 16, y: 12 * 16, r: 80 },
    { x: 12 * 16, y: 18 * 16, r: 80 },
    { x: 28 * 16, y: 18 * 16, r: 80 },
    { x: 20 * 16, y: 24 * 16, r: 80 },
  ];
  data.outsideColor = "#0a1408";
  return data;
}
