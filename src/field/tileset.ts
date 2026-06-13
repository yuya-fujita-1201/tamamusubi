// タイル参照 = (タイルセット index << 8) | フレーム番号。
// 衝突はタイルと独立した collision グリッドで持つ（タイル見た目と分離）。

export interface TileSetDef {
  key: string;          // 論理名
  sheet: string;        // アセットキー
  animFps?: number;     // 指定時、フレームを時間でループ（水・松明）
  animFrames?: number;
  fallback?: string;    // 画像未着時の色
}

export const TILESETS: TileSetDef[] = [
  { key: "grass", sheet: "tile.grass", fallback: "#4e9a4e" },          // 0
  { key: "path", sheet: "tile.path_set", fallback: "#b09060" },        // 1
  { key: "plaza", sheet: "tile.plaza", fallback: "#9a9a8e" },          // 2
  { key: "water", sheet: "tile.water", animFps: 4, animFrames: 4, fallback: "#3a6ed0" }, // 3
  { key: "forest", sheet: "tile.forest_floor", fallback: "#3a7a3a" },  // 4
  { key: "thicket", sheet: "tile.thicket_set", fallback: "#2a5a2a" },  // 5
  { key: "caveFloor", sheet: "tile.cave_floor", fallback: "#5a5a6e" }, // 6
  { key: "caveWall", sheet: "tile.cave_wall_set", fallback: "#32323e" }, // 7
  { key: "grassDetail", sheet: "tile.grass_detail", fallback: "#5aaa5a" }, // 8 (装飾オーバーレイ)
  // ── ここから 5.1 追加（既存マップの参照 index を壊さないよう末尾に追記） ──
  { key: "cliff", sheet: "tile.cliff_set", fallback: "#a8855a" },      // 9 渓谷岩塊（ゼファリム）
  { key: "waterEdge", sheet: "tile.water_edge_set", fallback: "#3a6ed0" }, // 10 池の水際遷移
  { key: "lava", sheet: "tile.lava", animFps: 4, animFrames: 4, fallback: "#e06018" }, // 11
  { key: "lavaEdge", sheet: "tile.lava_edge_set", fallback: "#b04812" }, // 12 溶岩の岸遷移
  { key: "volcanoWall", sheet: "tile.volcano_wall_set", fallback: "#2c1a18" }, // 13
  { key: "basaltFloor", sheet: "tile.basalt_floor", fallback: "#4a3c3a" }, // 14
  { key: "shallow", sheet: "tile.shallow_set", fallback: "#39c4cf" },  // 15 浅瀬の砂浜遷移
  { key: "waterTropical", sheet: "tile.water_tropical", animFps: 4, animFrames: 4, fallback: "#2fb8c9" }, // 16
  { key: "sand", sheet: "tile.sand", fallback: "#e8ddc0" },            // 17
  { key: "ruinFloor", sheet: "tile.ruin_floor", fallback: "#cfc9b8" }, // 18
  { key: "flowerDetail", sheet: "tile.flower_detail", fallback: "#5aaa5a" }, // 19 (装飾オーバーレイ)
  { key: "forestEdge", sheet: "tile.forest_edge_set", fallback: "#1e3d1e" }, // 20 暗い森の壁（迷路の森）
  // ── 5.5 天空マップ（ルミナス・アルカ） ──
  { key: "cloud", sheet: "tile.cloud", animFps: 3, animFrames: 4, fallback: "#dfe8f4" }, // 21 雲海
  { key: "cloudEdge", sheet: "tile.cloud_edge_set", fallback: "#dfe8f4" }, // 22 浮島の縁
  { key: "arcaFloor", sheet: "tile.arca_floor", fallback: "#e8e2d0" },     // 23 天空の白石床
  { key: "arcaWall", sheet: "tile.arca_wall_set", fallback: "#cfc6ae" },   // 24 大理石の段差壁（高低差）
  { key: "arcaStairs", sheet: "tile.arca_stairs", fallback: "#d8d2c0" },   // 25 白石の階段
  { key: "skyBelow", sheet: "tile.sky_below", animFps: 2, animFrames: 4, fallback: "#3a72c8" }, // 26 眼下の大空
  { key: "arcaPath", sheet: "tile.arca_path_set", fallback: "#b8a888" },   // 27 風化した石畳の参道
  { key: "islandBase", sheet: "tile.island_base_set", fallback: "#8a6a48" }, // 28 浮島の岩盤断面
  // 29 雲野原: 5.12で静止化（縁タイルがアニメ不能なため動静混在を解消）。
  // 内部の雲は cloudGrassEdge の center フレームを直接塗る（paintCloudVoid）ため、このシートは現在未使用。
  { key: "cloudField", sheet: "tile.cloudfield", fallback: "#cfe2f4" },
  { key: "cloudGrassEdge", sheet: "tile.cloudfield_grass_set", fallback: "#cfe2f4" }, // 30 雲↔島の草縁
  { key: "cloudStoneEdge", sheet: "tile.cloudfield_stone_set", fallback: "#cfe2f4" }, // 31 雲↔石の参道縁
  // ── 5.12 壁の方向別セット（天面/正面/側面リム/コーナー。arca.ts の paintArcaWalls 専用） ──
  { key: "arcaWallDir", sheet: "tile.arca_wall_dir_set", fallback: "#cfc6ae" },       // 32
  // ── 5.13 HD-2D化（虚空=EMPTY+背景1枚絵）。崖=石組み擁壁、縁=透明フリンジ ──
  { key: "arcaCliff", sheet: "tile.arca_cliff_set", fallback: "#a89070" },            // 33
  { key: "arcaFringe", sheet: "tile.arca_fringe_set", fallback: "#cfe2f4" },          // 34
  { key: "arcaFringeStone", sheet: "tile.arca_fringe_stone_set", fallback: "#cfe2f4" }, // 35
  { key: "arcaStairs2", sheet: "tile.arca_stairs2", fallback: "#d8d2c0" },            // 36
];

export const TS = Object.fromEntries(TILESETS.map((t, i) => [t.key, i])) as Record<string, number>;

/** タイル参照値を作る */
export function T(setIdx: number, frame = 0): number {
  return ((setIdx + 1) << 8) | frame; // +1: 0 を「空」に予約
}
export const EMPTY = 0;

export function tileSet(ref: number): TileSetDef | undefined {
  if (ref === EMPTY) return undefined;
  return TILESETS[(ref >> 8) - 1];
}
export function tileFrame(ref: number): number { return ref & 0xff; }

// ── 遷移タイルセット(4x4=16フレーム)の隣接シグネチャ → フレーム対応 ──
// 生成画像の実配置に合わせて後から調整できるよう、ここで一元管理する。
// シグネチャ: 上下左右のうち「地形外（=下地側）」に接している辺の組合せ。
export interface TransitionMap {
  center: number[];  // 内部（全周同地形）バリエーション
  n: number; e: number; s: number; w: number;     // その辺だけ外に接する
  /** 外コーナー（隣接2辺が外に接する）。未定義のコーナーは center にフォールバック */
  nw?: number; ne?: number; sw?: number; se?: number;
  fallbackCenter?: boolean; // マッピング外のセルは center にする（市松化防止）
}

// 既定マッピング（プロンプトの指示順を仮定。生成後の視覚QAで実物に合わせて更新する）
// 5.1 のプロンプトは Row1=center / Row2=N,S,W,E / Row3=NW,NE,SW,SE / Row4=accent を指示している。
export const DEFAULT_TRANS: TransitionMap = {
  center: [0, 1, 2, 3],
  n: 4, s: 5, w: 6, e: 7,
  nw: 8, ne: 9, sw: 10, se: 11,
  fallbackCenter: true,
};

// アセット別の上書き（生成シートの視覚QA結果を反映）
export const TRANS_MAPS: Record<string, TransitionMap> = {
  // 和風新セット(2026-06-13 生成)。エッジ草量の機械計測で較正済み:
  // f4=N(0.86) f5=S(0.96) f6=W(0.88) f7=E(0.92) f8=NW f9=NE f10=SW f11=SE。
  // f0は西寄り・f13/f15は南草混入・f15は灯籠プロップ入りのためセンターから除外。
  path: { center: [1, 2, 3, 1, 2, 3, 12, 14], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  // 実測: f0-f2=密集センター(f3は明色変種) / f4=北 / f9=南 / f6=西 / f7=東 / f8=NW / f5=NE
  thicket: { center: [0, 1, 2], n: 4, s: 9, w: 6, e: 7, nw: 8, ne: 5, fallbackCenter: true },
  // 2026-06-11 作り直し（馴染む境界・指示レイアウト準拠を視覚QA済）:
  // row1=center / f4=N f5=S f6=W f7=E / f8=NW f9=NE f10=SW f11=SE / f12-13=アクセント
  caveWall: {
    center: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 12, 13],
    n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true,
  },
  // 視覚QA済（2026-06-11）: 5セットとも生成シートはプロンプト指示どおりの
  // DEFAULT 配置（row1=center / row2=N,S,W,E / row3=NW,NE,SW,SE / row4=accent）。
  // center 配列の重複は重み（accent の出現率を下げる）。
  // cliff キーは和風版では「鎮守の森の樹冠マス」(tile_forest_wa) を指す。
  // 機械計測でDEFAULT配置を確認。f14(獣道)・f15(花鳥の賑やか変種)はセンターから除外。
  cliff: { center: [0, 1, 2, 3, 0, 1, 2, 3, 12, 13], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  // 和風水際(2026-06-13 機械計測): f5=N(0.89) f10=S(0.82) f6=W(0.82) f7=E(0.85)
  // f8=NW f9=NE f11=SE。SW単独は無し→f10兼用。純水センター=f1,f2,f12,f13,f15。
  waterEdge: { center: [1, 2, 12, 13, 15, 1, 12, 13], n: 5, s: 10, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  lavaEdge: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 12, 13, 14, 15] },
  volcanoWall: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 13, 14] },
  shallow: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 12, 13, 14] },
  forestEdge: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 12, 13, 14, 15] },
  // 視覚QA済（5.5）: 両セットとも指示どおりの DEFAULT 配置
  cloudEdge: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 12, 13, 14, 15] },
  arcaWall: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 12, 13, 14, 15] },
  // 視覚QA済（5.8）: 両セットとも指示どおりの DEFAULT 配置
  arcaPath: { ...DEFAULT_TRANS, center: [0, 1, 2, 3, 0, 1, 2, 3, 12, 13, 14, 15] },
  // f3はやや草混じりのためセンターから除外。f12=滝筋/f13=結晶/f14=苔/f15=根 を希少アクセントに
  islandBase: { ...DEFAULT_TRANS, center: [0, 1, 2, 0, 1, 2, 0, 1, 2, 12, 13, 14, 15] },
  // ↓ 生成後に視覚QAで較正（5.11）
  cloudGrassEdge: { ...DEFAULT_TRANS },
  cloudStoneEdge: { ...DEFAULT_TRANS },
};
