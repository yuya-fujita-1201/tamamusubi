import type { Scene, SceneCtx } from "../core/scene";
import { LOGICAL_W, LOGICAL_H } from "../core/constants";
import { audio } from "../core/audio";
import { assets } from "../gfx/assets";
import { WA_FONT } from "../gfx/font";
import { resetGame } from "../state/game";
import { FieldScene } from "./field";

// タイトル。生成背景アート＋コード描画ロゴ。キー入力で New Game。

export class TitleScene implements Scene {
  private t = 0;
  private starting = 0;

  enter() {
    audio.playBgm("title"); // 世界の歌（autoplay制限により最初のキー入力後に鳴る）
  }

  update(ctx: SceneCtx) {
    this.t++;
    if (this.starting > 0) {
      this.starting++;
      if (this.starting > 50) {
        resetGame();
        ctx.scenes.replace(new FieldScene("satoyama", 44, 11, { intro: true }), ctx);
      }
      return;
    }
    if (ctx.input.pressed("confirm") || ctx.input.pressed("attack")) {
      audio.unlock();
      audio.play("menuOk");
      this.starting = 1;
    }
  }

  draw(ctx: SceneCtx) {
    const r = ctx.r;
    r.clear("#101426");
    // 背景アート（玉結びキービジュアル「始まりの里山郷」を cover 配置）
    const sh = assets.get("bg.title");
    if (sh) {
      const imgAspect = sh.frameW / sh.frameH;
      const scrAspect = LOGICAL_W / LOGICAL_H;
      const w = imgAspect > scrAspect ? LOGICAL_H * imgAspect : LOGICAL_W;
      const h = imgAspect > scrAspect ? LOGICAL_H : LOGICAL_W / imgAspect;
      r.sprite("bg.title", 0, (LOGICAL_W - w) / 2, (LOGICAL_H - h) / 2 - 10, { w, h });
    } else {
      // フォールバック: グラデ空
      const g = r.ctx.createLinearGradient(0, 0, 0, r.H);
      g.addColorStop(0, "#2a3f6e"); g.addColorStop(1, "#0e1424");
      r.ctx.fillStyle = g;
      r.ctx.fillRect(0, 0, r.W, r.H);
    }
    // ふわっと暗幕（ロゴ可読性）
    r.ctx.fillStyle = "rgba(10,12,30,0.18)";
    r.ctx.fillRect(0, 0, r.W, r.H);

    // ロゴ（コード描画・3層）
    const cx = LOGICAL_W / 2;
    const bob = Math.sin(this.t / 50) * 1.5;
    r.font.draw("玉結び", cx + 1.5, 38 + bob + 1.5, { size: 32, color: "rgba(20,12,40,0.85)", align: "center", shadow: null, font: WA_FONT });
    r.font.draw("玉結び", cx, 38 + bob, { size: 32, color: "#ffe9a0", outline: "#5a3410", align: "center", font: WA_FONT });
    r.font.draw("- TAMAMUSUBI -", cx, 74 + bob, { size: 9, color: "#cfd8ff", align: "center" });

    if (this.starting === 0) {
      if (Math.floor(this.t / 30) % 2 === 0) {
        r.font.draw("Z / SPACE ではじめる", cx, 168, { size: 10, color: "#ffffff", outline: "#202440", align: "center" });
      }
      r.font.draw("移動:WASD/矢印  祓う:Z(長押しで縛り祓い)  祓い波:C  調べる:X  回避:Shift", cx, 204, {
        size: 6.5, color: "#aab4d4", align: "center",
      });
    } else {
      // フェードアウト
      const a = Math.min(1, this.starting / 40);
      r.ctx.fillStyle = `rgba(4,6,12,${a})`;
      r.ctx.fillRect(0, 0, r.W, r.H);
    }
  }
}
