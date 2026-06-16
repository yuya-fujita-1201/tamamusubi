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
  // 茅葺き民家×3（minka_a）。ユーザーFB(2026-06-13): 人間に対し家が小さすぎ
  //  → 描画を 56x42→82x62（面積≈2倍）に拡大し、入口の扉がミトの身長と整合する大きさに。
  //  footprint は footW3→4 のみ（建物基部の通行不可帯。上部は庇＝Yソートで奥に回る）。
  b.prop("obj.minka_a", 14, 18, 82, 62, { footW: 4, footH: 2 });
  b.prop("obj.minka_a", 42, 16, 82, 62, { footW: 4, footH: 2 });
  b.prop("obj.minka_a", 22, 28, 82, 62, { footW: 4, footH: 2 });
  // 瓦屋根民家×2（minka_b）
  b.prop("obj.minka_b", 38, 28, 82, 62, { footW: 4, footH: 2 });
  b.prop("obj.minka_b", 14, 30, 82, 62, { footW: 4, footH: 2 });
  // 水車小屋（池のほとり）
  b.prop("obj.windmill", 10, 9,  56, 72, { footW: 2, footH: 2 });
  // 鳥居（広場の北に）
  b.prop("obj.torii", 28, 9, 64, 48, { footW: 0, shadow: false });
  // 鳥居は通り抜け（柱の当たり判定なし）。オブリーク時の左ドリフトで門前(y9)が絞られないようにする（ユーザーFB）。
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
  // 村人（雑談）— ユーザーFB: 鈴代と同じ見た目の村人が並ぶのは不自然 → 村人を別スプライト化＋種類を増やす
  // 農婦
  b.npc({
    id: "villager_a",
    sheet: "npc.villager_a",
    x: 32, y: 22,
    facing: "left",
    dialog: [
      "南の大鳥居を抜けると里山郷が広がるよ。\nあの辺は最近、狐火が多いから気をつけてね。",
    ],
  });
  // 農夫の男性
  b.npc({
    id: "villager_b",
    sheet: "npc.villager_b",
    x: 24, y: 21,
    facing: "right",
    dialog: [
      "今年の早苗はよう育っとる。\n依代さまの灯が戻ってからは、\n気もずいぶん澄んできたわ。",
    ],
  });
  // 子供（小柄に表示＝等身は低くてOK・ユーザーFB）
  b.npc({
    id: "villager_c",
    sheet: "npc.villager_c",
    x: 31, y: 24,
    facing: "up",
    drawSize: 21,
    dialog: [
      "ねえ、結び師さまだ！\nおいらも大きくなったら、\n勾玉さがしの旅に出るんだ！",
    ],
  });

  // ── 南の道を確実に通す（平原への出口・satoyamaからの着地点を歩行可能に）──
  // x27-33 の縦帯を y34-39 まで道としてクリア（村スタート→平原の主動線）。
  // オブリーク時は「下移動＝右へドリフト」するため、右寄り(27→33)に7マス幅へ拡張してドリフトを受け止める（ユーザーFB）。
  const southGate = new Set<number>();
  for (let y = 34; y <= 39; y++) for (let x = 27; x <= 33; x++) southGate.add(y * W + x);
  b.paintAuto(southGate, TS.path as number, "path");
  for (const i of southGate) b.solid(i % W, Math.floor(i / W), false);

  // ── warp ───────────────────────────────────────────────────
  // 南端 → 始まりの里山郷（satoyama）北端。7マス幅(27-33)。着地は satoyama 北の道(44,3)
  for (const wx of [27, 28, 29, 30, 31, 32, 33]) b.warp(wx, 39, "satoyama", 44, 3, "down");

  // ── 北の鳥居から高台(takadai)へ抜ける道（立体実験マップへの入口）──
  // 鳥居(28,9)の北側 x24-30 y1..8 を道としてクリアし、北端に7マス幅warp。
  // オブリーク時は「上移動＝左へドリフト」するため、左寄り(30→24)に7マス幅へ拡張してドリフトを受け止める（ユーザーFB）。
  const northGate = new Set<number>();
  for (let y = 1; y <= 8; y++) for (let x = 24; x <= 30; x++) northGate.add(y * W + x);
  b.paintAuto(northGate, TS.path as number, "path");
  for (const i of northGate) b.solid(i % W, Math.floor(i / W), false);
  b.prop("obj.sign", 32, 8, 16, 16, { footW: 1, id: "sign:takadai_road" }); // 看板は拡張帯(24-30)の外へ
  for (const wx of [24, 25, 26, 27, 28, 29, 30]) b.warp(wx, 1, "takadai", 20, 27, "up");

  // ── 東の道 → 棚田の谷（tanada）。村の東口から谷へ抜ける動線 ──
  // 中央広場(28,20)から東へ伸びる道を東端(x55)まで開通し、東端に3マス幅warp。
  const eastGate = new Set<number>();
  for (let y = 19; y <= 21; y++) for (let x = 42; x <= 55; x++) eastGate.add(y * W + x);
  b.paintAuto(eastGate, TS.path as number, "path");
  for (const i of eastGate) b.solid(i % W, Math.floor(i / W), false);
  b.prop("obj.sign", 41, 18, 16, 16, { footW: 1, id: "sign:tanada_road" }); // 看板（道の外）
  for (const wy of [19, 20, 21]) b.warp(55, wy, "tanada", 56, 86, "up");

  const data = b.done();
  data.outsideColor = "#3a5a30";
  return data;
}
