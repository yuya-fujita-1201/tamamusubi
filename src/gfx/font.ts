import { SS } from "../core/constants";
import type { Renderer } from "./renderer";

// テキスト描画（CJK対応）。ロジカル px 指定。スーパーサンプル前提で
// integer サイズ＋影/縁取りで可読性を確保する。

export type Align = "left" | "center" | "right";

export interface TextOpts {
  size?: number;       // ロジカル px（既定 8）
  color?: string;
  shadow?: string | null;
  outline?: string;
  align?: Align;
  alpha?: number;
  font?: string;
}

const DEFAULT_FONT =
  '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "MS Gothic", monospace';

/** 和風表示用（ダメージ数字・Lv・マップ名・タイトル）。
 * macOS同梱の手書き風「Klee」→明朝の順でフォールバック（筆の趣）。 */
export const WA_FONT =
  '"Klee", "Hiragino Mincho ProN", "Yu Mincho", "Hiragino Kaku Gothic ProN", serif';

export class Font {
  constructor(private r: Renderer) {}

  draw(text: string, x: number, y: number, o: TextOpts = {}) {
    const ctx = this.r.ctx;
    const size = (o.size ?? 8) * SS;
    const px = Math.round(x * SS);
    const py = Math.round(y * SS);
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.font = `${size}px ${o.font ?? DEFAULT_FONT}`;
    ctx.textBaseline = "top";
    ctx.textAlign = o.align ?? "left";
    if (o.outline) {
      ctx.lineWidth = Math.max(2, Math.round(SS));
      ctx.strokeStyle = o.outline;
      ctx.lineJoin = "round";
      ctx.strokeText(text, px, py);
    } else if (o.shadow !== null) {
      ctx.fillStyle = o.shadow ?? "rgba(0,0,0,0.7)";
      ctx.fillText(text, px + SS, py + SS);
    }
    ctx.fillStyle = o.color ?? "#ffffff";
    ctx.fillText(text, px, py);
    ctx.restore();
  }

  measure(text: string, size = 8, font = DEFAULT_FONT): number {
    const ctx = this.r.ctx;
    ctx.save();
    ctx.font = `${size * SS}px ${font}`;
    const w = ctx.measureText(text).width / SS;
    ctx.restore();
    return w;
  }

  /** 折り返し（最大幅・ロジカル px）。改行 \n も尊重。 */
  wrap(text: string, maxW: number, size = 8): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      if (para === "") { out.push(""); continue; }
      let line = "";
      for (const ch of para) {
        const test = line + ch;
        if (this.measure(test, size) > maxW && line) { out.push(line); line = ch; }
        else line = test;
      }
      if (line) out.push(line);
    }
    return out;
  }
}
