import type { AmbientSoundId } from '../types/bookly';

export interface AmbientSoundOption {
  id: AmbientSoundId;
  label: string;
  description: string;
}

export const AMBIENT_SOUNDS: AmbientSoundOption[] = [
  { id: 'rain', label: 'Soft Rain', description: 'Steady rainfall against a windowpane' },
  { id: 'fireplace', label: 'Fireplace', description: 'Warm low hearth rumble and gentle crackle' },
  { id: 'cafe', label: 'Quiet Café', description: 'Muffled espresso room background ambience' },
  { id: 'library', label: 'Reading Room', description: 'Airy study hush with soft low tone' },
  { id: 'brown-noise', label: 'Brown Noise', description: 'Deep broadband focus noise' },
];

/**
 * Web Audio API ambient soundscape synthesizer.
 * Generates smooth, looping acoustic textures locally without external audio dependencies.
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private crackleTimer: number | null = null;
  private currentSound: AmbientSoundId | null = null;
  private volume = 0.45;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4; // 4-second seamless buffer
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }
    } else {
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.8;
      }
    }
    return buffer;
  }

  public play(soundId: AmbientSoundId): void {
    this.stop();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.currentSound = soundId;

    const createLoopSource = (type: 'white' | 'pink' | 'brown') => {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, type);
      src.loop = true;
      return src;
    };

    if (soundId === 'rain') {
      const src = createLoopSource('pink');
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1100;
      bandpass.Q.value = 0.55;

      const lowshelf = ctx.createBiquadFilter();
      lowshelf.type = 'lowshelf';
      lowshelf.frequency.value = 320;
      lowshelf.gain.value = 4;

      const gain = ctx.createGain();
      gain.gain.value = 0.85;

      src.connect(bandpass);
      bandpass.connect(lowshelf);
      lowshelf.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      this.activeNodes.push(src, bandpass, lowshelf, gain);
    } else if (soundId === 'fireplace') {
      const src = createLoopSource('brown');
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 260;

      const gain = ctx.createGain();
      gain.gain.value = 0.9;

      src.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      this.activeNodes.push(src, lowpass, gain);

      // Gentle occasional hearth crackle
      this.crackleTimer = window.setInterval(() => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'fireplace') return;
        if (Math.random() > 0.45) return;
        const burst = this.ctx.createBufferSource();
        const len = Math.floor(this.ctx.sampleRate * 0.025);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));
        }
        burst.buffer = buf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1800;
        const g = this.ctx.createGain();
        g.gain.value = 0.12 + Math.random() * 0.14;
        burst.connect(hp);
        hp.connect(g);
        g.connect(this.masterGain);
        burst.start();
      }, 280);
    } else if (soundId === 'cafe') {
      const src = createLoopSource('pink');
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 720;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.18;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain);
      lfoGain.connect(lowpass.frequency);

      const gain = ctx.createGain();
      gain.gain.value = 0.65;

      src.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      lfo.start();
      this.activeNodes.push(src, lowpass, lfo, lfoGain, gain);
    } else if (soundId === 'library') {
      const src = createLoopSource('brown');
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 420;
      bandpass.Q.value = 0.8;

      const gain = ctx.createGain();
      gain.gain.value = 0.38;

      src.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      this.activeNodes.push(src, bandpass, gain);
    } else {
      const src = createLoopSource('brown');
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 480;

      const gain = ctx.createGain();
      gain.gain.value = 0.72;

      src.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      this.activeNodes.push(src, lowpass, gain);
    }
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public stop(): void {
    this.currentSound = null;
    if (this.crackleTimer !== null) {
      window.clearInterval(this.crackleTimer);
      this.crackleTimer = null;
    }
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as AudioBufferSourceNode).stop === 'function') {
          (node as AudioBufferSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.activeNodes = [];
  }
}

export const ambientAudio = new AmbientAudioEngine();
