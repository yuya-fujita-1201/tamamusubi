import { Engine } from "./core/engine";
import { assets } from "./gfx/assets";
import { TitleScene } from "./scenes/title";
import { LOGICAL_W, LOGICAL_H } from "./core/constants";

// エントリポイント。アセットを読み込み、タイトルから開始。

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("canvas #game not found");

const engine = new Engine(canvas);

// ロード画面を即描画
engine.r.begin();
engine.r.clear("#0c0e1c");
engine.r.font.draw("玉結び — Now Loading...", LOGICAL_W / 2, LOGICAL_H / 2 - 6, {
  size: 10, color: "#aab4d4", align: "center",
});

void assets.loadAll().then(() => {
  engine.scenes.push(new TitleScene(), {
    input: engine.input, r: engine.r, scenes: engine.scenes, dt: 1000 / 60, time: 0,
  });
  engine.start();
});
