import { SS, CANVAS_W, CANVAS_H } from "../core/constants";
import { assets } from "./assets";
import type { Camera } from "../core/camera";
import { Font } from "./font";
import { Win } from "./window";

// 低レベル描画。すべて「ロジカル座標」で受け取り、内部で SS 倍して描く。
// 画素を保つため imageSmoothing は無効。

export interface DrawOpts {
  flipX?: boolean;
  alpha?: number;
  cam?: Camera;          // 指定時ワールド座標→スクリーン変換
  w?: number; h?: number; // 描画サイズ（ロジカル, 既定=フレームサイズ/SS）
  tint?: string;          // 単色tint（被弾点滅など）
  rot?: number;           // 中心回転（ラジアン）— 剣閃等のエフェクト用
  blend?: GlobalCompositeOperation; // "lighter" で加算風
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly W = CANVAS_W;
  readonly H = CANVAS_H;
  /** ワールド描画ズーム（飛行カメラ検証用）。HUD 描画前に 1 へ戻すこと。 */
  zoom = 1;
  /** 論理→実ピクセル係数（SS×zoom） */
  get k(): number { return SS * this.zoom; }
  readonly font: Font;
  readonly win: Win;
  /** tint 用の一時キャンバス（source-atop を全画面に当てないため） */
  private tintCanvas: HTMLCanvasElement;
  private tintCtx: CanvasRenderingContext2D;

  constructor(public canvas: HTMLCanvasElement) {
    const c = canvas.getContext("2d", { alpha: false });
    if (!c) throw new Error("no 2d ctx");
    this.ctx = c;
    this.ctx.imageSmoothingEnabled = false;
    this.font = new Font(this);
    this.win = new Win(this);
    this.tintCanvas = document.createElement("canvas");
    this.tintCanvas.width = 256; this.tintCanvas.height = 256;
    const tc = this.tintCanvas.getContext("2d");
    if (!tc) throw new Error("no tint ctx");
    this.tintCtx = tc;
    this.tintCtx.imageSmoothingEnabled = false;
  }

  begin() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
  }
  end() { /* post fx hook */ }

  clear(color = "#000") {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  toScreen(x: number, y: number, cam?: Camera): [number, number] {
    const wx = cam ? x - cam.x : x;
    const wy = cam ? y - cam.y : y;
    return [wx * this.k, wy * this.k];
  }

  // ── 図形（ロジカル座標） ───────────────────────────────────
  fillRect(x: number, y: number, w: number, h: number, color: string, cam?: Camera) {
    const [sx, sy] = this.toScreen(x, y, cam);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(w * this.k), Math.round(h * this.k));
  }
  strokeRect(x: number, y: number, w: number, h: number, color: string, lw = 1, cam?: Camera) {
    const [sx, sy] = this.toScreen(x, y, cam);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lw * this.k;
    this.ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, Math.round(w * this.k), Math.round(h * this.k));
  }
  /** マップごとの接地影の濃さ係数（砂浜=強い日差しでは薄く）。FieldScene が設定する */
  shadowMul = 1;

  /** 接地影専用の楕円（shadowMul を反映）。base は標準の不透明度 */
  shadow(cx: number, cy: number, rx: number, ry: number, cam?: Camera, base = 0.28) {
    const a = base * this.shadowMul;
    if (a <= 0.01) return;
    this.ellipse(cx, cy, rx, ry, `rgba(10,14,24,${a.toFixed(3)})`, cam);
  }

  /** 楕円塗り（中心 cx,cy 半径 rx,ry）。接地影などに使用。 */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, cam?: Camera) {
    const [sx, sy] = this.toScreen(cx, cy, cam);
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(sx, sy, Math.max(0.5, rx * this.k), Math.max(0.5, ry * this.k), 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  // ── スプライト ─────────────────────────────────────────────
  /** シートの frameIndex を左上 (x,y) に描く。未ロードなら色矩形フォールバック。 */
  sprite(key: string, frame: number, x: number, y: number, o: DrawOpts = {}) {
    const sh = assets.get(key);
    const dw = o.w ?? (sh ? sh.frameW / SS : 16);
    const dh = o.h ?? (sh ? sh.frameH / SS : 16);
    const [sx, sy] = this.toScreen(x, y, o.cam);
    const ctx = this.ctx;
    const px = Math.round(sx), py = Math.round(sy);
    const pw = Math.round(dw * this.k), ph = Math.round(dh * this.k);
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blend) ctx.globalCompositeOperation = o.blend;

    if (!sh) {
      ctx.fillStyle = assets.fallback(key);
      ctx.fillRect(px, py, pw, ph);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    const fi = ((frame % sh.frames) + sh.frames) % sh.frames;
    const fx = (fi % sh.cols) * sh.frameW;
    const fy = Math.floor(fi / sh.cols) * sh.frameH;

    let src: HTMLImageElement | HTMLCanvasElement = sh.img;
    let srcX = fx, srcY = fy;
    if (o.tint) {
      // フレームを一時キャンバスへ写して source-atop で単色化
      const tc = this.tintCtx;
      if (this.tintCanvas.width < sh.frameW || this.tintCanvas.height < sh.frameH) {
        this.tintCanvas.width = Math.max(this.tintCanvas.width, sh.frameW);
        this.tintCanvas.height = Math.max(this.tintCanvas.height, sh.frameH);
        tc.imageSmoothingEnabled = false;
      }
      tc.globalCompositeOperation = "source-over";
      tc.clearRect(0, 0, sh.frameW, sh.frameH);
      tc.drawImage(sh.img, fx, fy, sh.frameW, sh.frameH, 0, 0, sh.frameW, sh.frameH);
      tc.globalCompositeOperation = "source-atop";
      tc.fillStyle = o.tint;
      tc.fillRect(0, 0, sh.frameW, sh.frameH);
      tc.globalCompositeOperation = "source-over";
      src = this.tintCanvas;
      srcX = 0; srcY = 0;
    }

    if (o.rot) {
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(o.rot);
      if (o.flipX) ctx.scale(-1, 1);
      ctx.drawImage(src, srcX, srcY, sh.frameW, sh.frameH, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    } else if (o.flipX) {
      ctx.save();
      ctx.translate(px + pw, py);
      ctx.scale(-1, 1);
      ctx.drawImage(src, srcX, srcY, sh.frameW, sh.frameH, 0, 0, pw, ph);
      ctx.restore();
    } else {
      ctx.drawImage(src, srcX, srcY, sh.frameW, sh.frameH, px, py, pw, ph);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /** タイルを (x,y) に敷く。隣接タイルと必ず 1px 重ねて継ぎ目を消す。 */
  tile(key: string, frame: number, x: number, y: number, size: number, cam?: Camera, fallback?: string) {
    const sh = assets.get(key);
    const [sx, sy] = this.toScreen(x, y, cam);
    const px = Math.floor(sx), py = Math.floor(sy);
    const s = size * this.k;
    const pw = Math.floor(sx + s) - px + 1;
    const ph = Math.floor(sy + s) - py + 1;
    if (!sh) {
      this.ctx.fillStyle = fallback ?? assets.fallback(key);
      this.ctx.fillRect(px, py, pw, ph);
      return;
    }
    const fi = ((frame % sh.frames) + sh.frames) % sh.frames;
    const fx = (fi % sh.cols) * sh.frameW;
    const fy = Math.floor(fi / sh.cols) * sh.frameH;
    this.ctx.drawImage(sh.img, fx, fy, sh.frameW, sh.frameH, px, py, pw, ph);
  }

  // ── 暗闇オーバーレイ（洞窟） ────────────────────────────────
  private darkCanvas?: HTMLCanvasElement;
  darknessOverlay(strength: number, lights: { x: number; y: number; r: number }[], cam?: Camera) {
    if (!this.darkCanvas) {
      this.darkCanvas = document.createElement("canvas");
      this.darkCanvas.width = this.W; this.darkCanvas.height = this.H;
    }
    const dc = this.darkCanvas;
    const dx = dc.getContext("2d");
    if (!dx) return;
    dx.clearRect(0, 0, this.W, this.H);
    dx.fillStyle = `rgba(6,8,18,${strength})`;
    dx.fillRect(0, 0, this.W, this.H);
    dx.globalCompositeOperation = "destination-out";
    for (const L of lights) {
      const [sx, sy] = this.toScreen(L.x, L.y, cam);
      const rr = L.r * this.k;
      const g = dx.createRadialGradient(sx, sy, rr * 0.15, sx, sy, rr);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.6, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      dx.fillStyle = g;
      dx.beginPath(); dx.arc(sx, sy, rr, 0, Math.PI * 2); dx.fill();
    }
    dx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(dc, 0, 0);
  }
}
