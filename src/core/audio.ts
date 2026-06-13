// BGM: public/bgm/*.ogg を HTMLAudio でループ再生（WAVマスターから OGG 変換・MP3はループ無音問題で不可）。
// 通常戦闘はフィールド曲継続（シームレス戦闘）。バトル曲＝ボス専用（HANDOFF §3 確定事項）。
// SFX: WebAudio で合成（Phase 0 はプレースホルダー。体験版で SE-Prompts.md の生成素材に差替）。

export type BgmId = "title" | "town" | "field" | "mori" | "battle" | "boss" | "boss2" | null;
export type SfxId =
  | "swish" | "hit" | "hitHeavy" | "clang" | "hurt" | "poof" | "pickup" | "heal"
  | "chargeReady" | "spin" | "throw" | "harai" | "haraiReady"
  | "menuOpen" | "menuMove" | "menuOk" | "menuCancel" | "textBlip"
  | "chest" | "levelup" | "stomp" | "roar" | "fanfare";

const BGM_FILES: Record<Exclude<BgmId, null>, string> = {
  title: "bgm/title.ogg",    // 世界の歌（Kindling Tomorrow）
  town: "bgm/sato.ogg",      // 里（Ricewheel Lullaby）
  field: "bgm/field.ogg",    // 草原（Overworld Hope）
  mori: "bgm/mori.ogg",      // 森・杜（Maple-Temple Piano）
  battle: "bgm/boss.ogg",    // 通常ボス（Battle01）
  boss: "bgm/boss.ogg",
  boss2: "bgm/boss.ogg",
};

class AudioManager {
  private ac: AudioContext | null = null;
  private bgmEl: HTMLAudioElement | null = null;
  private current: BgmId = null;
  private unlocked = false;
  /** 全 SFX（と capture 時は BGM も）が通るマスターバス */
  private master: GainNode | null = null;
  /** 録画用タップ（MediaRecorder に渡す）。getRecordStream() で生成 */
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private capture = false;
  private routedEls = new WeakSet<HTMLAudioElement>();
  bgmVolume = 0.55;
  sfxVolume = 0.5;
  muted = false;

  /** 最初のキー入力等で呼ぶ（autoplay 制限解除） */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ctx(); // resume
    if (this.current) this.playBgm(this.current, true);
  }

  private ctx(): AudioContext | null {
    if (typeof AudioContext === "undefined") return null;
    if (!this.ac) this.ac = new AudioContext();
    if (this.ac.state === "suspended") void this.ac.resume();
    return this.ac;
  }

  /** マスターバス（lazy）。SFX は常にここを通る */
  private out(ac: AudioContext): GainNode {
    if (!this.master) {
      this.master = ac.createGain();
      this.master.connect(ac.destination);
    }
    return this.master;
  }

  /** 録画用: マスターバスのコピーを MediaStream として取得（BGM も AC 経由に切替） */
  getRecordStream(): MediaStream | null {
    const ac = this.ctx();
    if (!ac) return null;
    if (!this.recordDest) {
      this.recordDest = ac.createMediaStreamDestination();
      this.out(ac).connect(this.recordDest);
    }
    this.capture = true;
    if (this.bgmEl) this.routeBgm(this.bgmEl);
    return this.recordDest.stream;
  }

  /** BGM の HTMLAudio を WebAudio グラフへ取り込む（capture 時のみ使用） */
  private routeBgm(el: HTMLAudioElement) {
    if (this.routedEls.has(el)) return;
    const ac = this.ctx();
    if (!ac) return;
    try {
      const src = ac.createMediaElementSource(el);
      src.connect(this.out(ac));
      this.routedEls.add(el);
    } catch { /* 二重接続などは無視 */ }
  }

  playBgm(id: BgmId, force = false) {
    if (id === this.current && !force) return;
    this.current = id;
    if (!this.unlocked) return; // unlock 時に再生される
    if (this.bgmEl) { this.bgmEl.pause(); this.bgmEl.src = ""; this.bgmEl = null; }
    if (!id || this.muted) return;
    const el = new Audio(BGM_FILES[id]);
    el.loop = true;
    el.volume = this.bgmVolume;
    if (this.capture) this.routeBgm(el);
    void el.play().catch(() => { /* 失敗してもゲームは続行 */ });
    this.bgmEl = el;
  }

  stopBgm() { this.playBgm(null); }

  // ── SFX 合成 ────────────────────────────────────────────────
  private noiseBuf: AudioBuffer | null = null;
  private noise(ac: AudioContext): AudioBuffer {
    if (!this.noiseBuf) {
      const len = ac.sampleRate * 0.5;
      this.noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }

  private env(ac: AudioContext, t0: number, dur: number, peak: number, curve = 0.0015): GainNode {
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak * this.sfxVolume, t0 + curve);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(this.out(ac));
    return g;
  }

  private osc(ac: AudioContext, type: OscillatorType, f0: number, f1: number, t0: number, dur: number, peak: number) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    o.connect(this.env(ac, t0, dur, peak));
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  private burst(ac: AudioContext, t0: number, dur: number, peak: number, filter?: { type: BiquadFilterType; f0: number; f1?: number }) {
    const s = ac.createBufferSource();
    s.buffer = this.noise(ac);
    const g = this.env(ac, t0, dur, peak);
    if (filter) {
      const f = ac.createBiquadFilter();
      f.type = filter.type;
      f.frequency.setValueAtTime(filter.f0, t0);
      if (filter.f1) f.frequency.exponentialRampToValueAtTime(filter.f1, t0 + dur);
      s.connect(f); f.connect(g);
    } else s.connect(g);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  play(id: SfxId) {
    if (this.muted) return;
    const ac = this.ctx();
    if (!ac) return;
    const t = ac.currentTime + 0.001;
    switch (id) {
      case "swish": this.burst(ac, t, 0.09, 0.5, { type: "bandpass", f0: 2600, f1: 700 }); break;
      case "throw": this.burst(ac, t, 0.12, 0.45, { type: "bandpass", f0: 1500, f1: 3200 }); break;
      case "spin": this.burst(ac, t, 0.22, 0.5, { type: "bandpass", f0: 900, f1: 2600 }); break;
      case "hit":
        this.osc(ac, "square", 220, 70, t, 0.09, 0.5);
        this.burst(ac, t, 0.06, 0.45, { type: "lowpass", f0: 2400 });
        break;
      case "hitHeavy":
        this.osc(ac, "square", 150, 45, t, 0.16, 0.6);
        this.burst(ac, t, 0.14, 0.55, { type: "lowpass", f0: 1600, f1: 300 });
        break;
      case "clang":
        this.osc(ac, "square", 1320, 880, t, 0.1, 0.3);
        this.osc(ac, "triangle", 2640, 1760, t, 0.08, 0.2);
        break;
      case "hurt": this.osc(ac, "sawtooth", 320, 110, t, 0.18, 0.5); break;
      case "poof": this.burst(ac, t, 0.2, 0.4, { type: "lowpass", f0: 1200, f1: 240 }); break;
      case "pickup":
        this.osc(ac, "sine", 660, 660, t, 0.06, 0.4);
        this.osc(ac, "sine", 990, 990, t + 0.07, 0.09, 0.4);
        break;
      case "heal":
        for (const [i, f] of [523, 659, 784, 1047].entries())
          this.osc(ac, "sine", f, f, t + i * 0.07, 0.12, 0.3);
        break;
      case "chargeReady": this.osc(ac, "sine", 880, 1760, t, 0.12, 0.45); break;
      case "haraiReady":
        // 祓いゲージ満タン: 鈴を二度鳴らす
        this.osc(ac, "sine", 1568, 1568, t, 0.18, 0.3);
        this.osc(ac, "sine", 2093, 2093, t + 0.12, 0.24, 0.25);
        break;
      case "harai":
        // 祓い波: 低い衝撃 → 透明な倍音の広がり（浄化）
        this.osc(ac, "sine", 110, 55, t, 0.4, 0.7);
        this.burst(ac, t, 0.3, 0.5, { type: "lowpass", f0: 1400, f1: 200 });
        for (const [i, f] of [1047, 1319, 1568, 2093].entries())
          this.osc(ac, "sine", f, f * 1.01, t + 0.06 + i * 0.07, 0.5, 0.18);
        break;
      case "menuOpen": this.osc(ac, "triangle", 440, 880, t, 0.08, 0.35); break;
      case "menuMove": this.osc(ac, "square", 880, 880, t, 0.035, 0.2); break;
      case "menuOk": this.osc(ac, "square", 660, 990, t, 0.07, 0.3); break;
      case "menuCancel": this.osc(ac, "square", 440, 220, t, 0.07, 0.3); break;
      case "textBlip": this.osc(ac, "square", 740, 740, t, 0.025, 0.12); break;
      case "chest":
        for (const [i, f] of [784, 988, 1175, 1568].entries())
          this.osc(ac, "triangle", f, f, t + i * 0.09, 0.14, 0.35);
        break;
      case "levelup":
        for (const [i, f] of [523, 659, 784, 1047, 1319].entries())
          this.osc(ac, "square", f, f, t + i * 0.08, 0.12, 0.25);
        break;
      case "stomp":
        this.osc(ac, "sine", 90, 40, t, 0.22, 0.7);
        this.burst(ac, t, 0.18, 0.5, { type: "lowpass", f0: 500, f1: 120 });
        break;
      case "roar":
        this.osc(ac, "sawtooth", 140, 60, t, 0.5, 0.45);
        this.burst(ac, t, 0.45, 0.4, { type: "lowpass", f0: 900, f1: 200 });
        break;
      case "fanfare":
        for (const [i, f] of [523, 523, 523, 659, 784, 1047].entries())
          this.osc(ac, "square", f, f, t + i * 0.11, 0.16, 0.25);
        break;
    }
  }
}

export const audio = new AudioManager();
