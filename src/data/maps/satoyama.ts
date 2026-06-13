import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";
import { game } from "../../state/game";

// 始まりの里山郷・外縁フィールド（88×64）— Phase 1A リメイク。
// 明るい和風の里山台地。北に大鳥居と霧立の里への道、北西に池＋水車小屋、
// 東に小川と桟橋風小道、南東に見晴らし郭、南に深い杜の入口（杜の奥へ）。
// ※ 南端の空抜け（skyVoid / bgs parallax）は廃止。外周はすべて鎮守の森樹冠で囲む。

export function buildSatoyama(): MapData {
  const W = 88, H = 64;
  const b = new MapBuilder("satoyama", "始まりの里山郷", W, H, "field", "#4e8040", 11);
  b.fill(TS.grass as number, [0, 1, 2, 3]);

  // ── 歩ける台地（大きな中央草原＋枝葉の出丸）──────────────────────
  let meadow = b.blobUnion([
    [44, 32, 26, 20, 0.15],   // 中央大台地
    [44, 12,  9,  6, 0.15],   // 北ロビー（大鳥居前）
    [62, 32,  9,  7, 0.14],   // 東の出丸
    [26, 32,  9,  7, 0.14],   // 西の出丸
    [26, 16,  8,  6, 0.15],   // 北西の池の岸辺
    [44, 50, 12,  7, 0.15],   // 南の杜入口テラス
    [66, 48,  8,  6, 0.13],   // 南東の見晴らし郭
    [20, 46,  7,  5, 0.13],   // 南西の小径先
    [70, 20,  7,  5, 0.13],   // 東北の出丸
  ]);

  // 北の道（大鳥居へ続く）
  for (const c of b.path([[44, 2], [43, 8], [45, 14], [44, 20]], 3.5)) meadow.add(c);
  // 南の道（杜の入口へ）
  for (const c of b.path([[44, 36], [43, 44], [44, 52]], 3.5)) meadow.add(c);
  // 東西の道
  for (const c of b.path([[44, 30], [55, 29], [62, 32]], 3.0)) meadow.add(c);
  for (const c of b.path([[44, 30], [33, 31], [26, 32]], 3.0)) meadow.add(c);
  // 南東の見晴らし郭へ
  for (const c of b.path([[54, 42], [62, 46], [66, 48]], 2.8)) meadow.add(c);
  // 東小川沿いの桟橋風小道
  for (const c of b.path([[62, 32], [68, 24], [70, 20]], 2.8)) meadow.add(c);
  // 北西の池の岸辺へ
  for (const c of b.path([[33, 22], [28, 18], [26, 16]], 2.5)) meadow.add(c);
  // 南西の小径
  for (const c of b.path([[33, 44], [26, 46], [20, 46]], 2.5)) meadow.add(c);

  meadow = b.refine(meadow);

  // ── 外側をすべて鎮守の森樹冠で埋める（skyVoid なし）──────────────
  const outside = b.invert(meadow);
  b.paintAuto(outside, TS.cliff as number, "cliff", "ground", true);

  // ── 道（蛇行）────────────────────────────────────────────────────
  const road = b.path([[44, 3], [43, 9], [45, 16], [44, 22], [44, 30], [43, 40], [44, 52]], 2.6);
  const roadE = b.path([[44, 30], [56, 28], [62, 32]], 2.3);
  const roadW = b.path([[44, 30], [32, 32], [26, 32]], 2.3);
  const roadSE = b.path([[54, 42], [63, 46], [66, 48]], 2.2);
  const roadNE = b.path([[62, 32], [69, 23], [70, 20]], 2.2);
  const roadNW = b.path([[33, 22], [27, 18], [26, 16]], 2.2);
  const roadSW = b.path([[33, 44], [25, 46], [20, 46]], 2.2);
  for (const c of [...roadE, ...roadW, ...roadSE, ...roadNE, ...roadNW, ...roadSW]) road.add(c);
  for (const c of [...road]) if (!meadow.has(c)) road.delete(c);
  b.paintAuto(road, TS.path as number, "path");

  // ── 池（北西・水際遷移つき）─────────────────────────────────────
  const pond = b.blob(25, 14, 5, 4, 0.2);
  b.paintAuto(pond, TS.waterEdge as number, "waterEdge", "ground", true);

  // ── 東の小川（細い帯）─────────────────────────────────────────
  const stream = b.path([[68, 18], [69, 26], [68, 34]], 1.8);
  const streamSet = new Set<number>();
  for (const c of stream) if (meadow.has(c)) streamSet.add(c);
  b.paintAuto(streamSet, TS.waterEdge as number, "waterEdge", "ground", true);

  // ── デカール散布 ─────────────────────────────────────────────
  b.scatterDecals(0.10, [0, 1, 2, 3, 4, 5, 6, 7], meadow);
  b.scatterDecals(0.04, [0, 1, 2, 3], meadow, "tile.flower_detail");

  // ── ランドマーク ─────────────────────────────────────────────
  // 大鳥居（北の道の上・通り抜けられる門）
  // 鳥居は通り抜け（柱の当たり判定なし）。オブリーク時の左ドリフトで門前が絞られないようにする（ユーザーFB）。
  b.prop("obj.torii", 44, 9.5, 64, 48, { footW: 0, shadow: false });
  // 水車小屋（池のほとり）
  b.prop("obj.windmill", 20, 12, 56, 72, { footW: 2, footH: 2 });
  // 小さな祠 hokora（北ロビー右手。ランドマーク）
  b.prop("obj.hokora", 48, 14, 40, 48, { footW: 2, id: "hokora:satoyama_north" });
  // 桜・松・楢（景観配置）
  b.prop("obj.tree_blossom", 35, 26, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 54, 22, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 60, 40, 56, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 30, 40, 56, 72, { footW: 2 });
  b.prop("obj.tree_oak", 38, 42, 56, 72, { footW: 2 });    // 御神木
  b.prop("obj.tree_oak", 52, 36, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 72, 18, 48, 72, { footW: 2 });   // 和松
  b.prop("obj.tree_pine", 24, 26, 48, 72, { footW: 2 });
  b.prop("obj.tree_pine", 64, 46, 48, 72, { footW: 2 });
  // 竹林
  b.prop("obj.bamboo", 22, 20,  48, 72, { footW: 1 });
  b.prop("obj.bamboo", 62, 50,  48, 72, { footW: 1 });
  b.prop("obj.bamboo", 68, 40,  48, 72, { footW: 1 });
  b.prop("obj.bamboo", 18, 44,  48, 72, { footW: 1 });

  // 草むら（斬れる）
  const tufts: [number, number][] = [
    [40, 18], [49, 17], [56, 26], [35, 34], [53, 34],
    [66, 26], [22, 34], [30, 46], [50, 46], [42, 52],
    [61, 30], [26, 26], [37, 52], [58, 46], [46, 24],
  ];
  for (const [tx, ty] of tufts) {
    b.prop("obj.grass_tuft", tx, ty, 16, 16, { id: `grass:s${tx}_${ty}`, footW: 0, shadow: false });
  }

  // 看板（チュートリアル＋Phase 1A の指標）
  // チュートリアル看板。北ゲートのクリア帯(43-45)から外して当たり判定が消えないようにする（Codexレビュー）
  b.prop("obj.sign", 47, 11, 16, 16, { footW: 1, id: "sign:tutorial" });
  b.prop("obj.sign", 67, 50, 16, 16, { footW: 1, id: "sign:phase0" });

  // 見晴らし郭の宝箱
  b.prop("obj.chest", 68, 50, 16, 16, {
    id: "chest:satoyama_gp",
    frame: game.flags.has("chest:satoyama_gp") ? 3 : 0,
  });

  // ── 敵（台地に分散。プレイヤー初期位置 22,8 から離す）─────────────
  // kitsunebi×6
  b.spawn("kitsunebi", 38, 28);
  b.spawn("kitsunebi", 52, 24);
  b.spawn("kitsunebi", 28, 38);
  b.spawn("kitsunebi", 56, 38);
  b.spawn("kitsunebi", 48, 50);
  b.spawn("kitsunebi", 65, 30);
  // karakasa×4
  b.spawn("karakasa", 34, 44);
  b.spawn("karakasa", 58, 42);
  b.spawn("karakasa", 42, 56);
  b.spawn("karakasa", 22, 42);
  // kodama×3
  b.spawn("kodama", 62, 22);
  b.spawn("kodama", 30, 28);
  b.spawn("kodama", 66, 46);

  // ── 北の道を確実に通す（自動生成ノイズや柱で塞がる問題対策・ユーザーFB「村へ行けない」）──
  // x40-46 の縦帯を y0-10 まで歩行可能な道として明示的にクリアする。
  // ※ paintAuto は solid=false でも collision をクリアしないため、solid(false) を別途当てる。
  // オブリーク時は「上移動＝左へドリフト」するため、左寄り(45→40)に7マス幅へ拡張してドリフトを受け止める（ユーザーFB）。
  const northGate = new Set<number>();
  for (let y = 0; y <= 10; y++) for (let x = 40; x <= 46; x++) northGate.add(y * W + x);
  b.paintAuto(northGate, TS.path as number, "path");
  for (const i of northGate) b.solid(i % W, Math.floor(i / W), false);

  // 南の杜口（morioku への縦通路）も拡張。下移動＝右ドリフトのため右寄り(44→50)に7マス幅へ。
  const moriGate = new Set<number>();
  for (let y = 50; y <= 52; y++) for (let x = 44; x <= 50; x++) moriGate.add(y * W + x);
  b.paintAuto(moriGate, TS.path as number, "path");
  for (const i of moriGate) b.solid(i % W, Math.floor(i / W), false);

  // ── warp ───────────────────────────────────────────────────
  // 北端 → 霧立の里（kiritate）。7マス幅(40-46)でトリガーを取りこぼさない。着地は kiritate 南の道(28,36)
  for (const wx of [40, 41, 42, 43, 44, 45, 46]) b.warp(wx, 0, "kiritate", 28, 36, "down");
  // 南の杜口 → 杜の奥（morioku）。7マス幅(44-50)。着地点はmorioku北端の道(20,1)
  for (const wx of [44, 45, 46, 47, 48, 49, 50]) b.warp(wx, 52, "morioku", 20, 1, "down");

  const data = b.done();
  data.outsideColor = "#2a4a20";
  return data;
}
