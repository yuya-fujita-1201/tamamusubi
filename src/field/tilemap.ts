import { TILE, LOGICAL_W, LOGICAL_H, SS } from "../core/constants";
import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";
import type { Facing } from "../core/types";
import { EMPTY, tileFrame, tileSet } from "./tileset";
import { assets } from "../gfx/assets";

// マップデータ構造と描画。
// 描画順: ground → deco → decals → (props+entities の Yソートは scene 側) → overhead → 暗闇。

export interface MapProp {
  sheet: string;
  frame: number;
  x: number;          // 接地点（足元中心）ワールド座標
  y: number;
  w: number;          // 描画サイズ（論理 px）
  h: number;
  /** 指定時、時間でフレームをループ（滝・松明など） */
  animFps?: number;
  animFrames?: number;
  shadow?: { rx: number; ry: number }; // 接地影
  /** 通行不可 footprint（接地点基準の相対矩形）。未指定なら通行可（装飾） */
  solid?: { x: number; y: number; w: number; h: number };
  /** Yソートに参加するか（false=常に地面直上に描く） */
  ysort?: boolean;
  id?: string;        // 宝箱などの状態参照用
}

export interface Decal { x: number; y: number; frame: number; sheet?: string }

export interface Warp {
  x: number; y: number;             // タイル座標
  toMap: string;
  toX: number; toY: number;         // 着地タイル座標
  facing?: Facing;
}

export interface NpcDef {
  id: string;
  sheet: string;
  x: number; y: number;             // タイル座標
  dialog: string[];                 // 会話行（\n 区切りページ）
  facing?: Facing;
  /** 表示サイズ（論理px・正方）。未指定=28（ミト相当）。子供など小柄なNPCは小さく。 */
  drawSize?: number;
}

export interface SpawnDef {
  enemy: string;                    // enemies.ts のキー
  x: number; y: number;             // タイル座標
}

export interface MapData {
  id: string;
  name: string;
  w: number; h: number;             // タイル数
  ground: Uint16Array;
  deco: Uint16Array;                // 0=なし
  overhead: Uint16Array;            // プレイヤーより手前に描くタイル
  collision: Uint8Array;            // 1=通行不可
  decals: Decal[];                  // grass_detail 散布
  props: MapProp[];
  warps: Warp[];
  npcs: NpcDef[];
  spawns: SpawnDef[];
  bgm: "town" | "field" | "mori" | "battle" | "boss" | "boss2";
  darkness?: number;                // 0..1
  lights?: { x: number; y: number; r: number }[]; // ワールド座標
  /** 接地影の濃さ係数（1=標準。砂浜など日差しの強い地形は 0.3 前後に） */
  shadowAlpha?: number;
  /** 純色の外周色（マップ外を塗る） */
  outsideColor: string;
  /**
   * HD-2D風の背景プレーン（多層 parallax・Phase 0 検証項目②）。
   * 配列順に奥→手前で描画する。遠層に空、上層に高天原シルエット等の透過レイヤーを重ねる。
   * tileY を指定すると縦は繰り返さず「水平バンド」として1段だけ描く（地平線シルエット用。
   * 値は画面上端からの論理pxアンカーで、カメラYに連動して僅かに動く）。
   */
  bgs?: { sheet: string; parallax?: number; driftX?: number; scale?: number; bandY?: number }[];
}

export class Tilemap {
  constructor(public data: MapData) {}

  get pxW(): number { return this.data.w * TILE; }
  get pxH(): number { return this.data.h * TILE; }

  tileAt(layer: Uint16Array, tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= this.data.w || ty >= this.data.h) return EMPTY;
    return layer[ty * this.data.w + tx] ?? EMPTY;
  }

  isSolidTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.data.w || ty >= this.data.h) return true;
    return (this.data.collision[ty * this.data.w + tx] ?? 1) !== 0;
  }

  /** ワールド座標 AABB がどこかの solid に重なるか */
  rectSolid(x: number, y: number, w: number, h: number): boolean {
    const x0 = Math.floor(x / TILE), y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 0.01) / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (this.isSolidTile(tx, ty)) return true;
    return false;
  }

  warpAt(tx: number, ty: number): Warp | undefined {
    return this.data.warps.find((w) => w.x === tx && w.y === ty);
  }

  private drawLayer(r: Renderer, cam: Camera, layer: Uint16Array, time: number) {
    const d = this.data;
    const viewW = LOGICAL_W / r.zoom, viewH = LOGICAL_H / r.zoom; // 飛行ズームアウト対応
    const ty0 = Math.max(0, Math.floor(cam.y / TILE));
    const ty1 = Math.min(d.h - 1, Math.ceil((cam.y + viewH) / TILE));
    const tx0 = Math.max(0, Math.floor(cam.x / TILE));
    const tx1 = Math.min(d.w - 1, Math.ceil((cam.x + viewW) / TILE));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ref = layer[ty * d.w + tx] ?? EMPTY;
        if (ref === EMPTY) continue;
        const ts = tileSet(ref);
        if (!ts) continue;
        let frame = tileFrame(ref);
        if (ts.animFps && ts.animFrames) {
          frame = (frame + Math.floor((time / 1000) * ts.animFps)) % ts.animFrames;
        }
        r.tile(ts.sheet, frame, tx * TILE, ty * TILE, TILE, cam, ts.fallback);
      }
    }
  }

  /**
   * 背景プレーンを視差＋超低速ドリフトでタイリング描画する（多層対応）。
   * bandY 指定レイヤーは横タイリングのみの水平バンド（地平線の高天原シルエット等）。
   */
  private drawBackground(r: Renderer, cam: Camera, time: number,
    bg: NonNullable<MapData["bgs"]>[number]) {
    const sh = assets.get(bg.sheet);
    if (!sh) return; // 未ロード時は outsideColor フォールバック（clear 済み）
    const ctx = r.ctx;
    ctx.imageSmoothingEnabled = false;
    const p = bg.parallax ?? 0.45;
    const scale = bg.scale ?? 1;
    const fw = sh.frameW * scale, fh = sh.frameH * scale;
    // ドリフトは画像幅で先に折り返す（時間が伸びても精度劣化・ラップ時のジャンプなし）
    const driftPx = ((bg.driftX ?? 1.5) * (time / 1000) * SS) % fw;
    const mx = (((-(cam.x * p * SS) - driftPx) % fw) + fw) % fw;
    const ox = mx === 0 ? 0 : mx - fw; // 位相0のとき画面外1枚を描かない
    if (bg.bandY !== undefined) {
      // 水平バンド: 世界座標 bandY 付近に1段だけ（横タイリングのみ）。
      // 縦は視差 p でゆっくり追従 ＝ 遠い地平線の建築物に見える
      const sy = Math.round((bg.bandY - cam.y * p) * SS);
      for (let sx = ox; sx < r.W; sx += fw) {
        ctx.drawImage(sh.img, 0, 0, sh.frameW, sh.frameH, Math.round(sx), sy, fw, fh);
      }
      return;
    }
    const my = (((-(cam.y * p * SS)) % fh) + fh) % fh;
    const oy = my === 0 ? 0 : my - fh;
    for (let sy = oy; sy < r.H; sy += fh) {
      for (let sx = ox; sx < r.W; sx += fw) {
        ctx.drawImage(sh.img, 0, 0, sh.frameW, sh.frameH, Math.round(sx), Math.round(sy), fw, fh);
      }
    }
  }

  drawGround(r: Renderer, cam: Camera, time: number) {
    // マップ外の余白
    r.clear(this.data.outsideColor);
    if (this.data.bgs) for (const bg of this.data.bgs) this.drawBackground(r, cam, time, bg);
    this.drawLayer(r, cam, this.data.ground, time);
    this.drawLayer(r, cam, this.data.deco, time);
  }

  /**
   * 装飾デカール（疎な散布・影）。フラットプロップ（ysort:false の接地ピース）の
   * **後**に呼ぶ — 大型グラウンドピース（円形広場）の上にも影や花が正しく載る（5.13b）。
   */
  drawDecals(r: Renderer, cam: Camera) {
    const vw = LOGICAL_W / r.zoom, vh = LOGICAL_H / r.zoom;
    const vMargin = TILE;
    const hMargin = TILE;
    for (const dc of this.data.decals) {
      const wx = dc.x * TILE, wy = dc.y * TILE;
      const sx = wx - cam.x; // 画面X（ロジカル）
      if (sx < -hMargin || sx > vw + hMargin || wy < cam.y - vMargin || wy > cam.y + vh + vMargin) continue;
      r.tile(dc.sheet ?? "tile.grass_detail", dc.frame, wx, wy, TILE, cam, "transparent");
    }
  }

  drawOverhead(r: Renderer, cam: Camera, time: number) {
    this.drawLayer(r, cam, this.data.overhead, time);
  }

  /** prop を接地影つきで描く（Yソート外の flat props 用） */
  drawProp(r: Renderer, cam: Camera, p: MapProp, time = 0) {
    if (p.shadow) {
      r.shadow(p.x, p.y - 1, p.shadow.rx, p.shadow.ry, cam, 0.28);
    }
    const frame = p.animFps && p.animFrames
      ? Math.floor((time / 1000) * p.animFps) % p.animFrames
      : p.frame;
    r.sprite(p.sheet, frame, p.x - p.w / 2, p.y - p.h, { cam, w: p.w, h: p.h });
  }
}
