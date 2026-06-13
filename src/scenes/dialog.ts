import type { Scene, SceneCtx } from "../core/scene";
import { LOGICAL_W, LOGICAL_H } from "../core/constants";
import { audio } from "../core/audio";

// 会話ウィンドウ（オーバーレイ）。タイプライタ送り。
// confirm/attack でページ送り。下のフィールドは時間停止。

export class DialogScene implements Scene {
  transparentDraw = true;
  private page = 0;
  private chars = 0;
  private t = 0;

  constructor(private pages: string[], private onClose?: () => void) {}

  update(ctx: SceneCtx) {
    this.t++;
    const text = this.pages[this.page] ?? "";
    if (this.chars < text.length) {
      this.chars += 1;
      if (this.chars % 3 === 0) audio.play("textBlip");
      if (ctx.input.pressed("confirm") || ctx.input.pressed("attack")) {
        this.chars = text.length; // スキップ表示
      }
      return;
    }
    if (ctx.input.pressed("confirm") || ctx.input.pressed("attack")) {
      audio.play("menuOk");
      this.page++;
      this.chars = 0;
      if (this.page >= this.pages.length) {
        ctx.scenes.pop(ctx);
        this.onClose?.();
      }
    }
  }

  draw(ctx: SceneCtx) {
    const r = ctx.r;
    const w = LOGICAL_W - 16, h = 56;
    const x = 8, y = LOGICAL_H - h - 8;
    r.win.panel(x, y, w, h);
    const text = (this.pages[this.page] ?? "").slice(0, this.chars);
    const lines = text.split("\n");
    for (const [i, line] of lines.entries()) {
      r.font.draw(line, x + 10, y + 9 + i * 13, { size: 9, color: "#f2ede1" });
    }
    // ページ送りカーソル
    const full = this.chars >= (this.pages[this.page] ?? "").length;
    if (full && Math.floor(this.t / 20) % 2 === 0) {
      r.font.draw("▼", x + w - 16, y + h - 14, { size: 8, color: "#ffd34d" });
    }
  }
}
