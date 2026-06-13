export type InputAction =
  | "up" | "down" | "left" | "right"
  | "attack"     // Z / Space / pad2 — 長押しでチャージ（縛り祓い）
  | "confirm"    // X / E / Enter / pad0 — 調べる・話す・決定
  | "cancel"     // Esc / pad1
  | "menu"       // Tab / pad3 — メニュー
  | "cycle"      // Q / pad LB — 武器直接切替
  | "dodge"      // Shift / pad RB — 回避
  | "harai"      // C / pad LT — 祓い波（穢れゲージ解放の大技）
  | "skill1" | "skill2" | "skill3";  // 1=未使用 / 2=飛行カメラ検証 / 3=暗闇検証（4/5は立体表示削除に伴い廃止）

export type Facing = "down" | "left" | "right" | "up";

export const FACING_DIR: Record<Facing, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

/** 歩行/攻撃シートの行順（hdproc 後の strip 内のオフセット） */
export const FACING_ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

// 体験版武器3種: 祓い刀(sword) / 木槌(hammer) / 御鏡(mirror)。Phase 0 は sword のみ実装。
export type WeaponId = "sword" | "hammer" | "mirror";

export interface Rect { x: number; y: number; w: number; h: number }

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
