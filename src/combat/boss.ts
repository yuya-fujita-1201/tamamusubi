import type { Tilemap } from "../field/tilemap";
import type { FxManager } from "./fx";
import type { DropManager } from "./drops";
import { ProjectileManager, spawnRock } from "./projectile";
import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";
import { audio } from "../core/audio";
import { game, gainExp } from "../state/game";

// ボス（2フェーズ共通骨格）。BossDef でガワとパラメータを差し替える。
// P1: 岩投げ（影予告つき放物線）/ 接近ストンプ（衝撃波リング）
// P2(HP<=50%): 咆哮＋振動＋フラッシュ24F → 行動間隔短縮＋岩2連投
// 撃破演出は「浄化」: 穢れが剥がれ淡い光に包まれ白フェードで消える（殺すではなく祓う）

export type BossState =
  | "idle" | "walk" | "tele_rock" | "throw" | "tele_stomp" | "stomp"
  | "dying";

export type BossAction = "rock" | "stomp";

export interface BossDef {
  key: string;
  name: string;          // HUD 表示名
  sheet: string;         // スプライトシート
  maxHp: number;
  exp: number;
  projSheet: string;     // 投擲弾の見た目
  ringColor: string;     // 衝撃波リングの色
  /** 行動スタイル */
  style: "brawler";
  walkSpeed: number;
  /** 描画サイズ（論理px）。 */
  size: number;
  /** 当たり判定（省略時 size 比率: 0.61/0.54） */
  boxW?: number;
  boxH?: number;
}

export const BOSS_DEFS: Record<string, BossDef> = {
  gankinoou: {
    key: "gankinoou",
    name: "岩鬼の王",
    sheet: "boss.gankinoou",
    maxHp: 200,
    exp: 70,
    projSheet: "fx.rock",
    ringColor: "rgba(180,140,80,0.75)",
    style: "brawler",
    walkSpeed: 0.32,
    size: 72,
  },
};

export interface ShockRing {
  x: number; y: number;
  r: number;          // 現在半径
  maxR: number;
  width: number;      // 判定リング幅
  dmg: number;
  t: number;
  dead: boolean;
  hitPlayer: boolean;
}

export class GankinoBoss {
  x: number; y: number;
  readonly def: BossDef;
  maxHp: number;
  hp: number;
  state: BossState = "idle";
  stateT = 0;
  animT = 0;
  flashT = 0;
  dead = false;
  defeated = false;          // 浄化演出完了
  rings: ShockRing[] = [];
  private actionQueue: BossAction[] = [];
  private phase2Announced = false;
  private phase2FlashT = 0;
  /** 浄化演出用: 光量（0→1→フェードアウト） */
  private purifyAlpha = 0;
  private purifyT = 0;

  constructor(x: number, y: number, def: BossDef = BOSS_DEFS.gankinoou as BossDef) {
    this.x = x; this.y = y;
    this.def = def;
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;
  }

  get phase2(): boolean { return this.hp <= this.maxHp / 2; }
  get speedMul(): number { return this.phase2 ? 1.4 : 1.0; }

  /** 行動手札（brawler: P1は岩投げ→ストンプ、P2は岩2連→ストンプ） */
  private nextActions(): BossAction[] {
    return this.phase2
      ? ["rock", "rock", "stomp"]
      : ["rock", "stomp", "rock"];
  }

  get size(): number { return this.def.size; }

  get box() {
    const w = this.def.boxW ?? Math.round(this.size * 0.61);
    const h = this.def.boxH ?? Math.round(this.size * 0.54);
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }

  /** ヒット処理（祓いダメージ含む）。ボス死亡時 true を返す。 */
  takeHit(dmg: number, dirX: number, _dirY: number, fx: FxManager): boolean {
    if (this.dead) return false;
    const final = Math.max(1, dmg);
    this.hp -= final;
    this.flashT = 6;
    fx.damage(this.x + dirX * 6, this.y - 48, final, "#ffffff");
    fx.spawn({ sheet: "fx.hit", x: this.x + dirX * 10, y: this.y - 32, size: 26, fps: 24 });
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = "dying"; this.stateT = 0;
      this.purifyT = 0;
      audio.play("roar");
      return true;
    }
    return false;
  }

  update(c: {
    px: number; py: number;
    map: Tilemap;
    fx: FxManager;
    drops: DropManager;
    projectiles: ProjectileManager;
    cam: Camera;
    onDefeated: () => void;
    onLevelUp: () => void;
  }) {
    if (this.dead) return;
    this.animT++;
    this.stateT++;
    if (this.flashT > 0) this.flashT--;
    if (this.phase2FlashT > 0) this.phase2FlashT--;

    // フェーズ2突入演出（1回だけ: 咆哮＋画面振動＋フラッシュ24F）
    if (this.phase2 && !this.phase2Announced && this.state !== "dying") {
      this.phase2Announced = true;
      this.phase2FlashT = 24;
      audio.play("roar");
      c.cam.shake(2.5, 10);
      c.fx.spawn({ sheet: "fx.shock", x: this.x, y: this.y - 10, size: 56, fps: 16 });
    }

    // 衝撃波リング更新
    for (const ring of this.rings) {
      ring.t++;
      ring.r += 1.7;
      if (ring.r >= ring.maxR) ring.dead = true;
    }
    this.rings = this.rings.filter((r) => !r.dead);

    const dx = c.px - this.x, dy = c.py - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    switch (this.state) {
      case "idle": {
        if (this.stateT > 30) { this.state = "walk"; this.stateT = 0; }
        break;
      }
      case "walk": {
        const sp = this.def.walkSpeed * this.speedMul;
        this.moveWith(c.map, (dx / dist) * sp, (dy / dist) * sp, true);
        // 行動選択（P2は短い間隔で攻撃的に）
        if (this.stateT > (this.phase2 ? 50 : 75)) {
          this.stateT = 0;
          if (this.actionQueue.length === 0) {
            this.actionQueue = this.nextActions();
            if (Math.random() < 0.4) this.actionQueue.reverse();
          }
          const act = this.actionQueue.shift() as BossAction;
          if (act === "stomp") { this.state = "tele_stomp"; }
          else { this.state = "tele_rock"; }
        }
        break;
      }
      case "tele_rock": {
        // 15F テレグラフ: 岩を振り上げ（tint点滅）
        if (this.stateT >= 15) {
          this.state = "throw"; this.stateT = 0;
          audio.play("throw");
          const dmg = 11;
          if (this.phase2) {
            // P2: 2連投（扇状）
            const base = Math.atan2(dy, dx);
            for (const off of [-0.3, 0.3]) {
              const tx = this.x + Math.cos(base + off) * dist;
              const ty = this.y + Math.sin(base + off) * dist;
              c.projectiles.add(spawnRock(this.x, this.y - this.size * 0.55, tx, ty, dmg, 50, this.def.projSheet));
            }
          } else {
            // P1: 1発
            c.projectiles.add(spawnRock(this.x, this.y - this.size * 0.55, c.px, c.py, dmg, 50, this.def.projSheet));
          }
        }
        break;
      }
      case "throw": {
        if (this.stateT >= 24) { this.state = "walk"; this.stateT = 0; }
        break;
      }
      case "tele_stomp": {
        // 16F テレグラフ: 足を振り上げ
        if (this.stateT >= 16) {
          this.state = "stomp"; this.stateT = 0;
          audio.play("stomp");
          c.cam.shake(2, 8);
          const k = this.size / 56;
          this.rings.push({
            x: this.x, y: this.y - 6,
            r: 14 * Math.min(k, 2),
            maxR: Math.min(80 * k, 180),
            width: 10 + Math.min(k - 1, 2) * 4,
            dmg: 12,
            t: 0, dead: false, hitPlayer: false,
          });
          c.fx.spawn({ sheet: "fx.shock", x: this.x, y: this.y - 6, size: Math.min(64 * k, 120), fps: 14 });
        }
        break;
      }
      case "stomp": {
        if (this.stateT >= 30) { this.state = "walk"; this.stateT = 0; }
        break;
      }
      case "dying": {
        this.purifyT++;
        // 浄化演出: 穢れが剥がれ、体が淡い光に包まれ、白フェードで消える
        // 0～30F: fx.heal を随時生成（輝きが広がる）
        if (this.purifyT % 6 === 0 && this.purifyT <= 60) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.random() * this.size * 0.36;
          c.fx.spawn({
            sheet: "fx.heal",
            x: this.x + Math.cos(a) * rr,
            y: this.y - this.size * 0.45 + Math.sin(a) * rr * 0.6,
            size: 28 + Math.random() * 18,
            fps: 14,
            blend: "lighter",
          });
        }
        // 30F: 咆哮なし・静寂（穢れが祓われた安堵感）
        if (this.purifyT === 30) {
          c.cam.shake(1.2, 6); // 穢れが剥がれる小さな揺れ
        }
        // 光量の上昇（30→80F でフェードアウト）
        if (this.purifyT >= 30) {
          this.purifyAlpha = Math.min(1, (this.purifyT - 30) / 50);
        }
        // 80F で消滅・onDefeated
        if (this.purifyT >= 80) {
          this.dead = true;
          this.defeated = true;
          if (gainExp(game, this.def.exp)) c.onLevelUp();
          c.onDefeated();
        }
        break;
      }
    }
  }

  /** 移動（slide=true で壁スライド） */
  private moveWith(map: Tilemap, dx: number, dy: number, slide = false): boolean {
    const b = this.box;
    const tryMove = (mx: number, my: number) => {
      const nx = this.x + mx, ny = this.y + my;
      if (map.rectSolid(nx - b.w / 2, ny - b.h, b.w, b.h)) return false;
      this.x = nx; this.y = ny;
      return true;
    };
    if (tryMove(dx, dy)) return true;
    if (slide) return tryMove(dx, 0) || tryMove(0, dy);
    return false;
  }

  draw(r: Renderer, cam: Camera) {
    if (this.dead) return;
    const sz = this.size;
    r.shadow(this.x, this.y - 2, sz * 0.3, 5, cam, 0.32);

    // 衝撃波リング（判定の可視化を兼ねる）
    for (const ring of this.rings) {
      const [sx, sy] = r.toScreen(ring.x, ring.y, cam);
      const ctx = r.ctx;
      ctx.save();
      ctx.strokeStyle = this.def.ringColor;
      ctx.lineWidth = ring.width * r.k * 0.8;
      ctx.beginPath();
      ctx.ellipse(sx, sy, ring.r * r.k, ring.r * r.k * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // フレームアニメーション（4フレーム呼吸ループ）
    const frame = Math.floor((this.animT / 60) * 4) % 4;
    const telegraphing = this.state.startsWith("tele_");
    const blink = telegraphing && Math.floor(this.stateT / 3) % 2 === 0;
    const p2flash = this.phase2FlashT > 0 && Math.floor(this.phase2FlashT / 4) % 2 === 0;
    const tint =
      this.flashT > 0 ? "#ffffff"
      : p2flash ? "#ff4030"
      : blink ? "#ff8866"
      : undefined;

    const baseOpts: Parameters<Renderer["sprite"]>[4] = { cam, w: sz, h: sz };
    const tintOpts = tint ? { ...baseOpts, tint } : baseOpts;

    // スプライトが未登録の場合は色矩形フォールバック
    try {
      r.sprite(this.def.sheet, frame, this.x - sz / 2, this.y - sz, tintOpts);
    } catch {
      // fallback: 茶色の矩形（アセット未着時）
      const [sx, sy] = r.toScreen(this.x - sz / 2, this.y - sz, cam);
      const ctx = r.ctx;
      ctx.save();
      ctx.fillStyle = tint ?? (this.phase2 ? "#8b4040" : "#7a5c3a");
      ctx.fillRect(sx, sy, sz * r.k, sz * r.k);
      ctx.restore();
    }

    // フェーズ2は常時赤味オーバーレイ
    if (this.phase2 && !this.flashT && !blink && !p2flash) {
      try {
        r.sprite(this.def.sheet, frame, this.x - sz / 2, this.y - sz, {
          cam, w: sz, h: sz, tint: "#c03020", alpha: 0.38,
        });
      } catch { /* fallback描画済み */ }
    }

    // 浄化演出（dying中: 白い輝きが広がる）
    if (this.state === "dying" && this.purifyAlpha > 0) {
      const [sx, sy] = r.toScreen(this.x - sz / 2, this.y - sz, cam);
      const ctx = r.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = this.purifyAlpha * 0.8;
      ctx.fillStyle = "#e8f4ff";
      ctx.fillRect(sx, sy, sz * r.k, sz * r.k);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }
}
