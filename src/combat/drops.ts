import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";
import { audio } from "../core/audio";
import { game, BERRY_MAX } from "../state/game";
import type { FxManager } from "./fx";

// ドロップ品（ハート/ジェム）。ふわふわ浮遊し、近づくと吸引される。

export type DropKind = "heart" | "gem";

interface Drop {
  kind: DropKind;
  x: number; y: number;
  vx: number; vy: number;
  t: number;
  dead: boolean;
}

const HEART_HEAL = 12;
const GEM_GP = 5;

export class DropManager {
  list: Drop[] = [];

  spawn(kind: DropKind, x: number, y: number) {
    const a = Math.random() * Math.PI * 2;
    this.list.push({ kind, x, y, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, t: 0, dead: false });
  }

  update(px: number, py: number, fx: FxManager) {
    for (const d of this.list) {
      d.t++;
      // 初速の減衰
      d.x += d.vx; d.y += d.vy;
      d.vx *= 0.86; d.vy *= 0.86;
      // 吸引
      const dx = px - d.x, dy = py - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 28 && d.t > 18) {
        d.x += (dx / dist) * 2.2;
        d.y += (dy / dist) * 2.2;
      }
      if (dist < 8 && d.t > 18) {
        d.dead = true;
        if (d.kind === "heart") {
          game.hp = Math.min(game.maxHp, game.hp + HEART_HEAL);
          fx.damage(px, py - 14, HEART_HEAL, "#7cf78c");
        } else {
          game.gp += GEM_GP;
        }
        audio.play("pickup");
      }
      if (d.t > 60 * 12) d.dead = true; // 放置で消滅
    }
    this.list = this.list.filter((d) => !d.dead);
  }

  draw(r: Renderer, cam: Camera) {
    for (const d of this.list) {
      const bob = Math.sin((d.t / 60) * Math.PI * 2.4) * 1.5;
      const blink = d.t > 60 * 10 && Math.floor(d.t / 6) % 2 === 0;
      if (blink) continue;
      const key = d.kind === "heart" ? "drop.heart" : "drop.gem";
      r.shadow(d.x, d.y + 4, 4, 1.6, cam, 0.25);
      r.sprite(key, 0, d.x - 6, d.y - 6 + bob, { cam, w: 12, h: 12 });
    }
  }

  clear() { this.list = []; }
}

export { BERRY_MAX };
