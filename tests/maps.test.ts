import { describe, it, expect } from "vitest";
import { buildMap, MAP_BUILDERS } from "../src/data/maps";
import { TILE } from "../src/core/constants";
import { EMPTY } from "../src/field/tileset";

// マップ整合性の機械検証（アンチパターン G: warp往復ループ / 着地点 solid を検知）

describe("マップ構築", () => {
  it("全マップがビルドできる", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      expect(m.w).toBeGreaterThan(0);
      expect(m.h).toBeGreaterThan(0);
      expect(m.ground.length).toBe(m.w * m.h);
    }
  });

  it("全マップ: 敵スポーン地点は通行可能", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      for (const s of m.spawns) {
        const i = s.y * m.w + s.x;
        expect(m.collision[i], `[${id}] spawn ${s.enemy}@${s.x},${s.y}`).toBe(0);
      }
    }
  });

  it("kiritate: ゲーム開始地点(28,24)が通行可能", () => {
    // 2026-06-13: 村スタートに変更。title.ts の開始座標と一致させる。
    const m = buildMap("kiritate");
    expect(m.collision[24 * m.w + 28]).toBe(0);
  });

  it("satoyama: 北ロビー(44,11・kiritateからの着地周辺)が通行可能", () => {
    const m = buildMap("satoyama");
    expect(m.collision[11 * m.w + 44]).toBe(0);
    expect(m.collision[3 * m.w + 44], "kiritateからの着地点(44,3)").toBe(0);
  });

  it("全マップ: warp の着地先が別 warp の上にない（往復ループ防止）", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      for (const w of m.warps) {
        const dst = buildMap(w.toMap);
        const back = dst.warps.find((x) => x.x === w.toX && x.y === w.toY);
        expect(back, `[${id}] warp ${w.x},${w.y}→${w.toMap}@(${w.toX},${w.toY})`).toBeUndefined();
      }
    }
  });

  it("全マップ: warp 着地点が通行可能", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      for (const w of m.warps) {
        const dst = buildMap(w.toMap);
        const i = w.toY * dst.w + w.toX;
        expect(dst.collision[i], `[${id}] warp→${w.toMap}@(${w.toX},${w.toY}) should be walkable`).toBe(0);
      }
    }
  });

  it("全マップ: EMPTY歩行可能セルなし（落下防止）", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      for (let i = 0; i < m.ground.length; i++) {
        if (m.ground[i] === EMPTY && (m.deco[i] ?? 0) === EMPTY) {
          expect(m.collision[i], `[${id}] empty cell ${i % m.w},${Math.floor(i / m.w)}`).toBe(1);
        }
      }
    }
  });

  it("全マップ: 通行不可率が 0.30〜0.70（脱・箱庭の帯域）", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      let n = 0;
      for (let i = 0; i < m.collision.length; i++) if (m.collision[i]) n++;
      const ratio = n / m.collision.length;
      expect(ratio, `[${id}] solid ratio ${ratio.toFixed(3)}`).toBeGreaterThan(0.3);
      expect(ratio, `[${id}] solid ratio ${ratio.toFixed(3)}`).toBeLessThan(0.7);
    }
  });

  it("プロップの足元が画面内に収まる", () => {
    for (const id of Object.keys(MAP_BUILDERS)) {
      const m = buildMap(id);
      for (const p of m.props) {
        expect(p.x, `[${id}] prop ${p.sheet} x`).toBeGreaterThanOrEqual(0);
        expect(p.x, `[${id}] prop ${p.sheet} x`).toBeLessThanOrEqual(m.w * TILE);
        expect(p.y, `[${id}] prop ${p.sheet} y`).toBeGreaterThanOrEqual(0);
        expect(p.y, `[${id}] prop ${p.sheet} y`).toBeLessThanOrEqual(m.h * TILE);
      }
    }
  });

  it("kiritate: NPC 鈴代が登録されている", () => {
    const m = buildMap("kiritate");
    const suzushiro = m.npcs.find((n) => n.id === "suzushiro");
    expect(suzushiro).toBeDefined();
    expect(suzushiro!.dialog.length).toBeGreaterThanOrEqual(3);
    // 「討つんじゃないよ。祓うんだ」が含まれるか
    const allDialog = suzushiro!.dialog.join("\n");
    expect(allDialog).toContain("祓う");
  });

  it("kiritate: 敵スポーンなし", () => {
    const m = buildMap("kiritate");
    expect(m.spawns.length).toBe(0);
  });

  it("morioku: 暗闇演出が設定されている", () => {
    const m = buildMap("morioku");
    expect(m.darkness).toBeGreaterThan(0);
    expect(m.lights).toBeDefined();
    expect(m.lights!.length).toBeGreaterThan(0);
  });

  it("satoyama ↔ kiritate の warp 往復整合", () => {
    const sat = buildMap("satoyama");
    const kiri = buildMap("kiritate");
    const satToKiri = sat.warps.find((w) => w.toMap === "kiritate");
    const kiriToSat = kiri.warps.find((w) => w.toMap === "satoyama");
    expect(satToKiri).toBeDefined();
    expect(kiriToSat).toBeDefined();
  });

  it("satoyama ↔ morioku の warp 往復整合", () => {
    const sat = buildMap("satoyama");
    const mori = buildMap("morioku");
    const satToMori = sat.warps.find((w) => w.toMap === "morioku");
    const moriToSat = mori.warps.find((w) => w.toMap === "satoyama");
    expect(satToMori).toBeDefined();
    expect(moriToSat).toBeDefined();
  });
});
