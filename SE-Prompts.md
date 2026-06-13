# SE-Prompts.md — 『玉結び』効果音 制作ガイド＆プロンプト集

> 作成: 2026-06-13 ／ **SunoはSE不向き**（楽曲生成モデルのため単発音に音楽文脈が乗る）。
> 方針: **ElevenLabs Sound Effects（テキスト→SE生成）＋フリー素材ライブラリの二刀流**。

## 0. ツール使い分け

| ツール | 用途 | 備考 |
|---|---|---|
| **Gemini（Lyria 3）** | **まず無料で試す枠**——環境音・妖怪の声 | Geminiアプリ内で楽曲＋効果音の生成に対応（日次制限あり・無料）。本書のプロンプトがそのまま使える。**全出力にSynthID透かし**（聴感上は無音）が入るため、ストア公開前に商用条件を規約で確認すること |
| **ElevenLabs SFX**（elevenlabs.io/sound-effects） | 妖怪の声・固有SE・環境音ループの**本命** | 1プロンプト4バリエーション／最長30秒／**loopパラメータあり**／有料プランで商用ロイヤリティフリー・クレジット不要。API有（将来の一括生成も可能）。Geminiで質が足りない分を補完 |
| **効果音ラボ**（soundeffect-lab.info） | 斬撃・打撃・UI・足音などの定番 | 無料・商用OK・登録不要。和ゲーの定番音源。まずここを漁ってから生成する |
| **Sonniss GDC Bundle**（sonniss.com/gameaudiogdc） | プロ品質の大量素材（環境音・打撃） | 毎年無料配布の数十GB。ロイヤリティフリー商用OK・クレジット不要 |
| **OtoLogic**（otologic.jp） | 和楽器ワンショット・ジングル | CC-BY 4.0（クレジット表記でOK） |
| **jsfxr / ChipTone**（ブラウザ） | レトロUI音（決定・キャンセル・拾得） | 8bit系の即席生成。レトロ感を出したいUI音に |
| **freesound.org** | ニッチな実録音 | **ライセンス混在注意**——CC0フィルタをかけて使う |

## 1. 運用ルール（先に読む）

1. **命名規則**: `se_{カテゴリ}_{名前}_{連番}.wav`（例: `se_hit_sword_01.wav` / `se_yokai_wolf_howl_01.wav` / `se_amb_fire_loop.wav`）
2. **フォーマット**: 生成・DLは WAV（44.1kHz/16bit以上）で保管 → 実装時に ogg 変換（Web配信向け）。原本は `Sound/raw/`、実装用は `Sound/se/`
3. **バリエーションはエンジン側でも稼ぐ**: 同じ音を**再生時にピッチ±5〜10%ランダム**させるだけで連打の耳疲れが消える（Web Audio の playbackRate で実装容易。実装フェーズで組み込む）
4. **打撃音はゲームフィールの核**: ヒットストップと同フレームで鳴らす前提なので、**アタック（立ち上がり）が速い音**を選ぶ。余韻が長い音は弾かれ・チャージ用に
5. ElevenLabs のプロンプトは**英語・具体的に**。「材質＋動作＋距離感＋質感」の順で書くと安定。`loop` 指定は環境音のみ

## 2. カテゴリ1: 妖怪・生き物の声（ElevenLabs生成が本命）

> 本作の敵は「穢れた魂が妖の形をとったもの」。**恐ろしすぎない**こと（明るいトーン制約）。「怒り」より「迷い・悲しみ」の混じった声が世界観に合う。祓った瞬間の「安らぎの声」もセットで作る。

| SE | プロンプト |
|---|---|
| 狼型の妖・遠吠え | `A lone wolf howl, slightly ethereal and mournful, with a faint wind-like spectral echo, distant, fantasy game creature` |
| 狼型・威嚇 | `A wolf-like creature growl, low and sad rather than aggressive, short, with a soft ghostly reverb tail, game enemy sound` |
| 小型の妖・気配 | `A small playful spirit creature chirp, airy and slightly hollow like wind through bamboo, short, cute but mysterious` |
| 鬼系・唸り | `A large ogre-like creature deep grunt, heavy and weary, short, fantasy game boss enemy, not horror` |
| 穢れの飛沫（被弾） | `A soft dark slime splatter mixed with a faint whispering sigh, short, magical corruption hit, game sound` |
| **祓われた瞬間（昇天）** | `A gentle relieved spirit sigh dissolving into soft sparkling chimes rising upward, peaceful release, magical, 2 seconds` |
| 式鬼（白い光の玉） | `A tiny warm wisp of light hovering, soft airy hum with gentle paper flutter, magical familiar, short loop` |

- コツ: 同プロンプトの4バリエーションを**個体差**としてそのまま採用すると安く済む
- 「not horror」「gentle」「sad rather than aggressive」を入れるとダーク化を防げる（BGMと同じ原則）

## 3. カテゴリ2: 武器・戦闘音（フリー素材先行＋固有音を生成）

> まず効果音ラボ・Sonnissで「素振り whoosh／命中 impact／弾かれ deflect」の3点を確保し、**本作固有の音だけ生成**する。

### フリー素材で確保する定番（探すキーワード）

- 素振り: 「刀 素振り」「swish」「whoosh」
- 斬撃命中: 「斬る」「slash impact」
- 打撃命中（木槌）: 「打撃」「blunt impact heavy」
- 弾かれ: 「金属音」「parry」「metal clang」
- 矢: 「弓矢」「bow release」「arrow hit」

### ElevenLabsで生成する固有音

| SE | プロンプト |
|---|---|
| 祓い刀・命中（神聖な斬撃） | `A katana slash impact with a bright sacred chime layered in, crisp metallic cut plus a faint bell shimmer, short, fantasy action game hit` |
| 縛り祓い（注連縄展開） | `A thick sacred rope snapping taut with paper talismans fluttering, followed by a short binding shimmer, Japanese shrine magic, 1.5 seconds` |
| **祓い波（必殺・最重要）** | `A massive wave of purifying light bursting outward, deep whoosh blooming into bright bell harmonics and rising sparkles, sacred and triumphant, 2.5 seconds, fantasy game ultimate skill` |
| 御鏡・光線照射 | `A continuous beam of holy light, warm shimmering hum with subtle crystalline overtones, loopable, magical laser, soft not aggressive` |
| 木槌・岩割り | `A heavy wooden mallet smashing rock, deep crack and crumbling stones, short, satisfying, game action` |
| 式符・式鬼の爆ぜ | `A paper talisman bursting into a small flash of light, quick pop with paper scraps and chime sparkle, short, magical trap` |
| 舞扇・風 | `A sharp elegant fan whoosh creating a gust of wind with faint chime, quick, graceful, Japanese dance weapon` |
| チャージ完了 | `A short magical charge-up complete cue, rising hum locking into a bright resonant ping, satisfying, game skill ready` |

## 4. カテゴリ3: 環境音（ElevenLabs の loop 指定が活躍）

> フィールドBGMの下に薄く敷くレイヤー。**音量はBGMの2〜3割**で「気配」程度に。

| SE | プロンプト（`loop` 指定ON） |
|---|---|
| 焚き火・松明 | `Gentle campfire crackling, warm and steady, seamless loop, no wind` |
| 小川 | `A small clear stream flowing over stones, gentle bubbling water, seamless ambient loop` |
| 常世の浜・波 | `Calm ocean waves lapping on a white sand beach, soft and warm, with a very faint wind chime in the distance, seamless paradise ambience loop` |
| 鎮守の森 | `Quiet sacred forest ambience, soft leaves rustling, occasional distant bird, gentle and peaceful, seamless loop` |
| 雲海の風（飛空艇） | `High altitude wind above the clouds, smooth airy whoosh, majestic and calm, seamless loop, no whistling` |
| 雨（黒杉の幽谷） | `Soft rain on forest canopy, steady and gentle, seamless ambient loop` |
| 洞窟 | `Quiet cave ambience, distant water drips with soft hollow reverb, seamless loop, not scary` |

- ループの継ぎ目が気になったら Audacity で頭と尻をクロスフェード（定番処理）
- 火・水は**近接で音量が上がる**実装（距離減衰）を想定して、単体で破綻しない素直な音を選ぶ

## 5. UI・システム音（jsfxr／効果音ラボ＋一部生成）

| SE | 入手 |
|---|---|
| 決定・キャンセル・カーソル | jsfxr/ChipTone（レトロ感）or 効果音ラボ |
| 勾玉入手 | ElevenLabs: `A smooth jade magatama bead clinking into place with a warm short chime, satisfying pickup sound, game item get` |
| 銭の支払い | 効果音ラボ「コイン」系 |
| 依代が灯る（ジングル前の予兆） | ElevenLabs: `A soft holy light igniting with a gentle whoosh into warm resonance, 1 second, sacred` |
| レベルアップ/恵み取得 | ElevenLabs: `A bright ascending magical arpeggio with bell tones, short, joyful accomplishment, game fanfare, 1.5 seconds` |

## 6. ライセンスまとめ（公開前チェック用）

| ソース | 商用 | クレジット |
|---|---|---|
| Gemini（Lyria 3） | **○ 商用利用権付与**（収益化含む。ただし無料アプリ枠とPro/Commercialティアで条件が異なる可能性→**製品採用分は公開前に該当ティアの規約を最終確認**） | 不要（SynthID透かしは「AI製の識別」であり商用禁止ではない） |
| ElevenLabs（有料プラン） | ○ | 不要 |
| 効果音ラボ | ○ | 不要（規約は公開前に再確認） |
| Sonniss GDC | ○ | 不要 |
| OtoLogic | ○ | **必要**（CC-BY） |
| freesound | 素材ごと | **CC0のみ使う**のが安全 |
| jsfxr/ChipTone 自作音 | ○ | 不要（自作扱い） |

### AI音源をSteamに公開する時の注意（2026-06-13 確認）

1. **Steam はAI生成コンテンツOK**（2024年〜）。リリース時のコンテンツサーベイで「AI生成アセット使用」を開示する義務があるだけ（ストアページに表示される）。AI音源だから落ちることはない
2. **Suno（BGM）は有料プランで生成したものだけが商用可**。無料枠で作った曲を製品に入れない（必要なら有料プランで再生成）
3. 学習データの権利面は Lyria 3（ライセンス済みデータ）の方が Suno（訴訟経緯あり）より低リスクと評価されている
4. 公開前チェック: ①Suno有料プラン確認 ②Gemini採用分の規約確認 ③Steamサーベイ開示 ④OtoLogic等CC-BY素材のクレジット表記

## 7. 体験版（Phase 1A/1B）に必要な最小SEリスト

```
移動: 足音（草/土/石/木）×各1
戦闘: 祓い刀whoosh/hit/deflect、木槌whoosh/hit/岩割り、御鏡beam、
      被弾、敵whoosh/hit、敵の声（妖2〜3種×威嚇/被弾/祓われ）、
      縛り祓い、祓い波、チャージ完了、ヒットストップ用インパクト強調1
ボス: 岩鬼の王（咆哮/叩きつけ/フェーズ移行）
UI:   決定/キャンセル/カーソル/勾玉入手/銭/メニュー開閉
環境: 森ループ/小川/洞窟ループ/焚き火
ジングル: 依代が灯る（BGM-Prompts.md §5）
→ 約35〜40点。ElevenLabs生成 ≈ 15点／フリー素材DL ≈ 20点／jsfxr ≈ 5点 の配分想定
```
