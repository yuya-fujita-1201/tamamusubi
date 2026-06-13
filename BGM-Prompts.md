# BGM-Prompts.md v3.1 — 『玉結び』Suno用楽曲プロンプト集

> v3.1: 2026-06-13 ——**共通サウンドIDは初版のまま凍結（変更禁止。ユーザーのテスト済み資産）**。曲別本文も v2 原文を維持し、**ボスエクストラのみ短縮**して全曲「ID＋本文 ≤ 1000字」を検証済み（最大878字）。
> 音楽方針: モダン基調＋和は隠し味。参照＝DAISHI DANCEのジブリカバー（ピアノハウス）／久石譲（シネマティックピアノ）／クロノ・トリガー（歌う冒険メロディ）。

## 使い方

1. スタイル欄に **「共通サウンドID」→改行→「曲別本文」** の順で連結して貼る（各曲の合計文字数は見出しに記載。全曲1000字以内）
2. 歌詞欄は `[Instrumental]`
3. **モチーフ統一**: まずタイトルテーマを生成して確定 → Cover/Extend で派生（Audio Influence 60〜70%）
4. ダーク・ホラー寄り／純和風に寄りすぎたテイクは不採用。和楽器が前に出すぎたら "occasional / as color only" を強調して再生成

## 共通サウンドID（**凍結・変更禁止**・313字）

```
Modern cinematic game soundtrack with a subtle Japanese accent. Emotional piano, warm strings, soft electronic textures and modern beats at the core; occasional koto sparkle or bamboo flute phrase as color only. Bright, nostalgic, melodic like a classic 90s JRPG. High production quality. Instrumental, no vocals.
```

---

## 1. フィールド用

### 1-(a) 森（鎮守の森）— 久石譲寄り｜合計797字

```
Gentle mystical forest theme for a modern fantasy adventure game. Emotional minimalist piano with a softly repeating figure, warm string pads, light acoustic guitar, airy electronic shimmer, soft brushed percussion. A distant bamboo flute phrase appears only occasionally, like sunlight through leaves. Sacred green forest where kind spirits live — peaceful, curious, cinematic and intimate like a Studio Ghibli film score. 80 BPM, gentle dynamics, loopable, instrumental, no vocals.
```

### 1-(b) 草原（メイン探索テーマ）— クロノ・トリガー寄り｜合計821字

```
Uplifting overworld exploration theme in the spirit of classic 90s JRPG adventures, produced with modern cinematic sound. A bright, singable, deeply memorable lead melody on piano and strings, supported by acoustic guitar strums, melodic bass, light modern drums and warm brass swells. A faint koto sparkle accents the melody occasionally. Wind over sunny grasslands, the joyful start of a grand journey — hopeful, heroic, nostalgic. 105 BPM, major key, strong main theme, loopable, instrumental, no vocals.
```

### 1-(c) 空中（雲海飛行・高天原）— DAISHI DANCE寄り｜合計777字

```
Euphoric melodic deep house theme for flying above a sea of clouds in a fantasy adventure game. Lush emotional piano riff in the style of piano-house Ghibli covers, soft four-on-the-floor kick, warm side-chained pads, airy strings, glittering arpeggios, subtle koto plucks as accents. Golden clouds, a shining white sky city in the distance, total freedom and bliss. 118 BPM, uplifting and dreamy, builds gently then opens wide, loopable, instrumental, no vocals.
```

※高天原の街中（静謐な廃都）用はキックを抜いた「ambient piano and pads, sparse, sacred stillness」版を別生成。

### 1-(d) 海・航海（瑠璃の多島海）— チル・トロピカル｜合計699字

```
Breezy island-hopping sailing theme for a bright fantasy adventure game. Chill tropical-house groove with a soft beat, marimba patterns, plucked guitar, warm piano chords, light shakers like lapping waves, a cheerful flute melody. Turquoise sea, white sails, sunny archipelago adventure — carefree, sparkling, optimistic. 102 BPM, melodic and modern, loopable, instrumental, no vocals.
```

### 1-(d)' 常世の浜 — 久石譲「Summer」系の透明感｜合計725字

```
Dreamy paradise beach theme for a fantasy adventure game. Clear emotional piano melody with a gentle bouncing rhythm, warm strings, soft marimba, subtle pad and ocean-wave ambience, a single koto phrase drifting by like a memory. An eternal white-sand shore beyond the horizon — luminous, nostalgic, peaceful, slightly bittersweet but comforting. 78 BPM, cinematic and tender, loopable, instrumental, no vocals.
```

---

## 2. 戦闘用｜合計755字

※通常戦闘はフィールド曲継続の設計のため、強敵地帯・中ボス・天鎖守用。

```
Energetic battle theme in the spirit of classic 90s JRPG fights, produced as a modern hybrid. Driving electronic beat and punchy live drums, urgent piano riff, staccato strings, melodic synth-brass hooks, deep bass groove; a sharp shamisen lick accents the transitions. Exciting, heroic and playful — a sacred dance-like duel, intense but never dark or evil. 145 BPM, catchy repeating hook, tight loopable structure, instrumental, no vocals.
```

---

## 3. ボス用

### フェーズ1（哀しき守り神）｜合計779字

```
Intense cinematic boss battle theme for a fantasy action RPG. Hybrid orchestra — pounding cinematic drums and deep electronic bass, urgent low-string ostinato, dramatic piano stabs, soaring tragic melody on strings and horns, wordless choir swells. Fighting a corrupted guardian god: mighty, solemn and sorrowful rather than evil, a sacred trial of grand scale. 150 BPM, minor key with moments of tragic beauty, powerful loopable structure, instrumental, no vocals.
```

### フェーズ2（HP50%以下）

フェーズ1のテイクを Cover/Extend で派生（Audio Influence 60〜70%）させるか、本文末尾に以下を追記して別生成:

```
...same theme intensified: 160 BPM, full choir fortissimo, double-time drums, a desperate majestic final push.
```

### エクストラ「明るい狂騒」（Pain the Universe 直系・推奨版）｜合計878字 ←短縮済み

LoMボス曲の本質＝**明るい狂騒**。和の翻訳は「ゴシック」ではなく**祭囃子**（太鼓・鉦・篠笛×ピアノの乱舞）。使いどころ: 天の鬼神・高天原の大ボス・ラスボス級。

```
Frantic but BRIGHT extra boss theme - exhilarating like a wild festival, never dark, never gothic, no horror. A virtuosic galloping piano ostinato races in a high register over syncopated Latin-flavored rhythms, fast playful strings and jubilant brass stabs. Japanese festival frenzy drives the groove: rapid taiko and kane bell patterns like matsuri-bayashi, a shrieking joyful shinobue flute, tsugaru-shamisen runs trading phrases with the piano. Major-key brightness with thrilling dramatic turns - dancing chaos, a godly duel mid-festival. 170 BPM, tight loop.
```

- **Exclude Styles 欄**: `gothic, horror, dark ambient, church organ, metal` を推奨
- まだ暗ければ "bright major key, joyful frenzy" を本文の文頭へ移動して再生成

### エクストラ初版（ゴシック寄り・アーカイブ）｜合計841字 ←短縮済み

ダークに寄りやすいことが判明した初版。重厚な絵が欲しい場面用に保管。

```
Extra boss theme with virtuosic, frantic energy. An aggressive, relentless piano ostinato leads over fast orchestral strings, driving rock drums and galloping bass; dramatic shifting chords, a soaring melody both tragic and gorgeous, brief harpsichord and organ colors for gothic grandeur. Taiko impacts layered into the rock kit, a tsugaru-shamisen run answering the piano, pentatonic turns in the melody. A divine being dancing at full power - overwhelming, beautiful, never horror. 165 BPM, prog orchestral-rock, tight loop.
```

---

## 4. 街用

### 里（霧立の里）— ジブリ日常曲｜合計730字

```
Cozy village daily-life theme for a heartwarming fantasy adventure game. Warm intimate piano melody, soft acoustic guitar, gentle accordion or harmonica color, light brushed percussion, a brief koto sparkle now and then. A small mountain village with rice terraces, water wheels and kind neighbors — nostalgic, homely, like a Studio Ghibli everyday scene. 90 BPM, simple short loopable form, instrumental, no vocals.
```

### 都（宮乃京）— 雅×モダン｜合計733字

```
Elegant bustling capital theme for a fantasy adventure game. Graceful waltz-like piano and strings with a light modern rhythm section, playful woodwind phrases, warm brass, occasional sho-like pad and koto accent giving a refined Japanese color. An ancient bright capital with markets, festivals and dancing streamers — sophisticated, lively, welcoming. 100 BPM, charming and melodic, loopable, instrumental, no vocals.
```

---

## 5. ボーナス

### タイトルテーマ「世界の歌」— **最初に生成する曲**｜合計799字

```
Main title theme for a fantasy adventure game. A single emotional piano begins alone with a simple, deeply memorable melody — minimalist repeating figures that slowly bloom into warm strings and soft cinematic percussion. A faint koto echo answers the piano like an ancient memory. Hopeful, nostalgic, slightly mysterious — an old song the world itself used to sing, waiting to be sung again. 80 BPM, clear singable motif, gentle build, cinematic and intimate, instrumental, no vocals.
```

### 依代ジングル（短尺・**共通ID不要の例外**）

8秒の効果ジングルはBGM用IDの記述と衝突するため、これだけ単体で貼る:

```
Short 8-second magical jingle for a fantasy adventure game: a rising piano and harp flourish blooming into a warm bell tone and soft string swell, like light returning to an ancient shrine. Bright, sacred, satisfying resolution, instrumental, no vocals.
```

※実際は30秒程度で生成して頭の良い部分を切り出すのが確実。

---

## Suno 詳細設定ガイド（Weirdness / Style Influence）

> 基本は **50/50 のままでOK**（実績あり）。「症状が出た曲」と下記だけ動かす。

| 曲                         | Weirdness | Style Inf. | 理由                                                       |
| -------------------------- | --------- | ---------- | ---------------------------------------------------------- |
| タイトル「世界の歌」       | 30        | 50〜60     | モチーフの純度優先                                         |
| 森・里・常世の浜（静か系） | 30〜40    | 50〜60     | 定番の美しさでよい。変な音色の混入防止                     |
| 草原・海・戦闘             | 50        | 55〜65     | 現状維持                                                   |
| 空中（ピアノハウス）       | 45〜55    | **65〜70** | 変則ジャンルは Style 高めでないと平凡に逃げる              |
| ボス・エクストラ           | 50〜55    | **70**     | ダーク化の主因は語彙（改訂済み）。細かい楽器指定を拾わせる |
| ジングル                   | 20〜30    | 70         | 短尺は崩れやすい                                           |

- 調整は**一度に片方だけ**
- 症状→対処: 構成崩壊・変な音＝Weirdness↓／指定楽器が出ない＝Style↑／音の詰め込みで硬い＝Style↓
- Cover でのモチーフ展開は **Audio Influence 60〜70%**＋アレンジ変化は Style 側で

## 生成チェックリスト

- [ ] **全曲、凍結済み共通ID→改行→曲別本文の順で連結して貼る**（ジングルのみ例外）
- [ ] タイトルテーマを最初に生成し、メインモチーフを確定（→他曲の Cover 元）
- [ ] 歌詞欄 `[Instrumental]` でボーカル混入なしを確認
- [ ] 「純和風に寄りすぎ」「ダーク・ホラー寄り」のテイクは不採用
- [ ] ループ点が作れる構成のテイクを選ぶ
- [ ] ファイル命名: `bgm_title` / `bgm_field_forest` / `bgm_field_plains` / `bgm_field_sky` / `bgm_field_sea` / `bgm_field_tokoyo` / `bgm_battle` / `bgm_boss` / `bgm_boss_p2` / `bgm_boss_extra` / `bgm_town_village` / `bgm_town_capital` / `jingle_yorishiro`
