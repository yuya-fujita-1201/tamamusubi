import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";

// 棚田の谷（たなだのたに）— 2026-06-14 第4版（お手本=ZZ-HCP-logs/018 ＋ 指示=ZZ-HCP-logs/020/GPT-memo 準拠）。
//
// GPT Pro最重要診断: 「素材不足ではなく、地形パーツ同士の【接続文法】が弱い」。3エリアを文法から作り直す:
//  ① 棚田の滝 … 「貼り付けオブジェクト」をやめ、上段水田→落ち口→石垣の切り欠き→短い滝→滝壺 を縦1モジュール(obj.spillway)で接続。
//  ② 右側の川と橋 … 川を低い谷(H0)として描き(kaRiver3 カットバンク岸+強い接地影)、橋は 橋下影→橋床→橋台→道 のセットで接地。
//  ③ 上部の神社高台 … 棚田パーツの流用をやめ、神社専用文法(kaShrineWall=dressed ashlar / kaShrineGround=神域の平場 / obj.shrine_stairs=切り込み石段)に分離。鳥居→石段→平場→社の導線を通す。
//  ④ 128pxグリッド … 森/道/川岸/石垣の境界に kaEdgeOverlay を散布し大判 obj.curve_overlay を重ねて切り貼り感を分断。
//
// 構図（直交2D見下ろし・北=高 / 南=低。擁壁はすべて南向き=frame5）:
//  ・北中央 H2 神域: 社/鳥居/御神木/灯籠/地蔵。神社石垣(kaShrineWall)で囲い中央の切り込み石段(obj.shrine_stairs)で上がる。
//  ・中央スパイン H1: 蛇行する山道(kaPath2)＋草地(kaGrassCalm)。上段広場→草付き土手の段差→下段広場→南入口。
//  ・西/東 棚田: kaPaddy2 を段々にカスケード（南面に苔石垣＋埋め込み滝 obj.spillway）。
//  ・東 集落: 茅葺き民家＋水車小屋(obj.watermill_channel=分水路接続)。脇に川(kaRiver3 低い谷)＋木橋セット。
//  ・外周: 鎮守の森(kaForest2 縁ぼかし)＋竹林(kaBamboo)。

const GRASS = TS.kaGrassCalm as number; // 静かなベース草（歩行域を騒がせない）
const PADDY = TS.kaPaddy2 as number;
const RIVER = TS.kaRiver3 as number;    // L4: kaRiver2 → kaRiver3（低い谷・カットバンク岸）
const PATH = TS.kaPath2 as number;
const FOREST = TS.kaForest2 as number;
const BAMBOO = TS.kaBamboo as number;
const DOTE = TS.kaDote as number;       // 草付き土手（南向き前面=frame5）
const ISHI = TS.kaIshigaki as number;   // 苔石垣（棚田の段差・南向き前面=frame5）
const SHRINE_WALL = TS.kaShrineWall as number;   // L4: 神社専用擁壁（dressed ashlar・棚田と分離）
const SHRINE_GND = TS.kaShrineGround as number;  // L4: 神域の平場（低ノイズ）
const EDGE_OVL = "tile.ka_edge_overlay_set";     // L4: 境界破砕オーバーレイ（scatterDecals用sheet）

// 南向き前面フレーム（QA較正済）: dote/ishigaki/shrine_wall とも frame5 が「上端の明るい縁＋縦面＋下の接地影」の主役。
const FACE = 5;
const ISHI_L = 10, ISHI_R = 9;       // ishigaki 角（SW/SE 曲線）
const DOTE_L = 4, DOTE_R = 6;        // dote 端キャップ（W/E）
const SHRINE_L = 10, SHRINE_R = 9;   // shrine_wall 角（SW/SE 曲線）

export function buildTanada(): MapData {
  const W = 56, H = 46;
  const b = new MapBuilder("tanada", "棚田の谷", W, H, "field", "#2f5a2c", 11);
  const idx = (x: number, y: number) => y * W + x;
  const solidSet = new Set<number>();
  const noFlower = new Set<number>(); // 道など花を置かない領域

  // 谷床のベース草地（kaGrassCalm の center 8変種をハッシュ散布＝チェッカー回避）
  const gf = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return h % 4; // calm草の center は 0-3
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.ground(x, y, GRASS, gf(x, y));

  // ── 南向き擁壁（石垣 or 土手 or 神社石垣）。frame5=前面。1行で「上端縁+縦面+下影」が完結。 ──
  //   capY 行に front-face を敷き solid。端は角フレーム。skip(x) は段の通路（石段/道/滝の切り欠き）を通す。
  const SHADOW = TS.waDropshadow as number;
  const wall = (tile: number, x0: number, x1: number, capY: number,
                lEnd: number, rEnd: number, skip?: (x: number) => boolean) => {
    for (let x = x0; x <= x1; x++) {
      if (skip && skip(x)) continue;
      const f = x === x0 ? lEnd : x === x1 ? rEnd : FACE;
      b.ground(x, capY, tile, f); b.solid(x, capY, true); solidSet.add(idx(x, capY));
      // 下段への接地影を最強に（GPT-memo: 「上端の縁＋下端の影」で一目で段差と分かる）
      if (capY + 1 < H) b.deco(x, capY + 1, SHADOW, 3);
    }
  };

  // ── 棚田1段: kaPaddy2 を paintAuto（水鏡＋曲線の畦・角）→ 南面に苔石垣。skipX=滝の切り欠き列 ──
  const paddy = (cx: number, cy: number, rx: number, ry: number, x0: number, x1: number, wallY: number,
                 skipX?: number) => {
    const blob = b.blob(cx, cy, rx, ry, 0.12);
    b.paintAuto(blob, PADDY, "kaPaddy2", "ground", true);
    for (const i of blob) solidSet.add(i);
    wall(ISHI, x0, x1, wallY, ISHI_L, ISHI_R, skipX !== undefined ? (x) => x === skipX : undefined);
  };

  // ── 埋め込み滝スピルウェイ: 石垣の切り欠き(skipX列)に縦3タイルモジュールを重ねる ──
  //   上段水田(wallY-1)→石垣切欠き(wallY)→滝壺(wallY+1)。ysort:false=地面オーバーレイ(プレイヤーの下)。
  // 描画サイズは論理px（=HDソースpx÷SS8）。spillway源128x384→論理16x48（1×3タイル）。
  const spillway = (x: number, wallY: number) => {
    b.prop("obj.spillway", x, wallY + 2, 16, 48, { footW: 0, shadow: false, ysort: false });
  };

  // ════════════════════════════════════════════════════════════════════
  // 1) 外周＝鎮守の森（kaForest2 縁ぼかし）＋ 北の竹林（kaBamboo）
  // ════════════════════════════════════════════════════════════════════
  let meadow = b.blobUnion([
    [28, 41, 11, 5, 0.14],  // 南の入口広場
    [28, 33, 11, 6, 0.14],  // 下段広場
    [28, 24, 11, 6, 0.14],  // 中段広場
    [27, 15, 9, 5, 0.14],   // 上段広場（社直下）
    [45, 15, 9, 6, 0.15],   // 東の集落テラス
    [45, 28, 9, 6, 0.14],   // 東の見晴らし
    [20, 35, 7, 6, 0.13],   // 西の下段の野
  ]);
  // 道はS字に蛇行（お手本020「道は曲がりくねらせる」。直線で神社を見通させない＝探索感）。
  const roadPts: [number, number][] = [[28, 44], [27, 38], [29, 32], [26, 25], [28, 18], [28, 12]];
  const branchPts: [number, number][] = [[28, 18], [35, 15], [42, 15], [49, 17]]; // 集落への枝道
  // 東スパイン: 集落→東下段（見晴らし/2段目棚田周辺）を棚田の東を抜けて接続（QA P0: 東下段の孤立解消）。
  const eastSpinePts: [number, number][] = [[49, 17], [52, 23], [52, 30], [47, 35]];
  const road = new Set<number>();
  for (const c of b.path(roadPts, 1.8)) road.add(c);
  for (const c of b.path(branchPts, 1.4)) road.add(c);
  for (const c of b.path(eastSpinePts, 1.4)) road.add(c);
  for (const c of road) meadow.add(c);
  meadow = b.refine(meadow);

  const forest = b.invert(meadow);
  b.paintAuto(forest, FOREST, "kaForest2", "ground", true);
  for (const i of forest) solidSet.add(i);
  // 北端2行を竹林の壁に置換（背景・歩行不可）
  for (let y = 0; y <= 1; y++) for (let x = 0; x < W; x++) {
    if (forest.has(idx(x, y))) { b.ground(x, y, BAMBOO, gf(x, y) % 4); }
  }

  // ════════════════════════════════════════════════════════════════════
  // 2) 西の棚田カスケード（3段・南向き石垣＋埋め込み滝）
  // ════════════════════════════════════════════════════════════════════
  paddy(10, 13, 5.0, 1.4, 5, 16, 15, 8);
  spillway(8, 15);
  paddy(12, 19, 6.0, 1.5, 6, 18, 21, 14);
  spillway(14, 21);
  paddy(10, 25, 5.5, 1.7, 5, 16, 28, 9);
  spillway(9, 28);

  // ════════════════════════════════════════════════════════════════════
  // 3) 東の棚田（2段）＋ 川（kaRiver3=低い谷）＋ 木橋セット＋水車小屋
  // ════════════════════════════════════════════════════════════════════
  paddy(45, 24, 5.5, 1.4, 40, 51, 26, 47);
  spillway(47, 26);
  paddy(44, 30, 6.0, 1.6, 39, 50, 33, 43);
  spillway(43, 33);

  // 川: 東の森から南へ蛇行。中央スパインとは交差しない（東側の谷）。
  const river = b.path([[40, 2], [38, 9], [40, 17], [38, 26], [40, 38], [39, 45]], 2.2);
  b.paintAuto(river, RIVER, "kaRiver3", "ground", true);
  for (const i of river) solidSet.add(i);
  // 川岸の接地影（川が地面を削って低く流れる＝谷感）。frame3=最強影。
  for (const i of b.expand(river, 1)) {
    if (river.has(i)) continue;
    const x = i % W, y = Math.floor(i / W);
    if (forest.has(i) || solidSet.has(i)) continue;
    b.deco(x, y, SHADOW, 3);
  }

  // ── 橋セット: y=15 で枝道が川を渡る。橋下影→橋床→橋台→道の順で接地 ──
  // 描画サイズは論理px（=HDソース÷SS8）。bridge源256x128→論理32x16（2×1タイル）/ abutment源128→論理16（1タイル）。
  b.prop("obj.bridge_shadow", 39, 15, 32, 16, { footW: 0, shadow: false, ysort: false }); // A) 橋下水影（最下層・先挿入）
  b.prop("obj.bridge2", 39, 15, 32, 16, { footW: 0, shadow: false, ysort: false });        // B) 橋床（地面オーバーレイ・上を歩く）
  b.prop("obj.bridge_abutment", 36, 15, 16, 16, { footW: 0, shadow: false, ysort: true });  // C) 左岸橋台
  b.prop("obj.bridge_abutment", 42, 15, 16, 16, { footW: 0, shadow: false, ysort: true });  // D) 右岸橋台
  for (let x = 36; x <= 42; x++) { b.solid(x, 15, false); solidSet.delete(idx(x, 15)); b.ground(x, 15, PATH, 0); } // E) 橋を歩行可化

  // ── 水車小屋（obj.watermill_channel=分水路接続。川の畔） ──
  // watermill源256x256→論理48x48（建物として存在感を出すため約1.5倍上げ＝3×3タイル相当）。
  b.prop("obj.watermill_channel", 40, 12, 48, 48, { footW: 2, footH: 2, shadow: false, ysort: true, id: "watermill:tanada" });
  // collisionは prop() の footW2/footH2 が solidRect(39,10,2,2) を自動実行（QA P1: 重複登録を排除）。solidSet追跡のみ手動。
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) solidSet.add(idx(39 + dx, 10 + dy));

  // ════════════════════════════════════════════════════════════════════
  // 4) 北中央 H2 神域（神社専用石垣で囲い・切り込み石段で昇る）— 棚田と文法を分離
  // ════════════════════════════════════════════════════════════════════
  const PX0 = 23, PX1 = 33, GY0 = 4, GY1 = 9, PCAP = 10;
  const isStair = (x: number) => x === 27 || x === 28;
  // [1] 神域の床＝神社専用グラウンド（神聖・低ノイズ）。center変種のみ→直接frame指定。
  for (let y = GY0; y <= GY1; y++) for (let x = PX0; x <= PX1; x++) {
    b.ground(x, y, SHRINE_GND, gf(x, y) % 8); b.solid(x, y, false); solidSet.delete(idx(x, y));
  }
  // [2] 南面の正面擁壁＝神社石垣（石段列27,28は通路）
  wall(SHRINE_WALL, PX0, PX1, PCAP, SHRINE_L, SHRINE_R, isStair);
  // [3] 西/東の側面も神社石垣で閉じる（神域を島に）
  for (let y = GY0; y <= PCAP; y++) {
    b.ground(PX0, y, SHRINE_WALL, 6); // W端
    b.ground(PX1, y, SHRINE_WALL, 7); // E端
    b.solid(PX0, y, true); b.solid(PX1, y, true); solidSet.add(idx(PX0, y)); solidSet.add(idx(PX1, y));
  }
  // [4] 切り込み石段モジュールを壁の切り欠きに嵌める。源256x384→論理32x48（2×3タイル）。
  //     ty=13・h=48→描画はy10-12(歩行通路と一致)、上端が神域床(GY1=9)に接続。
  //     石段は「歩く床」なので ysort:false（地面オーバーレイ＝プレイヤーが上に乗る。Codex P2反映）。
  b.prop("obj.shrine_stairs", 28, 13, 32, 48, { footW: 0, shadow: false, ysort: false });
  // 石段通路の歩行可化（x=27,28・y=10〜13＝鳥居の踊り場まで連続）
  for (const sx of [27, 28]) for (const sy of [10, 11, 12, 13]) { b.solid(sx, sy, false); solidSet.delete(idx(sx, sy)); noFlower.add(idx(sx, sy)); }

  // ════════════════════════════════════════════════════════════════════
  // 5) 中央スパインの段差（草付き土手）— 平地にも高さを出す
  // ════════════════════════════════════════════════════════════════════
  const doteStep = (capY: number, x0: number, x1: number) => {
    wall(DOTE, x0, x1, capY, DOTE_L, DOTE_R, (x) => road.has(idx(x, capY)));
  };
  doteStep(20, 22, 34); // 上段広場↓中段
  doteStep(29, 21, 35); // 中段↓下段

  // ── 山道（kaPath2・曲線境界の autotile）。歩行可。土手の通路は道で貫通 ──
  b.paintAuto(road, PATH, "kaPath2", "ground");
  for (const i of road) { const x = i % W, y = Math.floor(i / W); b.solid(x, y, false); solidSet.delete(i); noFlower.add(i); }

  // ════════════════════════════════════════════════════════════════════
  // 6) 装飾（花の量感）＋ 境界破砕オーバーレイ（128pxグリッド分断）
  // ════════════════════════════════════════════════════════════════════
  for (const i of b.expand(road, 2)) noFlower.add(i);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) noFlower.add(idx(28 + dx, 42 + dy)); // 入場点クリアゾーン

  const inMeadow = (i: number) => !solidSet.has(i) && !forest.has(i);
  const meadowCells = new Set<number>();
  for (let i = 0; i < W * H; i++) if (inMeadow(i) && !noFlower.has(i)) meadowCells.add(i);
  const stoneSet = new Set<number>();
  for (const i of solidSet) if (!forest.has(i)) stoneSet.add(i);
  const nearStone = new Set<number>();
  for (const i of b.expand(stoneSet, 1)) if (meadowCells.has(i)) nearStone.add(i);
  const nearForest = new Set<number>();
  for (const i of b.expand(forest, 1)) if (meadowCells.has(i) && !nearStone.has(i)) nearForest.add(i);

  // 引き算・情報の優先順位: 歩行域(開けた草地)は静かに。装飾は段差/水辺/森縁に寄せ密度に上限。
  b.scatterDecals(0.22, [3, 5, 12, 13, 15], nearForest, "tile.ka_decor_set");          // 森縁の低木・シダ・切株
  b.scatterDecals(0.16, [0, 1, 3], nearStone, "tile.ka_decor_set");                     // 石垣/水辺沿いの花・低木（控えめ）
  b.scatterDecals(0.14, [0, 2, 3, 5], nearStone, "tile.flower_detail");                 // 同・小花（控えめ）

  // ── 境界破砕オーバーレイ（kaEdgeOverlay。128px境界を控えめに崩す。GPT-memo「全体のタイル境界改善」）──
  // ★密度は抑制（GPT-memo「引き算・情報の優先順位」: 歩行域を騒がせない）。境界だけに薄く。
  // 森縁(f0-3)=低木/根/影 / 道縁(f4-7)=草の食い込み / 川岸(f8-11)=侵食土手/湿石/葦 / 石垣・棚田縁(f12-15)
  b.scatterDecals(0.22, [0, 1, 2, 3], nearForest, EDGE_OVL);
  const roadEdge = new Set<number>();
  for (const i of b.expand(road, 1)) if (!road.has(i) && meadowCells.has(i)) roadEdge.add(i);
  b.scatterDecals(0.12, [4, 5, 6, 7], roadEdge, EDGE_OVL);
  const riverEdge = new Set<number>();
  for (const i of b.expand(river, 1)) if (!river.has(i) && !solidSet.has(i)) riverEdge.add(i);
  b.scatterDecals(0.26, [8, 9, 10, 11], riverEdge, EDGE_OVL);
  b.scatterDecals(0.16, [12, 13, 14, 15], nearStone, EDGE_OVL);

  // 花クラスタ・プロップ＝石垣/土手の足元に「点在」（縦横の列に並べない）。
  // dote段差の cap 行(20,29)は除外＝段差の縁ラインを花で隠さない（QA桜井 P1）。
  const wallFootRows = [16, 22, 27, 33, 21, 30, 34];
  for (const wy of wallFootRows) {
    for (let x = 6; x <= 50; x += 3) {
      const h = (x * 73856093 ^ wy * 19349663) >>> 0;
      if (h % 100 < 45) continue;
      const jx = x + ((h >>> 3) % 3) - 1;     // 符号なしシフト（QA P0: >>だと負フレーム/左偏りが出る）
      const i = idx(jx, wy);
      if (meadowCells.has(i)) {
        b.prop("obj.flower_cluster", jx, wy, 24, 24, { frame: (h >>> 5) % 4, footW: 0, shadow: false, id: `fc:${jx}_${wy}` });
      }
    }
  }

  // ── 大判曲線オーバーレイ（obj.curve_overlay_2x2）は密なシダ塊で装飾過剰になるため不採用。
  //    grid分断は kaEdgeOverlay の薄い散布に一本化（GPT-memo「引き算・情報の優先順位」）。 ──

  // ════════════════════════════════════════════════════════════════════
  // 7) ランドマーク
  // ════════════════════════════════════════════════════════════════════
  // 神域 H2（鳥居→石段→平場→社の縦導線）。
  //   鳥居は石段の踊り場(y14)に置き小さめに＝背後の石段(y10-12)を覆い隠さない（視覚忠実度QA: 「鳥居の奥が壁」解消）。
  //   社/御神木は石垣上端より上(y4-5)へ＝石垣越しに「上に神域がある」と読ませる。
  b.prop("obj.torii", 27.5, 14, 52, 40, { footW: 0, shadow: false });
  b.prop("obj.hokora", 28, 5, 40, 48, { footW: 2, id: "hokora:tanada" });
  b.prop("obj.tree_oak", 24, 4, 64, 88, { footW: 2 });
  b.prop("obj.tree_blossom", 32, 4, 56, 72, { footW: 2 });
  b.prop("obj.lantern", 25, 14, 24, 40, { footW: 1 });
  b.prop("obj.lantern", 30, 14, 24, 40, { footW: 1 });
  b.prop("obj.jizo", 33, 14, 28, 36, { footW: 1 });
  // 集落（民家）
  b.prop("obj.minka_a", 45, 14, 56, 56, { footW: 2 });
  b.prop("obj.minka_b", 49, 17, 56, 56, { footW: 2 });
  // 樹木・竹
  b.prop("obj.tree_blossom", 20, 11, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 51, 12, 48, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 19, 30, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 14, 40, 48, 72, { footW: 2 });
  b.prop("obj.bamboo", 24, 33, 48, 72, { footW: 1 });
  b.prop("obj.bamboo", 50, 34, 48, 72, { footW: 1 });
  b.prop("obj.sign", 30, 41, 16, 16, { footW: 1, id: "sign:tanada" });

  // ── 入口の鳥居＋戻り warp（南→kiritate 東口・3マス幅・往路と対）──
  b.prop("obj.torii", 28, 43, 64, 48, { footW: 0, shadow: false });
  for (const wx of [27, 28, 29]) b.warp(wx, 45, "kiritate", 53, 20, "left");

  // ── 到達不能な歩行セルを森で封鎖（棚田の畦のジッタが作る1セルの孤立ノッチを根絶＝BFS iso=0保証） ──
  {
    const seen = new Uint8Array(W * H);
    const stack = [idx(28, 44)]; seen[idx(28, 44)] = 1;
    while (stack.length) {
      const i = stack.pop() as number, x = i % W, y = Math.floor(i / W);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (seen[j] || b.data.collision[j]) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    for (let i = 0; i < W * H; i++) {
      if (!b.data.collision[i] && !seen[i]) { b.ground(i % W, Math.floor(i / W), FOREST, 0); b.solid(i % W, Math.floor(i / W), true); }
    }
  }

  const data = b.done();
  data.outsideColor = "#2a4a20";
  // 大気: 暖かい午後のゴールデンアワー（お手本の色温度に寄せる。強すぎる場合は0.24から調整）
  data.atmosphere = {
    grade: "#ffe8b4", gradeAlpha: 0.24, gradeBlend: "soft-light",
    mistColor: "228,206,166", mistAlpha: 0.12,
    vignette: 0.24,
  };
  return data;
}
