import assetmapJson from "../data/assetmap.json";

// HD strip 画像のロードとシート情報の保持。
// assetmap.json: { key: { file, frameW, frameH, frames, cols } }
// 画像未着でもゲームが起動できるよう、色矩形フォールバックを返す。

export interface Sheet {
  img: HTMLImageElement | HTMLCanvasElement;
  frameW: number;
  frameH: number;
  frames: number;
  cols: number;
}

interface AssetEntry { file: string; frameW: number; frameH: number; frames: number; cols: number }

const assetmap = assetmapJson as Record<string, AssetEntry>;

const FALLBACK_COLORS = [
  "#7c4f9f", "#4f7c9f", "#9f4f5e", "#4f9f6e", "#9f8a4f", "#5e5e9f",
];

class Assets {
  private sheets = new Map<string, Sheet>();
  private loadedCount = 0;
  private totalCount = 0;

  get progress(): number { return this.totalCount === 0 ? 1 : this.loadedCount / this.totalCount; }
  get ready(): boolean { return this.loadedCount >= this.totalCount; }

  loadAll(): Promise<void> {
    const entries = Object.entries(assetmap);
    this.totalCount = entries.length;
    return new Promise((resolve) => {
      if (entries.length === 0) return resolve();
      for (const [key, e] of entries) {
        const img = new Image();
        img.onload = () => {
          this.sheets.set(key, { img, frameW: e.frameW, frameH: e.frameH, frames: e.frames, cols: e.cols });
          if (++this.loadedCount >= this.totalCount) resolve();
        };
        img.onerror = () => {
          // 欠落してもフォールバック描画で続行
          if (++this.loadedCount >= this.totalCount) resolve();
        };
        img.src = `assets/${e.file}`;
      }
    });
  }

  get(key: string): Sheet | undefined { return this.sheets.get(key); }

  fallback(key: string): string {
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return FALLBACK_COLORS[h % FALLBACK_COLORS.length] as string;
  }
}

export const assets = new Assets();
