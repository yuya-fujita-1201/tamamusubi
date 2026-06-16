#!/usr/bin/env python3
"""verify_detail_coverage.py — 一覧(10-lists) ⇔ 詳細設計(30-detail) 網羅カバレッジ検証

build_data_json.py / verify_expansion_consistency.py が「データ内部整合（ID参照・Lv帯・
warp 宙吊り等）」を検証するのに対し、本スクリプトは **一覧に載った各エンティティが
30-detail に詳細設計ファイルを持つか（およびその逆＝孤児ファイルが無いか）** を
双方向に機械検証する。M7 step3「ENEMY/BOSS_LIST と詳細の双方向クロスリファレンス」
および M8「詳細網羅チェック」の再現可能オラクル。

検証カテゴリ:
  [1] ENEMY_LIST.md   の enm_NNN  ⇔ 30-detail/enemies/enm_*.md
  [2] BOSS_LIST.md    の boss_NN  ⇔ 30-detail/enemies/boss_*.md
  [3] CHARACTER_LIST.md の C<n>   ⇔ 30-detail/characters/C*.md
  [4] data/maps.json の各 map_id  ⇒ 30-detail/maps/*/<map_id>.md（掲載マップの詳細欠落0）

実行: python3 design/10-lists/data/verify_detail_coverage.py
（cwd はワークスペース直下 /Users/.../2D-RPG-Seihin を想定。--root で上書き可）
exit 0 = 全カテゴリ PASS（双方向欠落0）/ exit 1 = いずれかに欠落あり。

注（既知の意図的差分）:
  - 30-detail/maps/ には MAP_LIST 非掲載の連絡マップ（link_* 等）が含まれ得るが、
    本検証は「掲載マップの詳細欠落0」を主眼とし、詳細側の余剰（連絡マップ）は INFO 扱い。
  - 常世 R8 は無戦闘＝敵0/ボス0（ENEMY_LIST/BOSS_LIST §0 不変条件）。R8 を出現地域とする
    敵/ボスは存在しないのが正であり、欠落としては数えない。
"""
import json, os, re, sys, glob

ROOT = sys.argv[sys.argv.index('--root')+1] if '--root' in sys.argv else os.getcwd()
LISTS = os.path.join(ROOT, 'design/10-lists')
DATA = os.path.join(LISTS, 'data')
DETAIL = os.path.join(ROOT, 'design/30-detail')


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def ids_in_md(path, pattern):
    """markdown 内の ID トークン（pattern）を一意集合で返す。"""
    if not os.path.exists(path):
        return None
    return set(re.findall(pattern, read(path)))


def ids_from_files(directory, pattern, glob_pat):
    """detail ディレクトリ配下のファイル名から ID トークンを一意集合で返す。"""
    out = set()
    for p in glob.glob(os.path.join(directory, glob_pat)):
        m = re.match(pattern, os.path.basename(p))
        if m:
            out.add(m.group(0))
    return out


def report(label, list_ids, file_ids):
    """双方向差分を出力し PASS/FAIL を返す。"""
    if list_ids is None:
        print(f"  [{label}] FAIL — 一覧ファイルが見つからない")
        return False
    missing = sorted(list_ids - file_ids)   # 一覧にあるが詳細ファイル無
    orphan = sorted(file_ids - list_ids)     # 詳細ファイルにあるが一覧無
    ok = not missing and not orphan
    mark = '✓' if ok else '✗'
    print(f"  [{label}] {mark} 一覧={len(list_ids)} 詳細={len(file_ids)} "
          f"／詳細欠落={len(missing)} 孤児={len(orphan)}")
    if missing:
        print(f"      └ 一覧にあるが詳細ファイル無: {missing[:30]}")
    if orphan:
        print(f"      └ 詳細にあるが一覧無: {orphan[:30]}")
    return ok


def main():
    print("=" * 70)
    print("verify_detail_coverage.py — 一覧 ⇔ 詳細 網羅カバレッジ")
    print(f"ROOT = {ROOT}")
    print("=" * 70)
    results = []

    # [1] ENEMY
    enm_list = ids_in_md(os.path.join(LISTS, 'ENEMY_LIST.md'), r'enm_\d{3}')
    enm_file = ids_from_files(os.path.join(DETAIL, 'enemies'), r'enm_\d{3}', 'enm_*.md')
    results.append(report('ENEMY  enm_NNN', enm_list, enm_file))

    # [2] BOSS
    boss_list = ids_in_md(os.path.join(LISTS, 'BOSS_LIST.md'), r'boss_\d{2}')
    boss_file = ids_from_files(os.path.join(DETAIL, 'enemies'), r'boss_\d{2}', 'boss_*.md')
    results.append(report('BOSS   boss_NN', boss_list, boss_file))

    # [3] CHARACTER（C-番号で照合＝各中核キャラに詳細1本）
    char_list = ids_in_md(os.path.join(LISTS, 'CHARACTER_LIST.md'), r'C\d+(?=_)')
    char_file = ids_from_files(os.path.join(DETAIL, 'characters'), r'C\d+', 'C*.md')
    results.append(report('CHARACTER C<n>', char_list, char_file))

    # [4] MAP（maps.json の各 map_id に詳細ファイルがあるか＝掲載欠落0）
    maps = json.load(open(os.path.join(DATA, 'maps.json'), encoding='utf-8'))['maps']
    def mid(m):
        for k in ('id', 'map_id', 'mid'):
            if k in m:
                return m[k]
        return None
    map_ids = {mid(m) for m in maps if mid(m)}
    detail_stems = {os.path.basename(p)[:-3]
                    for p in glob.glob(os.path.join(DETAIL, 'maps', '*', '*.md'))}
    missing_maps = sorted(map_ids - detail_stems)
    extra = sorted(detail_stems - map_ids)
    ok_map = not missing_maps
    mark = '✓' if ok_map else '✗'
    print(f"  [MAP   map_id] {mark} maps.json={len(map_ids)} 詳細stem={len(detail_stems)} "
          f"／掲載詳細欠落={len(missing_maps)}（詳細余剰={len(extra)}＝連絡マップ等INFO）")
    if missing_maps:
        print(f"      └ maps.json にあるが詳細ファイル無: {missing_maps[:30]}")
    results.append(ok_map)

    print("=" * 70)
    if all(results):
        print("判定: ✅ 全カテゴリ PASS（一覧掲載エンティティの詳細欠落0・敵/ボス/キャラは双方向欠落0）")
        print("=" * 70)
        return 0
    print("判定: ❌ FAIL — 上記カテゴリに欠落あり")
    print("=" * 70)
    return 1


if __name__ == '__main__':
    sys.exit(main())
