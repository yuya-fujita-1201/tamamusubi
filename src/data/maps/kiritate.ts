import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";

// 霧立の里（56×40）— Phase 1A 拠点村。
// 茅葺き民家・瓦屋根・水車小屋・鳥居が並ぶ明るい和風の集落。
// 石畳の広場を中心に、池・小川・桜が配置される。
// NPC: 鈴代（世界観紹介）、村人（雑談）。敵なし。

export function buildKiritate(): MapData {
  const W = 56, H = 40;
  const b = new MapBuilder("kiritate", "霧立の里", W, H, "town", "#5a8850", 7);
  b.fill(TS.grass as number, [0, 1, 2, 3]);

  // ── 歩ける領域（村全体の広場＋周辺草地）───────────────────────────
  let village = b.blobUnion([
    [28, 20, 20, 14, 0.14],  // 中央広場
    [28,  8,  7,  5, 0.14],  // 北の入口
    [14, 20,  8,  6, 0.13],  // 西の民家地区
    [42, 20,  8,  6, 0.13],  // 東の民家地区
    [28, 32,  9,  6, 0.14],  // 南の出口（satoyama北端へ）
    [14, 32,  6,  4, 0.13],  // 南西の小路
    [42, 32,  6,  4, 0.13],  // 南東の路地
  ]);

  // 南北の中央通り
  for (const c of b.path([[28, 2], [27, 8], [29, 14], [28, 20], [28, 32], [28, 38]], 3.2)) village.add(c);
  // 東西の通り
  for (const c of b.path([[28, 20], [18, 19], [14, 20]], 2.8)) village.add(c);
  for (const c of b.path([[28, 20], [38, 21], [42, 20]], 2.8)) village.add(c);
  // 南の小路
  for (const c of b.path([[18, 30], [14, 32]], 2.2)) village.add(c);
  for (const c of b.path([[38, 30], [42, 32]], 2.2)) village.add(c);

  village = b.refine(village);

  // 外周をすべて鎮守の森樹冠で囲む
  const outside = b.invert(village);
  b.paintAuto(outside, TS.cliff as number, "cliff", "ground", true);

  // ── 石畳の広場（中央）─────────────────────────────────────────
  const plaza = b.blob(28, 20, 8, 6, 0.12);
  const plazaFiltered = new Set<number>();
  for (const c of plaza) if (village.has(c)) plazaFiltered.add(c);
  b.paintAuto(plazaFiltered, TS.path as number, "path");

  // ── 道（広場から延びる）──────────────────────────────────────
  const road = b.path([[28, 3], [27, 9], [29, 15], [28, 20], [28, 33], [28, 39]], 2.5);
  const roadE = b.path([[28, 20], [39, 20], [42, 20]], 2.2);
  const roadW = b.path([[28, 20], [17, 20], [14, 20]], 2.2);
  const roadSW = b.path([[20, 28], [14, 32]], 2.0);
  const roadSE = b.path([[36, 28], [42, 32]], 2.0);
  for (const c of [...roadE, ...roadW, ...roadSW, ...roadSE]) road.add(c);
  for (const c of [...road]) {
    if (!village.has(c)) road.delete(c);
  }
  b.paintAuto(road, TS.path as number, "path");

  // ── 池（北西隅）──────────────────────────────────────────────
  const pond = b.blob(12, 12, 4, 3, 0.18);
  b.paintAuto(pond, TS.waterEdge as number, "waterEdge", "ground", true);

  // ── デカール散布 ─────────────────────────────────────────────
  b.scatterDecals(0.09, [0, 1, 2, 3, 4, 5, 6, 7], village);
  b.scatterDecals(0.04, [0, 1, 2, 3], village, "tile.flower_detail");

  // ── 建物・ランドマーク ──────────────────────────────────────
  // 茅葺き民家×3（minka_a）
  b.prop("obj.minka_a", 14, 18, 56, 42, { footW: 3, footH: 2 });
  b.prop("obj.minka_a", 42, 16, 56, 42, { footW: 3, footH: 2 });
  b.prop("obj.minka_a", 22, 28, 56, 42, { footW: 3, footH: 2 });
  // 瓦屋根民家×2（minka_b）
  b.prop("obj.minka_b", 38, 28, 56, 42, { footW: 3, footH: 2 });
  b.prop("obj.minka_b", 14, 30, 56, 42, { footW: 3, footH: 2 });
  // 水車小屋（池のほとり）
  b.prop("obj.windmill", 10, 9,  56, 72, { footW: 2, footH: 2 });
  // 鳥居（広場の北に）
  b.prop("obj.torii", 28, 9, 64, 48, { footW: 0, shadow: false });
  b.solid(26, 9); b.solid(29, 9);
  // 祠（小さな hokora・広場西）
  b.prop("obj.hokora", 18, 24, 40, 48, { footW: 2, id: "hokora:kiritate" });
  // 桜と松（景観）
  b.prop("obj.tree_blossom", 44, 26, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 34, 10, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom",  8, 24, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine",    42, 10, 48, 72, { footW: 2 });
  b.prop("obj.tree_pine",    10, 28, 48, 72, { footW: 2 });
  // 竹林（東端）
  b.prop("obj.bamboo", 44, 32, 48, 72, { footW: 1 });
  b.prop("obj.bamboo", 46, 24, 48, 72, { footW: 1 });
  // 草むら（斬れる）
  const tufts: [number, number][] = [
    [20, 14], [36, 14], [10, 18], [44, 22], [12, 34], [44, 36],
  ];
  for (const [tx, ty] of tufts) {
    b.prop("obj.grass_tuft", tx, ty, 16, 16, { id: `grass:k${tx}_${ty}`, footW: 0, shadow: false });
  }

  // ── NPC ─────────────────────────────────────────────────────
  // 鈴代（世界観紹介 NPC）
  b.npc({
    id: "suzushiro",
    sheet: "npc.suzushiro",
    x: 26, y: 19,
    facing: "down",
    dialog: [
      "ようこそ、霧立の里へ。\nわたしは鈴代。この里の巫女よ。",
      "穢れた気が里山に漂いはじめた。\n討つんじゃないよ。祓うんだ。\n命を奪うのでなく、穢れを解くの。",
      "依代（よりしろ）になった獣や木霊を見たら、\nまず祓いの間合いに入りなさい。\n玉結びの力が、きっと道を開くから。",
    ],
  });
  // 村人（雑談）
  b.npc({
    id: "villager",
    sheet: "npc.suzushiro",
    x: 32, y: 22,
    facing: "left",
    dialog: [
      "南の大鳥居を抜けると里山郷が広がるよ。\nあの辺は最近、狐火が多いから気をつけてな。",
    ],
  });

  // ── warp ───────────────────────────────────────────────────
  // 南端 → 始まりの里山郷（satoyama）北端。
  // 着地点は satoyama の北端warpより1マス南（y=1）
  b.warp(28, 39, "satoyama", 44, 1, "down");

  const data = b.done();
  data.outsideColor = "#3a5a30";
  return data;
}
