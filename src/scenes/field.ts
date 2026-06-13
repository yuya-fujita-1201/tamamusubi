import type { Scene, SceneCtx } from "../core/scene";
import { LOGICAL_W, LOGICAL_H, TILE } from "../core/constants";
import { Camera } from "../core/camera";
import { audio } from "../core/audio";
import { rectsOverlap, type Rect, FACING_DIR } from "../core/types";
import { Tilemap, type MapProp } from "../field/tilemap";
import { buildMap } from "../data/maps";
import { Player } from "../field/player";
import { Enemy } from "../combat/enemy";
import { GankinoBoss, BOSS_DEFS, type BossDef } from "../combat/boss";
import { FxManager } from "../combat/fx";
import { DropManager } from "../combat/drops";
import { ProjectileManager } from "../combat/projectile";
import { AFFINITY } from "../data/weapons";
import { game, BERRY_MAX, levelFor, gainMp } from "../state/game";
import { DialogScene } from "./dialog";
import { WA_FONT } from "../gfx/font";
import { GameOverScene } from "./gameover";
import { CHARGE_FULL_F, CHARGE_WEAK_F } from "../data/weapons";

// ── ボスアリーナ定義（マップID → ボス・撃破フラグ・撃破口上）──
const BOSS_ARENAS: Record<string, {
  boss: string;
  bx: number; by: number;    // ボス初期位置（タイル）
  flag: string;
  defeatLines: string[];
  reward?: () => void;
}> = {
  morioku: {
    boss: "gankinoou",
    bx: -1, by: -1,          // 入場時にマップ中央から計算（後述）
    flag: "boss:gankinoou",
    defeatLines: [
      "岩鬼の王は穢れを祓われ、\n本来の山神の姿へ還っていった。",
      "静けさが戻った森奥に、\n澄んだ気が満ちていく。",
    ],
    reward: () => {
      game.gp += 100;
      game.berries = Math.min(BERRY_MAX, game.berries + 1);
    },
  },
};

// フィールド統括シーン（玉結び Phase 0）。シームレス戦闘・祓い波・HUD・ヒットストップ管理。
// ヒットストップ中は fx と damage 数字のみ動き続ける（桜井: 演出時間の最大活用）。
// Phase 0 検証フック: 2キー=飛行ズーム(①) / 3キー=暗闇+多光源fps(④) / 右上にfps常時表示。

export interface FieldOpts { intro?: boolean }

function circleRectOverlap(c: { x: number; y: number; r: number }, rc: Rect): boolean {
  const nx = Math.max(rc.x, Math.min(c.x, rc.x + rc.w));
  const ny = Math.max(rc.y, Math.min(c.y, rc.y + rc.h));
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 <= c.r * c.r;
}

/** 祓い波（穢れゲージ解放の大技）。広がる浄化の輪 */
interface HaraiWave {
  x: number; y: number;
  t: number;
  maxR: number;
  hit: Set<number>;
}
const HARAI_WAVE_F = 44;       // 波の寿命
const HARAI_WAVE_R = 150;      // 最大半径（論理px）
const HARAI_DMG_MUL = 3.2;     // 攻撃力倍率

export class FieldScene implements Scene {
  map!: Tilemap;
  player!: Player;
  enemies: Enemy[] = [];
  boss: GankinoBoss | null = null;
  cam = new Camera();
  fx = new FxManager();
  drops = new DropManager();
  projectiles = new ProjectileManager();
  private hitstop = 0;
  private fade = 1;          // 1=真っ黒 → 0
  private fadeDir = -1;
  private warpTo: { map: string; tx: number; ty: number } | null = null;
  private toastT = 0;
  private t = 0;
  private escT = 0;
  private deadT = 0;
  private exiting = false;
  private introPending: boolean;
  private mpRegenT = 0;
  // ── 祓い波 ──
  private waves: HaraiWave[] = [];
  private flashT = 0;          // 解放時の全画面白フラッシュ
  private kegareWasFull = false;
  // ── Phase 0 検証トグル ──
  private flight = false;      // ①飛行カメラズームアウト
  private zoomCur = 1;
  private darkTest = false;    // ④多光源 darkness fps

  constructor(private mapId: string, private spawnTx: number, private spawnTy: number, opts: FieldOpts) {
    this.introPending = opts.intro ?? false;
  }

  enter(ctx: SceneCtx) {
    const data = buildMap(this.mapId);
    this.map = new Tilemap(data);
    ctx.r.shadowMul = data.shadowAlpha ?? 1;
    this.player = new Player(this.spawnTx * TILE + TILE / 2, this.spawnTy * TILE + TILE - 2);
    this.player.onHaraiRelease = () => this.releaseHarai();
    this.enemies = [];
    for (const s of data.spawns) {
      const ex = s.x * TILE + TILE / 2, ey = s.y * TILE + TILE - 2;
      if (Math.hypot(ex - this.player.x, ey - this.player.y) < 64) continue; // スポーンキル防止
      this.enemies.push(new Enemy(s.enemy, ex, ey));
    }
    // ── ボス生成（BOSS_ARENASから。撃破済み or マップ未対応ならnull）──
    this.boss = null;
    const arena = BOSS_ARENAS[this.mapId];
    if (arena && !game.flags.has(arena.flag)) {
      const def = BOSS_DEFS[arena.boss] as BossDef | undefined;
      if (def) {
        // bx/by が -1 のときはマップ中央を使う（moriokuは専用マップ未作成時の防衛）
        const bx = arena.bx >= 0 ? arena.bx * TILE + TILE / 2 : this.map.pxW / 2;
        const by = arena.by >= 0 ? arena.by * TILE + TILE - 2 : this.map.pxH / 2 + TILE;
        this.boss = new GankinoBoss(bx, by, def);
      }
    }
    // BGM（ボス未撃破アリーナはボス曲）
    const bgm = (arena && !game.flags.has(arena.flag)) ? "boss" : data.bgm;
    audio.playBgm(bgm);
    this.toastT = 110;
    this.fade = 1; this.fadeDir = -1;
    game.respawn = { map: this.mapId, tx: this.spawnTx, ty: this.spawnTy };

    // ヘッドレス検証フック
    const w = window as unknown as { __tamamusubi?: Record<string, unknown> };
    if (w.__tamamusubi) {
      w.__tamamusubi.field = this;
      w.__tamamusubi.game = game;
      w.__tamamusubi.state = () => ({
        map: this.mapId, px: this.player.x, py: this.player.y,
        hp: game.hp, maxHp: game.maxHp, lv: levelFor(game.exp).lv, gp: game.gp,
        kegare: game.kegare, kegareMax: game.kegareMax,
        weapons: [...game.weapons], equipped: game.equipped,
        enemies: this.enemies.filter((e) => !e.dead).length,
        bossHp: this.boss?.hp ?? null,
        bossState: this.boss?.state ?? null,
        flags: [...game.flags],
        playerState: this.player.state,
        invulnT: this.player.invulnT,
        waves: this.waves.length,
        flight: this.flight, zoom: this.zoomCur,
        darkTest: this.darkTest,
        fps: (w.__tamamusubi as { engine?: { fps?: number } }).engine?.fps ?? -1,
      });
      w.__tamamusubi.warp = (map: string, tx: number, ty: number) => { this.warpTo = { map, tx, ty }; this.fadeDir = 1; };
    }
  }

  // ── 更新 ───────────────────────────────────────────────────
  update(ctx: SceneCtx) {
    this.t++;
    if (this.escT > 0) this.escT--;
    if (this.flashT > 0) this.flashT--;

    // 飛行ズームのイージング（雲へ昇る感覚）
    const zoomTarget = this.flight ? 0.28 : 1;
    this.zoomCur += (zoomTarget - this.zoomCur) * 0.06;
    if (Math.abs(this.zoomCur - zoomTarget) < 0.002) this.zoomCur = zoomTarget;

    // フェード
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * 0.05;
      if (this.fade <= 0) { this.fade = 0; this.fadeDir = 0; }
      if (this.fade >= 1 && this.warpTo) {
        const w = this.warpTo;
        ctx.scenes.replace(new FieldScene(w.map, w.tx, w.ty, {}), ctx);
        return;
      }
    }

    // イントロ（語り配分ルール: 薄く・短く。父の言葉だけ）
    if (this.introPending && this.t > 24) {
      this.introPending = false;
      game.flags.add("intro:done");
      ctx.scenes.push(new DialogScene([
        "父の声が、まだ耳の奥に残っている。",
        "──「ミト。勾玉を集めてくれ。頼む」",
        "里山の朝は、いつもと同じ顔をしていた。",
      ]), ctx);
      return;
    }

    // Phase 0 検証トグル（2=飛行 / 3=暗闇多光源）
    if (ctx.input.pressed("skill2")) {
      this.flight = !this.flight;
      audio.play(this.flight ? "menuOpen" : "menuCancel");
    }
    if (ctx.input.pressed("skill3")) {
      this.darkTest = !this.darkTest;
      audio.play("menuMove");
    }

    // ヒットストップ: エフェクトと数字のみ進める
    if (this.hitstop > 0) {
      this.hitstop--;
      this.fx.update();
      this.followCamera();
      return;
    }

    // プレイヤー死亡処理
    if (!this.player.alive) {
      this.deadT++;
      this.fx.update();
      this.drops.update(this.player.x, this.player.y, this.fx);
      // 相打ち対策（QAレビュー）: 浄化中のボスは死亡演出と撃破フラグを進め切る
      if (this.boss && this.boss.state === "dying") {
        this.boss.update({
          px: this.player.x, py: this.player.y, map: this.map,
          fx: this.fx, drops: this.drops, projectiles: this.projectiles, cam: this.cam,
          onDefeated: () => this.onBossDefeated(ctx),
          onLevelUp: () => this.onLevelUp(),
        });
      }
      if (this.deadT > 80) { ctx.scenes.replace(new GameOverScene(), ctx); return; }
      return;
    }

    // 入力系（調べる・Esc）
    if (this.fadeDir === 0 && this.player.canInteract) {
      if (ctx.input.pressed("confirm")) {
        if (this.tryInteract(ctx)) return;
      }
      // 祓い波（ゲージ満タンで解放可能）
      if (ctx.input.pressed("harai")) {
        if (game.kegare >= game.kegareMax) {
          this.player.startHarai(this.fx);
        } else {
          audio.play("menuCancel");
        }
      }
      // Esc 2回でタイトルへ（多重発火ガードつき）
      if (ctx.input.pressed("cancel")) {
        if (this.escT > 0 && !this.exiting) {
          this.exiting = true;
          void import("./title").then(({ TitleScene }) => {
            ctx.scenes.replace(new TitleScene(), ctx);
          });
          return;
        }
        this.escT = 90;
        this.toastT = 0;
      }
    }

    this.player.update(ctx.input, this.map, this.fx, this.projectiles);
    if (++this.mpRegenT >= 80) { this.mpRegenT = 0; gainMp(game, 1); }
    for (const e of this.enemies) {
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) > 360) continue; // 遠距離は休眠
      e.update({
        px: this.player.x, py: this.player.y, map: this.map,
        fx: this.fx, drops: this.drops, projectiles: this.projectiles,
        onLevelUp: () => this.onLevelUp(),
      });
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // ── ボス更新 ──
    this.boss?.update({
      px: this.player.x, py: this.player.y, map: this.map,
      fx: this.fx, drops: this.drops, projectiles: this.projectiles, cam: this.cam,
      onDefeated: () => this.onBossDefeated(ctx),
      onLevelUp: () => this.onLevelUp(),
    });

    // 岩着弾コールバック（ボスの岩投げがプレイヤーに当たる）
    this.projectiles.onRockLand = (x, y, dmg, p) => {
      const fxSize = p.landFxSize ?? 36;
      this.fx.spawn({ sheet: p.landFx ?? "fx.shock", x, y, size: fxSize, fps: 18 });
      this.cam.shake(1.5, 4);
      audio.play("stomp");
      if (Math.hypot(x - this.player.x, y - (this.player.y - 6)) < fxSize * 0.44) {
        this.player.takeDamage(dmg, x, y, this.fx, this.cam);
      }
    };
    this.projectiles.targets = this.enemies.filter((e) => !e.dead).map((e) => ({ x: e.x, y: e.y - e.def.size / 2 }));
    this.projectiles.update(this.player.x, this.player.y - 8);
    this.drops.update(this.player.x, this.player.y, this.fx);
    this.fx.update();
    this.updateWaves();

    this.resolvePlayerAttacks();
    this.resolveProjectileHits();
    this.resolveTouchDamage();
    this.resolveBreakables();
    this.checkWarp();

    // ゲージ満タンの通知音（1回だけ）
    const full = game.kegare >= game.kegareMax;
    if (full && !this.kegareWasFull) audio.play("haraiReady");
    this.kegareWasFull = full;

    this.followCamera();
  }

  private followCamera() {
    const viewW = LOGICAL_W / this.zoomCur, viewH = LOGICAL_H / this.zoomCur;
    this.cam.follow(this.player.x, this.player.y - 8, this.map.pxW, this.map.pxH, viewW, viewH);
  }

  // ── 祓い波 ─────────────────────────────────────────────────
  /** プレイヤーの溜め完了時に呼ばれる（Player.onHaraiRelease） */
  private releaseHarai() {
    game.kegare = 0;
    this.waves.push({ x: this.player.x, y: this.player.y - 8, t: 0, maxR: HARAI_WAVE_R, hit: new Set() });
    audio.play("harai");
    this.cam.shake(3, 12);
    this.hitstop = Math.max(this.hitstop, 6); // 解放の「タメ」
    this.flashT = 14;
    this.fx.spawn({ sheet: "fx.heal", x: 0, y: -4, size: 46, fps: 16, follow: this.player.anchor, blend: "lighter" });
  }

  private updateWaves() {
    for (const wv of this.waves) {
      wv.t++;
      const k = Math.min(1, wv.t / HARAI_WAVE_F);
      const r = wv.maxR * (1 - Math.pow(1 - k, 3)); // easeOutCubic
      for (const e of this.enemies) {
        if (e.dead || wv.hit.has(e.id)) continue;
        if (Math.hypot(e.x - wv.x, (e.y - e.def.size / 2) - wv.y) > r) continue;
        wv.hit.add(e.id);
        const dx = e.x - wv.x, dy = e.y - wv.y;
        const d = Math.hypot(dx, dy) || 1;
        const dmg = Math.max(1, Math.round(this.player.baseDamage(0) * HARAI_DMG_MUL));
        e.takeHit(dmg, dx / d, dy / d, this.fx, this.drops, () => this.onLevelUp());
        // 浄化の輝き（祓われた場所に光が残る）
        this.fx.spawn({ sheet: "fx.heal", x: e.x, y: e.y - e.def.size / 2, size: 30, fps: 14, blend: "lighter" });
        this.hitstop = Math.max(this.hitstop, 5);
        audio.play("hitHeavy");
      }
      // ── 祓い波がボスに触れたとき（1回のみ）──
      const BOSS_WAVE_ID = -777;
      if (this.boss && !this.boss.dead && this.boss.state !== "dying"
          && !wv.hit.has(BOSS_WAVE_ID)) {
        const bCenter = { x: this.boss.x, y: this.boss.y - this.boss.size / 2 };
        if (Math.hypot(bCenter.x - wv.x, bCenter.y - wv.y) <= r) {
          wv.hit.add(BOSS_WAVE_ID);
          const bdx = bCenter.x - wv.x, bdy = bCenter.y - wv.y;
          const bd = Math.hypot(bdx, bdy) || 1;
          const dmg = Math.max(1, Math.round(this.player.baseDamage(0) * HARAI_DMG_MUL));
          this.boss.takeHit(dmg, bdx / bd, bdy / bd, this.fx);
          this.fx.spawn({ sheet: "fx.heal", x: this.boss.x, y: bCenter.y, size: 40, fps: 14, blend: "lighter" });
          this.hitstop = Math.max(this.hitstop, 7);
          audio.play("hitHeavy");
        }
      }
    }
    this.waves = this.waves.filter((wv) => wv.t < HARAI_WAVE_F);
  }

  /** 浄化の輪の描画（タイルとスプライトの間ではなく fx の後・最前面寄り） */
  private drawWaves(r: import("../gfx/renderer").Renderer) {
    for (const wv of this.waves) {
      const k = Math.min(1, wv.t / HARAI_WAVE_F);
      const rad = wv.maxR * (1 - Math.pow(1 - k, 3));
      const a = 0.65 * (1 - k);
      const ctx = r.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const [sx, sy] = r.toScreen(wv.x, wv.y, this.cam);
      // 三重の輪（外=金 / 中=白 / 内=淡青）— 祓いの神聖さ
      const ring = (rr: number, w: number, color: string, alpha: number) => {
        if (rr <= 0) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = w * r.k;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rr * r.k, rr * r.k * 0.86, 0, 0, Math.PI * 2);
        ctx.stroke();
      };
      ring(rad, 5, "#ffe9a0", a);
      ring(rad * 0.88, 3, "#ffffff", a * 0.9);
      ring(rad * 0.72, 2, "#bfe9ff", a * 0.6);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // ── 攻撃解決 ───────────────────────────────────────────────
  private resolvePlayerAttacks() {
    const hit = this.player.getActiveHit();
    if (!hit) return;
    for (const e of this.enemies) {
      if (e.dead || this.player.swingHit.has(e.id)) continue;
      const overlap = hit.kind === "rect"
        ? rectsOverlap(hit.rect as Rect, e.box)
        : circleRectOverlap(hit.circle as { x: number; y: number; r: number }, e.box);
      if (!overlap) continue;
      this.player.swingHit.add(e.id);

      const cx = e.box.x + e.box.w / 2, cy = e.box.y + e.box.h / 2;
      const dx = cx - this.player.x, dy = cy - (this.player.y - 8);
      const d = Math.hypot(dx, dy) || 1;
      const aff = AFFINITY[e.def.key]?.[hit.weapon.id] ?? 1;
      const dmg = Math.max(1, Math.round(this.player.baseDamage(hit.chargeLevel) * aff));
      e.takeHit(dmg, dx / d, dy / d, this.fx, this.drops, () => this.onLevelUp());

      // 穢れが剥がれて祓いゲージへ（チャージヒットは多め）
      game.kegare = Math.min(game.kegareMax, game.kegare + (hit.chargeLevel > 0 ? 16 : 9));

      const hs = hit.chargeLevel > 0 ? hit.weapon.charge.hitstop : hit.weapon.hitstop;
      this.hitstop = Math.max(this.hitstop, hs);
      audio.play(hit.chargeLevel > 0 ? "hitHeavy" : "hit");
      if (hit.chargeLevel > 0) this.cam.shake(2, 4);
      if (aff > 1) this.fx.damage(cx, cy - 18, "効果バツグン!", "#ffd34d");
    }
    // ── ボスへの通常攻撃 ──
    if (this.boss && !this.boss.dead && this.boss.state !== "dying"
        && !this.player.swingHit.has(-999)) {
      const overlap = hit.kind === "rect"
        ? rectsOverlap(hit.rect as Rect, this.boss.box)
        : circleRectOverlap(hit.circle as { x: number; y: number; r: number }, this.boss.box);
      if (overlap) {
        this.player.swingHit.add(-999);
        const bcx = this.boss.box.x + this.boss.box.w / 2;
        const bcy = this.boss.box.y + this.boss.box.h / 2;
        const bdx = bcx - this.player.x, bdy = bcy - (this.player.y - 8);
        const bd = Math.hypot(bdx, bdy) || 1;
        const baff = AFFINITY[this.boss.def.key]?.[hit.weapon.id] ?? 1;
        const dmg = Math.max(1, Math.round(this.player.baseDamage(hit.chargeLevel) * baff));
        this.boss.takeHit(dmg, bdx / bd, bdy / bd, this.fx);
        if (baff > 1) this.fx.damage(bcx, bcy - 28, "効果バツグン!", "#ffd34d");
        game.kegare = Math.min(game.kegareMax, game.kegare + (hit.chargeLevel > 0 ? 20 : 12));
        const hs = hit.chargeLevel > 0 ? hit.weapon.charge.hitstop : hit.weapon.hitstop;
        this.hitstop = Math.max(this.hitstop, hs);
        audio.play(hit.chargeLevel > 0 ? "hitHeavy" : "hit");
        if (hit.chargeLevel > 0) this.cam.shake(2, 4);
      }
    }
  }

  private resolveProjectileHits() {
    for (const p of this.projectiles.list) {
      if (p.dead) continue;
      if (!p.fromPlayer && (p.kind === "spore" || p.kind === "homing")) {
        if (circleRectOverlap({ x: p.x, y: p.y, r: p.radius }, this.player.box)) {
          p.dead = true;
          this.player.takeDamage(p.dmg, p.x - p.vx * 4, p.y - p.vy * 4, this.fx, this.cam);
        }
      }
    }
  }

  private resolveTouchDamage() {
    if (this.player.invulnT > 0 || !this.player.alive) return;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (rectsOverlap(e.box, this.player.box)) {
        this.player.takeDamage(e.def.atk, e.x, e.y, this.fx, this.cam);
        return;
      }
    }
    // ── ボスの接触ダメージ ──
    if (this.boss && !this.boss.dead && this.boss.state !== "dying") {
      // ボス本体への接触
      if (rectsOverlap(this.boss.box, this.player.box)) {
        this.player.takeDamage(10, this.boss.x, this.boss.y, this.fx, this.cam);
        return;
      }
      // 衝撃波リング
      for (const ring of this.boss.rings) {
        if (ring.hitPlayer) continue;
        const px = this.player.x, py = this.player.y - 6;
        const rdx = px - ring.x, rdy = (py - ring.y) / 0.6; // 楕円補正
        const dist = Math.hypot(rdx, rdy);
        if (Math.abs(dist - ring.r) < ring.width) {
          ring.hitPlayer = true;
          this.player.takeDamage(ring.dmg, ring.x, ring.y, this.fx, this.cam);
          return;
        }
      }
    }
  }

  /** 草むら・壺をプレイヤーの攻撃で壊す */
  private resolveBreakables() {
    const hit = this.player.getActiveHit();
    if (!hit) return;
    for (const p of this.map.data.props) {
      if (!p.id) continue;
      const isGrass = p.id.startsWith("grass:");
      if (!isGrass) continue;
      if (p.frame >= 3) continue;
      const box: Rect = { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h };
      const overlap = hit.kind === "rect"
        ? rectsOverlap(hit.rect as Rect, box)
        : circleRectOverlap(hit.circle as { x: number; y: number; r: number }, box);
      if (!overlap) continue;
      p.frame = 3;
      audio.play("swish");
      this.fx.spawn({ sheet: "fx.hit", x: p.x, y: p.y - p.h / 2, size: 20, fps: 22 });
      if (Math.random() < 0.2) this.drops.spawn("gem", p.x, p.y - 4);
      else if (Math.random() < 0.12) this.drops.spawn("heart", p.x, p.y - 4);
    }
  }

  // ── インタラクション ───────────────────────────────────────
  private tryInteract(ctx: SceneCtx): boolean {
    const d = FACING_DIR[this.player.facing];
    const ix = this.player.x + d.x * 22, iy = this.player.y - 6 + d.y * 22;

    for (const n of this.map.data.npcs) {
      const nx = n.x * TILE + TILE / 2, ny = n.y * TILE + TILE / 2;
      if (Math.hypot(nx - ix, ny - iy) < 16 || Math.hypot(nx - this.player.x, ny - (this.player.y - 4)) < 24) {
        audio.play("menuOk");
        ctx.scenes.push(new DialogScene(n.dialog), ctx);
        return true;
      }
    }
    for (const p of this.map.data.props) {
      if (!p.id) continue;
      const px = p.x, py = p.y - p.h / 3;
      if (Math.hypot(px - ix, py - iy) > 26 && Math.hypot(px - this.player.x, py - (this.player.y - 4)) > 30) continue;
      if (p.id.startsWith("sign:")) {
        audio.play("menuOk");
        ctx.scenes.push(new DialogScene(this.signText(p.id)), ctx);
        return true;
      }
      if (p.id.startsWith("chest:") && p.frame < 3) {
        this.openChest(ctx, p);
        return true;
      }
    }
    return false;
  }

  private signText(id: string): string[] {
    switch (id) {
      case "sign:tutorial":
        return [
          "「Zで祓う。おしっぱなしで縛り祓い。\n 穢れを祓うと祓いゲージが満ちる」",
          "「ゲージが満ちたら C で祓い波——\n 周囲の穢れをまとめて浄化する」",
        ];
      case "sign:phase0":
        return [
          "（検証の祠: 2キー=飛行カメラ /\n 3キー=夜の多灯テスト / 右上=fps）",
        ];
      default:
        return ["……何も書かれていない。"];
    }
  }

  private openChest(ctx: SceneCtx, p: MapProp) {
    p.frame = 3;
    audio.play("chest");
    game.flags.add(p.id as string);
    switch (p.id) {
      case "chest:satoyama_gp":
        game.gp += 30;
        game.berries = Math.min(BERRY_MAX, game.berries + 1);
        ctx.scenes.push(new DialogScene(["宝箱をあけた！\n30銭と回復の実を手に入れた。"]), ctx);
        break;
      default:
        ctx.scenes.push(new DialogScene(["宝箱はからっぽだった…。"]), ctx);
    }
  }

  // ── イベント ───────────────────────────────────────────────
  private onLevelUp() {
    audio.play("levelup");
    this.fx.damage(this.player.x, this.player.y - 34, "LEVEL UP!", "#ffd34d");
    this.fx.spawn({ sheet: "fx.heal", x: 0, y: -6, size: 40, fps: 12, follow: this.player.anchor, blend: "lighter" });
  }

  private onBossDefeated(ctx: SceneCtx) {
    const arena = BOSS_ARENAS[this.mapId];
    if (!arena) return;
    game.flags.add(arena.flag);
    // 報酬
    arena.reward?.();
    // BGM をフィールド曲へ（建前: 山神が戻った安堵）
    audio.playBgm(this.map.data.bgm);
    // 撃破口上ダイアログ
    ctx.scenes.push(new DialogScene(arena.defeatLines), ctx);
  }

  private checkWarp() {
    if (this.fadeDir !== 0) return;
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor((this.player.y - 4) / TILE);
    const w = this.map.warpAt(tx, ty);
    if (w) {
      this.warpTo = { map: w.toMap, tx: w.toX, ty: w.toY };
      this.fadeDir = 1;
      if (w.facing) this.player.facing = w.facing;
    }
  }

  // ── 描画 ───────────────────────────────────────────────────
  draw(ctx: SceneCtx) {
    const r = ctx.r;
    const cam = this.cam;
    r.zoom = this.zoomCur;             // ワールドはズーム描画（飛行検証①）
    this.map.drawGround(r, cam, ctx.time);

    type Drawable = { y: number; draw: () => void };
    const items: Drawable[] = [];
    for (const p of this.map.data.props) {
      if (p.ysort === false) { this.map.drawProp(r, cam, p, ctx.time); continue; }
      items.push({ y: p.y, draw: () => this.map.drawProp(r, cam, p, ctx.time) });
    }
    this.map.drawDecals(r, cam);
    for (const n of this.map.data.npcs) {
      const nx = n.x * TILE + TILE / 2, ny = n.y * TILE + TILE - 2;
      items.push({
        y: ny,
        draw: () => {
          r.shadow(nx, ny - 1, 10, 3.6, cam, 0.3);
          const frame = Math.floor((ctx.time / 1000) * 4) % 4;
          r.sprite(n.sheet, frame, nx - 20, ny - 40, { cam, w: 40, h: 40 });
        },
      });
    }
    for (const e of this.enemies) items.push({ y: e.y, draw: () => e.draw(r, cam) });
    if (this.boss && !this.boss.dead) items.push({ y: this.boss.y, draw: () => this.boss?.draw(r, cam) });
    if (this.player.alive || this.deadT < 40) items.push({ y: this.player.y, draw: () => this.player.draw(r, cam) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    this.map.drawOverhead(r, cam, ctx.time);
    this.projectiles.draw(r, cam);
    this.drops.draw(r, cam);
    this.fx.draw(r, cam);
    this.drawWaves(r);

    // 暗闇（洞窟 or 多光源テスト④）
    if (this.map.data.darkness || this.darkTest) {
      const strength = this.map.data.darkness ?? 0.42;
      const lights = [
        ...(this.map.data.lights ?? []),
        { x: this.player.x, y: this.player.y - 8, r: 80 },
      ];
      if (this.darkTest) {
        // プレイヤー周辺に提灯8灯を仮想配置（多光源fps計測）
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.t / 90;
          lights.push({ x: this.player.x + Math.cos(a) * 90, y: this.player.y + Math.sin(a) * 60, r: 46 });
        }
      }
      r.darknessOverlay(strength, lights, cam);
    }

    // 解放フラッシュ（祓い波）
    if (this.flashT > 0) {
      const a = (this.flashT / 14) * 0.55;
      r.ctx.fillStyle = `rgba(255,250,235,${a})`;
      r.ctx.fillRect(0, 0, r.W, r.H);
    }

    r.zoom = 1;                        // HUD は等倍
    this.drawHud(ctx);

    // マップ名トースト
    if (this.toastT > 0) {
      this.toastT--;
      const a = Math.min(1, this.toastT / 30);
      r.win.panel(LOGICAL_W / 2 - 56, 12, 112, 18, { alpha: 0.85 * a });
      r.font.draw(this.map.data.name, LOGICAL_W / 2, 15, { size: 9.5, color: "#f2ede1", align: "center", alpha: a, font: WA_FONT });
    }
    // フェード
    if (this.fade > 0) {
      r.ctx.fillStyle = `rgba(4,6,12,${Math.min(1, this.fade)})`;
      r.ctx.fillRect(0, 0, r.W, r.H);
    }
  }

  private drawHud(ctx: SceneCtx) {
    const r = ctx.r;
    // ── ボスHPバー（上中央）── ボスが生存中のみ表示
    if (this.boss && !this.boss.dead) {
      const bw = 140, bx = LOGICAL_W / 2 - bw / 2;
      r.win.panel(bx - 4, 6, bw + 8, 18, { alpha: 0.88 });
      r.font.draw(this.boss.def.name, LOGICAL_W / 2, 9, { size: 6.5, color: "#e8c88a", align: "center", font: WA_FONT });
      const bRatio = Math.max(0, this.boss.hp / this.boss.maxHp);
      r.win.gauge(bx, 16, bw, 4, bRatio,
        bRatio > 0.5 ? ["#d0882a", "#8a4a0a"] : ["#e84030", "#8a1a10"]);
    }
    // HP / 祓いゲージ（左下）
    r.win.panel(6, LOGICAL_H - 42, 106, 36);
    r.font.draw("HP", 12, LOGICAL_H - 36, { size: 7, color: "#9fb2e8" });
    const hpRatio = game.hp / game.maxHp;
    r.win.gauge(26, LOGICAL_H - 34, 56, 5, hpRatio,
      hpRatio > 0.3 ? ["#56d35c", "#1f7a2c"] : ["#e86a4a", "#8a2a1a"]);
    r.font.draw(`${game.hp}/${game.maxHp}`, 82, LOGICAL_H - 28, { size: 7, color: "#f2ede1", align: "right" });
    // 祓いゲージ（満タンで金色に明滅）
    const kr = game.kegare / game.kegareMax;
    const full = kr >= 1;
    const blink = full && Math.floor(this.t / 8) % 2 === 0;
    r.font.draw("祓", 12, LOGICAL_H - 22, { size: 7, color: full ? "#ffe9a0" : "#c9b2e8" });
    r.win.gauge(26, LOGICAL_H - 20, 56, 5, kr,
      blink ? ["#fff6d8", "#c9a23a"] : full ? ["#ffe9a0", "#a87f1f"] : ["#b78fe0", "#5a3f80"]);
    if (full) r.font.draw("C!", 88, LOGICAL_H - 22, { size: 7, color: blink ? "#fff6d8" : "#ffe9a0" });
    // 回復の実（パネル内に収める）
    r.sprite("item.berry", 0, 88, LOGICAL_H - 41, { w: 9, h: 9 });
    r.font.draw(`×${game.berries}`, 97, LOGICAL_H - 40, { size: 6, color: "#f2ede1" });

    // チャージ＆武器（右下）
    r.win.panel(LOGICAL_W - 74, LOGICAL_H - 30, 68, 24);
    const w = this.player.weapon;
    r.sprite(w.icon, 0, LOGICAL_W - 70, LOGICAL_H - 27, { w: 18, h: 18 });
    const cT = this.player.chargeT;
    const cRatio = cT / CHARGE_FULL_F;
    r.win.gauge(LOGICAL_W - 48, LOGICAL_H - 21, 38, 5, cRatio,
      cT >= CHARGE_FULL_F ? ["#ffd34d", "#b07a10"] : cT >= CHARGE_WEAK_F ? ["#7cd6ff", "#2a6a9a"] : ["#9aa4c8", "#4a5478"]);
    r.font.draw(w.name, LOGICAL_W - 46, LOGICAL_H - 14, { size: 6, color: "#9fb2e8" });

    // Lv / 銭（左上・和フォント）
    const lv = levelFor(game.exp).lv;
    r.font.draw(`Lv${lv}  ${game.gp}銭`, 8, 6, { size: 8, color: "#f2ede1", outline: "#202440", font: WA_FONT });

    // fps（右上・Phase 0 計測）
    const eng = (window as unknown as { __tamamusubi?: { engine?: { fps?: number } } }).__tamamusubi?.engine;
    const fps = Math.round(eng?.fps ?? 0);
    r.font.draw(`${fps}fps${this.flight ? " 飛行" : ""}${this.darkTest ? " 夜" : ""}`,
      LOGICAL_W - 6, 6, { size: 6.5, color: fps >= 45 ? "#9fe8b2" : "#ff9c8a", align: "right", outline: "#202440" });
  }
}
