import { MapBuilder } from "../../field/mapbuilder";
import { TS } from "../../field/tileset";
import type { MapData } from "../../field/tilemap";

// 棚田の谷（たなだのたに）— 2026-06-14 第3版（お手本=ZZ-HCP-logs/018 ＋ GPT-memo ＋ GPT-momo2 準拠）。
//
// 第2版へのユーザーFB: ①平地(草地)も棚田同様に段差化せよ ②棚田⇄平地の縦カスケード川が平坦で変→壁から落ちる小滝に
// ③石垣の角が直角すぎる ④お手本とかけ離れている。さらに「既存使い回しをやめ新規素材をどんどん作れ」。
//
// 対応（GPT-momo2の三原則）:
//  ・角を直角にしない … world_coastline_16 生成の【曲線オートタイル】(kaPaddy2/kaRiver2/kaPath2/kaForest2)を paintAuto。
//  ・石垣以外の高低差 … 草付き土手 kaDote を新設。中央スパインも段差化して「平地も高さがある」状態に。
//  ・床と輪郭の分離 … base地形→輪郭overlay(autotile辺/角)→高低差(南向き前面壁 frame5=上端縁+縦面+下影)→装飾→プロップ。
//  ・滝 … obj.waterfall を石垣/土手の段差に重ね、上段→下段へ水を落とす。
//
// 構図（直交2D見下ろし・北=高 / 南=低。擁壁はすべて南向き=frame5）:
//  ・北中央 H2 神域: 社/鳥居/御神木/灯籠/地蔵。苔石垣(kaIshigaki)で囲い石段で上がる。
//  ・中央スパイン H1: 蛇行する山道(kaPath2)＋草地(kaGrass2)。上段広場→草付き土手の段差→下段広場→南入口。
//  ・西/東 棚田: kaPaddy2 を段々にカスケード（南面に苔石垣＋滝）。鏡面水田＋曲線の畦。
//  ・東 集落: 茅葺き民家＋水車小屋。脇に川(kaRiver2 カットバンク=低い谷)＋木橋。
//  ・外周: 鎮守の森(kaForest2 縁ぼかし)＋竹林(kaBamboo)。花クラスタ/装飾で石垣沿いに量感。

const GRASS = TS.kaGrassCalm as number; // 静かなベース草（GPT-memo3=歩行域を騒がせない）
const PADDY = TS.kaPaddy2 as number;
const RIVER = TS.kaRiver2 as number;
const PATH = TS.kaPath2 as number;
const FOREST = TS.kaForest2 as number;
const BAMBOO = TS.kaBamboo as number;
const DOTE = TS.kaDote as number;       // 草付き土手（南向き前面=frame5）
const ISHI = TS.kaIshigaki as number;   // 苔石垣（南向き前面=frame5）
const STAIRS = TS.waStairs3 as number;  // 既存・石段（神域の昇り）

// 南向き前面フレーム（QA較正済）: dote/ishigaki とも frame5 が「上端の明るい縁＋縦面＋下の接地影」の主役。
const FACE = 5;
const ISHI_L = 10, ISHI_R = 9;   // ishigaki 角（SW/SE 曲線）
const DOTE_L = 4, DOTE_R = 6;    // dote 端キャップ（W/E）

export function buildTanada(): MapData {
  const W = 56, H = 46;
  const b = new MapBuilder("tanada", "棚田の谷", W, H, "field", "#2f5a2c", 11);
  const idx = (x: number, y: number) => y * W + x;
  const solidSet = new Set<number>();
  const noFlower = new Set<number>(); // 道など花を置かない領域

  // 谷床のベース草地（kaGrass2 の center 8変種をハッシュ散布＝チェッカー回避）
  const gf = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return h % 4; // calm草の center は 0-3（4-7は辺なので base には使わない）
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.ground(x, y, GRASS, gf(x, y));

  // ── 南向き擁壁（石垣 or 土手）。frame5=前面。1行で「上端縁+縦面+下影」が完結。 ──
  //   capY 行に front-face を敷き solid。端は角フレーム。skip(x) は段の通路（石段/道）を通す。
  //   wall の下段側(capY+1)に薄い落ち影 deco を重ね、段差を強調。
  const SHADOW = TS.waDropshadow as number;
  const wall = (tile: number, x0: number, x1: number, capY: number,
                lEnd: number, rEnd: number, skip?: (x: number) => boolean) => {
    for (let x = x0; x <= x1; x++) {
      if (skip && skip(x)) continue;
      const f = x === x0 ? lEnd : x === x1 ? rEnd : FACE;
      b.ground(x, capY, tile, f); b.solid(x, capY, true); solidSet.add(idx(x, capY));
      // 下段への接地影を最強に（GPT-memo3: 縦面ディテールより「上端の縁＋下端の影」を強調＝一目で段差と分かる）
      if (capY + 1 < H) b.deco(x, capY + 1, SHADOW, 3);
    }
  };

  // ── 棚田1段: kaPaddy2 を paintAuto（水鏡＋曲線の畦・角）→ 南面に苔石垣＋落ち口の滝 ──
  const paddy = (cx: number, cy: number, rx: number, ry: number, x0: number, x1: number, wallY: number) => {
    // GPT-memo3: 水面はシンプルな広い面に。輪郭のガタつきは外周(畦=paddy2のedge/角)で作る＝水を削らない。
    const blob = b.blob(cx, cy, rx, ry, 0.12);
    b.paintAuto(blob, PADDY, "kaPaddy2", "ground", true);
    for (const i of blob) solidSet.add(i);
    wall(ISHI, x0, x1, wallY, ISHI_L, ISHI_R);
  };

  // ════════════════════════════════════════════════════════════════════
  // 1) 外周＝鎮守の森（kaForest2 縁ぼかし）＋ 北の竹林（kaBamboo）
  // ════════════════════════════════════════════════════════════════════
  // 歩ける谷の輪郭（blob/道）を作り、その外を森で塗る。
  let meadow = b.blobUnion([
    [28, 41, 11, 5, 0.14],  // 南の入口広場
    [28, 33, 11, 6, 0.14],  // 下段広場
    [28, 24, 11, 6, 0.14],  // 中段広場
    [27, 15, 9, 5, 0.14],   // 上段広場（社直下）
    [45, 15, 9, 6, 0.15],   // 東の集落テラス
    [45, 28, 9, 6, 0.14],   // 東の見晴らし
    [20, 35, 7, 6, 0.13],   // 西の下段の野
  ]);
  const roadPts: [number, number][] = [[28, 44], [28, 38], [27, 31], [28, 23], [28, 16], [28, 12]];
  const branchPts: [number, number][] = [[28, 17], [35, 15], [42, 15], [47, 17]]; // 集落への枝道
  const road = new Set<number>();
  // レビュー反映: 道を細く（ベージュの矩形帯を解消）。主幹2.2/枝道1.6。周囲の草地で輪郭を崩す。
  for (const c of b.path(roadPts, 1.8)) road.add(c);
  for (const c of b.path(branchPts, 1.4)) road.add(c);
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
  // 2) 西の棚田カスケード（3段・南向き石垣＋滝）
  // ════════════════════════════════════════════════════════════════════
  // 各段で幅/中心を少し変える＝同形反復の矩形感を崩す
  paddy(10, 13, 5.0, 1.4, 5, 16, 15);
  paddy(12, 19, 6.0, 1.5, 6, 18, 21);
  paddy(10, 25, 5.5, 1.7, 5, 16, 28);

  // ════════════════════════════════════════════════════════════════════
  // 3) 東の棚田（2段）＋ 川（kaRiver2 カットバンク）＋ 木橋
  // ════════════════════════════════════════════════════════════════════
  paddy(45, 24, 5.5, 1.4, 40, 51, 26);
  paddy(44, 30, 6.0, 1.6, 39, 50, 33);

  // 川: 東の森から南へ。中央スパインとは交差しない（東側の谷）。カットバンク＋接地影で低い谷に見せる。
  const river = b.path([[40, 2], [38, 9], [40, 17], [38, 26], [40, 38], [39, 45]], 2.2);
  b.paintAuto(river, RIVER, "kaRiver2", "ground", true);
  for (const i of river) solidSet.add(i);
  // 川岸の接地影（川が地面を削って低く流れている＝谷感）。川に隣接する非川セルの下側に影 deco。
  for (const i of b.expand(river, 1)) {
    if (river.has(i)) continue;
    const x = i % W, y = Math.floor(i / W);
    if (forest.has(i) || solidSet.has(i)) continue;
    b.deco(x, y, SHADOW, 2);
  }

  // ════════════════════════════════════════════════════════════════════
  // 4) 北中央 H2 神域（苔石垣で囲い・石段で昇る）
  // ════════════════════════════════════════════════════════════════════
  const PX0 = 23, PX1 = 33, GY0 = 4, GY1 = 9, PCAP = 10;
  const STAIR: [number, number] = [27, 28];
  const isStair = (x: number) => STAIR.includes(x);
  // 上段草地（神域の床）＝歩行可へ（forest塗りのsolidを解除）
  for (let y = GY0; y <= GY1; y++) for (let x = PX0; x <= PX1; x++) {
    b.ground(x, y, GRASS, gf(x, y)); b.solid(x, y, false); solidSet.delete(idx(x, y));
  }
  // 南面の苔石垣（石段列は通路）
  wall(ISHI, PX0, PX1, PCAP, ISHI_L, ISHI_R, isStair);
  // 西/東の側面も石垣で閉じる（神域を島に）
  for (let y = GY0; y <= PCAP; y++) {
    b.ground(PX0, y, ISHI, 8); // W端キャップ
    b.ground(PX1, y, ISHI, 11);    // E端キャップ
    b.solid(PX0, y, true); b.solid(PX1, y, true); solidSet.add(idx(PX0, y)); solidSet.add(idx(PX1, y));
  }
  // 石段（PCAP→PCAP の1段ぶん＋下に1マス。神域は高いので2行）
  for (let i = 0; i < STAIR.length; i++) {
    const sx = STAIR[i] as number, left = i === 0;
    b.ground(sx, PCAP, STAIRS, left ? 1 : 2);
    b.ground(sx, PCAP + 1, STAIRS, left ? 13 : 14);
    b.solid(sx, PCAP, false); b.solid(sx, PCAP + 1, false);
    solidSet.delete(idx(sx, PCAP)); solidSet.delete(idx(sx, PCAP + 1));
    noFlower.add(idx(sx, PCAP)); noFlower.add(idx(sx, PCAP + 1));
  }

  // ════════════════════════════════════════════════════════════════════
  // 5) 中央スパインの段差（草付き土手）— 平地にも高さを出す（GPT-momo2 #3）
  // ════════════════════════════════════════════════════════════════════
  // 上段広場(社直下)→中段→下段 を草付き土手で仕切り、道(kaPath2)の所だけ通路にする。
  const doteStep = (capY: number, x0: number, x1: number) => {
    wall(DOTE, x0, x1, capY, DOTE_L, DOTE_R, (x) => road.has(idx(x, capY)));
  };
  doteStep(20, 22, 34); // 上段広場↓中段
  doteStep(29, 21, 35); // 中段↓下段

  // ── 山道（kaPath2・曲線境界の autotile）。歩行可。土手の通路は道で貫通 ──
  b.paintAuto(road, PATH, "kaPath2", "ground");
  for (const i of road) { const x = i % W, y = Math.floor(i / W); b.solid(x, y, false); solidSet.delete(i); noFlower.add(i); }

  // 木橋: 東枝道が川(x≈38-40,y15)を渡る所を歩行可化＋橋プロップ
  for (let x = 37; x <= 41; x++) { b.solid(x, 15, false); solidSet.delete(idx(x, 15)); b.ground(x, 15, PATH, 0); }
  b.prop("obj.bridge", 39, 15, 64, 40, { footW: 0, shadow: false });

  // ════════════════════════════════════════════════════════════════════
  // 6) 装飾（花の量感）— 石垣/土手沿い・畦・道縁に密度を寄せる
  // ════════════════════════════════════════════════════════════════════
  // レビュー反映: 道の周囲2マスは装飾ゼロ（道を読みやすく＝桜井「通行域の視認性」）。
  for (const i of b.expand(road, 2)) noFlower.add(i);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) noFlower.add(idx(28 + dx, 42 + dy)); // 入場点クリアゾーン

  const inMeadow = (i: number) => !solidSet.has(i) && !forest.has(i);
  const meadowCells = new Set<number>();
  for (let i = 0; i < W * H; i++) if (inMeadow(i) && !noFlower.has(i)) meadowCells.add(i);
  // 石組み（石垣/水田/川/土手）に近い歩行セル＝花の帯（最高密度）。
  // ※森は別扱い: solidSet には森も含まれるので、石組み専用集合(stoneSet=solidSet−forest)で算出する
  //   （Codexレビュー反映: でないと森の縁が花帯扱いになり nearForest の低木散布が餓死する）。
  const stoneSet = new Set<number>();
  for (const i of solidSet) if (!forest.has(i)) stoneSet.add(i);
  const nearStone = new Set<number>();
  for (const i of b.expand(stoneSet, 1)) if (meadowCells.has(i)) nearStone.add(i);
  // 森の縁を低木・シダ・切株でぼかす（森の境界は密度上限30-40%＝GPT-memo3）
  const nearForest = new Set<number>();
  for (const i of b.expand(forest, 1)) if (meadowCells.has(i) && !nearStone.has(i)) nearForest.add(i);
  b.scatterDecals(0.34, [3, 5, 12, 13, 15], nearForest, "tile.ka_decor_set");

  // GPT-memo3【引き算・情報の優先順位】:
  //  歩行域(開けた草地)は装飾ゼロ＝静かに（草ベースのみ）。装飾は段差/水辺/森縁に寄せ密度に上限。
  //  クラッタ(小石/枯草=ノイズ源)は撒かない。花は段差・水辺沿いのみ・低密度(20%)で。
  b.scatterDecals(0.16, [0, 1, 3], nearStone, "tile.ka_decor_set");        // 石垣/水辺沿いの花・低木（控えめ）
  b.scatterDecals(0.14, [0, 2, 3, 5], nearStone, "tile.flower_detail");    // 同・小花（控えめ）

  // 花クラスタ・プロップ＝石垣/土手の足元に「点在」（縦横の列に並べない＝GPT-memo3 禁止事項）。
  //   3マスおき＋±1ジッタ＋約45%間引き＋変種ランダムで、列状の反復を崩す。
  const wallFootRows = [16, 22, 29, 27, 33, 21, 30, 34];
  for (const wy of wallFootRows) {
    for (let x = 6; x <= 50; x += 3) {
      const h = (x * 73856093 ^ wy * 19349663) >>> 0;
      if (h % 100 < 45) continue;                 // 約45%間引き（連続配置の禁止）
      const jx = x + ((h >> 3) % 3) - 1;          // ±1 ジッタ（列を崩す）
      const i = idx(jx, wy);
      if (meadowCells.has(i)) {
        b.prop("obj.flower_cluster", jx, wy, 24, 24, { frame: (h >> 5) % 4, footW: 0, shadow: false, id: `fc:${jx}_${wy}` });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 7) 滝（石垣の段差に重ねて上段→下段へ水を落とす）
  // ════════════════════════════════════════════════════════════════════
  // 各棚田段に滝（上段→下段へ水を落とす。石垣の段差に重ねる）
  b.prop("obj.waterfall", 8, 16, 36, 56, { footW: 0, shadow: false });   // 西1段目の落ち口
  b.prop("obj.waterfall", 14, 22, 36, 56, { footW: 0, shadow: false });  // 西2段目
  b.prop("obj.waterfall", 9, 29, 36, 56, { footW: 0, shadow: false });   // 西3段目
  b.prop("obj.waterfall", 47, 27, 36, 56, { footW: 0, shadow: false });  // 東1段目
  b.prop("obj.waterfall", 43, 34, 36, 56, { footW: 0, shadow: false });  // 東2段目

  // ════════════════════════════════════════════════════════════════════
  // 8) ランドマーク
  // ════════════════════════════════════════════════════════════════════
  // 神域 H2
  b.prop("obj.torii", 27.5, 13, 64, 48, { footW: 0, shadow: false });
  b.prop("obj.hokora", 28, 6, 40, 48, { footW: 2, id: "hokora:tanada" });
  b.prop("obj.tree_oak", 24, 5, 64, 88, { footW: 2 });
  b.prop("obj.tree_blossom", 32, 5, 56, 72, { footW: 2 });
  b.prop("obj.lantern", 25, 12, 24, 40, { footW: 1 });
  b.prop("obj.lantern", 30, 12, 24, 40, { footW: 1 });
  b.prop("obj.jizo", 33, 13, 28, 36, { footW: 1 });
  // 集落
  b.prop("obj.windmill", 41, 13, 56, 72, { footW: 2, footH: 2 });
  b.prop("obj.minka_a", 45, 14, 56, 56, { footW: 2 });
  b.prop("obj.minka_b", 49, 17, 56, 56, { footW: 2 });
  // 樹木・竹
  b.prop("obj.tree_blossom", 20, 11, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 51, 12, 48, 72, { footW: 2 });
  b.prop("obj.tree_blossom", 19, 30, 56, 72, { footW: 2 });
  b.prop("obj.tree_pine", 14, 40, 48, 72, { footW: 2 });
  // （GPT-memo3レビュー: 南東のクラッタ集積を解消するため SE桜は削除＝桜の希少価値を保つ）
  b.prop("obj.bamboo", 24, 33, 48, 72, { footW: 1 });
  b.prop("obj.bamboo", 50, 34, 48, 72, { footW: 1 });
  b.prop("obj.sign", 30, 41, 16, 16, { footW: 1, id: "sign:tanada" });

  // ── 入口の鳥居＋戻り warp（南→kiritate 東口・3マス幅・往路と対）──
  b.prop("obj.torii", 28, 43, 64, 48, { footW: 0, shadow: false });
  for (const wx of [27, 28, 29]) b.warp(wx, 45, "kiritate", 53, 20, "left");

  const data = b.done();
  data.outsideColor = "#2a4a20";
  // 大気: 暖かい午後の里山光へ（レビュー反映=お手本の色温度に寄せる。彩度・明度を少し上げる）
  data.atmosphere = {
    grade: "#fff0c8", gradeAlpha: 0.20, gradeBlend: "soft-light",
    mistColor: "222,212,176", mistAlpha: 0.10,
    vignette: 0.26,
  };
  return data;
}
