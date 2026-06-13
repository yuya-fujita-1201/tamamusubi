import { ENEMIES, type EnemyDef } from "../data/enemies";
import type { Tilemap } from "../field/tilemap";
import type { FxManager } from "./fx";
import type { DropManager } from "./drops";
import { ProjectileManager, spawnSpore } from "./projectile";
import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";
import { audio } from "../core/audio";
import { game, gainExp } from "../state/game";

// 敵エンティティ。状態機械: wander → chase → telegraph → attack → cooldown。
// テレグラフ（かまえ）で「見てから対処」を保証する（敵ごとにF数差別化）。

export type EnemyState = "wander" | "chase" | "telegraph" | "attack" | "cooldown";

let nextId = 1;

export interface EnemyUpdateCtx {
  px: number; py: number;            // プレイヤー足元
  map: Tilemap;
  fx: FxManager;
  drops: DropManager;
  projectiles: ProjectileManager;
  onLevelUp: () => void;
}

export class Enemy {
  readonly id = nextId++;
  def: EnemyDef;
  x: number; y: number;              // 足元中心
  homeX: number; homeY: number;
  hp: number;
  state: EnemyState = "wander";
  stateT = 0;
  dirX = 0; dirY = 1;
  wanderT = 0;
  animT = 0;
  flashT = 0;
  kx = 0; ky = 0;                    // ノックバック速度
  atkDirX = 0; atkDirY = 0;          // telegraph で固定した攻撃方向
  dead = false;
  faceLeft = true;

  constructor(key: string, x: number, y: number) {
    const def = ENEMIES[key];
    if (!def) throw new Error(`unknown enemy: ${key}`);
    this.def = def;
    this.x = x; this.y = y;
    this.homeX = x; this.homeY = y;
    this.hp = def.hp;
  }

  /** 当たり判定ボックス（足元基準） */
  get box() {
    const { bodyW, bodyH } = this.def;
    return { x: this.x - bodyW / 2, y: this.y - bodyH, w: bodyW, h: bodyH };
  }

  /** 攻撃ヒット。多段防止は呼び出し側（swingId管理）で行う。 */
  takeHit(dmg: number, dirX: number, dirY: number, fx: FxManager, drops: DropManager, onLevelUp: () => void) {
    this.hp -= dmg;
    this.flashT = 6;
    const kb = 2.6;
    this.kx = dirX * kb; this.ky = dirY * kb;
    fx.damage(this.x, this.y - this.def.size, dmg, "#ffffff");
    fx.spawn({ sheet: "fx.hit", x: this.x, y: this.y - this.def.size / 2, size: 22, fps: 24 });
    if (this.hp <= 0) {
      this.die(fx, drops, onLevelUp);
    } else {
      // 被弾で即時アグロ
      if (this.state === "wander") { this.state = "chase"; this.stateT = 0; }
    }
  }

  private die(fx: FxManager, drops: DropManager, onLevelUp: () => void) {
    this.dead = true;
    audio.play("poof");
    fx.spawn({ sheet: "fx.poof", x: this.x, y: this.y - this.def.size / 2, size: 26, fps: 16 });
    if (Math.random() < this.def.dropHeart) drops.spawn("heart", this.x, this.y);
    else if (Math.random() < this.def.dropGem) drops.spawn("gem", this.x, this.y);
    if (gainExp(game, this.def.exp)) onLevelUp();
  }

  private moveWith(map: Tilemap, dx: number, dy: number) {
    const b = this.def;
    const ignoreSolid = b.behavior === "fly";
    const tryMove = (mx: number, my: number) => {
      const nx = this.x + mx, ny = this.y + my;
      if (!ignoreSolid && map.rectSolid(nx - b.bodyW / 2, ny - b.bodyH, b.bodyW, b.bodyH)) return false;
      // マップ外へは出さない（fly含む）
      if (nx < 8 || ny < 8 || nx > map.pxW - 8 || ny > map.pxH - 8) return false;
      this.x = nx; this.y = ny;
      return true;
    };
    if (!tryMove(dx, dy)) { tryMove(dx, 0) || tryMove(0, dy); }
    if (Math.abs(dx) > 0.05) this.faceLeft = dx < 0;
  }

  update(c: EnemyUpdateCtx) {
    if (this.dead) return;
    this.animT++;
    this.stateT++;
    if (this.flashT > 0) this.flashT--;

    // ノックバック（常時適用・減衰）
    if (Math.abs(this.kx) > 0.05 || Math.abs(this.ky) > 0.05) {
      this.moveWith(c.map, this.kx, this.ky);
      this.kx *= 0.78; this.ky *= 0.78;
    }

    const dx = c.px - this.x, dy = c.py - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const d = this.def;

    switch (this.state) {
      case "wander": {
        this.wanderT--;
        if (this.wanderT <= 0) {
          this.wanderT = 60 + Math.random() * 90;
          const a = Math.random() * Math.PI * 2;
          // ホームから離れすぎたら戻る方向
          const hx = this.homeX - this.x, hy = this.homeY - this.y;
          if (Math.hypot(hx, hy) > 56) {
            const hd = Math.hypot(hx, hy);
            this.dirX = hx / hd; this.dirY = hy / hd;
          } else if (Math.random() < 0.3) {
            this.dirX = 0; this.dirY = 0; // 休憩
          } else {
            this.dirX = Math.cos(a); this.dirY = Math.sin(a);
          }
        }
        this.moveWith(c.map, this.dirX * d.speed * 0.45, this.dirY * d.speed * 0.45);
        if (dist < d.sightR) { this.state = "chase"; this.stateT = 0; }
        break;
      }
      case "chase": {
        const ux = dx / dist, uy = dy / dist;
        // 行動別の間合い
        let trigger = 24;
        if (d.behavior === "ranged") trigger = 96;
        if (d.behavior === "lunge") trigger = 56;
        if (d.behavior === "fly") trigger = 64;
        if (d.behavior === "tank") trigger = 30;

        if (d.behavior === "ranged" && dist < 64) {
          // 距離を取る
          this.moveWith(c.map, -ux * d.speed, -uy * d.speed);
        } else if (d.behavior === "lunge" && dist < 72) {
          // 弧を描く（接線方向＋少し接近）
          const t = this.id % 2 === 0 ? 1 : -1;
          this.moveWith(c.map, (-uy * t + ux * 0.25) * d.speed, (ux * t + uy * 0.25) * d.speed);
        } else if (d.behavior === "fly") {
          // 蛇行接近
          const sw = Math.sin(this.animT / 9) * 0.9;
          this.moveWith(c.map, (ux + -uy * sw) * d.speed, (uy + ux * sw) * d.speed);
        } else {
          this.moveWith(c.map, ux * d.speed, uy * d.speed);
        }

        if (dist <= trigger) {
          this.state = "telegraph"; this.stateT = 0;
          this.atkDirX = ux; this.atkDirY = uy;
          if (Math.abs(ux) > 0.05) this.faceLeft = ux < 0;
        }
        if (dist > d.sightR * 1.9) { this.state = "wander"; this.stateT = 0; }
        break;
      }
      case "telegraph": {
        // 停止して構え（点滅は draw 側）。ウルフは方向再追尾を telegraph 前半のみ許可
        if (d.behavior === "lunge" && this.stateT < d.telegraphF / 2) {
          this.atkDirX = dx / dist; this.atkDirY = dy / dist;
        }
        if (this.stateT >= d.telegraphF) {
          this.state = "attack"; this.stateT = 0;
          if (d.behavior === "ranged") {
            c.projectiles.add(spawnSpore(this.x, this.y - d.size / 2, c.px, c.py - 8, d.atk,
              d.projectile ?? "spore"));
            this.state = "cooldown"; this.stateT = 0;
          }
        }
        break;
      }
      case "attack": {
        // 突進系: 固定方向へ高速移動
        const lungeF = d.behavior === "hop" ? 14 : d.behavior === "tank" ? 12 : 16;
        const mul = d.behavior === "hop" ? 3.2 : d.behavior === "lunge" ? 3.4 : d.behavior === "fly" ? 2.8 : 2.6;
        this.moveWith(c.map, this.atkDirX * d.speed * mul, this.atkDirY * d.speed * mul);
        if (this.stateT >= lungeF) { this.state = "cooldown"; this.stateT = 0; }
        break;
      }
      case "cooldown": {
        if (this.stateT >= d.attackCdF) {
          this.state = dist < d.sightR ? "chase" : "wander";
          this.stateT = 0;
        }
        break;
      }
    }
  }

  draw(r: Renderer, cam: Camera) {
    const d = this.def;
    const sz = d.size;
    // 接地影（fly は小さく）
    const shadowRy = d.behavior === "fly" ? 1.6 : 2.4;
    r.shadow(this.x, this.y - 1, sz * 0.32, shadowRy, cam, 0.28);

    // ウルフのテレグラフ補助: 足元に飛びかかり方向のインジケーター
    if (this.state === "telegraph" && d.behavior === "lunge") {
      const ex = this.x + this.atkDirX * 26, ey = this.y + this.atkDirY * 26;
      r.ellipse(ex, ey, 5, 2, "rgba(200,60,40,0.35)", cam);
    }

    const frame = Math.floor((this.animT / 60) * d.animFps) % 4;
    const flyBob = d.behavior === "fly" ? Math.sin(this.animT / 12) * 2 - 6 : 0;
    const flip = d.view === "side" ? !this.faceLeft : this.faceLeft && d.view === "front" && false;
    // テレグラフ中は赤白点滅（見てから対処の合図）
    const blink = this.state === "telegraph" && Math.floor(this.stateT / 3) % 2 === 0;
    const tintOpt = this.flashT > 0 ? { tint: "#ffffff" } : blink ? { tint: "#ff8866" } : {};
    r.sprite(d.sheet, frame, this.x - sz / 2, this.y - sz + flyBob, {
      cam, w: sz, h: sz, flipX: flip, ...tintOpt,
    });
  }
}
