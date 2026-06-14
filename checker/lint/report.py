"""レポート出力: art_qa_report.md / score.json / error_overlay.png / warning_overlay.png。

スコアは Tile Contract.scoreAxes の 10 軸を各 0-5 で評価し、平均を 100 点換算する。
各 Finding は axis を持ち、ERROR/WARNING で軸から減点する。
"""
from __future__ import annotations

import json
import os

import common
from common import ERROR, WARNING, INFO

AXES = [
    common.AXIS_STRUCTURE, common.AXIS_HEIGHT, common.AXIS_WALKABLE, common.AXIS_SEAM,
    common.AXIS_NOISE, common.AXIS_WATER, common.AXIS_CONTACT, common.AXIS_WORLD,
    common.AXIS_FOCUS, common.AXIS_REUSE,
]

DEDUCT = {ERROR: 1.5, WARNING: 0.6, INFO: 0.0}


def score(findings, thresholds):
    axis_score = {a: 5.0 for a in AXES}
    for f in findings:
        a = f.axis if f.axis in axis_score else common.AXIS_STRUCTURE
        axis_score[a] = max(0.0, axis_score[a] - DEDUCT.get(f.severity, 0.0))
    # 「再利用可能なタイルマップとしての成立度」は全体の健全度の従属軸
    errors = sum(1 for f in findings if f.severity == ERROR)
    warnings = sum(1 for f in findings if f.severity == WARNING)
    axis_score[common.AXIS_REUSE] = max(0.0, 5.0 - errors * 1.2 - warnings * 0.3)
    total = round(sum(axis_score.values()) / (5.0 * len(AXES)) * 100)
    done_score_min = thresholds.get("doneScoreMin", 80)
    done_max_err = thresholds.get("doneMaxErrors", 0)
    done_max_warn = thresholds.get("doneMaxMajorWarnings", 3)
    passed = (total >= done_score_min and errors <= done_max_err and warnings <= done_max_warn)
    return {
        "total": total,
        "axes": {a: round(axis_score[a], 1) for a in AXES},
        "errors": errors,
        "warnings": warnings,
        "infos": sum(1 for f in findings if f.severity == INFO),
        "passed": passed,
        "criteria": {
            "doneScoreMin": done_score_min,
            "doneMaxErrors": done_max_err,
            "doneMaxMajorWarnings": done_max_warn,
        },
    }


def _bucket(findings, sev):
    out = [f for f in findings if f.severity == sev]
    out.sort(key=lambda f: (f.check, f.code))
    return out


def write_report(ctx: common.Ctx, findings, sc, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    md_path = os.path.join(out_dir, "art_qa_report.md")
    score_path = os.path.join(out_dir, "score.json")

    lines = []
    lines.append(f"# Art QA Report — {ctx.name} (`{ctx.id}`)")
    lines.append("")
    lines.append(f"> map_art_linter 自動検査。Tile Contract / TILE_GRAMMAR に基づく構造・接続・視認性チェック。")
    lines.append("")
    # 総合評価
    verdict = "✅ 合格" if sc["passed"] else "❌ 差し戻し"
    lines.append("## 総合評価")
    lines.append("")
    lines.append(f"**{sc['total']} / 100点** — {verdict}")
    lines.append("")
    lines.append(f"- ERROR: **{sc['errors']}** 件（合格条件: {sc['criteria']['doneMaxErrors']} 件）")
    lines.append(f"- WARNING: **{sc['warnings']}** 件（合格条件: {sc['criteria']['doneMaxMajorWarnings']} 件以下）")
    lines.append(f"- INFO: {sc['infos']} 件")
    lines.append("")
    lines.append("| 評価軸 | スコア(0-5) |")
    lines.append("|---|---|")
    for a in AXES:
        bar = "█" * int(round(sc["axes"][a])) + "░" * (5 - int(round(sc["axes"][a])))
        lines.append(f"| {a} | {bar} {sc['axes'][a]} |")
    lines.append("")

    def section(title, sev, limit=None):
        bucket = _bucket(findings, sev)
        if limit:
            bucket = bucket[:limit]
        lines.append(f"## {title}（{len([f for f in findings if f.severity==sev])} 件）")
        lines.append("")
        if not bucket:
            lines.append("- なし")
            lines.append("")
            return
        for f in bucket:
            loc = ""
            if f.cells:
                head = ", ".join(f"({c[0]},{c[1]})" for c in f.cells[:6])
                more = f" 他{len(f.cells)-6}箇所" if len(f.cells) > 6 else ""
                loc = f"　座標: {head}{more}"
            lines.append(f"### [{f.code}] {f.title}")
            if f.detail:
                lines.append(f"- {f.detail}")
            if loc:
                lines.append(f"-{loc}")
            if f.suggestion:
                lines.append(f"- **修正指示**: {f.suggestion}")
            lines.append(f"- 軸: {f.axis} / check: `{f.check}`")
            lines.append("")

    section("重大な問題（ERROR）", ERROR)
    section("中程度の問題（WARNING）", WARNING)
    section("ノイズ・参考（INFO）", INFO, limit=30)

    lines.append("## 合格条件（Definition of Done 抜粋）")
    lines.append("")
    lines.append(f"- 総合スコア {sc['criteria']['doneScoreMin']} 点以上")
    lines.append(f"- ERROR {sc['criteria']['doneMaxErrors']} 件")
    lines.append(f"- 重大 WARNING {sc['criteria']['doneMaxMajorWarnings']} 件以下")
    lines.append("- 詳細は quality/MAP_DEFINITION_OF_DONE.md を参照。")
    lines.append("")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    with open(score_path, "w", encoding="utf-8") as f:
        json.dump({**sc, "findings": [x.to_dict() for x in findings]}, f, ensure_ascii=False, indent=2)
    return md_path, score_path


# ── overlay PNG ─────────────────────────────────────────
CAT_COLOR = {
    "ground_grass": (122, 168, 96), "ground_tone": (95, 150, 90), "shrine_ground": (138, 184, 122),
    "path": (179, 149, 104), "water_surface": (127, 166, 200), "river": (91, 143, 184),
    "retaining_wall": (138, 133, 122), "earth_bank": (106, 122, 68), "cliff": (168, 133, 90),
    "stair": (154, 144, 120), "forest_wall": (52, 96, 47), "decor": (90, 170, 90),
    "shadow": (60, 60, 60), "seam_breaker": (90, 170, 90), "other": (120, 120, 120),
}


def write_overlays(ctx: common.Ctx, findings, out_dir):
    try:
        import numpy as np
        from PIL import Image, ImageDraw
    except Exception:
        return []
    os.makedirs(out_dir, exist_ok=True)
    written = []

    def base_canvas():
        if ctx.image is not None:
            return Image.fromarray(ctx.image).convert("RGBA"), ctx.img_px_per_tile()
        scale = 14
        img = Image.new("RGBA", (ctx.w * scale, ctx.h * scale), (20, 28, 18, 255))
        d = ImageDraw.Draw(img)
        for y in range(ctx.h):
            for x in range(ctx.w):
                k, _ = ctx.ground_at(x, y)
                cat = ctx.category(k) or "other"
                col = CAT_COLOR.get(cat, CAT_COLOR["other"])
                # 歩行不可は少し暗く
                if ctx.solid(x, y):
                    col = tuple(int(c * 0.7) for c in col)
                d.rectangle([x * scale, y * scale, x * scale + scale - 1, y * scale + scale - 1],
                            fill=(*col, 255))
        # プロップ位置に白点
        for p in ctx.props:
            px, py = p["itx"] * scale, p["ity"] * scale
            d.ellipse([px - 2, py - 2, px + 2, py + 2], fill=(255, 255, 255, 200))
        return img, scale

    for sev, color, fname in ((common.ERROR, (220, 40, 40), "error_overlay.png"),
                              (common.WARNING, (235, 200, 40), "warning_overlay.png")):
        img, ppt = base_canvas()
        if ppt is None:
            ppt = 14
        d = ImageDraw.Draw(img, "RGBA")
        for f in findings:
            if f.severity != sev:
                continue
            for c in f.cells[:300]:   # 1 findingあたりの描画上限（REPEAT等の大量セルで埋め尽くさない）
                x0, y0 = c[0] * ppt, c[1] * ppt
                d.rectangle([x0, y0, x0 + ppt - 1, y0 + ppt - 1], fill=(*color, 120))
                d.rectangle([x0, y0, x0 + ppt - 1, y0 + ppt - 1],
                            outline=(*color, 255), width=max(2, int(ppt // 5)))
        path = os.path.join(out_dir, fname)
        img.convert("RGBA").save(path)
        written.append(path)
    return written
