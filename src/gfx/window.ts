import { SS } from "../core/constants";
import type { Renderer } from "./renderer";

// SFC 風ウィンドウ/ゲージ描画。
// パネルは3重縁（暗い外縁→白枠→明るい内縁）＋上辺ハイライト＋背景縦グラデで工芸品感を出す。

export class Win {
  constructor(private r: Renderer) {}

  panel(x: number, y: number, w: number, h: number, opts: { bg?: [string, string]; alpha?: number } = {}) {
    const ctx = this.r.ctx;
    const px = Math.round(x * SS), py = Math.round(y * SS);
    const pw = Math.round(w * SS), ph = Math.round(h * SS);
    const [c0, c1] = opts.bg ?? ["#1c2a52", "#101a38"];
    ctx.save();
    ctx.globalAlpha = opts.alpha ?? 0.96;
    // 背景縦グラデ
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.globalAlpha = 1;
    // 3重縁
    ctx.lineWidth = SS;
    ctx.strokeStyle = "#0a0f22"; // 暗い外縁
    ctx.strokeRect(px + SS * 0.5, py + SS * 0.5, pw - SS, ph - SS);
    ctx.strokeStyle = "#e8e4d8"; // 白枠
    ctx.strokeRect(px + SS * 1.5, py + SS * 1.5, pw - SS * 3, ph - SS * 3);
    ctx.strokeStyle = "#5a6aa8"; // 明るい内縁
    ctx.strokeRect(px + SS * 2.5, py + SS * 2.5, pw - SS * 5, ph - SS * 5);
    // 上辺ハイライト
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(px + SS * 3, py + SS * 3, pw - SS * 6, SS);
    ctx.restore();
  }

  /** 立体ゲージ: 縦グラデ＋上端1px白線。ratio 0..1 */
  gauge(x: number, y: number, w: number, h: number, ratio: number,
        colors: [string, string] = ["#56d35c", "#1f7a2c"], bg = "#22232e") {
    const ctx = this.r.ctx;
    const px = Math.round(x * SS), py = Math.round(y * SS);
    const pw = Math.round(w * SS), ph = Math.round(h * SS);
    ctx.save();
    ctx.fillStyle = "#0a0f22";
    ctx.fillRect(px - SS, py - SS, pw + SS * 2, ph + SS * 2);
    ctx.fillStyle = bg;
    ctx.fillRect(px, py, pw, ph);
    const fw = Math.round(pw * Math.max(0, Math.min(1, ratio)));
    if (fw > 0) {
      const g = ctx.createLinearGradient(0, py, 0, py + ph);
      g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
      ctx.fillStyle = g;
      ctx.fillRect(px, py, fw, ph);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(px, py, fw, Math.max(1, Math.round(SS * 0.7)));
    }
    ctx.restore();
  }
}
