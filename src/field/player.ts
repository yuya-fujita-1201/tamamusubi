import { WALK_CELL, ATK_CELL } from "../core/constants";
import type { Input } from "../core/input";
import type { Facing, Rect, WeaponId } from "../core/types";
import { FACING_DIR, FACING_ROW } from "../core/types";
import type { Tilemap } from "./tilemap";
import type { FxManager } from "../combat/fx";
import { WEAPONS, WEAPON_ORDER, CHARGE_FULL_F, CHARGE_WEAK_F, type WeaponDef } from "../data/weapons";
import type { ProjectileManager } from "../combat/projectile";
import { audio } from "../core/audio";
import { game, atkOf, SPELLS, type SpellId } from "../state/game";
import type { Camera } from "../core/camera";
import type { Renderer } from "../gfx/renderer";

// プレイヤー（ミト）。攻撃モーション4要素（待機/かまえ/攻撃/フォロー＋キャンセルフレーム）を
// 武器フレームデータ（weapons.ts）で駆動する。
// 高解像度シート構成（Phase 0 の主検証項目）:
//   mito.walk = 4方向×8コマ（セル48論理px=240px実寸） / mito.idle = 4方向×8コマ呼吸ループ
//   mito.atk  = 4方向×8コマ（セル64論理px=320px実寸）: [0-1]かまえ [2-3]振り [4-5]フォロー [6-7]戻り
// 本体スプライトと剣閃エフェクトは分離し、エフェクトは回転で4方向に対応（K-2）。

export type PlayerState =
  | "idle" | "walk" | "windup" | "active" | "follow"
  | "charging" | "spin" | "dash" | "hurt" | "deflect" | "dead"
  | "dodge" | "cast"
  | "haraiwave"   // 祓い波: 溜め18F（無防備）→解放
  | "iai";        // 居合抜刀（チャージ解放）: 納刀溜め→縮地→前方大判定の一閃

export interface ActiveHit {
  kind: "rect" | "circle";
  rect?: Rect;                       // ワールド座標
  circle?: { x: number; y: number; r: number };
  swingId: number;
  weapon: WeaponDef;
  chargeLevel: 0 | 1 | 2;            // 0=通常 1=弱 2=強
  pierce: boolean;
  /** ステップ斬り（フロントステップからの攻撃キャンセル）＝威力補正のボーナス行動 */
  dashCut: boolean;
}

const WALK_SPEED = 1.45;
const BODY_W = 13, BODY_H = 11;      // 足元当たり判定

/** 祓い波の溜めフレーム（この間は無防備＝リスクとリターン） */
export const HARAI_WINDUP_F = 18;

// ── ステップ（フロントステップ・縮地 2026-06-13仕様変更）──────────
// ユーザーFB: バックステップ→前ステップ化。硬直を減らし、ステップ中に刀を振れる
// （モンハンの回避斬りのような「避けながら斬る」爽快感を狙う）。
// 予備2F → 無敵10F（F3-12・3.6px/F）→ 後隙8F（F13-20・減衰スライド）
export const DODGE_F = 20;
export const DODGE_INVULN_START = 3;
export const DODGE_INVULN_END = 12;
const DODGE_SPEED = 3.6;
const DODGE_MOVE_CANCEL = 13;        // 後隙の移動キャンセル解禁
const DODGE_ATK_CANCEL = 7;          // ステップ中盤から斬りキャンセル可（ステップ斬り）
const DODGE_COOL = DODGE_F + 16;     // 開始から36Fは再入力不可

// ── 居合抜刀（チャージ解放 2026-06-13仕様変更）──────────────────
// 納刀のまま溜め（mito.iai f1-2）→ 解放で縮地＋前方大判定の一閃。回転斬りは廃止。
const IAI_F = 30;                    // 全体F
const IAI_HIT_FROM = 3;              // 判定開始（縮地と同時）
const IAI_HIT_TO = 10;
const IAI_LUNGE_F = 8;               // 縮地フレーム数
const IAI_LUNGE_SPEED = 2.8;         // 縮地速度 px/F
const IAI_MOVE_CANCEL = 22;
const IAI_ATK_CANCEL = 24;

let swingCounter = 1;

export class Player {
  x: number; y: number;              // 足元中心
  facing: Facing = "down";
  state: PlayerState = "idle";
  stateT = 0;
  animT = 0;
  invulnT = 0;
  kx = 0; ky = 0;
  chargeT = 0;
  chargeReadyPlayed = false;
  swingId = 0;
  swingHit = new Set<number>();      // このスイングで既にヒットした対象id
  /** エフェクト追従用アンカー（FxManager の follow 参照先） */
  anchor = { x: 0, y: 0 };
  /** スピン中の見た目向きサイクル */
  private spinFacingIdx = 0;
  // ── 5.14 回避・魔法・バフ ──
  private dodgeDir = { x: 0, y: 1 };
  /** このステップが前方/横への踏み込みか（真後ろへの後退ステップは false）。
   *  ステップ斬りの威力補正＝前方コミットの報酬なので、後退斬りには乗せない（Codexレビュー） */
  private dodgeForward = true;
  dodgeCoolT = 0;
  castSpell: SpellId | null = null;
  /** 詠唱完了時に Field 側が効果を発動する */
  onCastComplete: ((spell: SpellId) => void) | null = null;
  /** ルシアのバフ残りF（攻撃 dmg×1.2。Field が付与・消費を管理） */
  buffT = 0;
  /** 残像（回避の無敵中を視覚化） */
  private ghosts: { x: number; y: number; frame: number; t: number }[] = [];
  /** ステップ斬りの慣性（dodge から攻撃キャンセルした時に付与） */
  private stepMomentum: { x: number; y: number; t: number } | null = null;
  /** ステップ斬りとして発動したスイングID（このIDの active 判定だけ威力補正＝ボーナス行動） */
  private dashCutSwing = -1;
  /** 被弾硬直中に押された dodge のラッチ（硬直明けに発動） */
  private queuedDodge = false;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.anchor.x = x; this.anchor.y = y;
  }

  get weapon(): WeaponDef { return WEAPONS[game.equipped]; }
  get box(): Rect { return { x: this.x - BODY_W / 2, y: this.y - BODY_H, w: BODY_W, h: BODY_H }; }
  get alive(): boolean { return this.state !== "dead"; }
  get busy(): boolean {
    return this.state === "windup" || this.state === "active" || this.state === "spin" ||
      this.state === "dash" || this.state === "hurt" || this.state === "deflect" || this.state === "dead" ||
      this.state === "dodge" || this.state === "cast" || this.state === "haraiwave" ||
      this.state === "iai";
  }
  /** 回避の無敵窓内か（invulnT と独立） */
  get dodgeInvulnerable(): boolean {
    return this.state === "dodge" && this.stateT >= DODGE_INVULN_START && this.stateT <= DODGE_INVULN_END;
  }
  /** 会話・メニューを開ける状態か */
  get canInteract(): boolean { return this.state === "idle" || this.state === "walk"; }

  // ── ダメージ ───────────────────────────────────────────────
  takeDamage(dmg: number, fromX: number, fromY: number, fx: FxManager, cam: Camera): void {
    if (this.invulnT > 0 || this.state === "dead") return;
    if (this.dodgeInvulnerable) return; // 5.14: 回避の無敵窓（能動的無敵）
    // ダッシュ斬りのモーション中はスーパーアーマー（ユーザーFB: ダッシュで敵に当たっても斬りを出し切りたい）。
    // ダメージ・無敵・軽いノックバックは受けるが、hurt へ遷移させずモーションを継続させる。
    const dashCutMotion = (this.state === "windup" || this.state === "active")
      && this.swingId === this.dashCutSwing;
    game.hp = Math.max(0, game.hp - dmg);
    fx.damage(this.x, this.y - WALK_CELL * 0.8, dmg, "#ff9c8a");
    audio.play("hurt");
    cam.shake(1.5, 4);
    this.invulnT = 60;
    if (game.hp <= 0) {
      this.chargeT = 0; this.castSpell = null; this.stepMomentum = null; this.dashCutSwing = -1;
      this.state = "dead"; this.stateT = 0;
      return;
    }
    const dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    if (dashCutMotion) {
      // 斬りは継続（state/stepMomentum/swingId を維持）。押し戻しは弱めにして狙いを崩さない。
      this.kx = (dx / d) * 0.8; this.ky = (dy / d) * 0.8;
      return;
    }
    this.chargeT = 0;                 // 被弾でチャージ消失（リスク）
    this.castSpell = null;            // 詠唱も被弾で中断（MP未消費のまま）
    this.stepMomentum = null;         // ステップ斬りの慣性も消す（QAレビュー: 次の攻撃に漏れる）
    if (this.state === "haraiwave") this.haraiCancelled = true; // 溜め中の被弾＝不発（リスク）
    this.kx = (dx / d) * 2.4; this.ky = (dy / d) * 2.4;
    this.state = "hurt";
    this.stateT = 0;
  }

  /** ロックシェルに剣を弾かれた */
  onDeflected(fx: FxManager): void {
    audio.play("clang");
    this.stepMomentum = null;
    fx.spawn({ sheet: "fx.hit", x: this.x + FACING_DIR[this.facing].x * 14, y: this.y - 10 + FACING_DIR[this.facing].y * 10, size: 14, fps: 24 });
    const d = FACING_DIR[this.facing];
    this.kx = -d.x * 1.8; this.ky = -d.y * 1.8;
    this.state = "deflect";
    this.stateT = 0;
  }

  // ── 攻撃判定の公開 ─────────────────────────────────────────
  getActiveHit(): ActiveHit | null {
    const w = this.weapon;
    if (this.state === "active") {
      const f = this.stateT + 1; // 1-origin
      if (f >= w.hitFrom && f <= w.hitTo) {
        const hb = w.hitbox[this.facing];
        return {
          kind: "rect",
          rect: { x: this.x + hb.x, y: this.y - 8 + hb.y, w: hb.w, h: hb.h },
          swingId: this.swingId, weapon: w, chargeLevel: 0, pierce: false,
          dashCut: this.swingId === this.dashCutSwing,
        };
      }
      return null;
    }
    if (this.state === "iai" && this.stateT >= IAI_HIT_FROM && this.stateT <= IAI_HIT_TO) {
      // 前方のみ・通常より大きい判定（lv2はさらに広く・貫通）
      const lv = this.chargeLevelAtRelease;
      const reach = lv === 2 ? 46 : 36, width = lv === 2 ? 44 : 34, depth = lv === 2 ? 32 : 24;
      const d = FACING_DIR[this.facing];
      const rect: Rect = d.y !== 0
        ? { x: this.x - width / 2, y: d.y > 0 ? this.y - 8 + (reach - depth) : this.y - 8 - reach, w: width, h: depth }
        : { x: d.x > 0 ? this.x + (reach - depth) : this.x - reach, y: this.y - 8 - width / 2, w: depth, h: width };
      return {
        kind: "rect", rect,
        swingId: this.swingId, weapon: w,
        chargeLevel: lv, pierce: true, dashCut: false,
      };
    }
    if (this.state === "spin" && this.stateT >= 2 && this.stateT <= 14) {
      return {
        kind: "circle",
        circle: { x: this.x, y: this.y - 8, r: 26 },
        swingId: this.swingId, weapon: w,
        chargeLevel: this.chargeLevelAtRelease, pierce: true, dashCut: false,
      };
    }
    if (this.state === "dash") {
      const hb = w.hitbox[this.facing];
      return {
        kind: "rect",
        rect: { x: this.x + hb.x, y: this.y - 8 + hb.y, w: hb.w, h: hb.h },
        swingId: this.swingId, weapon: w,
        chargeLevel: this.chargeLevelAtRelease, pierce: true, dashCut: false,
      };
    }
    return null;
  }

  private chargeLevelAtRelease: 0 | 1 | 2 = 0;

  /** ダメージ計算（相性は scene 側で乗算） */
  baseDamage(chargeLevel: 0 | 1 | 2): number {
    const w = this.weapon;
    const mul = chargeLevel === 2 ? w.charge.dmgMulStrong : chargeLevel === 1 ? w.charge.dmgMulWeak : 1;
    return Math.max(1, Math.round(atkOf(game) * w.dmgMul * mul));
  }

  // ── 更新 ───────────────────────────────────────────────────
  update(input: Input, map: Tilemap, fx: FxManager, projectiles: ProjectileManager): void {
    this.animT++;
    this.stateT++;
    if (this.invulnT > 0) this.invulnT--;
    if (this.dodgeCoolT > 0) this.dodgeCoolT--;
    if (this.buffT > 0) this.buffT--;
    for (const g of this.ghosts) g.t++;
    this.ghosts = this.ghosts.filter((g) => g.t < 14);
    this.anchor.x = this.x; this.anchor.y = this.y - 12;

    // ノックバック減衰
    if (Math.abs(this.kx) > 0.05 || Math.abs(this.ky) > 0.05) {
      this.tryMove(map, this.kx, this.ky);
      this.kx *= 0.78; this.ky *= 0.78;
    }

    const w = this.weapon;
    switch (this.state) {
      case "idle":
      case "walk": {
        // 回避は移動より先に判定（開始フレームに歩行分だけ滑る問題の防止・Codexレビュー）
        if (input.pressed("dodge") && this.startDodge(input, fx, map)) break;
        this.handleMove(input, map);
        // 武器サイクル
        if (input.pressed("cycle")) this.cycleWeapon();
        if (input.pressed("attack")) this.startAttack(fx, projectiles);
        break;
      }
      case "windup": {
        this.applyStepMomentum(map);
        if (this.stateT >= w.windup) {
          this.state = "active"; this.stateT = 0;
          this.spawnSwingFx(fx, projectiles);
        }
        break;
      }
      case "active": {
        this.applyStepMomentum(map);
        if (this.stateT >= w.active) { this.state = "follow"; this.stateT = 0; }
        break;
      }
      case "follow": {
        // キャンセルフレーム（のりしろ）
        if (this.stateT >= w.atkCancel) {
          // 5.14: 回避を最優先（attack 長押し中でも dodge の新規押下は意図が明確）
          if (input.pressed("dodge") && this.startDodge(input, fx, map)) break;
          if (input.isDown("attack")) {
            // 押しっぱなし → チャージへ
            this.state = "charging"; this.stateT = 0;
            this.chargeT = 0; this.chargeReadyPlayed = false;
            break;
          }
          if (input.pressed("attack")) { this.startAttack(fx, projectiles); break; }
        }
        if (this.stateT >= w.moveCancel) {
          const v = input.dirVec();
          if (v.x !== 0 || v.y !== 0) { this.state = "walk"; this.stateT = 0; break; }
        }
        if (this.stateT >= w.follow) { this.state = "idle"; this.stateT = 0; }
        break;
      }
      case "charging": {
        this.chargeT = Math.min(CHARGE_FULL_F, this.chargeT + 1);
        if (this.chargeT === CHARGE_WEAK_F) {
          fx.spawn({ sheet: "fx.charge", x: 0, y: 2, size: 30, fps: 12, loop: false, follow: this.anchor, blend: "lighter" });
        }
        if (this.chargeT >= CHARGE_FULL_F && !this.chargeReadyPlayed) {
          this.chargeReadyPlayed = true;
          audio.play("chargeReady");
          fx.spawn({ sheet: "fx.charge", x: 0, y: 2, size: 36, fps: 16, loop: false, follow: this.anchor, blend: "lighter" });
        }
        // 半減速度で移動可（向きも変えられる＝狙いをつけられる）
        this.handleMove(input, map, 0.5, true);
        if (!input.isDown("attack")) {
          const lv: 0 | 1 | 2 = this.chargeT >= CHARGE_FULL_F ? 2 : this.chargeT >= CHARGE_WEAK_F ? 1 : 0;
          this.chargeT = 0;
          if (lv === 0) { this.state = "idle"; this.stateT = 0; break; }
          this.releaseCharge(lv, fx, projectiles);
        }
        break;
      }
      case "spin": {
        // 見た目: 4方向を高速サイクル
        if (this.stateT % 4 === 0) {
          const order: Facing[] = ["down", "left", "up", "right"];
          this.spinFacingIdx = (this.spinFacingIdx + 1) % 4;
          this.facing = order[this.spinFacingIdx] as Facing;
        }
        if (this.stateT >= 16) { this.state = "follow"; this.stateT = 0; }
        break;
      }
      case "dash": {
        const d = FACING_DIR[this.facing];
        this.tryMove(map, d.x * 2.8, d.y * 2.8);
        if (this.stateT >= 14) { this.state = "follow"; this.stateT = 0; }
        break;
      }
      case "dodge": {
        // 予備3F（移動なし）→ 無敵12F 全速 → 後隙11F 減衰スライド
        // バックステップは短く鋭く（×0.8 ≈ 30px）、ロールは従来どおり38px
        const dodgeSp = DODGE_SPEED * (game.dodgeStyle === "backstep" ? 0.8 : 1);
        if (this.stateT >= DODGE_INVULN_START && this.stateT <= DODGE_INVULN_END) {
          this.tryMove(map, this.dodgeDir.x * dodgeSp, this.dodgeDir.y * dodgeSp);
          if (this.stateT % 6 === 0) {
            const row = FACING_ROW[this.facing];
            this.ghosts.push({ x: this.x, y: this.y, frame: row * 8 + (this.stateT % 8), t: 0 });
          }
        } else if (this.stateT > DODGE_INVULN_END) {
          const k = 1 - (this.stateT - DODGE_INVULN_END) / (DODGE_F - DODGE_INVULN_END);
          this.tryMove(map, this.dodgeDir.x * dodgeSp * 0.32 * k, this.dodgeDir.y * dodgeSp * 0.32 * k);
          if (this.stateT >= DODGE_MOVE_CANCEL) {
            const v = input.dirVec();
            if (v.x !== 0 || v.y !== 0) { this.state = "walk"; this.stateT = 0; break; }
          }
        }
        // ステップ斬り: ステップ中盤から刀でキャンセル（勢いを引き継ぐ・モンハンの回避斬り）
        // ＝ボーナス行動。前方/横への踏み込み斬りだけ威力補正（後退斬りは通常威力・Codexレビュー）。
        if (this.stateT >= DODGE_ATK_CANCEL && input.pressed("attack")) {
          this.stepMomentum = { x: this.dodgeDir.x, y: this.dodgeDir.y, t: 10 };
          this.startAttack(fx, projectiles);
          if (this.dodgeForward) this.dashCutSwing = this.swingId;
          break;
        }
        if (this.stateT >= DODGE_F) { this.state = "idle"; this.stateT = 0; }
        break;
      }
      case "iai": {
        // 縮地: 判定発生と同時に前方へ滑る
        if (this.stateT >= IAI_HIT_FROM && this.stateT < IAI_HIT_FROM + IAI_LUNGE_F) {
          const d = FACING_DIR[this.facing];
          const k = 1 - (this.stateT - IAI_HIT_FROM) / IAI_LUNGE_F;
          this.tryMove(map, d.x * IAI_LUNGE_SPEED * k, d.y * IAI_LUNGE_SPEED * k);
        }
        if (this.stateT >= IAI_ATK_CANCEL && input.pressed("attack")) {
          this.startAttack(fx, projectiles); break;
        }
        if (this.stateT >= IAI_MOVE_CANCEL) {
          const v = input.dirVec();
          if (v.x !== 0 || v.y !== 0) { this.state = "walk"; this.stateT = 0; break; }
        }
        if (this.stateT >= IAI_F) { this.state = "idle"; this.stateT = 0; }
        break;
      }
      case "haraiwave": {
        // 溜め18F（移動不可・無敵なし）→ 解放。被弾でキャンセル済みなら何もしない
        if (this.stateT >= HARAI_WINDUP_F) {
          this.state = "follow"; this.stateT = 0;
          if (!this.haraiCancelled) this.onHaraiRelease?.();
          this.haraiCancelled = false;
        }
        break;
      }
      case "cast": {
        // 詠唱中は移動不可。dodge でキャンセル可（MP消費なし＝消費は発動時）。
        // CD中の dodge は失敗するので詠唱を巻き込まない（無音二重失敗の防止・Codexレビュー）
        if (input.pressed("dodge") && this.dodgeCoolT <= 0) {
          if (this.startDodge(input, fx, map)) {
            this.castSpell = null; // 回避が実際に出た時だけ詠唱を破棄
            break;
          }
        }
        const spell = this.castSpell ? SPELLS[this.castSpell] : null;
        if (!spell) { this.state = "idle"; this.stateT = 0; break; }
        if (this.stateT >= spell.castF) {
          const id = spell.id;
          this.castSpell = null;
          this.state = "follow"; this.stateT = 0;
          this.onCastComplete?.(id); // MP消費と効果は Field 側（発動時消費）
        }
        break;
      }
      case "hurt": {
        // 5.14: 被弾中の dodge 押下をラッチして硬直明けに発動（取りこぼし防止・手触りレビュー）
        if (input.pressed("dodge")) this.queuedDodge = true;
        if (this.stateT >= 14) {
          if (this.queuedDodge) {
            this.queuedDodge = false;
            if (this.startDodge(input, fx, map)) break;
          }
          this.state = "idle"; this.stateT = 0;
        }
        break;
      }
      case "deflect": {
        // 16F: 前半8Fは完全硬直、後半は移動キャンセル可
        if (this.stateT >= 8) {
          const v = input.dirVec();
          if (v.x !== 0 || v.y !== 0) { this.state = "walk"; this.stateT = 0; break; }
        }
        if (this.stateT >= 16) { this.state = "idle"; this.stateT = 0; }
        break;
      }
      case "dead":
        break;
    }
  }

  /** ステップ斬りの慣性スライド（減衰） */
  private applyStepMomentum(map: Tilemap): void {
    if (!this.stepMomentum) return;
    const m = this.stepMomentum;
    const k = m.t / 10;
    this.tryMove(map, m.x * 2.4 * k, m.y * 2.4 * k);
    if (--m.t <= 0) this.stepMomentum = null;
  }

  private handleMove(input: Input, map: Tilemap, speedMul = 1, updateFacing = true): void {
    const v = input.dirVec();
    if (v.x === 0 && v.y === 0) {
      if (this.state === "walk") { this.state = "idle"; this.stateT = 0; }
      return;
    }
    if (this.state === "idle") { this.state = "walk"; this.stateT = 0; }
    const len = Math.hypot(v.x, v.y);
    const sp = WALK_SPEED * speedMul;
    const mvx = (v.x / len) * sp, mvy = (v.y / len) * sp;
    this.tryMove(map, mvx, mvy);
    if (updateFacing) {
      // 支配的な軸を向きにする（斜めは横優先）
      if (v.x !== 0) this.facing = v.x < 0 ? "left" : "right";
      else if (v.y !== 0) this.facing = v.y < 0 ? "up" : "down";
    }
  }

  private tryMove(map: Tilemap, dx: number, dy: number): void {
    const tryAxis = (mx: number, my: number) => {
      const nx = this.x + mx, ny = this.y + my;
      if (map.rectSolid(nx - BODY_W / 2, ny - BODY_H, BODY_W, BODY_H)) return false;
      this.x = nx; this.y = ny;
      return true;
    };
    if (!tryAxis(dx, dy)) { tryAxis(dx, 0) || tryAxis(0, dy); }
  }

  private cycleWeapon(): void {
    const owned = WEAPON_ORDER.filter((id) => game.weapons.includes(id));
    if (owned.length <= 1) return;
    const i = owned.indexOf(game.equipped);
    game.equipped = owned[(i + 1) % owned.length] as WeaponId;
    audio.play("menuMove");
  }

  private startAttack(_fx: FxManager, _projectiles: ProjectileManager): void {
    this.state = "windup";
    this.stateT = 0;
    this.swingId = swingCounter++;
    this.swingHit.clear();
    this.dashCutSwing = -1; // 既定は補正なし。ステップ斬りは呼び出し側で直後に swingId を代入する（QAレビュー）
  }

  /** ステップ開始（2026-06-13 フロントステップ仕様）。成功時 true。
   * - 入力方向へ素早く踏み込む。無入力なら向いている方向へ前ステップ（縮地）
   * - 入力がほぼ真後ろ（facing と逆）の場合は向きを保ったまま下がる＝敵に正対したバックステップ
   * - ステップ中盤から攻撃キャンセル（ステップ斬り）可能 */
  private startDodge(input: Input, fx: FxManager, map: Tilemap): boolean {
    if (this.dodgeCoolT > 0) return false;
    const v = input.dirVec();
    const f = FACING_DIR[this.facing];
    if (v.x === 0 && v.y === 0) {
      this.dodgeDir = { x: f.x, y: f.y }; // 前ステップ
      this.dodgeForward = true;
    } else {
      const len = Math.hypot(v.x, v.y);
      this.dodgeDir = { x: v.x / len, y: v.y / len };
      const dot = this.dodgeDir.x * f.x + this.dodgeDir.y * f.y;
      this.dodgeForward = dot >= -0.5; // 前・横は踏み込み / 真後ろは後退（補正対象外）
      if (dot >= -0.5) {
        // 前・横ステップは向きも更新（踏み込んだ先に斬れる）
        if (Math.abs(v.x) >= Math.abs(v.y)) this.facing = v.x < 0 ? "left" : "right";
        else this.facing = v.y < 0 ? "up" : "down";
      } // 真後ろは facing 維持＝敵を見ながら下がる
    }
    // 行き先が壁なら不発（CD未消費）
    const px = this.x + this.dodgeDir.x * 10, py = this.y + this.dodgeDir.y * 10;
    if (map.rectSolid(px - 6, py - 10, 12, 10)) return false;
    this.state = "dodge";
    this.stateT = 0;
    this.dodgeCoolT = DODGE_COOL;
    this.ghosts.length = 0;
    audio.play("swish");
    fx.spawn({ sheet: "fx.poof", x: this.x, y: this.y - 4, size: 16, fps: 22 });
    return true;
  }

  /** 祓い波の解放時に Field 側が波動を生成する */
  onHaraiRelease: (() => void) | null = null;
  private haraiCancelled = false;

  /** 祓い波の溜め開始（ゲージ判定は Field 側）。成功時 true */
  startHarai(fx: FxManager): boolean {
    if (this.state !== "idle" && this.state !== "walk" && this.state !== "follow") return false;
    this.state = "haraiwave";
    this.stateT = 0;
    this.haraiCancelled = false;
    audio.play("chargeReady");
    fx.spawn({ sheet: "fx.charge", x: 0, y: 0, size: 40, fps: 18, loop: false, follow: this.anchor, blend: "lighter" });
    return true;
  }

  /** 魔法詠唱開始（リングメニューから呼ばれる）。MP判定はメニュー側で済んでいる前提。 */
  startCast(spell: SpellId, fx: FxManager): boolean {
    if (this.state !== "idle" && this.state !== "walk") return false;
    this.castSpell = spell;
    this.state = "cast";
    this.stateT = 0;
    fx.spawn({
      sheet: "fx.charge", x: 0, y: 2, size: 26, fps: 14, loop: false,
      follow: this.anchor, blend: "lighter",
    });
    return true;
  }

  /** かまえ→攻撃の遷移時にエフェクトを発火 */
  private spawnSwingFx(fx: FxManager, _projectiles: ProjectileManager): void {
    const w = this.weapon;
    const d = FACING_DIR[this.facing];
    audio.play(w.swingSfx);
    if (w.fx === "slash") {
      fx.spawn({
        sheet: "fx.slash", x: d.x * 18, y: -2 + d.y * 16, size: 40, fps: 28,
        rot: this.fxRot(), follow: this.anchor, blend: "lighter",
      });
    } else if (w.fx === "thrust") {
      fx.spawn({
        sheet: "fx.thrust", x: d.x * 24, y: -2 + d.y * 22, size: 42, fps: 28,
        rot: this.fxRot(), follow: this.anchor, blend: "lighter",
      });
    }
  }

  /** エフェクト素材は右向き基準 → 向きに応じて回転 */
  private fxRot(): number {
    switch (this.facing) {
      case "right": return 0;
      case "down": return Math.PI / 2;
      case "left": return Math.PI;
      case "up": return -Math.PI / 2;
    }
  }

  private releaseCharge(lv: 1 | 2, fx: FxManager, _projectiles: ProjectileManager): void {
    const w = this.weapon;
    this.chargeLevelAtRelease = lv;
    this.swingId = swingCounter++;
    this.swingHit.clear();
    this.stateT = 0;
    if (w.id === "sword") {
      // 居合抜刀（2026-06-13仕様変更）: 納刀溜めからの一閃。前方のみ・大判定・縮地
      this.state = "iai";
      audio.play("spin"); // 鋭い抜きの風切り（専用SEは後日）
      const d = FACING_DIR[this.facing];
      fx.spawn({
        // flipX: 弧の出っ張り（凸側）を進行方向へ向ける（素材は凸が左基準のため反転）
        sheet: "fx.iai_wa", x: d.x * 30, y: -6 + d.y * 26, size: lv === 2 ? 72 : 56, fps: 22,
        rot: this.fxRot(), flipX: true, follow: this.anchor, blend: "lighter",
      });
    } else {
      this.state = "dash";
      audio.play("spin");
      const d = FACING_DIR[this.facing];
      fx.spawn({
        sheet: "fx.thrust", x: d.x * 26, y: -2 + d.y * 24, size: lv === 2 ? 52 : 42, fps: 20,
        rot: this.fxRot(), follow: this.anchor, blend: "lighter",
      });
    }
  }

  // ── 描画 ───────────────────────────────────────────────────
  draw(r: Renderer, cam: Camera): void {
    const sz = WALK_CELL;
    // 残像（回避の無敵中の視覚化）— 本体より先に描く
    for (const g of this.ghosts) {
      const a = Math.max(0, 0.35 - g.t * 0.025);
      r.sprite("mito.walk", g.frame, g.x - sz / 2, g.y - sz, { cam, w: sz, h: sz, alpha: a });
    }
    // 無敵中は点滅（dodge 中はスキップ＝残像と重なって視認性を落とさない）
    if (this.invulnT > 0 && this.state !== "dodge" && Math.floor(this.invulnT / 4) % 2 === 0 && this.state !== "dead") return;

    r.shadow(this.x, this.y - 1, 8.5, 3.0, cam, 0.3);

    const row = FACING_ROW[this.facing];
    // 歩行/待機/攻撃すべて 4方向×8コマの高解像度シート。
    let sheet = "mito.walk";
    let frame = row * 8;
    const w = this.weapon;

    switch (this.state) {
      case "idle":
        // 呼吸ループ（6fps・8コマ）
        sheet = "mito.idle";
        frame = row * 8 + (Math.floor((this.animT / 60) * 6) % 8);
        break;
      case "walk": frame = row * 8 + (Math.floor((this.animT / 60) * 12) % 8); break;
      case "windup": sheet = w.sheet; frame = row * 8 + (this.stateT < w.windup / 2 ? 0 : 1); break;
      case "active": sheet = w.sheet; frame = row * 8 + (this.stateT < w.active / 2 ? 2 : 3); break;
      case "spin": sheet = w.sheet; frame = row * 8 + 3; break;
      case "dash": sheet = w.sheet; frame = row * 8 + 3; break;
      case "follow": {
        sheet = w.sheet;
        frame = row * 8 + 4 + Math.min(3, Math.floor((this.stateT / Math.max(1, w.follow)) * 4));
        break;
      }
      case "charging": {
        // 居合の構え: 納刀のまま腰を落としたどっしり構え（f1固定）。
        // ユーザーFB(2026-06-13): f0/f1トグルで体が上下する問題 → 単一フレーム固定。
        // 張り詰めは chargeTint の脈動で表現（上下動はさせない）。
        sheet = "mito.iai"; frame = row * 8 + 1;
        break;
      }
      case "iai": {
        sheet = "mito.iai";
        const t = this.stateT;
        const f = t < IAI_HIT_FROM ? 2            // 抜きはじめ
          : t <= IAI_HIT_TO ? 3                   // 抜刀の一閃（キメ）
          : t < 17 ? 4 : t < 22 ? 5 : t < 27 ? 6 : 7; // フォロー→納刀
        frame = row * 8 + f;
        break;
      }
      case "haraiwave": {
        // 祓い波の溜めも居合の構え（納刀で力を練る）
        sheet = "mito.iai"; frame = row * 8 + (this.stateT < HARAI_WINDUP_F / 2 ? 0 : 1);
        break;
      }
      case "hurt":
      case "deflect": frame = row * 8; break;
      case "dodge":
        // ステップ=高速歩行サイクルで疾走感（前傾モーションは将来専用シート化）
        frame = row * 8 + (Math.floor((this.animT / 60) * 24) % 8);
        break;
      case "cast": {
        sheet = this.weapon.sheet; frame = row * 8 + 1; // かまえポーズ（両手を掲げる代用）
        break;
      }
      case "dead": frame = 0; break;
    }

    const hurtTint = this.state === "hurt" || this.state === "deflect" ? { tint: "#ff7766" }
      : this.state === "haraiwave" && Math.floor(this.animT / 3) % 2 === 0 ? { tint: "#fff6d8" } : {};
    const chargeTint =
      this.state === "charging" && this.chargeT >= CHARGE_FULL_F && Math.floor(this.animT / 4) % 2 === 0
        ? { tint: "#ffe9a0" }
        : this.state === "charging" && this.chargeT >= CHARGE_WEAK_F && Math.floor(this.animT / 6) % 2 === 0
          ? { tint: "#bfe9ff" }
          : {};
    // 攻撃シートはセルが大きい（64論理px）。足元アンカーで描けば体サイズは歩行と一致する。
    const drawSz = sheet === "mito.walk" || sheet === "mito.idle" ? sz : ATK_CELL;
    // 祓い波の溜め中は白金のオーラ
    if (this.state === "haraiwave" && Math.floor(this.animT / 3) % 2 === 0) {
      r.ellipse(this.x, this.y - 2, 11, 4.0, "rgba(255,246,214,0.30)", cam);
    }
    if (this.buffT > 0 && Math.floor(this.animT / 6) % 3 !== 0) {
      r.ellipse(this.x, this.y - 2, 11, 4.0, "rgba(255,214,90,0.22)", cam);
    }
    r.sprite(sheet, frame, this.x - drawSz / 2, this.y - drawSz, {
      cam, w: drawSz, h: drawSz, ...hurtTint, ...chargeTint,
    });
    // 詠唱プログレスバー（頭上 16x3px。遅さの体感を削る）
    if (this.state === "cast" && this.castSpell) {
      const ratio = Math.min(1, this.stateT / SPELLS[this.castSpell].castF);
      const bx = this.x - 8, by = this.y - WALK_CELL * 0.92 - 7;
      r.fillRect(bx, by, 16, 3, "rgba(12,16,30,0.8)", cam);
      const col = ratio < 0.5 ? "#ff9c5a" : ratio < 0.95 ? "#ffe9a0" : "#9cffb0";
      r.fillRect(bx + 0.5, by + 0.5, 15 * ratio, 2, col, cam);
    }
  }
}
