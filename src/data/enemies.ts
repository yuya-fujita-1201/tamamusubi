// 敵定義（玉結び）。敵＝穢れを帯びた妖。祓うと光になって還る（殺すではなく浄化）。
// Phase 0 は狐火1種で祓い波の手触りを検証する。体験版で里山の妖5種＋岩鬼の王を追加。

export type EnemyBehavior = "hop" | "ranged" | "lunge" | "fly" | "tank";

export interface EnemyDef {
  key: string;
  name: string;
  sheet: string;
  size: number;          // 描画サイズ（論理px・正方）
  bodyW: number;         // 当たり判定幅
  bodyH: number;
  hp: number;
  atk: number;           // 接触/攻撃ダメージ
  exp: number;
  speed: number;         // px/F
  sightR: number;        // 索敵半径
  telegraphF: number;    // かまえテレグラフF数
  attackCdF: number;     // 攻撃後クールダウン
  behavior: EnemyBehavior;
  deflectSword?: boolean;
  projectile?: "spore" | "ember";
  animFps: number;
  view: "front" | "side";
  dropHeart: number;
  dropGem: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  karakasa: {
    key: "karakasa", name: "穢れ唐傘", sheet: "enemy.karakasa",
    size: 26, bodyW: 16, bodyH: 15,
    hp: 20, atk: 7, exp: 6, speed: 0.8, sightR: 95,
    telegraphF: 12, attackCdF: 70,
    behavior: "hop", animFps: 7, view: "front",
    dropHeart: 0.15, dropGem: 0.32,
  },
  kodama: {
    key: "kodama", name: "穢れ木霊", sheet: "enemy.kodama",
    size: 22, bodyW: 14, bodyH: 13,
    hp: 18, atk: 6, exp: 7, speed: 0.45, sightR: 120,
    telegraphF: 18, attackCdF: 110,
    behavior: "ranged", projectile: "spore", animFps: 6, view: "front",
    dropHeart: 0.15, dropGem: 0.34,
  },
  kitsunebi: {
    key: "kitsunebi", name: "穢れ狐火", sheet: "enemy.kitsunebi",
    size: 24, bodyW: 16, bodyH: 14,
    hp: 16, atk: 6, exp: 4, speed: 0.65, sightR: 100,
    telegraphF: 14, attackCdF: 80,
    behavior: "fly", animFps: 8, view: "front",
    dropHeart: 0.14, dropGem: 0.3,
  },
};
