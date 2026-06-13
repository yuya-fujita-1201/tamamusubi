import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";

// 飛び道具: チャクラム（往復・プレイヤー帰還）、胞子弾、ボスの岩（放物線=z軸つき）。

export interface Projectile {
  kind: "chakram" | "spore" | "rock" | "homing" | "fireball";
  x: number; y: number;
  vx: number; vy: number;
  z: number; zv: number;       // rock の高さ（描画は y-z）
  size: number;
  radius: number;              // 当たり判定半径
  dmg: number;
  fromPlayer: boolean;
  pierce: boolean;
  returning: boolean;          // チャクラム帰還中
  life: number;                // 残フレーム
  sheet: string;
  fps: number;
  t: number;
  dead: boolean;
  hitIds: Set<number>;         // pierce 時の多段ヒット防止
  /** rock 着弾時の演出（既定: fx.shock / 36px）。ドラゴンのメテオは fx.explosion で大きく */
  landFx?: string;
  landFxSize?: number;
  /** 5.14: 武器相性キー（chakram 弾のみ。魔法弾は相性なし） */
  affinity?: "chakram";
  /** 5.14: ヒット時の hitstop（既定はチャクラム相当の6F） */
  hitstop?: number;
  /** 5.14: ヒット時の追加FX（fireball の爆発） */
  hitFx?: { sheet: string; size: number };
}

export function spawnChakram(x: number, y: number, dx: number, dy: number, dmg: number, big = false): Projectile {
  const sp = big ? 3.2 : 2.6;
  return {
    kind: "chakram", x, y, vx: dx * sp, vy: dy * sp, z: 0, zv: 0,
    size: big ? 26 : 16, radius: big ? 11 : 7, dmg,
    fromPlayer: true, pierce: big, returning: false,
    life: big ? 70 : 46, sheet: "fx.chakram", fps: 18, t: 0, dead: false,
    hitIds: new Set(),
    affinity: "chakram",
  };
}

/** 魔法フレイムの火球（5.14）。直進・非貫通・着弾で爆発＋hitstop8。相性なし。 */
export function spawnFireball(x: number, y: number, dx: number, dy: number, dmg: number): Projectile {
  const sp = 2.6;
  const d = Math.hypot(dx, dy) || 1;
  return {
    kind: "fireball", x, y, vx: (dx / d) * sp, vy: (dy / d) * sp, z: 0, zv: 0,
    size: 18, radius: 8, dmg,
    fromPlayer: true, pierce: false, returning: false,
    life: 90, sheet: "fx.fireball", fps: 16, t: 0, dead: false,
    hitIds: new Set(),
    hitstop: 8,
    hitFx: { sheet: "fx.explosion", size: 34 },
  };
}

export function spawnSpore(x: number, y: number, tx: number, ty: number, dmg: number,
                           kindSheet: "spore" | "ember" = "spore"): Projectile {
  const d = Math.hypot(tx - x, ty - y) || 1;
  const sp = kindSheet === "ember" ? 1.4 : 1.1; // 火の弾はやや速い（テレグラフ長めで相殺）
  return {
    kind: "spore", x, y, vx: ((tx - x) / d) * sp, vy: ((ty - y) / d) * sp, z: 0, zv: 0,
    size: 10, radius: 4, dmg,
    fromPlayer: false, pierce: false, returning: false,
    life: 160, sheet: `fx.${kindSheet}`, fps: 10, t: 0, dead: false,
    hitIds: new Set(),
  };
}

/** プレイヤーを追尾する大型火球（ドラゴン用）。旋回率に上限があり、走り抜ければかわせる。 */
export function spawnHoming(x: number, y: number, dirX: number, dirY: number, dmg: number,
                            sheet = "fx.ember"): Projectile {
  const sp = 1.25;
  const d = Math.hypot(dirX, dirY) || 1;
  return {
    kind: "homing", x, y, vx: (dirX / d) * sp, vy: (dirY / d) * sp, z: 0, zv: 0,
    size: 22, radius: 9, dmg,
    fromPlayer: false, pierce: false, returning: false,
    life: 240, sheet, fps: 14, t: 0, dead: false,
    hitIds: new Set(),
  };
}

/** 着弾点 (tx,ty) へ放物線で飛ぶ投擲弾（岩/泡/メテオなど）。landF 後に着地。 */
export function spawnRock(x: number, y: number, tx: number, ty: number, dmg: number,
                          landF = 50, sheet = "fx.rock",
                          opts: { size?: number; radius?: number; landFx?: string; landFxSize?: number } = {}): Projectile {
  const g = 0.18;
  return {
    kind: "rock", x, y,
    vx: (tx - x) / landF, vy: (ty - y) / landF,
    z: 0, zv: -(g * landF) / 2 - 14 / landF, // 初速: 放物線が landF で z=0 に戻る + 山なり
    size: opts.size ?? 16, radius: opts.radius ?? 8, dmg,
    fromPlayer: false, pierce: false, returning: false,
    life: landF, sheet, fps: 12, t: 0, dead: false,
    hitIds: new Set(),
    ...(opts.landFx !== undefined ? { landFx: opts.landFx } : {}),
    ...(opts.landFxSize !== undefined ? { landFxSize: opts.landFxSize } : {}),
  };
}

export class ProjectileManager {
  list: Projectile[] = [];
  /** 岩の着地コールバック（boss の衝撃波生成等） */
  onRockLand?: (x: number, y: number, dmg: number, p: Projectile) => void;
  /** ホーミング対象（fireball 用。Field が毎フレーム差し替える） */
  targets: { x: number; y: number }[] = [];

  add(p: Projectile) { this.list.push(p); }

  update(px: number, py: number) {
    for (const p of this.list) {
      p.t++;
      p.life--;
      if (p.kind === "rock") {
        p.x += p.vx; p.y += p.vy;
        p.z += p.zv; p.zv += 0.18;
        if (p.life <= 0) {
          p.dead = true;
          this.onRockLand?.(p.x, p.y, p.dmg, p);
        }
        continue;
      }
      if (p.kind === "chakram") {
        if (!p.returning && p.life <= 0) {
          p.returning = true;
          p.life = 180; // 帰還タイムアウト（壁裏等で戻れない場合の残留防止）
          p.hitIds.clear(); // 帰りも当たる
        }
        if (p.returning) {
          const dx = px - p.x, dy = py - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = 3.4;
          p.vx = (dx / d) * sp; p.vy = (dy / d) * sp;
          if (d < 10 || p.life <= 0) p.dead = true; // 手元に戻った or タイムアウト
        }
        p.x += p.vx; p.y += p.vy;
        continue;
      }
      if (p.kind === "homing") {
        // 追尾: 速度ベクトルをプレイヤー方向へ少しずつ回頭（旋回率制限）。
        // 寿命の最後の60Fは直進（振り切れる猶予）
        if (p.life > 60) {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const cur = Math.atan2(p.vy, p.vx);
          const want = Math.atan2(py - p.y, px - p.x);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-0.045, Math.min(0.045, diff));
          p.vx = Math.cos(cur + turn) * sp;
          p.vy = Math.sin(cur + turn) * sp;
        }
        p.x += p.vx; p.y += p.vy;
        if (p.life <= 0) p.dead = true;
        continue;
      }
      if (p.kind === "fireball") {
        // 5.15: 近傍の敵へホーミング（直線では使いづらいというFB対応）。
        // 旋回率上限つき＝置き撃ちで外れる余地は残す。至近では直進（行き過ぎ防止）
        let best: { x: number; y: number } | null = null;
        let bd = 150;
        for (const t of this.targets) {
          // 前方コーン制限: 進行方向の前半球のみ捕捉（背面の敵へUターンしない。Codexレビュー）
          if ((t.x - p.x) * p.vx + (t.y - p.y) * p.vy <= 0) continue;
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < bd) { bd = d; best = t; }
        }
        if (best && bd > 6) {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const cur = Math.atan2(p.vy, p.vx);
          const want = Math.atan2(best.y - p.y, best.x - p.x);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-0.1, Math.min(0.1, diff));
          p.vx = Math.cos(cur + turn) * sp;
          p.vy = Math.sin(cur + turn) * sp;
        }
        p.x += p.vx; p.y += p.vy;
        if (p.life <= 0) p.dead = true;
        continue;
      }
      // spore
      p.x += p.vx; p.y += p.vy;
      if (p.life <= 0) p.dead = true;
    }
    this.list = this.list.filter((p) => !p.dead);
  }

  draw(r: Renderer, cam: Camera) {
    for (const p of this.list) {
      const frame = Math.floor((p.t / 60) * p.fps);
      if (p.kind === "rock") {
        // 影（着地予告を兼ねる）
        r.shadow(p.x, p.y, 6, 2.4, cam, 0.4);
        r.sprite(p.sheet, frame, p.x - p.size / 2, p.y - p.size / 2 + p.z, { cam, w: p.size, h: p.size });
      } else if (p.kind === "fireball") {
        // 素材は右向き基準 → 速度方向へ回転（左向きで尾が逆になるのを防ぐ）
        const rot = Math.atan2(p.vy, p.vx);
        r.sprite(p.sheet, frame, p.x - p.size / 2, p.y - p.size / 2, { cam, w: p.size, h: p.size, rot });
      } else {
        r.sprite(p.sheet, frame, p.x - p.size / 2, p.y - p.size / 2, { cam, w: p.size, h: p.size });
      }
    }
  }

  clear() { this.list = []; }
}
