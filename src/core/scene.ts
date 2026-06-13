import type { Input } from "./input";
import type { Renderer } from "../gfx/renderer";

export interface SceneCtx {
  input: Input;
  r: Renderer;
  scenes: SceneStack;
  dt: number;
  time: number;
}

export interface Scene {
  /** true なら下のシーンも描画される（リングメニュー等のオーバーレイ） */
  transparentDraw?: boolean;
  enter?(ctx: SceneCtx): void;
  exit?(ctx: SceneCtx): void;
  update(ctx: SceneCtx): void;
  draw(ctx: SceneCtx): void;
}

export class SceneStack {
  private stack: Scene[] = [];

  get top(): Scene | undefined { return this.stack[this.stack.length - 1]; }
  get depth(): number { return this.stack.length; }

  push(s: Scene, ctx?: SceneCtx) { this.stack.push(s); if (ctx) s.enter?.(ctx); }
  pop(ctx?: SceneCtx): Scene | undefined {
    const s = this.stack.pop();
    if (s && ctx) s.exit?.(ctx);
    return s;
  }
  replace(s: Scene, ctx?: SceneCtx) {
    while (this.stack.length) this.pop(ctx);
    this.push(s, ctx);
  }

  /** 最上位シーンのみ更新（下のシーンは時間停止＝リングメニュー/会話中はフィールドが止まる） */
  update(ctx: SceneCtx) {
    this.top?.update(ctx);
  }

  draw(ctx: SceneCtx) {
    // 描画開始インデックス: 上から transparentDraw を遡る
    let start = this.stack.length - 1;
    while (start > 0 && (this.stack[start] as Scene).transparentDraw) start--;
    for (let i = start; i < this.stack.length; i++) (this.stack[i] as Scene).draw(ctx);
  }
}
