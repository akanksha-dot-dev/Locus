/**
 * Native Web Audio API Synthesizer for futuristic cyberpunk auditory feedback.
 * Synthesizes start chirps, step ticks, verdict chimes, and error buzzes natively
 * without requiring external audio asset files.
 */

const STORAGE_KEY_MUTED = 'swytchagent_audio_muted';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  constructor() {
    this.muted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_MUTED) === 'true' : false;
  }

  /**
   * Lazily initializes and resumes the AudioContext upon user gesture.
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
        }
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {
          // Autoplay policy may still suspend until next user gesture
        });
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
    } catch {
      // Ignore localStorage quota errors
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Synthesizes and plays a futuristic sound cue.
   */
  public playTone(type: 'start' | 'step' | 'verdict' | 'error'): void {
    if (this.muted) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      switch (type) {
        case 'start': {
          // Cyber chirp: Fast ascending frequency sweep (350Hz -> 880Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.13);
          break;
        }

        case 'step': {
          // Micro tick: Crisp, sub-second mechanical pulse (1200Hz, 35ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.035);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'verdict': {
          // Harmonic chime: Major triad arpeggio (C5 -> E5 -> G5 -> C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const noteStart = now + idx * 0.07;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.001, noteStart);
            gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(noteStart);
            osc.stop(noteStart + 0.36);
          });
          break;
        }

        case 'error': {
          // Warning buzz: Low sawtooth oscillation (140Hz -> 85Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.linearRampToValueAtTime(85, now + 0.18);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.19);
          break;
        }
      }
    } catch {
      // Silent catch to protect pipeline
    }
  }
}

export const audioService = new AudioSynthesizer();

export function playTone(type: 'start' | 'step' | 'verdict' | 'error'): void {
  audioService.playTone(type);
}

export function setMuted(muted: boolean): void {
  audioService.setMuted(muted);
}

export function isMuted(): boolean {
  return audioService.isMuted();
}

export function toggleMute(): boolean {
  return audioService.toggleMute();
}
