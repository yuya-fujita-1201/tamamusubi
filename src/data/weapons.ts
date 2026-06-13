import type { Facing, WeaponId, Rect } from "../core/types";

// 武器フレームデータ（Seiken-5.0 の60Hzフレームデータを移植・玉結び体験版3種に再構成）。
// 攻撃シートはミト高解像度8コマ/方向（mito.atk）: [0-1]=かまえ [2-3]=振り(キメ) [4-5]=フォロー [6-7]=戻り

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;            // アセットキー
  sheet: string;           // 本体攻撃シート
  dmgMul: number;          // 基礎攻撃力への倍率
  windup: number;          // かまえF数
  active: number;          // 攻撃フェーズF数
  hitFrom: number;         // 判定開始（攻撃フェーズ内 1-origin）
  hitTo: number;
  follow: number;          // フォローF数
  moveCancel: number;      // フォロー nF目から移動キャンセル可
  atkCancel: number;       // フォロー nF目から次攻撃可
  hitstop: number;         // ヒット時停止F
  /** 向きごとの攻撃判定（プレイヤー中心基準の相対矩形） */
  hitbox: Record<Facing, Rect>;
  fx: "slash" | "thrust" | "none";
  swingSfx: "swish" | "throw";
  charge: {
    name: string;
    dmgMulWeak: number;    // 30F 弱チャージ
    dmgMulStrong: number;  // 48F 強チャージ
    hitstop: number;
  };
}

const box = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** 前方矩形を向き別に展開（down 基準: 前=+y）。reach=前方距離, width=横幅, depth=奥行 */
function frontBoxes(reach: number, width: number, depth: number): Record<Facing, Rect> {
  return {
    down: box(-width / 2, reach - depth, width, depth),
    up: box(-width / 2, -reach, width, depth),
    left: box(-reach, -width / 2, depth, width),
    right: box(reach - depth, -width / 2, depth, width),
  };
}

// 体格は聖剣5.0と同等（体高26論理px）。リーチもほぼ同等＋わずかに広め。
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: {
    id: "sword", name: "祓い刀", icon: "ui.icon_sword", sheet: "mito.atk",
    dmgMul: 1.0,
    windup: 4, active: 6, hitFrom: 3, hitTo: 5, follow: 12,
    moveCancel: 4, atkCancel: 6,
    hitstop: 5,
    hitbox: frontBoxes(25, 29, 18),
    fx: "slash", swingSfx: "swish",
    // 2026-06-13仕様変更: チャージ＝居合（納刀溜め→抜刀の一閃。前方大判定・縮地）
    charge: { name: "居合・祓い抜き", dmgMulWeak: 1.6, dmgMulStrong: 2.6, hitstop: 12 },
  },
  // ── 以下は体験版で実装する枠（Phase 0 では未入手）。シートは仮にミトの剣を流用 ──
  hammer: {
    id: "hammer", name: "木槌", icon: "ui.icon_sword", sheet: "mito.atk",
    dmgMul: 1.5,
    windup: 10, active: 8, hitFrom: 3, hitTo: 6, follow: 20,
    moveCancel: 14, atkCancel: 16,
    hitstop: 8,
    hitbox: frontBoxes(23, 26, 19),
    fx: "thrust", swingSfx: "swish",
    charge: { name: "杭打ち", dmgMulWeak: 1.6, dmgMulStrong: 2.8, hitstop: 12 },
  },
  mirror: {
    id: "mirror", name: "御鏡", icon: "ui.icon_sword", sheet: "mito.atk",
    dmgMul: 0.6,
    windup: 8, active: 12, hitFrom: 2, hitTo: 12, follow: 12,
    moveCancel: 8, atkCancel: 10,
    hitstop: 3,
    hitbox: frontBoxes(56, 14, 48),
    fx: "none", swingSfx: "throw",
    charge: { name: "御光", dmgMulWeak: 1.5, dmgMulStrong: 2.2, hitstop: 8 },
  },
};

export const CHARGE_WEAK_F = 30;
export const CHARGE_FULL_F = 48;

export const WEAPON_ORDER: WeaponId[] = ["sword", "hammer", "mirror"];

/** 武器相性ボーナス（敵タイプ別ダメージ倍率）。Phase 0 は素通し、体験版で調整。 */
export const AFFINITY: Record<string, Partial<Record<WeaponId, number>>> = {};
