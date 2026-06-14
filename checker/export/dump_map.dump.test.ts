import { it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildMap, MAP_BUILDERS } from "../../src/data/maps";
import { tileSet, tileFrame, EMPTY } from "../../src/field/tileset";
import type { MapData } from "../../src/field/tilemap";

// MapData(TS・ビルダー生成) を Python linter が読める JSON へ書き出す唯一の橋渡し。
// レイヤーは "setKey:frame"(空セルは "") の文字列配列に復号して持たせる（Python側でビット演算を再実装しないため）。
//
// 使い方:
//   CHECK_MAP=tanada npx vitest run --config checker/checker.vitest.config.ts
//   CHECK_MAP=all    npx vitest run --config checker/checker.vitest.config.ts   ← 全マップ
// 出力: checker/_dump/<map>.json

const OUT_DIR = path.resolve(__dirname, "..", "_dump");

function decodeLayer(layer: Uint16Array): string[] {
  const out = new Array<string>(layer.length);
  for (let i = 0; i < layer.length; i++) {
    const ref = layer[i] ?? EMPTY;
    if (!ref) { out[i] = ""; continue; }
    const ts = tileSet(ref);
    out[i] = ts ? `${ts.key}:${tileFrame(ref)}` : `__unknown_${ref}__`;
  }
  return out;
}

function dump(m: MapData) {
  return {
    id: m.id,
    name: m.name,
    w: m.w,
    h: m.h,
    logicalTile: 16,
    ground: decodeLayer(m.ground),
    deco: decodeLayer(m.deco),
    overhead: decodeLayer(m.overhead),
    collision: Array.from(m.collision),
    decals: m.decals,
    props: m.props.map((p) => ({
      sheet: p.sheet,
      frame: p.frame,
      x: p.x, y: p.y, w: p.w, h: p.h,
      tileX: p.x / 16, tileY: p.y / 16,
      ysort: p.ysort ?? true,
      solid: p.solid ?? null,
      id: p.id ?? null,
    })),
    warps: m.warps,
    npcs: m.npcs.map((n) => ({ id: n.id, sheet: n.sheet, x: n.x, y: n.y })),
    spawns: m.spawns,
    outsideColor: m.outsideColor,
    shadowAlpha: m.shadowAlpha ?? 1,
    atmosphere: m.atmosphere ?? null,
  };
}

it("dump map(s) to checker/_dump", () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const target = process.env.CHECK_MAP || "tanada";
  const ids = target === "all" ? Object.keys(MAP_BUILDERS) : [target];
  for (const id of ids) {
    const m = buildMap(id);
    const file = path.join(OUT_DIR, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(dump(m)));
    // eslint-disable-next-line no-console
    console.log(`[dump] ${id}: ${m.w}x${m.h} props=${m.props.length} decals=${m.decals.length} -> ${file}`);
  }
});
