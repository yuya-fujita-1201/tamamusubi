// 『玉結び』論理解像度はワイド 400x224（約16:9・25タイル幅）。描画は SS 倍のスーパーサンプルで行い、
// HD ピクセルアートを 1:1 で写せるようにする。
// ユーザーFB(2026-06-13): 背景・タイルも高解像度化 → SS=8（canvas 3200x1792、タイル128px実寸）。
// Retina(2x)のフルスクリーン実ピクセル(約3000px幅)とほぼ1:1で、これ以上は上げても見えない。
// fps が 45 を下回る場合は SS=6 へのフォールバックを検討する（PLAN.md §10）。
export const LOGICAL_W = 400;
export const LOGICAL_H = 224;
export const SS = 8;
export const CANVAS_W = LOGICAL_W * SS; // 3200
export const CANVAS_H = LOGICAL_H * SS; // 1792

export const TILE = 16; // 論理タイルサイズ（実寸 128px）
export const FIXED_DT = 1000 / 60;

// 表示フレームサイズ（論理 px）。HD ソースは×SS。
// 体格は聖剣5.0と同じ身長感（体高26論理px・横攻撃のがっしり等身基準）。密度だけ上げる。
export const WALK_CELL = 30;   // ミト歩行/待機セル: 240px 実寸（443px raw から BOX 縮小・体高208px）
export const ATK_CELL = 40;    // ミト攻撃セル: 320px 実寸（剣の伸びる分大きい）
export const FX_SIZE = 32;     // 256px 実寸
