import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Zap, Radio, CalendarDays, Briefcase, FileText, LayoutGrid, RotateCcw, Sun, Volume2 } from 'lucide-react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  label: string;
  shortcuts: {
    keys: string[];
    description: string;
    icon?: React.ReactNode;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Navigation',
    shortcuts: [
      {
        keys: ['1'],
        description: 'Go to Command Center',
        icon: <Radio className="w-3 h-3 text-indigo-500" />,
      },
      {
        keys: ['2'],
        description: 'Go to Swarm Pipeline',
        icon: <Zap className="w-3 h-3 text-cyan-500" />,
      },
      {
        keys: ['3'],
        description: 'Go to Day Schedule',
        icon: <CalendarDays className="w-3 h-3 text-emerald-500" />,
      },
      {
        keys: ['4'],
        description: 'Go to Workload Radar',
        icon: <Briefcase className="w-3 h-3 text-amber-500" />,
      },
      {
        keys: ['5'],
        description: 'Go to Artifacts & Dispatch',
        icon: <FileText className="w-3 h-3 text-purple-500" />,
      },
      {
        keys: ['6'],
        description: 'Go to All Sections',
        icon: <LayoutGrid className="w-3 h-3 text-slate-500" />,
      },
    ],
  },
  {
    label: 'Agent & Controls',
    shortcuts: [
      {
        keys: ['⌘', 'K'],
        description: 'Focus command prompt',
        icon: <Zap className="w-3 h-3 text-indigo-500" />,
      },
      {
        keys: ['⌘', 'Enter'],
        description: 'Run autonomous plan',
        icon: <Zap className="w-3 h-3 text-emerald-500" />,
      },
      {
        keys: ['R'],
        description: 'Reset schedule to AI plan',
        icon: <RotateCcw className="w-3 h-3 text-slate-400" />,
      },
      {
        keys: ['B'],
        description: 'Toggle AI Morning Voice Briefing',
        icon: <Radio className="w-3 h-3 text-cyan-400" />,
      },
      {
        keys: ['M'],
        description: 'Toggle audio synthesizer mute',
        icon: <Volume2 className="w-3 h-3 text-cyan-500" />,
      },
      {
        keys: ['T'],
        description: 'Toggle light / dark theme',
        icon: <Sun className="w-3 h-3 text-amber-400" />,
      },
    ],
  },
  {
    label: 'Utility',
    shortcuts: [
      {
        keys: ['?'],
        description: 'Open keyboard shortcuts',
        icon: <Keyboard className="w-3 h-3 text-indigo-400" />,
      },
      {
        keys: ['Esc'],
        description: 'Close any modal / overlay',
        icon: <X className="w-3 h-3 text-slate-400" />,
      },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg bg-surface-card border border-hairline-strong rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scanlines overlay */}
              <div className="scanlines absolute inset-0 pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                    <Keyboard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                      Keyboard Shortcuts
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">
                      Power-user command reference
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-surface-elevated transition-all cursor-pointer"
                  aria-label="Close keyboard shortcuts"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shortcut Groups */}
              <div className="relative z-10 p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-gray-400 font-semibold px-0.5 flex items-center gap-2">
                      <span className="h-px flex-1 bg-hairline bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
                      {group.label}
                      <span className="h-px flex-1 bg-hairline bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
                    </h3>

                    <div className="space-y-1">
                      {group.shortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-elevated transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {shortcut.icon && (
                              <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                {shortcut.icon}
                              </span>
                            )}
                            <span className="text-xs font-sans text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                              {shortcut.description}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, kIdx) => (
                              <React.Fragment key={kIdx}>
                                <kbd className="kbd">{key}</kbd>
                                {kIdx < shortcut.keys.length - 1 && (
                                  <span className="text-[10px] text-slate-400 dark:text-gray-500">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="relative z-10 px-5 py-3 border-t border-hairline bg-surface-elevated/50">
                <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500 text-center">
                  Press <kbd className="kbd">?</kbd> anywhere to toggle this panel •{' '}
                  <kbd className="kbd">Esc</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
