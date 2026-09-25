import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import { TerminalLogFeed } from './TerminalLogFeed';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Terminal as TerminalIcon,
  ChevronUp,
  ChevronDown,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Activity,
  Maximize2,
  Minimize2,
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

  const totalLogs = terminalLogs.length;

  return (
    <aside
      aria-label="Telemetry and System Audit Logs"
      className="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-6 sm:w-[680px] z-50 pointer-events-auto"
    >
      <div className="rounded-t-xl sm:rounded-xl bg-surface-elevated/95 border border-hairline-strong shadow-2xl backdrop-blur-md overflow-hidden">
        {/* ── Collapsed Dock Bar ───────────────────────────────────── */}
        <header className="px-4 py-2.5 flex items-center justify-between gap-3 border-b border-hairline bg-surface-card/70 select-none">
          {/* Left: Terminal Toggle & Count Badge */}
          <button
            type="button"
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className="flex items-center gap-2.5 text-xs font-mono text-gray-200 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="p-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 group-hover:glow-cyan transition-all">
              <TerminalIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold tracking-wider uppercase text-[11px]">
              Telemetry Stream
            </span>
            <Badge
              variant="cyan"
              size="sm"
              className="text-[10px] font-mono py-0 px-1.5 tabular-nums"
            >
              {totalLogs}
            </Badge>
          </button>

          {/* Right: Status Pill, Mute, Clear & Expand / Minimize */}
          <div className="flex items-center gap-2">
            {/* WS Status Badge */}
            <div className="hidden sm:flex items-center">
              {wsStatus === 'connected' ? (
                <Badge variant="emerald" size="sm" dot pulse className="text-[10px]">
                  WS LIVE
                </Badge>
              ) : wsStatus === 'reconnecting' ? (
                <Badge variant="amber" size="sm" dot pulse className="text-[10px]">
                  RECONNECTING
                </Badge>
              ) : (
                <Badge variant="default" size="sm" className="text-[10px]">
                  OFFLINE
                </Badge>
              )}
            </div>

            {/* Audio Mute Switch */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute cyber audio cues' : 'Mute cyber audio cues'}
              className="p-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>

            {/* Clear Logs Button */}
            {isTerminalOpen && totalLogs > 0 && (
              <button
                type="button"
                onClick={clearLogs}
                title="Clear audit logs"
                className="p-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Open / Close Toggle Button */}
            <button
              type="button"
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className="p-1.5 rounded-md hover:bg-white/5 text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono"
            >
              {isTerminalOpen ? (
                <>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                  <span className="hidden sm:inline">Minimize</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* ── Slide-up Monospace Terminal Feed ─────────────────────── */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '340px', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden flex flex-col"
            >
              <TerminalLogFeed logs={terminalLogs} maxHeight="h-[300px]" autoScroll={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
};
