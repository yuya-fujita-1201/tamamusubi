import { LOGICAL_W, LOGICAL_H } from "./constants";

// 追従カメラ。マップ境界へクランプ。shake は描画オフセットとして加算される。
export class Camera {
  x = 0; y = 0;
  private shakeT = 0;
  private shakeAmp = 0;

  /** viewW/viewH: 表示する論理範囲（飛行ズームアウト時は LOGICAL_W/zoom を渡す） */
  follow(tx: number, ty: number, mapW: number, mapH: number, viewW = LOGICAL_W, viewH = LOGICAL_H) {
    this.x = Math.round(tx - viewW / 2);
    this.y = Math.round(ty - viewH / 2);
    // マップが画面より小さい軸は中央寄せ（ワイド表示で小部屋が左に寄るのを防ぐ）
    if (mapW <= viewW) this.x = Math.round((mapW - viewW) / 2);
    else this.x = Math.max(0, Math.min(mapW - viewW, this.x));
    if (mapH <= viewH) this.y = Math.round((mapH - viewH) / 2);
    else this.y = Math.max(0, Math.min(mapH - viewH, this.y));
    if (this.shakeT > 0) {
      this.shakeT--;
      const a = this.shakeAmp * (this.shakeT % 2 === 0 ? 1 : -1);
      this.x += Math.round(a);
      this.y += Math.round(a * 0.6);
    }
  }

  /** amp 論理px・frames フレームの画面振動 */
  shake(amp: number, frames: number) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, frames);
    if (this.shakeT <= 0) this.shakeAmp = 0;
  }
}
