import type { WeaponId } from "../core/types";

// ランタイムのゲーム進行状態。デモなので永続セーブはなし
// （死亡時は村で復活、進行フラグは保持）。

// ── 魔法（5.14）──────────────────────────────────────────────
export type SpellId = "heal" | "fire";

export interface SpellDef {
  id: SpellId;
  name: string;
  icon: string;          // アセットキー
  mpCost: number;
  castF: number;         // 詠唱フレーム（60Hz）
  unlockLv: number;      // 習得レベル
}

export const SPELLS: Record<SpellId, SpellDef> = {
  heal: { id: "heal", name: "ヒール", icon: "ui.icon_heal", mpCost: 8, castF: 20, unlockLv: 1 },
  fire: { id: "fire", name: "フレイム", icon: "ui.icon_fire", mpCost: 12, castF: 16, unlockLv: 3 },
};

export const SPELL_ORDER: SpellId[] = ["heal", "fire"];

// ── 回避スタイル（5.15）。魔法スロットと同様、将来の換装UIを見込んで設定値化 ──
// backstep: 向きを保ったまま真後ろへ跳ぶ（既定。正面ダッシュの違和感FB対応）
// roll:     入力方向へ転がる（旧挙動。換装候補として温存）
export type DodgeStyle = "backstep" | "roll";

export interface GameState {
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  /** 穢れゲージ（祓い波の弾薬）。敵を攻撃すると溜まり、満タンで祓い波を解放できる */
  kegare: number;
  kegareMax: number;
  level: number;
  exp: number;
  gp: number;
  berries: number;          // 回復の実（最大3）
  weapons: WeaponId[];      // 入手済み
  equipped: WeaponId;
  spells: SpellId[];        // 習得済み魔法（5.14）
  dodgeStyle: DodgeStyle;   // 回避スタイル（5.15・換装可能）
  /** ルシアのクールダウン（マップ遷移で Companion が作り直されても持続させる） */
  companionCd: { heal: number; buff: number };
  flags: Set<string>;       // "chest:forest1", "boss:defeated", "intro:done" など
  /** 死亡時の復帰先 */
  respawn: { map: string; tx: number; ty: number };
}

export const BERRY_MAX = 3;
export const BERRY_HEAL = 40;
export const BERRY_MP = 8;     // 5.14: 実は MP も回復
export const BERRY_PRICE = 30;

export interface LevelDef {
  lv: number; exp: number; maxHp: number; atk: number; maxMp: number;
}

/** レベルごとの必要累計EXPと能力 */
export const LEVELS: readonly LevelDef[] = [
  { lv: 1, exp: 0, maxHp: 50, atk: 6, maxMp: 30 },
  { lv: 2, exp: 12, maxHp: 62, atk: 7, maxMp: 30 },
  { lv: 3, exp: 30, maxHp: 74, atk: 9, maxMp: 35 },
  { lv: 4, exp: 60, maxHp: 88, atk: 11, maxMp: 35 },
  { lv: 5, exp: 105, maxHp: 102, atk: 13, maxMp: 40 },
  { lv: 6, exp: 165, maxHp: 118, atk: 16, maxMp: 40 },
  { lv: 7, exp: 245, maxHp: 134, atk: 19, maxMp: 45 },
  { lv: 8, exp: 350, maxHp: 152, atk: 23, maxMp: 45 },
];

export function levelFor(exp: number): LevelDef {
  let cur: LevelDef = LEVELS[0] as LevelDef;
  for (const l of LEVELS) if (exp >= l.exp) cur = l;
  return cur;
}

export function atkOf(g: GameState): number {
  return levelFor(g.exp).atk;
}

/** MP 加算（敵撃破+3 / 時間回復+1 / 実+8）。上限クランプ */
export function gainMp(g: GameState, amount: number): void {
  g.mp = Math.max(0, Math.min(g.maxMp, g.mp + amount));
}

/** EXP加算。レベルが上がったら true（HP/MP最大値も更新・上昇分だけ回復）。
 * 新レベルの unlockLv に達した魔法を自動習得する（5.14）。 */
export function gainExp(g: GameState, amount: number): boolean {
  const before = levelFor(g.exp).lv;
  g.exp += amount;
  const after = levelFor(g.exp);
  if (after.lv > before) {
    const hpGain = after.maxHp - g.maxHp;
    g.maxHp = after.maxHp;
    g.hp = Math.min(g.maxHp, g.hp + hpGain); // 上昇分は回復
    const mpGain = after.maxMp - g.maxMp;
    g.maxMp = after.maxMp;
    g.mp = Math.min(g.maxMp, g.mp + Math.max(0, mpGain));
    g.level = after.lv;
    for (const sid of SPELL_ORDER) {
      if (after.lv >= SPELLS[sid].unlockLv && !g.spells.includes(sid)) g.spells.push(sid);
    }
    return true;
  }
  return false;
}

export function newGame(): GameState {
  return {
    maxHp: 50,
    hp: 50,
    maxMp: 30,
    mp: 30,
    kegare: 0,
    kegareMax: 100,
    level: 1,
    exp: 0,
    gp: 0,
    berries: 1,
    weapons: ["sword"],
    equipped: "sword",
    spells: [],
    dodgeStyle: "backstep",
    companionCd: { heal: 450, buff: 300 }, // 加入直後の連発防止に半充填スタート
    flags: new Set(),
    respawn: { map: "satoyama", tx: 44, ty: 11 },
  };
}

/** グローバル単一状態（タイトル→NewGame で作り直す） */
export let game: GameState = newGame();
export function resetGame() { game = newGame(); }
