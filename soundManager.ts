/**
 * Procedural Web Audio API sound synthesizer for Desi Drive Challenge
 * No external audio files needed - 100% generated in real-time.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  
  private driftGain: GainNode | null = null;
  private driftNoiseNode: AudioBufferSourceNode | null = null;

  private nitroGain: GainNode | null = null;
  private nitroNoiseNode: AudioBufferSourceNode | null = null;

  private hornOscs: OscillatorNode[] = [];
  private hornGain: GainNode | null = null;

  constructor() {
    // AudioContext will initialize on first user gesture
    const savedMute = localStorage.getItem('desi_drive_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initCtx(): boolean {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('desi_drive_muted', String(this.isMuted));
    if (this.isMuted) {
      this.stopEngine();
      this.stopDrift();
      this.stopNitro();
      this.stopHorn();
    }
    return this.isMuted;
  }

  public startEngine(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    if (this.engineGain) return; // already running

    const now = this.ctx.currentTime;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, now);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, now);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, now);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(27.5, now);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  public updateEngine(speedKmh: number, throttle: number, isNitro: boolean): void {
    if (this.isMuted || !this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const baseFreq = 50 + (speedKmh * 1.4) + (throttle * 35) + (isNitro ? 40 : 0);
    const clampedFreq = Math.min(Math.max(baseFreq, 45), 360);
    const filterFreq = 350 + (speedKmh * 4.5) + (throttle * 300) + (isNitro ? 600 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(clampedFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(clampedFreq * 0.5, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    const targetGain = 0.05 + (throttle * 0.07) + (isNitro ? 0.04 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  public stopEngine(): void {
    if (this.engineGain && this.ctx) {
      try {
        this.engineOsc1?.stop();
        this.engineOsc2?.stop();
        this.engineOsc1?.disconnect();
        this.engineOsc2?.disconnect();
        this.engineGain.disconnect();
      } catch {
        // ignore
      }
      this.engineGain = null;
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineFilter = null;
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public setDrift(isDrifting: boolean, intensity: number = 1): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    if (isDrifting && !this.driftGain) {
      const buffer = this.createNoiseBuffer();
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();

      this.driftNoiseNode = source;
      this.driftGain = gain;
    }

    if (this.driftGain) {
      const targetGain = isDrifting ? Math.min(0.12 * intensity, 0.15) : 0;
      this.driftGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
      if (!isDrifting && targetGain === 0) {
        setTimeout(() => {
          if (!this.driftGain) return;
          this.stopDrift();
        }, 150);
      }
    }
  }

  public stopDrift(): void {
    if (this.driftNoiseNode) {
      try {
        this.driftNoiseNode.stop();
        this.driftNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.driftNoiseNode = null;
      this.driftGain = null;
    }
  }

  public setNitro(isNitro: boolean): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    if (isNitro && !this.nitroGain) {
      const buffer = this.createNoiseBuffer();
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();

      this.nitroNoiseNode = source;
      this.nitroGain = gain;
    }

    if (this.nitroGain) {
      const targetGain = isNitro ? 0.16 : 0;
      this.nitroGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
      if (!isNitro) {
        setTimeout(() => {
          this.stopNitro();
        }, 120);
      }
    }
  }

  public stopNitro(): void {
    if (this.nitroNoiseNode) {
      try {
        this.nitroNoiseNode.stop();
        this.nitroNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.nitroNoiseNode = null;
      this.nitroGain = null;
    }
  }

  /**
   * Iconic Indian "Horn OK Please" musical dual-tone horn
   */
  public playDesiHorn(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    this.stopHorn();

    const now = this.ctx.currentTime;
    const notes = [
      { freq: 440, time: 0, dur: 0.12 },
      { freq: 554.37, time: 0.12, dur: 0.12 },
      { freq: 659.25, time: 0.24, dur: 0.18 },
      { freq: 880, time: 0.42, dur: 0.28 },
    ];

    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(n.freq, now + n.time);
      osc2.frequency.setValueAtTime(n.freq * 1.01, now + n.time);

      gain.gain.setValueAtTime(0, now + n.time);
      gain.gain.linearRampToValueAtTime(0.12, now + n.time + 0.02);
      gain.gain.setValueAtTime(0.12, now + n.time + n.dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, now + n.time + n.dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now + n.time);
      osc2.start(now + n.time);
      osc1.stop(now + n.time + n.dur);
      osc2.stop(now + n.time + n.dur);
    });
  }

  public stopHorn(): void {
    this.hornOscs.forEach(o => {
      try { o.stop(); o.disconnect(); } catch { /* ignore */ }
    });
    this.hornOscs = [];
  }

  /**
   * Sparkling Coin pickup chime
   */
  public playCoinSound(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Checkpoint chime fanfare
   */
  public playCheckpointSound(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);

      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  /**
   * Impact / Crash sound
   */
  public playCrashSound(intensity: number = 1): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    const targetVol = Math.min(0.25 * intensity, 0.3);
    gain.gain.setValueAtTime(targetVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * UI Click / button sound
   */
  public playClickSound(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Unlock / purchase fanfare
   */
  public playUnlockSound(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major
    chords.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    });
  }
}

export const soundManager = new SoundManager();
