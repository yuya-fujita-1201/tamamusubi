import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";
import { WA_FONT } from "../gfx/font";

// エフェクト＆ダメージ数字。ヒットストップ中も update され続ける
// （sakurai-hitstop: 演出時間を最大限活用）。

export interface FxSpawn {
  sheet: string;
  x: number; y: number;        // 中心ワールド座標
  size: number;                // 描画サイズ（論理px・正方）
  fps?: number;                // 既定 20
  frames?: number;             // 既定 4
  rot?: number;                // ラジアン
  flipX?: boolean;
  blend?: GlobalCompositeOperation;
  alpha?: number;
  loop?: boolean;
  /** 追従対象（プレイヤーアンカー等）。指定時 x,y は相対オフセット */
  follow?: { x: number; y: number };
  ySortFoot?: number;          // Yソートに参加する場合の足元 y（未指定は最前面）
}

interface Fx extends FxSpawn {
  t: number;
  dead: boolean;
}

export interface DamageNum {
  x: number; y: number;
  vy: number;
  t: number;
  text: string;
  color: string;
}

export class FxManager {
  list: Fx[] = [];
  nums: DamageNum[] = [];

  spawn(s: FxSpawn): Fx {
    const fx: Fx = { fps: 20, frames: 4, ...s, t: 0, dead: false };
    this.list.push(fx);
    return fx;
  }

  damage(x: number, y: number, amount: number | string, color = "#ffffff") {
    this.nums.push({ x, y, vy: -1.3, t: 0, text: String(amount), color });
  }

  update() {
    for (const fx of this.list) {
      fx.t++;
      const total = ((fx.frames ?? 4) / (fx.fps ?? 20)) * 60;
      if (!fx.loop && fx.t >= total) fx.dead = true;
    }
    this.list = this.list.filter((f) => !f.dead);
    for (const n of this.nums) {
      n.t++;
      n.y += n.vy;
      n.vy += 0.06;
      if (n.vy > 0.4) n.vy = 0.4;
    }
    this.nums = this.nums.filter((n) => n.t < 45);
  }

  /** 最前面エフェクト（Yソート外）を描く */
  draw(r: Renderer, cam: Camera) {
    for (const fx of this.list) {
      this.drawOne(r, cam, fx);
    }
    for (const n of this.nums) {
      const alpha = n.t > 32 ? 1 - (n.t - 32) / 13 : 1;
      r.font.draw(n.text, n.x - cam.x, n.y - cam.y, {
        size: 9.5, color: n.color, outline: "#1a1028", align: "center", alpha,
        font: WA_FONT,
      });
    }
  }

  drawOne(r: Renderer, cam: Camera, fx: Fx) {
    const frame = Math.min((fx.frames ?? 4) - 1, Math.floor((fx.t / 60) * (fx.fps ?? 20)));
    const cx = (fx.follow ? fx.follow.x + fx.x : fx.x);
    const cy = (fx.follow ? fx.follow.y + fx.y : fx.y);
    const o: Parameters<Renderer["sprite"]>[4] = {
      cam, w: fx.size, h: fx.size,
      ...(fx.rot !== undefined ? { rot: fx.rot } : {}),
      ...(fx.flipX !== undefined ? { flipX: fx.flipX } : {}),
      ...(fx.blend !== undefined ? { blend: fx.blend } : {}),
      ...(fx.alpha !== undefined ? { alpha: fx.alpha } : {}),
    };
    r.sprite(fx.sheet, frame, cx - fx.size / 2, cy - fx.size / 2, o);
  }

  clear() { this.list = []; this.nums = []; }
}
