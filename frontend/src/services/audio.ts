/**
 * Native Web Audio API Synthesizer & Web Speech Synthesis for futuristic cyberpunk auditory feedback
 * and interactive AI executive voice briefings with real-time chapter synchronization.
 */

const STORAGE_KEY_MUTED = 'locus_audio_muted';
const STORAGE_KEY_VOICE_PERSONA = 'locus_voice_persona';
const STORAGE_KEY_VOICE_PITCH = 'locus_voice_pitch';
const STORAGE_KEY_VOICE_VOLUME = 'locus_voice_volume';

export type VoicePersona = 'tactical' | 'british' | 'natural' | 'cyber' | 'broadcast';
export type VoicePitch = 'deep' | 'natural' | 'crisp';
export type BriefingTone = 'tactical' | 'executive' | 'casual';

export interface BriefingChapter {
  id: string;
  title: string;
  icon: string;
  text: string;
}

export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentWordIndex: number;
  currentChapterIndex: number;
  totalChapters: number;
  activeChapterId?: string;
  charProgress: number; // 0 to 100
  persona: VoicePersona;
  pitch: VoicePitch;
  rate: number;
  volume: number; // 0.0 to 1.0
}

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechListeners: ((state: SpeechState) => void)[] = [];
  private activeChapters: BriefingChapter[] = [];
  private activeChapterIdx: number = 0;
  private progressInterval: any = null;

  private currentSpeechState: SpeechState = {
    isSpeaking: false,
    isPaused: false,
    currentWordIndex: 0,
    currentChapterIndex: 0,
    totalChapters: 0,
    charProgress: 0,
    persona: 'tactical',
    pitch: 'natural',
    rate: 1.0,
    volume: 1.0,
  };

  constructor() {
    this.muted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_MUTED) === 'true' : false;
    if (typeof window !== 'undefined') {
      const savedPersona = localStorage.getItem(STORAGE_KEY_VOICE_PERSONA) as VoicePersona;
      if (savedPersona) {
        this.currentSpeechState.persona = savedPersona;
      }
      const savedPitch = localStorage.getItem(STORAGE_KEY_VOICE_PITCH) as VoicePitch;
      if (savedPitch) {
        this.currentSpeechState.pitch = savedPitch;
      }
      const savedVol = localStorage.getItem(STORAGE_KEY_VOICE_VOLUME);
      if (savedVol) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) this.currentSpeechState.volume = Math.max(0, Math.min(1, parsed));
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

  public getVolume(): number {
    return this.currentSpeechState.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentSpeechState.volume = clamped;
    try {
      localStorage.setItem(STORAGE_KEY_VOICE_VOLUME, String(clamped));
    } catch {}
    if (this.currentUtterance) {
      this.currentUtterance.volume = clamped;
    }
    this.notifySpeechState();
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
  public playTone(type: 'start' | 'step' | 'verdict' | 'error' | 'success' | 'alarm' | 'rebalance' | 'chapter' | 'finish'): void {
    if (this.muted) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const vol = this.currentSpeechState.volume;

      switch (type) {
        case 'start': {
          // Cyber chirp: Fast ascending frequency sweep (350Hz -> 880Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.13);
          break;
        }

        case 'chapter': {
          // Chapter switch soft blip: Dual high-tech harmonic click (700Hz -> 1050Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(700, now);
          osc.frequency.exponentialRampToValueAtTime(1050, now + 0.08);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.09);
          break;
        }

        case 'finish': {
          // Transmission complete: Descending cyber confirmation
          [900, 1200, 1500].forEach((freq, idx) => {
            const noteStart = now + idx * 0.06;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.01, noteStart);
            gain.gain.linearRampToValueAtTime(0.14 * vol, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(noteStart);
            osc.stop(noteStart + 0.21);
          });
          break;
        }

        case 'step': {
          // Micro tick: Crisp, sub-second mechanical pulse (1200Hz, 35ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.035);

          gain.gain.setValueAtTime(0.12 * vol, now);
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
            gain.gain.linearRampToValueAtTime(0.15 * vol, noteStart + 0.02);
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
            gain.gain.linearRampToValueAtTime(0.16 * vol, noteStart + 0.03);
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
          gain.gain.linearRampToValueAtTime(0.14 * vol, now + 0.04);
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
            gain.gain.setValueAtTime(0.15 * vol, noteStart);
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

          gain.gain.setValueAtTime(0.2 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.19);
          break;
        }
      }
    } catch {
      // Silent catch
    }
  }

  /**
   * Helper to select pitch numeric value based on VoicePitch setting and Persona
   */
  private computePitch(pitchSetting: VoicePitch, persona: VoicePersona): number {
    let base = 1.0;
    if (persona === 'tactical') base = 0.92;
    else if (persona === 'british') base = 1.05;
    else if (persona === 'cyber') base = 1.15;
    else if (persona === 'broadcast') base = 1.02;

    if (pitchSetting === 'deep') return Math.max(0.7, base * 0.85);
    if (pitchSetting === 'crisp') return Math.min(1.4, base * 1.15);
    return base;
  }

  /**
   * Speaks multi-chapter executive AI briefing sequentially with chapter events.
   */
  public speakChapters(
    chapters: BriefingChapter[],
    startIdx: number = 0,
    persona?: VoicePersona,
    rate?: number,
    pitch?: VoicePitch
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.muted || !chapters || chapters.length === 0) return;

    this.stopSpeech();
    this.activeChapters = chapters;
    this.activeChapterIdx = Math.max(0, Math.min(startIdx, chapters.length - 1));

    const selectedPersona = persona || this.currentSpeechState.persona;
    const selectedRate = rate || this.currentSpeechState.rate;
    const selectedPitch = pitch || this.currentSpeechState.pitch;

    this.speakCurrentChapter(selectedPersona, selectedRate, selectedPitch);
  }

  private speakCurrentChapter(persona: VoicePersona, rate: number, pitch: VoicePitch): void {
    if (this.activeChapterIdx >= this.activeChapters.length) {
      this.playTone('finish');
      this.currentSpeechState = {
        ...this.currentSpeechState,
        isSpeaking: false,
        isPaused: false,
        charProgress: 100,
        currentWordIndex: 0,
      };
      this.currentUtterance = null;
      this.notifySpeechState();
      return;
    }

    const chapter = this.activeChapters[this.activeChapterIdx];
    if (!chapter || !chapter.text) {
      this.activeChapterIdx++;
      this.speakCurrentChapter(persona, rate, pitch);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(chapter.text);
      utterance.rate = rate;
      utterance.pitch = this.computePitch(pitch, persona);
      utterance.volume = this.currentSpeechState.volume;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (persona === 'british') {
          const ukVoice = voices.find((v) => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('British') || v.name.includes('George'));
          if (ukVoice) utterance.voice = ukVoice;
        } else if (persona === 'tactical') {
          const maleVoice = voices.find((v) => (v.lang.includes('en-US') || v.lang.includes('en-GB')) && (v.name.includes('David') || v.name.includes('Guy') || v.name.includes('Male')));
          if (maleVoice) utterance.voice = maleVoice;
        } else if (persona === 'cyber') {
          const synthVoice = voices.find((v) => v.name.includes('Zira') || v.name.includes('Robot') || v.name.includes('Microsoft') || v.lang.includes('en'));
          if (synthVoice) utterance.voice = synthVoice;
        } else if (persona === 'broadcast') {
          const newsVoice = voices.find((v) => v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Natural'));
          if (newsVoice) utterance.voice = newsVoice;
        } else {
          const naturalVoice = voices.find((v) => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Natural')));
          if (naturalVoice) utterance.voice = naturalVoice;
        }
      }

      utterance.onstart = () => {
        this.currentSpeechState = {
          ...this.currentSpeechState,
          isSpeaking: true,
          isPaused: false,
          currentChapterIndex: this.activeChapterIdx,
          totalChapters: this.activeChapters.length,
          activeChapterId: chapter.id,
          charProgress: 0,
          persona,
          rate,
          pitch,
        };
        this.notifySpeechState();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
          const charIndex = event.charIndex;
          const totalLength = chapter.text.length || 1;
          const progress = Math.min(100, Math.round((charIndex / totalLength) * 100));

          this.currentSpeechState.currentWordIndex = charIndex;
          this.currentSpeechState.charProgress = progress;
          this.notifySpeechState();
        }
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
        // Step to next chapter with soft confirmation chime
        this.activeChapterIdx++;
        if (this.activeChapterIdx < this.activeChapters.length) {
          this.playTone('chapter');
          setTimeout(() => {
            if (this.currentSpeechState.isSpeaking) {
              this.speakCurrentChapter(persona, rate, pitch);
            }
          }, 200);
        } else {
          this.playTone('finish');
          this.currentSpeechState = {
            ...this.currentSpeechState,
            isSpeaking: false,
            isPaused: false,
            charProgress: 100,
          };
          this.currentUtterance = null;
          this.notifySpeechState();
        }
      };

      utterance.onerror = () => {
        this.currentSpeechState = {
          ...this.currentSpeechState,
          isSpeaking: false,
          isPaused: false,
          charProgress: 0,
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

  /**
   * Speaks single block of text (backward compatibility).
   */
  public speakBriefing(text: string, persona: VoicePersona = 'tactical', rate: number = 1.0, pitch: VoicePitch = 'natural'): void {
    this.speakChapters(
      [
        {
          id: 'summary',
          title: 'Executive Briefing',
          icon: '⚡',
          text,
        },
      ],
      0,
      persona,
      rate,
      pitch
    );
  }

  public jumpToChapter(chapterIdx: number): void {
    if (this.activeChapters.length > 0) {
      this.playTone('chapter');
      this.activeChapterIdx = Math.max(0, Math.min(chapterIdx, this.activeChapters.length - 1));
      this.stopSpeechOnly();
      setTimeout(() => {
        this.speakCurrentChapter(
          this.currentSpeechState.persona,
          this.currentSpeechState.rate,
          this.currentSpeechState.pitch
        );
      }, 100);
    }
  }

  private stopSpeechOnly(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public stopSpeech(): void {
    this.stopSpeechOnly();
    this.currentSpeechState = {
      ...this.currentSpeechState,
      isSpeaking: false,
      isPaused: false,
      currentWordIndex: 0,
      charProgress: 0,
    };
    this.currentUtterance = null;
    this.notifySpeechState();
  }

  public pauseSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.currentSpeechState.isSpeaking) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    }
  }

  public resumeSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.currentSpeechState.isPaused) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
  }

  public setPersona(persona: VoicePersona): void {
    this.currentSpeechState.persona = persona;
    try {
      localStorage.setItem(STORAGE_KEY_VOICE_PERSONA, persona);
    } catch {}
    this.notifySpeechState();
  }

  public setPitch(pitch: VoicePitch): void {
    this.currentSpeechState.pitch = pitch;
    try {
      localStorage.setItem(STORAGE_KEY_VOICE_PITCH, pitch);
    } catch {}
    this.notifySpeechState();
  }

  public setRate(rate: number): void {
    this.currentSpeechState.rate = rate;
    this.notifySpeechState();
  }
}

export const audioService = new AudioSynthesizer();

export function playTone(type: 'start' | 'step' | 'verdict' | 'error' | 'success' | 'alarm' | 'rebalance' | 'chapter' | 'finish'): void {
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

export function setVolume(volume: number): void {
  audioService.setVolume(volume);
}

export function getVolume(): number {
  return audioService.getVolume();
}

export function speakBriefing(text: string, persona: VoicePersona = 'tactical', rate: number = 1.0, pitch: VoicePitch = 'natural'): void {
  audioService.speakBriefing(text, persona, rate, pitch);
}

export function speakChapters(chapters: BriefingChapter[], startIdx: number = 0, persona?: VoicePersona, rate?: number, pitch?: VoicePitch): void {
  audioService.speakChapters(chapters, startIdx, persona, rate, pitch);
}

export function jumpToChapter(chapterIdx: number): void {
  audioService.jumpToChapter(chapterIdx);
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

export function setVoicePitch(pitch: VoicePitch): void {
  audioService.setPitch(pitch);
}

export function setVoiceRate(rate: number): void {
  audioService.setRate(rate);
}

