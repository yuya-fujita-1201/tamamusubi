#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_data_json.py — 一覧Markdown(../*.md)を解析して機械可読JSONミラーを生成する。

設計意図（メンテ体制の核）:
  - Markdownの一覧表が「正典（source of truth）」。本スクリプトはそのミラーを生成するだけ。
  - 一覧を更新したら本スクリプトを再実行すればJSONが追従する（手書き転記を排除）。
  - 出力は決定的（タイムスタンプ等の非決定要素を入れない）→ gitの差分が安定する。

使い方:
  cd design/10-lists/data && python3 build_data_json.py
出力:
  ./regions.json maps.json weapons.json items.json enemies.json
  ./bosses.json accessories.json npcs.json skills.json events.json
  ./characters.json (soft: 期待 7 件・件数不一致でも停止しない)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LISTS = os.path.normpath(os.path.join(HERE, ".."))
SCHEMA_VERSION = 1

LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")   # [text](url) -> text
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")          # **text** -> text


def clean(cell: str) -> str:
    s = cell.strip()
    s = LINK_RE.sub(r"\1", s)
    s = BOLD_RE.sub(r"\1", s)
    s = s.replace("`", "")
    return s.strip()


def split_row(line: str):
    # "| a | b | c |" -> ["a","b","c"]  (先頭/末尾の空セルを除去)
    parts = line.split("|")
    if parts and parts[0].strip() == "":
        parts = parts[1:]
    if parts and parts[-1].strip() == "":
        parts = parts[:-1]
    return [clean(p) for p in parts]


def is_sep(cells):
    return all(re.fullmatch(r"-{2,}|:?-+:?", c) for c in cells) if cells else False


def parse_rows(md_path, id_re, keys, region_from_heading=False, skip_first=None):
    """ID正規表現に一致する第1セルを持つ行を抽出してdict化。
    - 列数が keys と一致する行のみ採用（同一ファイル内の別表＝列数違いを排除）。
    - skip_first: 除外する第1セル値の集合（例: ヘッダ行の "map_id"）。
    - region_from_heading=True のとき、直近の '### R{n} ...' / '### 連絡...' から region を注入。"""
    rows = []
    skipped_cols = 0
    skip_first = skip_first or set()
    cur_region = None
    # v1.1: R9（火群と白磐の地）を末尾採番で追加したため R[1-9] に拡張。
    # v1.2: R10（綿津見の大海・現世/外洋）を末尾採番で追加。R10 を R1 より先に評価する。
    heading_re = re.compile(r"^#{2,4}\s+(R10|R[1-9]|連絡)")
    with open(md_path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            if region_from_heading:
                m = heading_re.match(line)
                if m:
                    cur_region = "LINK" if m.group(1) == "連絡" else m.group(1)
            if not line.lstrip().startswith("|"):
                continue
            cells = split_row(line)
            if not cells or is_sep(cells):
                continue
            first = cells[0]
            if first in skip_first:
                continue
            if not id_re.fullmatch(first):
                continue
            if len(cells) != len(keys):
                skipped_cols += 1
                continue
            rec = {keys[i]: cells[i] for i in range(len(keys))}
            if region_from_heading:
                rec["region"] = cur_region
            rows.append(rec)
    if skipped_cols:
        print(f"  (note: {os.path.basename(md_path)} skipped {skipped_cols} "
              f"id-like rows with non-matching column count)")
    return rows


def dump(name, records, extra=None):
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "source": f"design/10-lists/{name['src']}",
        "generatedBy": "design/10-lists/data/build_data_json.py",
        "count": len(records) if extra is None else None,
        name["key"]: records,
    }
    if extra:
        payload.pop("count", None)
        payload.update(extra)
    out = os.path.join(HERE, name["out"])
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return out, (len(records) if extra is None else extra.get("count"))


def md(p):
    return os.path.join(LISTS, p)


warnings = []


def report(label, count, expect):
    flag = "OK " if count == expect else "!! "
    if count != expect:
        warnings.append(f"{label}: got {count}, expected {expect}")
    print(f"  [{flag}] {label}: {count} (expect {expect})")


def main():
    print("== build_data_json: parsing Markdown lists ==")

    # 1) REGION（v1.1: R9／v1.2: R10 を末尾採番で追加 → R(?:10|[1-9])）
    regions = parse_rows(
        md("REGION_LIST.md"), re.compile(r"R(?:10|[1-9])"),
        ["id", "slug", "name", "layer", "lv_range", "field", "town",
         "dungeon", "shrine", "total", "unlock", "status"],
    )
    dump({"src": "REGION_LIST.md", "out": "regions.json", "key": "regions"}, regions)
    report("regions", len(regions), 10)

    # 2) MAP（地域はセクション見出しから注入。IDは大文字含む既存実装表記を許容）
    maps = parse_rows(
        md("MAP_LIST.md"), re.compile(r"[a-z][A-Za-z0-9_]*"),
        ["id", "type", "name", "terrain", "enemies", "warp",
         "weapon_gimmick", "reward", "lv_range", "status"],
        region_from_heading=True, skip_first={"map_id"},
    )
    dump({"src": "MAP_LIST.md", "out": "maps.json", "key": "maps"}, maps)
    report("maps", len(maps), 303)

    # 3) WEAPON（段階行。series / grade を派生）
    weapons = parse_rows(
        md("WEAPON_LIST.md"), re.compile(r"W[1-8]_[a-z]+_g\d+"),
        ["id", "stage_name", "atk_mult", "effect", "upgrade_cond",
         "region", "role"],
    )
    for w in weapons:
        m = re.fullmatch(r"(W[1-8]_[a-z]+)_g(\d+)", w["id"])
        if m:
            w["series"] = m.group(1)
            w["grade"] = int(m.group(2))
    dump({"src": "WEAPON_LIST.md", "out": "weapons.json", "key": "stages"}, weapons,
         extra={"count": len(weapons),
                "seriesCount": len({w.get("series") for w in weapons})})
    report("weapons(stages)", len(weapons), 80)

    # 4) ITEM
    items = parse_rows(
        md("ITEM_LIST.md"), re.compile(r"itm_\d+"),
        ["id", "category", "name", "effect", "source", "max", "note"],
    )
    dump({"src": "ITEM_LIST.md", "out": "items.json", "key": "items"}, items)
    report("items", len(items), 115)

    # 5) ENEMY
    enemies = parse_rows(
        md("ENEMY_LIST.md"), re.compile(r"enm_\d+"),
        ["id", "region", "name", "archetype", "lv_range", "behavior",
         "weakness", "status_effect", "drop", "status"],
    )
    dump({"src": "ENEMY_LIST.md", "out": "enemies.json", "key": "enemies"}, enemies)
    report("enemies", len(enemies), 72)

    # 6) BOSS
    bosses = parse_rows(
        md("BOSS_LIST.md"), re.compile(r"boss_\d+"),
        ["id", "region", "kind", "name", "map", "lv_range", "archetype",
         "weakness", "attacks", "minions", "reward", "status"],
    )
    dump({"src": "BOSS_LIST.md", "out": "bosses.json", "key": "bosses"}, bosses)
    report("bosses", len(bosses), 19)

    # 7) ACCESSORY（勾玉＋衣の2系統）
    magatama = parse_rows(
        md("ACCESSORY_LIST.md"), re.compile(r"mag_\d+"),
        ["id", "vocab", "name", "effect", "source", "region", "status"],
    )
    koromo = parse_rows(
        md("ACCESSORY_LIST.md"), re.compile(r"koromo_\d+"),
        ["id", "name", "defense", "env_trait", "source", "region", "status"],
    )
    dump({"src": "ACCESSORY_LIST.md", "out": "accessories.json", "key": "magatama"},
         magatama, extra={"count": {"magatama": len(magatama), "koromo": len(koromo)},
                          "magatama": magatama, "koromo": koromo})
    report("magatama", len(magatama), 48)
    report("koromo", len(koromo), 11)

    # 8) NPC
    npcs = parse_rows(
        md("NPC_LIST.md"), re.compile(r"npc_\d+"),
        ["id", "region", "role", "name", "summary", "location", "status", "note"],
    )
    dump({"src": "NPC_LIST.md", "out": "npcs.json", "key": "npcs"}, npcs)
    report("npcs", len(npcs), 90)

    # 9) SKILL
    skills = parse_rows(
        md("SKILL_LIST.md"), re.compile(r"skl_\d+"),
        ["id", "school", "name", "type", "effect", "learn", "cost",
         "phase", "status", "note"],
    )
    dump({"src": "SKILL_LIST.md", "out": "skills.json", "key": "skills"}, skills)
    report("skills", len(skills), 24)

    # 10) EVENT
    events = parse_rows(
        md("EVENT_LIST.md"), re.compile(r"ev_\d+"),
        ["id", "type", "stage", "trigger", "summary", "prereq", "result",
         "related", "status"],
    )
    dump({"src": "EVENT_LIST.md", "out": "events.json", "key": "events"}, events)
    report("events", len(events), 165)

    # 11) CHARACTER（C{n}_romaji。物語の中核キャラ。NPC/敵/ボスとは別カウント。
    #     正典＝ CHARACTER_LIST.md §1「一覧本体」（9列）。§4 トラッカー（4列）は
    #     列数不一致で自動除外される。
    #     注記: 本ブロックの不一致は soft-warn に留め sys.exit には積まない
    #     （既存ビルドの exit code を壊さないため。warnings には追加しない）。
    try:
        characters = parse_rows(
            md("CHARACTER_LIST.md"), re.compile(r"C\d+_[a-z_]+"),
            ["id", "kind", "name", "school", "phase", "location",
             "related", "status", "summary"],
        )
        dump({"src": "CHARACTER_LIST.md", "out": "characters.json",
              "key": "characters"}, characters)
        flag = "OK " if len(characters) == 7 else "?? "
        print(f"  [{flag}] characters: {len(characters)} (expect 7, soft)")
    except Exception as exc:  # noqa: BLE001 — 既存ビルドを止めない
        print(f"  [?? ] characters: skipped (soft) — {exc}")

    print("== done ==")
    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print("  -", w)
        sys.exit(1)
    print("All counts match expected targets.")


if __name__ == "__main__":
    main()
