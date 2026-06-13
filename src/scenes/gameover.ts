import type { Scene, SceneCtx } from "../core/scene";
import { LOGICAL_W } from "../core/constants";
import { audio } from "../core/audio";
import { game } from "../state/game";
import { FieldScene } from "./field";

// ゲームオーバー。confirm で村から再開（HP全回復・進行フラグ維持）。

export class GameOverScene implements Scene {
  private t = 0;

  enter() { audio.stopBgm(); }

  update(ctx: SceneCtx) {
    this.t++;
    if (this.t > 60 && (ctx.input.pressed("confirm") || ctx.input.pressed("attack"))) {
      audio.play("menuOk");
      game.hp = game.maxHp;
      const rp = game.respawn;
      ctx.scenes.replace(new FieldScene(rp.map, rp.tx, rp.ty, {}), ctx);
    }
  }

  draw(ctx: SceneCtx) {
    const r = ctx.r;
    const a = Math.min(1, this.t / 50);
    r.clear("#000");
    r.ctx.fillStyle = `rgba(12,6,10,${a})`;
    r.ctx.fillRect(0, 0, r.W, r.H);
    r.font.draw("リオンは倒れてしまった…", LOGICAL_W / 2, 90, {
      size: 13, color: `rgba(220,120,110,${a})`, align: "center", outline: "#1a0a10",
    });
    if (this.t > 60 && Math.floor(this.t / 30) % 2 === 0) {
      r.font.draw("Z で村から再開", LOGICAL_W / 2, 130, { size: 9, color: "#e8e4d8", align: "center" });
    }
  }
}
