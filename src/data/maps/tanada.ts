import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";

// 棚田の谷（たなだのたに）— 2026-06-14 Phase L1 骨格（LANDSCAPE_SETUP.md）。
// キーアート(ZZ-HCP-logs/016/shot01)準拠: 山道→川→段々の棚田→赤鳥居/水車/御神木。
// まず既存アセット(草/山道/川/森)で構図を可視化し、後で Agent Forge の絵画調タイルへ差し替える。
export function buildTanada(): MapData {
  const W = 56, H = 46;
  const b = new MapBuilder("tanada", "棚田の谷", W, H, "field", "#3a6a34", 11);
  b.fill(TS.kaGrass as number, [0, 1, 2, 3]);  // 絵画調・畦草（Agent Forge L2）

  // ── 歩ける谷床＋畦(あぜ)の動線 ──────────────────────────────────
  let meadow = b.blobUnion([
    [28, 41, 10, 5, 0.14],  // 南の入口広場（鳥居）
    [30, 30, 12, 9, 0.15],  // 谷床（中央・広め）
    [43, 26, 10, 8, 0.15],  // 東の集落テラス
    [30, 9, 9, 6, 0.14],    // 北の御神木の杜
    [24, 23, 6, 14, 0.13],  // 西の棚田わきの畦道
    [45, 38, 7, 5, 0.13],   // 南東の見晴らし
    [18, 38, 6, 4, 0.13],   // 南西の野
  ]);
  const roads: [number, number][][] = [
    [[28, 44], [29, 38], [27, 32], [30, 26], [29, 18], [30, 10]], // 南入口→北の御神木（主路）
    [[30, 26], [38, 25], [43, 25]],                                // 集落へ
    [[32, 32], [40, 37], [44, 37]],                                // 見晴らしへ
    [[27, 32], [24, 28], [24, 18]],                                // 西の棚田畦道へ
  ];
  for (const pts of roads) for (const c of b.path(pts, 3.0)) meadow.add(c);
  meadow = b.refine(meadow);

  // ── 外周＝鎮守の森（絵画調 L2）───────────────────────────────────
  b.paintAuto(b.invert(meadow), TS.kaForest as number, "kaForest", "ground", true);

  // ── 川（中央東・蛇行）N→S。絵画調の流れる川。先に塗り、橋(山道)を上から重ねる ──
  const river = b.path([[35, 1], [37, 10], [35, 20], [37, 30], [35, 45]], 2.4);
  b.paintAuto(river, TS.kaRiver as number, "kaRiver", "ground", true);

  // ── 棚田（西の斜面・段々にカスケード。waterEdge の水鏡） ──────────
  // 棚田＝厚め(ry=3)にして内部の水鏡セルを増やし、畦(edge)タイルの密集＝継ぎ目を減らす。
  const terraces: [number, number, number, number][] = [
    [14, 12, 7, 3], [16, 18, 7, 3], [17, 24, 7, 3], [16, 30, 7, 3],
  ];
  for (const [cx, cy, rx, ry] of terraces) {
    b.paintAuto(b.blob(cx, cy, rx, ry, 0.18), TS.kaPaddy as number, "kaPaddy", "ground", true);  // 絵画調・水鏡（L2）
  }

  // ── 山道（蛇行・川を渡る所は橋＝歩行可で上書き）─────────────────────
  const road = new Set<number>();
  for (const pts of roads) for (const c of b.path(pts, 2.3)) road.add(c);
  b.paintAuto(road, TS.kaPath as number, "kaPath");  // 絵画調・石畳の山道（L2）
  for (const i of road) b.solid(i % W, Math.floor(i / W), false); // 川を渡る橋を含め歩行可

  // ── 装飾密度（柱D）: 花・草・草株を高密度散布して描き込み感を出す ─────
  b.scatterDecals(0.15, [0, 1, 2, 3, 4, 5, 6, 7], meadow);
  b.scatterDecals(0.08, [0, 1, 2, 3], meadow, "tile.flower_detail");
  // 草株（斬れる・立体的な茂み）を谷床に散らす
  const tufts: [number, number][] = [
    [25, 35], [33, 33], [40, 30], [27, 28], [35, 34], [44, 31], [22, 38],
    [31, 36], [38, 28], [26, 40], [42, 34], [29, 32], [46, 35], [24, 30],
    [37, 39], [32, 27], [48, 33], [20, 36], [43, 28], [30, 38],
  ];
  for (const [tx, ty] of tufts) {
    b.prop("obj.grass_tuft", tx, ty, 16, 16, { id: `grass:t${tx}_${ty}`, footW: 0, shadow: false });
  }

  // ── ランドマーク（キーアート構図）───────────────────────────────
  b.prop("obj.torii", 28, 43, 64, 48, { footW: 0, shadow: false });   // 入口の赤鳥居
  b.prop("obj.windmill", 39, 16, 56, 72, { footW: 2, footH: 2 });     // 川辺の水車
  b.prop("obj.tree_oak", 30, 7, 64, 88, { footW: 2 });                // 御神木（北の巨木）
  b.prop("obj.hokora", 33, 9, 40, 48, { footW: 2, id: "hokora:tanada" });
  b.prop("obj.minka_a", 45, 23, 56, 56, { footW: 2 });                // 集落（茅葺き）
  b.prop("obj.minka_b", 48, 28, 56, 56, { footW: 2 });
  b.prop("obj.tree_blossom", 24, 13, 56, 72, { footW: 2 });           // 桜（棚田わき）
  b.prop("obj.tree_blossom", 22, 33, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 12, 39, 48, 72, { footW: 2 });
  b.prop("obj.tree_pine", 50, 13, 48, 72, { footW: 2 });
  // 谷を縁取る木々（描き込み・キーアートの緑の密度）
  b.prop("obj.tree_blossom", 41, 40, 56, 72, { footW: 2 });
  b.prop("obj.tree_oak", 47, 18, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 34, 38, 48, 72, { footW: 2 });
  b.prop("obj.tree_pine", 19, 11, 48, 72, { footW: 2 });
  b.prop("obj.bamboo", 27, 24, 48, 72, { footW: 1 });
  b.prop("obj.bamboo", 49, 35, 48, 72, { footW: 1 });
  b.prop("obj.bamboo", 18, 33, 48, 72, { footW: 1 });
  b.prop("obj.sign", 31, 41, 16, 16, { footW: 1, id: "sign:tanada" });

  // ── 戻り warp（南の鳥居 → kiritate 東口）。3マス幅。村の東ゲートに着地（往路と対） ──
  for (const wx of [27, 28, 29]) b.warp(wx, 45, "kiritate", 53, 20, "left");

  const data = b.done();
  data.outsideColor = "#2a4a20";
  // ── 大気（Phase L3）: 暖かいゴールデンアワー＋遠景のもや＋ビネットでキーアートの柔らかさへ ──
  data.atmosphere = {
    grade: "#ffd6a0", gradeAlpha: 0.22, gradeBlend: "soft-light",
    mistColor: "208,222,216", mistAlpha: 0.16,
    vignette: 0.30,
  };
  return data;
}
