/**
 * Native Web Audio API Synthesizer & Web Speech Synthesis for futuristic cyberpunk auditory feedback
 * and interactive AI executive voice briefings.
 */

const STORAGE_KEY_MUTED = 'locus_audio_muted';
const STORAGE_KEY_VOICE_PERSONA = 'locus_voice_persona';

export type VoicePersona = 'tactical' | 'british' | 'natural';

export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentWordIndex: number;
  persona: VoicePersona;
  rate: number;
}

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechListeners: ((state: SpeechState) => void)[] = [];
  private currentSpeechState: SpeechState = {
    isSpeaking: false,
    isPaused: false,
    currentWordIndex: 0,
    persona: 'tactical',
    rate: 1.0,
  };

  constructor() {
    this.muted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_MUTED) === 'true' : false;
    if (typeof window !== 'undefined') {
      const savedPersona = localStorage.getItem(STORAGE_KEY_VOICE_PERSONA) as VoicePersona;
      if (savedPersona) {
        this.currentSpeechState.persona = savedPersona;
      }
    }
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
    if (muted && this.currentSpeechState.isSpeaking) {
      this.stopSpeech();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public getSpeechState(): SpeechState {
    return { ...this.currentSpeechState };
  }

  public subscribeSpeech(listener: (state: SpeechState) => void): () => void {
    this.speechListeners.push(listener);
    listener(this.getSpeechState());
    return () => {
      this.speechListeners = this.speechListeners.filter((l) => l !== listener);
    };
  }

  private notifySpeechState(): void {
    this.speechListeners.forEach((listener) => listener(this.getSpeechState()));
  }

  /**
   * Synthesizes and plays a futuristic sound cue.
   */
  public playTone(type: 'start' | 'step' | 'verdict' | 'error' | 'success' | 'alarm' | 'rebalance'): void {
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

        case 'success': {
          // Success chime: Upbeat dual tone (660Hz -> 880Hz)
          [659.25, 880.0].forEach((freq, idx) => {
            const noteStart = now + idx * 0.09;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.01, noteStart);
            gain.gain.linearRampToValueAtTime(0.16, noteStart + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(noteStart);
            osc.stop(noteStart + 0.29);
          });
          break;
        }

        case 'rebalance': {
          // Rebalance pulse: Cyber sweep down-then-up (500Hz -> 300Hz -> 750Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.linearRampToValueAtTime(300, now + 0.08);
          osc.frequency.exponentialRampToValueAtTime(750, now + 0.22);
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case 'alarm': {
          // Emergency alert: Alternating siren tones
          [880, 660, 880, 660].forEach((freq, idx) => {
            const noteStart = now + idx * 0.1;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(noteStart);
            osc.stop(noteStart + 0.1);
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

  /**
   * Speaks executive AI debriefing using Web Speech Synthesis.
   */
  public speakBriefing(text: string, persona: VoicePersona = 'tactical', rate: number = 1.0): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.muted || !text) return;

    this.stopSpeech();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = persona === 'tactical' ? 0.95 : persona === 'british' ? 1.05 : 1.0;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (persona === 'british') {
          const ukVoice = voices.find((v) => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('British'));
          if (ukVoice) utterance.voice = ukVoice;
        } else if (persona === 'tactical') {
          const maleVoice = voices.find((v) => (v.lang.includes('en-US') || v.lang.includes('en-GB')) && (v.name.includes('David') || v.name.includes('Male') || v.name.includes('Natural')));
          if (maleVoice) utterance.voice = maleVoice;
        } else {
          const naturalVoice = voices.find((v) => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny')));
          if (naturalVoice) utterance.voice = naturalVoice;
        }
      }

      utterance.onstart = () => {
        this.currentSpeechState = {
          isSpeaking: true,
          isPaused: false,
          currentWordIndex: 0,
          persona,
          rate,
        };
        this.notifySpeechState();
      };

      utterance.onpause = () => {
        this.currentSpeechState.isPaused = true;
        this.notifySpeechState();
      };

      utterance.onresume = () => {
        this.currentSpeechState.isPaused = false;
        this.notifySpeechState();
      };

      utterance.onend = () => {
        this.currentSpeechState = {
          isSpeaking: false,
          isPaused: false,
          currentWordIndex: 0,
          persona,
          rate,
        };
        this.currentUtterance = null;
        this.notifySpeechState();
      };

      utterance.onerror = () => {
        this.currentSpeechState = {
          isSpeaking: false,
          isPaused: false,
          currentWordIndex: 0,
          persona,
          rate,
        };
        this.currentUtterance = null;
        this.notifySpeechState();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful fallback
    }
  }

  public stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.currentSpeechState = {
      isSpeaking: false,
      isPaused: false,
      currentWordIndex: 0,
      persona: this.currentSpeechState.persona,
      rate: this.currentSpeechState.rate,
    };
    this.currentUtterance = null;
    this.notifySpeechState();
  }

  public pauseSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.currentSpeechState.isSpeaking) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
  }

  public resumeSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.currentSpeechState.isPaused) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // Ignore
      }
    }
  }

  public setPersona(persona: VoicePersona): void {
    this.currentSpeechState.persona = persona;
    try {
      localStorage.setItem(STORAGE_KEY_VOICE_PERSONA, persona);
    } catch {
      // Ignore
    }
    this.notifySpeechState();
  }
}

export const audioService = new AudioSynthesizer();

export function playTone(type: 'start' | 'step' | 'verdict' | 'error' | 'success' | 'alarm' | 'rebalance'): void {
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

export function speakBriefing(text: string, persona: VoicePersona = 'tactical', rate: number = 1.0): void {
  audioService.speakBriefing(text, persona, rate);
}

export function stopSpeech(): void {
  audioService.stopSpeech();
}

export function pauseSpeech(): void {
  audioService.pauseSpeech();
}

export function resumeSpeech(): void {
  audioService.resumeSpeech();
}

export function subscribeSpeech(listener: (state: SpeechState) => void): () => void {
  return audioService.subscribeSpeech(listener);
}

export function setVoicePersona(persona: VoicePersona): void {
  audioService.setPersona(persona);
}
