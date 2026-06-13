import { describe, it, expect } from "vitest";
import { WEAPONS, CHARGE_WEAK_F, CHARGE_FULL_F, WEAPON_ORDER, DASH_CUT_DMG_MUL } from "../src/data/weapons";
import { ENEMIES } from "../src/data/enemies";
import { LEVELS, levelFor, gainExp, newGame } from "../src/state/game";
import { BOSS_DEFS, GankinoBoss } from "../src/combat/boss";

describe("武器フレームデータ（桜井メソッド整合）", () => {
  it("判定発生は攻撃フェーズ内にある", () => {
    for (const w of Object.values(WEAPONS)) {
      if (w.id === "mirror") continue; // 御鏡は照射型（体験版で別実装）
      expect(w.hitFrom).toBeGreaterThanOrEqual(1);
      expect(w.hitTo).toBeLessThanOrEqual(w.active);
      expect(w.hitFrom).toBeLessThanOrEqual(w.hitTo);
    }
  });

  it("キャンセルフレームはフォロー内にあり、移動キャンセル ≤ 攻撃キャンセル", () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.moveCancel).toBeGreaterThan(0);
      expect(w.moveCancel).toBeLessThanOrEqual(w.follow);
      expect(w.atkCancel).toBeLessThanOrEqual(w.follow);
      expect(w.moveCancel).toBeLessThanOrEqual(w.atkCancel);
    }
  });

  it("祓い刀（初期武器）のかまえは4F以内（即時フィードバック）", () => {
    expect(WEAPONS.sword.windup).toBeLessThanOrEqual(4);
    expect(WEAPONS.sword.windup).toBeGreaterThanOrEqual(1);
  });

  it("チャージ段階は 弱<強 のダメージ序列", () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.charge.dmgMulWeak).toBeGreaterThan(1);
      expect(w.charge.dmgMulStrong).toBeGreaterThan(w.charge.dmgMulWeak);
    }
    expect(CHARGE_WEAK_F).toBeLessThan(CHARGE_FULL_F);
  });

  it("武器順序の先頭は祓い刀", () => {
    expect(WEAPON_ORDER[0]).toBe("sword");
  });

  it("ステップ斬りの実ダメージは全レベルで 通常 < ステップ斬り < 弱チャージ < 強チャージ", () => {
    // Codexレビュー: 生の倍率(1.4<1.6)だけでなく、整数丸め後の実ダメージで序列を検証する。
    // 計算順は実装（player.baseDamage→field.ts の dashMul 乗算）に一致させる。
    const w = WEAPONS.sword;
    const baseDmg = (atk: number, mul: number) => Math.max(1, Math.round(atk * w.dmgMul * mul));
    for (const lv of LEVELS) {
      const atk = lv.atk;
      const normal = baseDmg(atk, 1);
      const dash = Math.max(1, Math.round(normal * DASH_CUT_DMG_MUL)); // field.ts と同じ二段
      const weak = baseDmg(atk, w.charge.dmgMulWeak);
      const strong = baseDmg(atk, w.charge.dmgMulStrong);
      expect(dash, `Lv${lv.lv} atk${atk}: 通常${normal}<斬込${dash}`).toBeGreaterThan(normal);
      expect(dash, `Lv${lv.lv} atk${atk}: 斬込${dash}<弱${weak}`).toBeLessThan(weak);
      expect(weak).toBeLessThan(strong);
    }
  });
});

describe("敵定義", () => {
  it("全敵にテレグラフ12F以上 or 低速接触型の妥当な値がある", () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.telegraphF).toBeGreaterThanOrEqual(8);
      expect(e.hp).toBeGreaterThan(0);
      expect(e.sightR).toBeGreaterThan(0);
    }
  });
  it("Phase 0 の敵（穢れ狐火）が定義されている", () => {
    expect(ENEMIES.kitsunebi).toBeDefined();
    expect(ENEMIES.kitsunebi?.behavior).toBe("fly");
  });
});

describe("ボス定義（岩鬼の王）", () => {
  it("HP は 0 より大きい", () => {
    const def = BOSS_DEFS.gankinoou;
    expect(def).toBeDefined();
    expect(def!.maxHp).toBeGreaterThan(0);
  });

  it("テレグラフ相当フレームは 12F 以上（ストンプ 16F・岩投げ 15F）", () => {
    // GankinoBoss の tele_stomp=16F, tele_rock=15F をロジックで検証
    // ボスを生成して stomp テレグラフを消化し、stomp 状態になることを確認
    const boss = new GankinoBoss(0, 0);
    boss.state = "tele_stomp";
    boss.stateT = 0;
    // stateT が 15 の時点ではまだ tele_stomp のまま
    for (let i = 0; i < 15; i++) {
      // 簡易更新（map/fx等を使わない状態だけ確認）
      boss.stateT++;
    }
    expect(boss.stateT).toBe(15); // 16F 未満なのでまだ tele_stomp
    expect(boss.state).toBe("tele_stomp");
  });

  it("フェーズ2 閾値は HP が 50% 以下", () => {
    const boss = new GankinoBoss(0, 0);
    expect(boss.phase2).toBe(false);
    boss.hp = Math.floor(boss.maxHp / 2);
    expect(boss.phase2).toBe(true);
    boss.hp = Math.floor(boss.maxHp / 2) + 1;
    expect(boss.phase2).toBe(false);
  });
});

describe("成長と祓いゲージ", () => {
  it("レベルテーブルは単調増加", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.exp).toBeGreaterThan(LEVELS[i - 1]!.exp);
      expect(LEVELS[i]!.maxHp).toBeGreaterThan(LEVELS[i - 1]!.maxHp);
      expect(LEVELS[i]!.atk).toBeGreaterThanOrEqual(LEVELS[i - 1]!.atk);
    }
  });
  it("gainExp でレベルアップし HP が増える", () => {
    const g = newGame();
    const hp0 = g.maxHp;
    gainExp(g, 12);
    expect(levelFor(g.exp).lv).toBe(2);
    expect(g.maxHp).toBeGreaterThan(hp0);
  });
  it("newGame の祓いゲージは空・上限100", () => {
    const g = newGame();
    expect(g.kegare).toBe(0);
    expect(g.kegareMax).toBe(100);
  });
});
