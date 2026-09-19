type SfxName = "shoot" | "hit" | "explode" | "levelup" | "pickup" | "hurt" | "dash" | "boss";

/**
 * Tiny procedural sound engine built on the Web Audio API — no asset files.
 * All effects are synthesized from oscillators + noise so the game stays
 * fully self-contained and offline.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Must be triggered from a user gesture (browsers block autoplay). */
  resume() {
    // Guard construction: some headless / audio-less environments throw here,
    // and audio must never be able to break gameplay.
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      }
      void this.ctx.resume();
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.5,
    slideTo?: number,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  private noise(dur: number, gain = 0.4, hp = 400) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  play(name: SfxName) {
    switch (name) {
      case "shoot":
        this.tone(880, 0.08, "square", 0.18, 420);
        break;
      case "hit":
        this.tone(320, 0.05, "triangle", 0.16);
        break;
      case "explode":
        this.noise(0.28, 0.5, 300);
        this.tone(120, 0.3, "sawtooth", 0.25, 40);
        break;
      case "hurt":
        this.tone(220, 0.25, "sawtooth", 0.4, 70);
        break;
      case "levelup":
        this.tone(523, 0.12, "sine", 0.4, 784);
        setTimeout(() => this.tone(784, 0.18, "sine", 0.4, 1046), 90);
        break;
      case "pickup":
        this.tone(1200, 0.05, "sine", 0.12, 1600);
        break;
      case "dash":
        this.tone(180, 0.16, "sine", 0.3, 520);
        break;
      case "boss":
        this.tone(70, 0.6, "sawtooth", 0.5, 48);
        this.noise(0.5, 0.4, 120);
        break;
    }
  }
}
