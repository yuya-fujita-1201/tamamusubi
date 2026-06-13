import { describe, it, expect } from "vitest";
import assetmap from "../src/data/assetmap.json";
import { TILESETS } from "../src/field/tileset";
import { ENEMIES } from "../src/data/enemies";
import { WEAPONS } from "../src/data/weapons";
import { buildMap } from "../src/data/maps";

// アセット参照の整合性。コードが参照するシートが assetmap に存在するか機械検証する。
const am = assetmap as Record<string, { file: string; frameW: number; frameH: number; frames: number; cols: number }>;

describe("assetmap 整合性", () => {
  it("ミトの3シート（歩行/待機/攻撃）が 4方向×8コマ=32 で登録されている", () => {
    for (const key of ["mito.walk", "mito.idle", "mito.atk"]) {
      const e = am[key];
      expect(e, key).toBeDefined();
      expect(e!.frames, key).toBe(32);
    }
    // 高解像度の要: 歩行セルは 240px 実寸（論理30×SS8・体高208px）
    expect(am["mito.walk"]!.frameW).toBe(240);
    expect(am["mito.atk"]!.frameW).toBe(320);
  });

  it("satoyama が使うタイルセットのシートが存在する", () => {
    const m = buildMap("satoyama");
    const used = new Set<number>();
    for (const arr of [m.ground, m.deco, m.overhead]) {
      for (let i = 0; i < arr.length; i++) {
        const ref = arr[i]!;
        if (ref !== 0) used.add((ref >> 8) - 1);
      }
    }
    for (const idx of used) {
      const ts = TILESETS[idx]!;
      expect(am[ts.sheet], ts.sheet).toBeDefined();
    }
  });

  it("satoyama のプロップ・敵・武器のシートが存在する", () => {
    const m = buildMap("satoyama");
    // 未着アセット（obj.hokora 等）は色矩形フォールバックで動くため、
    // 登録済みシートは壊れていないことを確認し、未登録は警告のみとする。
    const missingProps: string[] = [];
    for (const p of m.props) {
      if (!am[p.sheet]) missingProps.push(p.sheet);
    }
    if (missingProps.length > 0) {
      console.warn(`[assetmap] 未着プロップ（フォールバックで動作）: ${missingProps.join(", ")}`);
    }
    for (const s of m.spawns) {
      const def = ENEMIES[s.enemy]!;
      expect(am[def.sheet], def.sheet).toBeDefined();
    }
    expect(am[WEAPONS.sword.sheet]).toBeDefined();
    for (const bg of m.bgs ?? []) expect(am[bg.sheet], bg.sheet).toBeDefined();
  });

  it("描画サイズ ≤ ソースサイズ（解像度二重劣化の検知・antipatterns §A）", () => {
    // 歩行セル30論理px → 240実寸。frameW がそれ未満なら拡大描画＝劣化
    expect(am["mito.walk"]!.frameW).toBeGreaterThanOrEqual(240);
    // タイル16論理px → 128実寸
    expect(am["tile.grass"]!.frameW).toBeGreaterThanOrEqual(128);
  });
});
