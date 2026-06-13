import { TILE } from "../core/constants";
import { Rng } from "../core/rng";
import type { Facing } from "../core/types";
import { EMPTY, T, TRANS_MAPS, DEFAULT_TRANS, type TransitionMap } from "./tileset";
import type { MapData, MapProp, NpcDef, SpawnDef } from "./tilemap";

// マップ構築 DSL。グリッド感を出さないための paintAuto（遷移タイル）、
// blob（楕円塊）、scatterDecals（疎な装飾散布）を提供する。

export class MapBuilder {
  data: MapData;
  private rng: Rng;

  constructor(id: string, name: string, w: number, h: number,
              bgm: MapData["bgm"], outsideColor: string, seed = 1) {
    this.rng = new Rng(seed);
    this.data = {
      id, name, w, h,
      ground: new Uint16Array(w * h),
      deco: new Uint16Array(w * h),
      overhead: new Uint16Array(w * h),
      collision: new Uint8Array(w * h),
      decals: [], props: [], warps: [], npcs: [], spawns: [],
      bgm, outsideColor,
    };
  }

  private idx(x: number, y: number): number { return y * this.data.w + x; }
  private inb(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.data.w && y < this.data.h; }

  fill(setIdx: number, frames: number[] = [0]) {
    for (let i = 0; i < this.data.ground.length; i++)
      this.data.ground[i] = T(setIdx, this.rng.pick(frames));
    return this;
  }

  ground(x: number, y: number, setIdx: number, frame = 0) {
    if (this.inb(x, y)) this.data.ground[this.idx(x, y)] = T(setIdx, frame);
    return this;
  }

  deco(x: number, y: number, setIdx: number, frame = 0) {
    if (this.inb(x, y)) this.data.deco[this.idx(x, y)] = T(setIdx, frame);
    return this;
  }

  overhead(x: number, y: number, setIdx: number, frame = 0) {
    if (this.inb(x, y)) this.data.overhead[this.idx(x, y)] = T(setIdx, frame);
    return this;
  }

  solid(x: number, y: number, on = true) {
    if (this.inb(x, y)) this.data.collision[this.idx(x, y)] = on ? 1 : 0;
    return this;
  }

  solidRect(x0: number, y0: number, w: number, h: number, on = true) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) this.solid(x, y, on);
    return this;
  }

  /** 外周を1マス通行不可に */
  sealBorder() {
    for (let x = 0; x < this.data.w; x++) { this.solid(x, 0); this.solid(x, this.data.h - 1); }
    for (let y = 0; y < this.data.h; y++) { this.solid(0, y); this.solid(this.data.w - 1, y); }
    return this;
  }

  /** 複数楕円塊の合成（有機的な大型マス。重ねて「ひし形/三日月/雲形」を作る） */
  blobUnion(specs: [number, number, number, number, number?][]): Set<number> {
    const out = new Set<number>();
    for (const [cx, cy, rx, ry, jitter] of specs)
      for (const i of this.blob(cx, cy, rx, ry, jitter ?? 0.25)) out.add(i);
    return out;
  }

  /** 補集合（マップ全域から cells を除いた残り）。歩ける領域→外側マスの反転に使う */
  invert(cells: Set<number>): Set<number> {
    const out = new Set<number>();
    for (let i = 0; i < this.data.ground.length; i++) if (!cells.has(i)) out.add(i);
    return out;
  }

  /** 集合を r セル膨張（通路の安全マージン確保用） */
  expand(cells: Set<number>, r = 1): Set<number> {
    const out = new Set<number>(cells);
    const w = this.data.w;
    for (const i of cells) {
      const x = i % w, y = Math.floor(i / w);
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (this.inb(x + dx, y + dy)) out.add(this.idx(x + dx, y + dy));
    }
    return out;
  }

  /**
   * 歩行可能領域の輪郭を整える（実機FBの「地続きに見えない/浮き島」対策）。
   * a) 壁セルの8近傍に歩行セルが6つ以上 → 歩行化（凹みノッチ充填）
   * b) 壁セルの8近傍に壁が1つ以下 → 歩行化（浮き島チップ除去）
   * c) 歩行セルの8近傍に歩行セルが1つ以下 → 壁化（孤立スペック除去）
   * 細い回廊（幅2以上）は壊さないしきい値設定。
   */
  refine(walkable: Set<number>, iterations = 2): Set<number> {
    let cur = walkable;
    const w = this.data.w, h = this.data.h;
    const n8 = [-1, 0, 1];
    for (let it = 0; it < iterations; it++) {
      const next = new Set<number>(cur);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          let walkN = 0, wallN = 0;
          for (const dy of n8) for (const dx of n8) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (!this.inb(nx, ny)) { wallN++; continue; }
            if (cur.has(ny * w + nx)) walkN++; else wallN++;
          }
          if (!cur.has(i)) {
            if (walkN >= 6 || wallN <= 1) next.add(i);
          } else if (walkN <= 1) {
            next.delete(i);
          }
        }
      }
      cur = next;
    }
    return cur;
  }

  /**
   * 「歩ける領域」以外の全セルを terrain で埋めて通行不可にする。
   * マップのシルエットが blob/道の輪郭で決まり、矩形の外周が見えなくなる（脱・箱庭の核）。
   */
  fillOutside(walkable: Set<number>, setIdx: number, transKey: string,
              layer: "ground" | "deco" | "overhead" = "ground"): Set<number> {
    const mass = this.invert(walkable);
    this.paintAuto(mass, setIdx, transKey, layer, true);
    return mass;
  }

  /** 通行不可セルの割合（脱・箱庭の目標 0.30-0.50 の検証用） */
  solidRatio(): number {
    let n = 0;
    for (let i = 0; i < this.data.collision.length; i++) if (this.data.collision[i]) n++;
    return n / this.data.collision.length;
  }

  /**
   * cells 内へプロップをグリッド＋ジッタで散布（迷路の森など）。
   * 同種を等間隔に並べず、jitter と chance で自然な揺らぎを作る。
   */
  scatterProps(cells: Set<number>, sheets: string[], w: number, h: number,
               opts: { spacing?: number; jitter?: number; chance?: number; footW?: number; footH?: number } = {}) {
    const sp = opts.spacing ?? 3;
    const jit = opts.jitter ?? 0.8;
    const chance = opts.chance ?? 0.85;
    for (let gy = 1; gy < this.data.h - 1; gy += sp) {
      for (let gx = 1; gx < this.data.w - 1; gx += sp) {
        const tx = gx + (this.rng.next() - 0.5) * 2 * jit;
        const ty = gy + (this.rng.next() - 0.5) * 2 * jit;
        const cx = Math.round(tx), cy = Math.round(ty);
        if (!this.inb(cx, cy) || !cells.has(this.idx(cx, cy))) continue;
        if (!this.rng.chance(chance)) continue;
        const sheet = this.rng.pick(sheets);
        this.prop(sheet, tx, ty, w, h, {
          ...(opts.footW !== undefined ? { footW: opts.footW } : {}),
          ...(opts.footH !== undefined ? { footH: opts.footH } : {}),
        });
      }
    }
    return this;
  }

  /** 楕円塊のセル集合（自然な輪郭。jitter で縁を崩す） */
  blob(cx: number, cy: number, rx: number, ry: number, jitter = 0.25): Set<number> {
    const cells = new Set<number>();
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        if (!this.inb(x, y)) continue;
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const d = dx * dx + dy * dy;
        const edge = 1 + (this.rng.next() - 0.5) * jitter * 2;
        if (d <= edge) cells.add(this.idx(x, y));
      }
    }
    return cells;
  }

  /** 折れ線を太さ thick でラスタライズした道セル集合 */
  path(points: [number, number][], thick = 4): Set<number> {
    const cells = new Set<number>();
    const stamp = (x: number, y: number) => {
      const r = thick / 2;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          const tx = Math.round(x + dx), ty = Math.round(y + dy);
          if (dx * dx + dy * dy <= r * r + 0.5 && this.inb(tx, ty)) cells.add(this.idx(tx, ty));
        }
    };
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i] as [number, number];
      const [x1, y1] = points[i + 1] as [number, number];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
      for (let s = 0; s <= steps; s++) {
        stamp(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
      }
    }
    return cells;
  }

  /**
   * 遷移タイルセットでセル集合を塗る。
   * 外（集合外）に接する辺が1つなら端タイル、隣接2辺なら外コーナータイル、
   * それ以外は中央（端タイルの縁が並ぶ市松化を防ぐ — antipatterns §I-2）。
   * コーナーフレーム未定義のセットでは従来どおり center にフォールバックする。
   */
  paintAuto(cells: Set<number>, setIdx: number, transKey: string,
            layer: "ground" | "deco" | "overhead" = "ground", solid = false) {
    const tm: TransitionMap = TRANS_MAPS[transKey] ?? DEFAULT_TRANS;
    const arr = this.data[layer];
    const w = this.data.w;
    for (const i of cells) {
      const x = i % w, y = Math.floor(i / w);
      const outN = !cells.has(this.idx(x, y - 1)) && this.inb(x, y - 1);
      const outS = !cells.has(this.idx(x, y + 1)) && this.inb(x, y + 1);
      const outW = !cells.has(this.idx(x - 1, y)) && this.inb(x - 1, y);
      const outE = !cells.has(this.idx(x + 1, y)) && this.inb(x + 1, y);
      const outs = [outN, outS, outW, outE].filter(Boolean).length;
      let frame: number | undefined;
      if (outs === 1) {
        frame = outN ? tm.n : outS ? tm.s : outW ? tm.w : tm.e;
      } else if (outs === 2) {
        if (outN && outW) frame = tm.nw;
        else if (outN && outE) frame = tm.ne;
        else if (outS && outW) frame = tm.sw;
        else if (outS && outE) frame = tm.se;
        // N+S / W+E（対辺）はコーナーで表せないので center へ
      }
      if (frame === undefined) frame = this.rng.pick(tm.center);
      arr[i] = T(setIdx, frame);
      if (solid) this.data.collision[i] = 1;
    }
    return this;
  }

  /** 装飾デカールを疎に散布（cells 省略時は全面、密度 5-15% 推奨。sheet 省略時 grass_detail） */
  scatterDecals(density: number, frames: number[], cells?: Set<number>, sheet?: string) {
    const w = this.data.w;
    for (let i = 0; i < this.data.ground.length; i++) {
      if (cells && !cells.has(i)) continue;
      if (this.data.deco[i] !== EMPTY) continue;
      if (this.rng.chance(density)) {
        this.data.decals.push({
          x: i % w, y: Math.floor(i / w), frame: this.rng.pick(frames),
          ...(sheet !== undefined ? { sheet } : {}),
        });
      }
    }
    return this;
  }

  /**
   * 大型プロップを接地配置。tx,ty は足元中心のタイル座標（小数可）。
   * footW×footH タイルを通行不可にする（footprint は本体下部のみ）。
   */
  prop(sheet: string, tx: number, ty: number, w: number, h: number,
       opts: { frame?: number; footW?: number; footH?: number; shadow?: boolean; ysort?: boolean;
               id?: string; animFps?: number; animFrames?: number } = {}): MapProp {
    const p: MapProp = {
      sheet,
      frame: opts.frame ?? 0,
      x: tx * TILE, y: ty * TILE,
      w, h,
      ysort: opts.ysort ?? true,
      ...(opts.shadow !== false ? { shadow: { rx: w * 0.32, ry: Math.max(3, w * 0.1) } } : {}),
      ...(opts.id !== undefined ? { id: opts.id } : {}),
      ...(opts.animFps !== undefined ? { animFps: opts.animFps } : {}),
      ...(opts.animFrames !== undefined ? { animFrames: opts.animFrames } : {}),
    };
    this.data.props.push(p);
    const fw = opts.footW ?? Math.max(1, Math.round(w / TILE) - 1);
    const fh = opts.footH ?? 1;
    const fx0 = Math.round(tx - fw / 2), fy0 = Math.round(ty - fh);
    this.solidRect(fx0, fy0, fw, fh);
    return p;
  }

  warp(x: number, y: number, toMap: string, toX: number, toY: number, facing?: Facing) {
    this.data.warps.push(facing ? { x, y, toMap, toX, toY, facing } : { x, y, toMap, toX, toY });
    this.solid(x, y, false); // warp マスは必ず通行可能
    return this;
  }

  npc(n: NpcDef) {
    this.data.npcs.push(n);
    this.solid(n.x, n.y); // NPC は通行不可（会話対象）
    return this;
  }

  spawn(enemy: string, x: number, y: number) {
    this.data.spawns.push({ enemy, x, y } satisfies SpawnDef);
    return this;
  }

  done(): MapData { return this.data; }
}
