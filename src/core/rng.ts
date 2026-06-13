// 再現可能な疑似乱数（mulberry32）。マップ装飾の散布などに使う。
export class Rng {
  private s: number;
  constructor(seed = 1) { this.s = seed >>> 0; }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)] as T; }
  chance(p: number): boolean { return this.next() < p; }
}

export const rng = new Rng(0xC0FFEE);
