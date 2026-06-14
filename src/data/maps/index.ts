import type { MapData } from "../../field/tilemap";
import { buildSatoyama } from "./satoyama";
import { buildKiritate } from "./kiritate";
import { buildMorioku } from "./morioku";
import { buildTakadai } from "./takadai";
import { buildTanada } from "./tanada";

// マップは入場のたびに構築する（宝箱フラグ等を反映するため）。
// Phase 1A: 始まりの里山郷（satoyama）・霧立の里（kiritate）・杜の奥（morioku）の3マップ。
// + 高台（takadai）= 2026-06-13 立体表現(高低差)の実験マップ。
// + 棚田の谷（tanada）= 2026-06-14 Phase L1 美麗風景骨格（山道/棚田/川）。

export const MAP_BUILDERS: Record<string, () => MapData> = {
  satoyama: buildSatoyama,
  kiritate: buildKiritate,
  morioku:  buildMorioku,
  takadai:  buildTakadai,
  tanada:   buildTanada,
};

export function buildMap(id: string): MapData {
  const fn = MAP_BUILDERS[id];
  if (!fn) throw new Error(`unknown map: ${id}`);
  return fn();
}
