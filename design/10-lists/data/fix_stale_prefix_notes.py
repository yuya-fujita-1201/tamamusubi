#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
turn-060: 旧 map_id 接頭辞（「r7_/r8_ 接頭辞を保持」「再採番せず固定」等）の
現役散文ステイルを、turn-054 のローテーション実態（接頭辞 == region）へ同期する。

背景:
- turn-054 で map_id 接頭辞を region 番号へ再採番（homura r9_→r7_ / tokoyo r7_→r8_ /
  wadatsumi r7_→r9_ / takamagahara r8_→r10_）。実ディスク・maps.json・verify 項目11 で
  接頭辞 == region を機械保証済。
- しかし現役文書の一部に「接頭辞を保持 / 固定 / warp グラフ保護のため不変」という
  旧スキーム前提の散文が残存（独立 critic が flag）。これを実態へ同期する。
- REGION_RENUMBER_MAP.md §2/§8（歴史記録として保全明記）と §0 changelog は対象外。

冪等性: old が在れば置換、new が既に在れば skip、どちらも無ければ MISS を報告。
再実行で二重適用しない。MISS が1件でもあれば exit 1。
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]  # .../2D-RPG-Seihin

# (相対パス, old, new)
REPL = [
    # --- critic flag M3/M4: MAP_LIST §R8 常世 ---
    ("design/10-lists/MAP_LIST.md",
     "map_id は warp グラフ保護のため r7_ 接頭辞を保持（region は本セクション見出しが正＝build_data_json が見出しから注入）。",
     "map_id 接頭辞は turn-054 で region 番号へ再採番済＝`r8_`（接頭辞 == region。warp と同時更新でグラフ無破壊。region は本セクション見出しが正＝build_data_json が見出しから注入）。"),
    # --- critic flag M3/M4: EVENT_LIST 第二幕 ---
    ("design/10-lists/EVENT_LIST.md",
     "出現マップ ID は warp グラフ保護のため `r7_` 接頭辞を保持するが、地域は R9。",
     "出現マップ ID の接頭辞は turn-054 で region 番号へ再採番済＝`r9_`（接頭辞 == region。warp と同時更新）。地域は R9。"),
    # --- critic flag M4: SCOPE_AND_SCALE §1.2 ---
    ("design/00-overview/SCOPE_AND_SCALE.md",
     "**map_id 接頭辞（小文字 `r{n}_`）は再採番せず固定＝warp グラフ無傷**（[REGION_LIST §1.2](../10-lists/REGION_LIST.md)）。",
     "**map_id 接頭辞（小文字 `r{n}_`）も turn-054 で region 番号へ再採番済＝接頭辞 == region**（warp と同時更新でグラフ無破壊・verify 項目11 で機械保証。[REGION_LIST §1.2](../10-lists/REGION_LIST.md)）。"),
    # --- critic flag M4: R8_tokoyo ---
    ("design/20-basic/regions/R8_tokoyo.md",
     "移設先マップの `r7_` 接頭辞は warp グラフ保護のため保持するが region は R9。",
     "移設先マップの接頭辞は turn-054 で region 番号へ再採番済＝`r9_`（接頭辞 == region）。"),
    ("design/20-basic/regions/R8_tokoyo.md",
     "R9 map_id は `r7_` 接頭辞を保持（region は R9）。",
     "R9 map_id 接頭辞は region と一致＝`r9_`（turn-054 再採番済）。"),
    # --- critic flag M4: R9_wadatsumi ---
    ("design/20-basic/regions/R9_wadatsumi.md",
     "（地域=R9・全17枚・map_id は warp グラフ保護のため `r7_` 接頭辞を保持）",
     "（地域=R9・全17枚・map_id 接頭辞は region と一致＝`r9_`／turn-054 再採番済）"),
    ("design/20-basic/regions/R9_wadatsumi.md",
     "**warp 保護のため固定なのは map_id 接頭辞 `r7_` のみ**＝region は R9 が正",
     "**map_id 接頭辞も turn-054 で region 番号へ再採番済＝`r9_`（接頭辞 == region）**"),
    ("design/20-basic/regions/R9_wadatsumi.md",
     "map_id は warp グラフ保護のため旧 R8 由来の `r7_` 接頭辞を保持する（region は R9 が正＝[MAP_LIST §R9 見出し](../../10-lists/MAP_LIST.md)）。",
     "map_id 接頭辞は turn-054 で region 番号へ再採番済＝`r9_`（接頭辞 == region。region は [MAP_LIST §R9 見出し](../../10-lists/MAP_LIST.md) が正）。"),
    ("design/20-basic/regions/R9_wadatsumi.md",
     "**再採番せず固定なのは map_id 接頭辞のみ**——map_id は warp グラフ保護のため旧 R8 由来の `r7_` 接頭辞を保持するが、region は R9 が正（MAP_LIST §R9 見出し＝build_data_json が見出しから注入）。",
     "**map_id 接頭辞も turn-054 で region 番号へ再採番済＝`r9_`（接頭辞 == region）**——warp と同時更新でグラフ無破壊、region は R9 が正（MAP_LIST §R9 見出し＝build_data_json が見出しから注入）。"),
    ("design/20-basic/regions/R9_wadatsumi.md",
     "の R9 行（17枚・`r7_` 接頭辞を保持／region は R9）。野外10・町2・D4・祠1。",
     "の R9 行（17枚・接頭辞 `r9_` == region／turn-054 再採番済）。野外10・町2・D4・祠1。"),
    # --- critic flag M6: characters ---
    ("design/30-detail/characters/C5_tokoyo_no_kannagi.md",
     "※ map_id は warp グラフ保護で `r7_` 接頭辞を保持するが**地域は R8**）",
     "※ map_id 接頭辞は region と一致＝`r8_`／turn-054 再採番済・**地域は R8**）"),
    ("design/30-detail/characters/C5_tokoyo_no_kannagi.md",
     "（map_id の `r7_` 接頭辞は warp グラフ保護のため保持）",
     "（map_id 接頭辞 `r8_` == region／turn-054 再採番済）"),
    ("design/30-detail/characters/C6_shirabe.md",
     "※ map_id は warp グラフ保護で `r8_` 接頭辞を保持するが**地域は R10**）",
     "※ map_id 接頭辞は region と一致＝`r10_`／turn-054 再採番済・**地域は R10**）"),
    ("design/30-detail/characters/C6_shirabe.md",
     "（map_id の `r8_` 接頭辞は warp グラフ保護のため保持）",
     "（map_id 接頭辞 `r10_` == region／turn-054 再採番済）"),
    ("design/30-detail/characters/C7_amakusarimori.md",
     "（map_id の `r8_` 接頭辞は warp グラフ保護のため保持）",
     "（map_id 接頭辞 `r10_` == region／turn-054 再採番済）"),
    # --- critic flag M7: enm_062（R9→R7 ラベル誤り＋編集行のリンクパス補修）---
    ("design/30-detail/enemies/enm_062_fujin_no_ayakashi.md",
     "地理を越えて R9 和田津見のカルスト北（[`r7_shiroiwa_kita`](../maps/homura/r7_shiroiwa_kita.md)）でも「砂塵の妖」として再利用され",
     "地理を越えて R7 ホムラの白磐北＝カルスト（石灰岩地帯／[`r7_shiroiwa_kita`](../maps/r07_homura/r7_shiroiwa_kita.md)）でも「砂塵の妖」として再利用され"),
    ("design/30-detail/enemies/enm_062_fujin_no_ayakashi.md",
     "**出現map_id（R9 再利用）**: r7_shiroiwa_kita（北部の砂塵帯 H1北部〜H0手前・kaSajin タイル散在域）。「砂塵の妖」ラベルで再利用。",
     "**出現map_id（R7 再利用）**: r7_shiroiwa_kita（白磐北＝カルストの砂塵帯 H1北部〜H0手前・kaSajin タイル散在域）。「砂塵の妖」ラベルで再利用。"),
    # --- 根本原因網羅: BOSS_LIST §1.7（「不変」の旧框組を実態へ）---
    ("design/10-lists/BOSS_LIST.md",
     "出現マップ ID（`r9_sango_miya_oku`／`r9_shinkai_boss`）は warp グラフ保護のため不変だが、当該マップは MAP_LIST で R9 セクションに属する。",
     "出現マップ ID（`r9_sango_miya_oku`／`r9_shinkai_boss`）の接頭辞は turn-054 で region 番号へ再採番済＝`r9_`（接頭辞 == region）。当該マップは MAP_LIST で R9 セクションに属する。"),
]

def main():
    applied = skipped = miss = 0
    for rel, old, new in REPL:
        p = ROOT / rel
        txt = p.read_text(encoding="utf-8")
        if old in txt:
            n = txt.count(old)
            txt = txt.replace(old, new)
            p.write_text(txt, encoding="utf-8")
            print(f"APPLIED x{n}: {rel}\n    -> {new[:60]}...")
            applied += n
        elif new in txt:
            print(f"SKIP (already applied): {rel}")
            skipped += 1
        else:
            print(f"MISS (string not found!): {rel}\n    old={old[:70]}")
            miss += 1
    print(f"\n=== summary: applied={applied} skipped={skipped} miss={miss} ===")
    return 1 if miss else 0

if __name__ == "__main__":
    sys.exit(main())
