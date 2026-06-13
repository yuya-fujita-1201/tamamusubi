import type { InputAction } from "./types";
import { audio } from "./audio";

// 入力抽象: キーボード / ゲームパッドを InputAction に統一。
// エッジ検出（pressed / released）と押下中（isDown）を提供。
// チャージ攻撃のため attack の isDown / released が要。

const KEY_MAP: Record<string, InputAction> = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  KeyZ: "attack", Space: "attack",
  KeyX: "confirm", KeyE: "confirm", Enter: "confirm",
  Escape: "cancel",
  Tab: "menu",
  KeyC: "harai", KeyV: "harai",
  KeyQ: "cycle",
  ShiftLeft: "dodge", ShiftRight: "dodge",
  Digit1: "skill1", Digit2: "skill2", Digit3: "skill3",
};

export class Input {
  private down = new Set<InputAction>();
  private prev = new Set<InputAction>();
  private buffered = new Set<InputAction>();
  private padDown = new Set<InputAction>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => {
      audio.unlock(); // 実ジェスチャ文脈で autoplay 制限を解除
      const a = KEY_MAP[e.code];
      if (a) {
        if (!e.repeat) this.buffered.add(a);
        this.down.add(a);
        e.preventDefault();
      }
    });
    target.addEventListener("keyup", (e) => {
      const a = KEY_MAP[e.code];
      if (a) { this.down.delete(a); e.preventDefault(); }
    });
    target.addEventListener("blur", () => { this.down.clear(); });
  }

  private pollGamepad() {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    this.padDown.clear();
    if (!gp) return;
    const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
    const set = (a: InputAction, on: boolean) => { if (on) this.padDown.add(a); };
    set("left", ax < -0.4); set("right", ax > 0.4);
    set("up", ay < -0.4); set("down", ay > 0.4);
    const b = (i: number) => gp.buttons[i]?.pressed ?? false;
    set("up", b(12)); set("down", b(13)); set("left", b(14)); set("right", b(15));
    set("attack", b(2) || b(0)); // X/A
    set("confirm", b(1));        // B=調べる
    set("menu", b(3) || b(9));   // Y/Start
    set("cancel", b(8));         // Select
    set("cycle", b(4));          // LB
    set("dodge", b(5));          // RB
    set("harai", b(6));          // LT — 祓い波
    set("skill1", b(7));         // RT
  }

  /** フレーム開始時: gamepad を取り込む */
  beginFrame() {
    const prevAll = this.allDown();
    this.pollGamepad();
    for (const a of this.padDown) {
      if (!prevAll.has(a)) this.buffered.add(a);
    }
  }
  /** フレーム終了時 */
  endFrame() {
    this.prev = this.allDown();
    this.buffered.clear();
  }

  private allDown(): Set<InputAction> {
    const s = new Set(this.down);
    for (const a of this.padDown) s.add(a);
    return s;
  }

  isDown(a: InputAction): boolean { return this.down.has(a) || this.padDown.has(a); }
  /** 今フレーム新たに押された（バッファ含む） */
  pressed(a: InputAction): boolean { return (this.isDown(a) && !this.prev.has(a)) || this.buffered.has(a); }
  released(a: InputAction): boolean { return !this.isDown(a) && this.prev.has(a); }

  /** 8方向移動ベクトル（-1/0/1） */
  dirVec(): { x: number; y: number } {
    let x = 0, y = 0;
    if (this.isDown("left")) x -= 1;
    if (this.isDown("right")) x += 1;
    if (this.isDown("up")) y -= 1;
    if (this.isDown("down")) y += 1;
    return { x, y };
  }

  /** ヘッドレス検証用: 物理キー相当の注入 */
  inject(a: InputAction, on: boolean) {
    if (on) { if (!this.down.has(a)) this.buffered.add(a); this.down.add(a); }
    else this.down.delete(a);
  }
}
