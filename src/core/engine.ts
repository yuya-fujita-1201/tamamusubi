import { CANVAS_W, CANVAS_H, FIXED_DT } from "./constants";
import { Input } from "./input";
import { Renderer } from "../gfx/renderer";
import { SceneStack, type SceneCtx } from "./scene";
import type { InputAction } from "./types";
import { audio } from "./audio";

// ゲームループ。可変フレームを固定 60Hz dt に量子化して update。
// ヒットストップ（全体停止）はここで一元管理する。
// ヘッドレス検証用に window.__tamamusubi を公開。

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly r: Renderer;
  readonly input: Input;
  readonly scenes = new SceneStack();
  time = 0;
  frameCount = 0;
  /** 残りヒットストップフレーム数。>0 の間はシーン更新を止める（描画は続く） */
  hitstop = 0;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.r = new Renderer(canvas);
    this.input = new Input(window);
    this.exposeHeadless();
  }

  start() {
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.frame(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  /** ヒットストップ要求（フレーム数）。重複時は長い方を採用。 */
  requestHitstop(frames: number) { this.hitstop = Math.max(this.hitstop, frames); }

  /** 実測 fps（EMA）。Phase 0 の性能検証用（PLAN §10: 安定45fps以上） */
  fps = 60;

  private frame(t: number) {
    let delta = t - this.last;
    this.last = t;
    if (delta > 250) delta = 250;
    if (delta > 0) this.fps = this.fps * 0.95 + (1000 / delta) * 0.05;
    this.acc += delta;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 6) {
      this.tick();
      this.acc -= FIXED_DT;
      steps++;
    }
    this.render();
  }

  private tick() {
    this.time += FIXED_DT;
    this.frameCount++;
    this.input.beginFrame();
    if (this.hitstop > 0) {
      this.hitstop--;
    } else {
      const ctx = this.makeCtx();
      this.scenes.update(ctx);
    }
    this.input.endFrame();
  }

  private render() {
    const ctx = this.makeCtx();
    this.r.begin();
    this.scenes.draw(ctx);
    this.r.end();
  }

  private makeCtx(): SceneCtx {
    return { input: this.input, r: this.r, scenes: this.scenes, dt: FIXED_DT, time: this.time };
  }

  // ── ヘッドレス検証フック（rAF が止まる環境で決定論的に進める） ──
  private exposeHeadless() {
    const w = window as unknown as Record<string, unknown>;
    w.__tamamusubi = {
      step: (n = 1) => { for (let i = 0; i < n; i++) this.tick(); this.render(); return this.frameCount; },
      key: (a: InputAction, down: boolean) => this.input.inject(a, down),
      shot: () => this.canvas.toDataURL("image/png"),
      engine: this,
      audio, // 録画スクリプト用（getRecordStream）
    };
  }
}
