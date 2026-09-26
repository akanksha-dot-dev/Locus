import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import { TerminalLogFeed } from './TerminalLogFeed';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Terminal as TerminalIcon,
  ChevronDown,
  Trash2,
  Volume2,
  VolumeX,
  Activity,
  X,
  Copy,
  Check,
  Filter,
} from 'lucide-react';

export const TelemetryDrawer: React.FC = () => {
  const {
    terminalLogs,
    isTerminalOpen,
    setIsTerminalOpen,
    clearLogs,
    isMuted,
    setIsMuted,
    wsStatus,
  } = useAgent();

  const [activeFilter, setActiveFilter] = useState<'all' | 'nodes' | 'audit' | 'errors'>('all');
  const [copied, setCopied] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTerminalOpen) {
        setIsTerminalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTerminalOpen, setIsTerminalOpen]);

  const totalLogs = terminalLogs.length;

  const filteredLogs = React.useMemo(() => {
    if (activeFilter === 'all') return terminalLogs;
    if (activeFilter === 'nodes') return terminalLogs.filter((l) => l.type === 'tool' || l.source.toLowerCase().includes('node'));
    if (activeFilter === 'audit') return terminalLogs.filter((l) => l.type === 'verdict' || l.type === 'ws');
    if (activeFilter === 'errors') return terminalLogs.filter((l) => l.type === 'error');
    return terminalLogs;
  }, [terminalLogs, activeFilter]);

  const handleCopyLogs = () => {
    const logText = terminalLogs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard?.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ── 1. Unobtrusive Floating Status Capsule (Bottom Right) ──── */}
      {!isTerminalOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={() => setIsTerminalOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface-card/90 hover:bg-surface-card border border-hairline-strong shadow-2xl backdrop-blur-md text-xs font-mono text-slate-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-white transition-all cursor-pointer group hover:scale-105 active:scale-95"
            title="Open real-time telemetry inspector"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">
              Telemetry
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold tabular-nums">
              {totalLogs}
            </span>
          </button>
        </div>
      )}

      {/* ── 2. Silky Right Slide-Over Inspector Drawer ──────────────── */}
      <AnimatePresence>
        {isTerminalOpen && (
          <aside
            aria-label="Telemetry and System Audit Logs"
            className="fixed inset-0 z-50 overflow-hidden pointer-events-none"
          >
            {/* Click-away backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTerminalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
            />

            {/* Slide-out Panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                className="w-screen max-w-md sm:max-w-lg bg-surface-card border-l border-hairline-strong shadow-2xl flex flex-col backdrop-blur-xl"
              >
                {/* Drawer Header */}
                <header className="p-4 sm:p-5 border-b border-hairline bg-surface-elevated/80 flex items-center justify-between gap-3 select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-500">
                      <TerminalIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                          Telemetry & Audit Feed
                        </h3>
                        <Badge variant="cyan" size="sm" className="text-[10px] font-mono tabular-nums">
                          {totalLogs} events
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-gray-400">
                        Live LangGraph state machine & Swytchcode tool execution log
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Sound toggle */}
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      title={isMuted ? 'Unmute cyber audio' : 'Mute cyber audio'}
                      className="p-1.5 rounded-lg hover:bg-surface-active text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-500" />
                      )}
                    </button>

                    {/* Copy logs */}
                    {totalLogs > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyLogs}
                        title="Copy logs to clipboard"
                        className="p-1.5 rounded-lg hover:bg-surface-active text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Clear logs */}
                    {totalLogs > 0 && (
                      <button
                        type="button"
                        onClick={clearLogs}
                        title="Clear logs"
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Close Drawer */}
                    <button
                      type="button"
                      onClick={() => setIsTerminalOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-surface-active text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ml-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </header>

                {/* Sub-header Filter Tabs */}
                <div className="px-4 py-2 bg-surface-elevated/40 border-b border-hairline flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1">
                    {(['all', 'nodes', 'audit', 'errors'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        className={`px-2 py-1 rounded-md capitalize transition-colors cursor-pointer text-[11px] ${
                          activeFilter === filter
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{wsStatus === 'connected' ? 'WebSocket Live' : 'Polling'}</span>
                  </div>
                </div>

                {/* Main Streaming Feed */}
                <div className="flex-1 overflow-hidden p-3 bg-surface-base/90 font-mono text-xs">
                  <TerminalLogFeed logs={filteredLogs} />
                </div>

                {/* Drawer Footer */}
                <footer className="p-3 bg-surface-elevated border-t border-hairline flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Press <kbd className="px-1 py-0.5 rounded bg-surface-card border border-hairline">Esc</kbd> to close</span>
                  <span>Streaming @ ws://localhost:8000/ws</span>
                </footer>
              </motion.div>
            </div>
          </aside>
        )}
      </AnimatePresence>
    </>
  );
};
