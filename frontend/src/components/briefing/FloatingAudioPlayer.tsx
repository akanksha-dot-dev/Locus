import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  audioService,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  jumpToChapter,
  SpeechState,
  subscribeSpeech,
  playTone,
} from '../../services/audio';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  SkipForward,
  RotateCcw,
  Sparkles,
  Radio,
  ChevronUp,
} from 'lucide-react';

export const FloatingAudioPlayer: React.FC = () => {
  const [speechState, setSpeechState] = useState<SpeechState>(() => audioService.getSpeechState());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSpeech((state) => {
      setSpeechState(state);
      if (state.isSpeaking) {
        setIsVisible(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!isVisible || !speechState.isSpeaking) {
    return null;
  }

  const handlePlayPause = () => {
    if (speechState.isPaused) {
      playTone('step');
      resumeSpeech();
    } else {
      playTone('step');
      pauseSpeech();
    }
  };

  const handleNextChapter = () => {
    if (speechState.currentChapterIndex < speechState.totalChapters - 1) {
      jumpToChapter(speechState.currentChapterIndex + 1);
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-2.5 px-4 rounded-2xl bg-surface-card/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl font-mono text-xs card-highlight-glow"
      >
        {/* Animated Cyber Transmitter Icon */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <Radio className="w-4 h-4 text-cyan-500 animate-pulse" />
        </div>

        {/* Chapter Info */}
        <div className="flex flex-col min-w-[120px] max-w-[180px]">
          <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
            {speechState.activeChapterId ? `CH ${speechState.currentChapterIndex + 1}: ${speechState.activeChapterId.toUpperCase()}` : 'AI BRIEFING'}
          </span>
          <div className="w-full bg-surface-elevated h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full transition-all duration-150"
              style={{ width: `${Math.max(5, speechState.charProgress)}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 border-l border-hairline pl-2.5">
          <button
            type="button"
            onClick={handlePlayPause}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow-xs"
            title={speechState.isPaused ? 'Resume' : 'Pause'}
          >
            {speechState.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {speechState.totalChapters > 1 && (
            <button
              type="button"
              onClick={handleNextChapter}
              disabled={speechState.currentChapterIndex >= speechState.totalChapters - 1}
              className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-active text-slate-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer transition-all shadow-xs"
              title="Next Chapter"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playTone('step');
              stopSpeech();
            }}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer transition-all shadow-xs"
            title="Stop Audio"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleScrollToTop}
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-active text-slate-400 hover:text-white cursor-pointer transition-all shadow-xs ml-1"
            title="Scroll to Briefing HUD"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
