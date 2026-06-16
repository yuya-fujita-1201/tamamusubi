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
  // ── 和風の高低差（直交2D・聖剣流）: 石積み擁壁の崖＋階段。takadai マップ用 ──
  { key: "waCliff", sheet: "tile.wa_cliff_set", fallback: "#7d6f56" },                // 37 和風崖（リム/壁面/基部・旧）
  { key: "waStairs", sheet: "tile.wa_stairs", fallback: "#9a8a66" },                  // 38 和風石段（縦タイル・旧）
  // ── 2026-06-14 高台リニューアル（お手本=ZZ-HCP-logs/009）。直交2Dで石垣/笠石/石段/落ち影/草トーン差 ──
  // フレーム配置（16=4x4相当の横ストリップ）:
  //  waIshigaki: 0-3=笠石キャップ(0左外角/1,2直線/3右外角) 4-7=上段壁(4左端/5,6直線/7右端) 8-11=下段壁 12-15=基部(14左下角/15右下角)
  //  waKasaishi: 0北直線/1北変種/2西直線/3東直線 4=NW/5=NE/6=SW/7=SE外角 8-11内角 12北苔/13西苔/14東苔/15北地衣
  //  waStairs2:  0左側壁/1,2上端中央/3右側壁 4左壁段/5,6中央段/7右壁段 8-11下中段 12-15下端(13,14中央)
  //  waDropshadow: 0(薄24px)→3(濃56px) 落ち影の帯。半透明・草の上に deco で重ねる
  { key: "waIshigaki", sheet: "tile.wa_ishigaki_set", fallback: "#8a857a" },          // 39 高い野面積み石垣（笠石/壁/基部）
  { key: "waKasaishi", sheet: "tile.wa_kasaishi_set", fallback: "#bdb9a6" },          // 40 笠石ボーダー帯（上段の縁取り）
  { key: "waStairs2", sheet: "tile.wa_stairs2_set", fallback: "#9a9078" },            // 41 苔石階段（側壁付き）
  { key: "waDropshadow", sheet: "tile.wa_dropshadow", fallback: "transparent" },      // 42 落ち影（半透明オーバーレイ）
  { key: "grassUpper", sheet: "tile.grass_upper", fallback: "#5fb35f" },              // 43 上段草（明・暖色）
  { key: "grassLower", sheet: "tile.grass_lower", fallback: "#3f8a4e" },              // 44 下段草（暗・青み）
  // ── 2026-06-14 高台2巡目（お手本011・不透明3D石垣）。手続き合成 forge/gen_cliff3.py ──
  // 完全不透明＝下地透け(緑余白)なし。16フレーム:
  //  0 rim_N / 1 rim_W / 2 rim_E / 3 rim_NW / 4 rim_NE  （N/W/E=細い面取り笠石縁＋外角）
  //  5 cap_h(前面上の笠石) / 6,7 wall / 8,9 base
  //  10 cap_SW(前左角) / 11 cap_SE / 12 wall_L / 13 wall_R / 14 base_L / 15 base_R
  { key: "waCliff3", sheet: "tile.wa_cliff3_set", fallback: "#8a857a" },              // 45 不透明3D石垣
  { key: "waStairs3", sheet: "tile.wa_stairs3_set", fallback: "#9a9078" },            // 46 不透明石段
  // ── Phase L2 美麗風景・絵画調オートタイル（棚田の谷 tanada。Agent Forge生成） ──
  // row1=center(0-3) / row2=N,S,W,E(4-7) / row3=NW,NE,SW,SE(8-11) / row4=accent(12-15)
  { key: "kaGrass", sheet: "tile.ka_grass_set", fallback: "#6aa84e" },                // 47 絵画調・畦草
  { key: "kaPaddy", sheet: "tile.ka_paddy_set", fallback: "#7fa6c8" },                // 48 棚田の水鏡（静止）
  { key: "kaPath", sheet: "tile.ka_path_set", fallback: "#b39568" },                  // 49 絵画調・石畳の山道
  { key: "kaRiver", sheet: "tile.ka_river_set", fallback: "#5b96b8" },                // 50 絵画調・流れる川
  { key: "kaForest", sheet: "tile.ka_forest_set", fallback: "#3a6a36" },              // 51 絵画調・鎮守の森
  // ── Phase L3 GPT-momo2: 曲線オートタイルで「角を直角にしない／石垣以外の高低差／床と輪郭の分離」 ──
  // すべて world_coastline_16/grass/forest プリセット生成（Agent Forge）。高低差素材は edge に
  // 「上端の明るい縁＋縦面＋下の接地影」の3点セットが焼き込まれている。配置は base→overlay→deco の順。
  { key: "kaDote", sheet: "tile.ka_dote_set", fallback: "#6a7a44" },                  // 52 草付き土手（石垣不使用の自然高低差）
  { key: "kaIshigaki", sheet: "tile.ka_ishigaki_set", fallback: "#8a857a" },          // 53 苔むし石積み擁壁（棚田/参道の段差）
  { key: "kaPaddy2", sheet: "tile.ka_paddy2_set", fallback: "#7fa6c8" },              // 54 鏡面水田（丸角・草侵食・畦縁）
  { key: "kaRiver2", sheet: "tile.ka_river2_set", fallback: "#5b96b8" },              // 55 川岸カットバンク（川は低い谷）
  { key: "kaGrass2", sheet: "tile.ka_grass2_set", fallback: "#6aa84e" },              // 56 ふかふか草地（チェッカー回避）
  { key: "kaPath2", sheet: "tile.ka_path2_set", fallback: "#b39568" },                // 57 蛇行山道（飛び石・曲線境界）
  { key: "kaForest2", sheet: "tile.ka_forest2_set", fallback: "#34602f" },            // 58 鎮守の森（縁ぼかし・四角さ解消）
  { key: "kaBamboo", sheet: "tile.ka_bamboo_set", fallback: "#4a7a3a" },              // 59 竹林の壁（歩行不可背景）
  { key: "kaDecor", sheet: "tile.ka_decor_set", fallback: "transparent" },            // 60 装飾オーバーレイ（花/小石/葦/草むら/根）
  // ── Phase L3 整理（GPT-memo3）: 静かな歩行ベース草。kaGrass2 より低コントラストでノイズを抑える ──
  { key: "kaGrassCalm", sheet: "tile.ka_grass_calm_set", fallback: "#6a9a52" },        // 61 静かなベース草地
  // ── Phase L4 GPT-020: 地形接続文法修正セット（神社高台/川改善/境界破砕） ──
  // row1=center(0-3) / row2=N,S,W,E(4-7) / row3=NW,NE,SW,SE(8-11) / row4=accent(12-15)
  { key: "kaShrineWall",   sheet: "tile.ka_shrine_wall_set",   fallback: "#8a857a" },   // 62 神社高台専用擁壁（dressed ashlar / 棚田と分離）
  { key: "kaShrineGround", sheet: "tile.ka_shrine_ground_set", fallback: "#8ab87a" },   // 63 神域の平場（低ノイズ・管理された草地）
  { key: "kaRiver3",       sheet: "tile.ka_river3_set",        fallback: "#5b8fb8" },   // 64 川改良版（カットバンク岸・H0低地として明示）
  { key: "kaEdgeOverlay",  sheet: "tile.ka_edge_overlay_set",  fallback: "transparent" }, // 65 境界破砕オーバーレイ（森縁/道縁/川岸/石垣縁）
  { key: "kaWaterfall",    sheet: "tile.ka_waterfall",         fallback: "#cfe8f5" },     // 66 滝（正方形タイル・横シームレス。川幅ぶん敷き詰める）
  { key: "waBaseShadow",   sheet: "tile.wa_baseshadow",        fallback: "transparent" }, // 67 段差ブロックの下部影（下が黒い半透明グラデ。waDropshadowの上下反転）
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
  // ── Phase L2 絵画調オートタイル（Agent Forge生成。row1=center / row2=N,S,W,E / row3=4角 / row4=accent）──
  kaGrass: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  kaPaddy: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  kaPath: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  kaRiver: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  kaForest: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  // ── Phase L3 新セット（生成タイルの16フレーム個別QAで較正済・2026-06-14 セッション8）──
  // paddy2/river2/path2 = 標準配置の完全オートタイル（曲線の外角込み）。
  // dote/ishigaki = 南向き前面フレーム5が主役（上端縁+縦面+下影の3点セット）。N辺は専用無し→代替。
  // grass2 = center8変種のみ（辺なし）。forest2/bamboo = 辺・角あり（角の順が標準と異なるので個別指定）。
  kaDote: { center: [0, 1, 2, 3], n: 0, s: 5, w: 4, e: 6, nw: 4, ne: 6, sw: 10, se: 9, fallbackCenter: true },
  kaIshigaki: { center: [0, 1, 2, 3], n: 15, s: 5, w: 8, e: 11, nw: 4, ne: 7, sw: 10, se: 9, fallbackCenter: true },
  kaPaddy2: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: false },
  kaRiver2: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: false },
  kaGrass2: { center: [0, 1, 2, 3, 4, 5, 6, 7], n: 0, s: 0, w: 0, e: 0, nw: 0, ne: 0, sw: 0, se: 0, fallbackCenter: true },
  kaPath2: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: false },
  kaForest2: { center: [0, 1, 2, 3], n: 0, s: 4, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  kaBamboo: { center: [0, 1, 2, 3], n: 5, s: 4, w: 7, e: 6, nw: 10, ne: 11, sw: 8, se: 9, fallbackCenter: true },
  kaGrassCalm: { center: [0, 1, 2, 3, 4, 5, 6, 7], n: 0, s: 0, w: 0, e: 0, nw: 0, ne: 0, sw: 0, se: 0, fallbackCenter: true },
  // ── Phase L4 GPT-020 追加 ──
  // kaShrineWall: 神社専用擁壁。kaIshigakiと同じフレーム規約だが質感が別物（dressed ashlar）。
  kaShrineWall: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: true },
  // kaShrineGround: center変種のみ（境界なしの神域平場）。paintAutoは使わずgf(x,y)%8で直接frame指定。
  kaShrineGround: { center: [0, 1, 2, 3, 4, 5, 6, 7], n: 0, s: 0, w: 0, e: 0, nw: 0, ne: 0, sw: 0, se: 0, fallbackCenter: true },
  // kaRiver3: fallbackCenter:false = 川は対辺でもcenterを出さない。N辺(4)/S辺(5)が主役（縦流れ）。
  kaRiver3: { center: [0, 1, 2, 3], n: 4, s: 5, w: 6, e: 7, nw: 8, ne: 9, sw: 10, se: 11, fallbackCenter: false },
  // kaEdgeOverlay: 形式上登録するがpaintAutoは使わない（scatterDecalsでframe直接指定）。
  kaEdgeOverlay: { center: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], n: 0, s: 0, w: 0, e: 0, fallbackCenter: true },
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
