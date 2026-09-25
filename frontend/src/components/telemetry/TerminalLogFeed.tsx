import React, { useState, useEffect, useRef } from 'react';
import { TerminalLog } from '../../types';
import { Badge } from '../common/Badge';
import {
  Terminal as TerminalIcon,
  Clock,
  ArrowDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ChevronRight,
  Code2,
  Copy,
  Check,
} from 'lucide-react';

export interface TerminalLogFeedProps {
  logs: TerminalLog[];
  maxHeight?: string;
  autoScroll?: boolean;
}

export const TerminalLogFeed: React.FC<TerminalLogFeedProps> = ({
  logs,
  maxHeight = 'h-72',
  autoScroll = true,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'tool' | 'ws' | 'verdict' | 'error'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    return log.type === filterType;
  });

  // Handle auto-scroll to bottom
  useEffect(() => {
    if (!autoScroll || userScrolledUp) return;
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, userScrolledUp]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setUserScrolledUp(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setUserScrolledUp(false);
    }
  };

  const handleCopyPayload = (log: TerminalLog) => {
    navigator.clipboard.writeText(JSON.stringify(log.payload || log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getTypeStyle = (type: TerminalLog['type']) => {
    switch (type) {
      case 'tool':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'ws':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'verdict':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'error':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  return (
    <div className="relative flex flex-col h-full font-mono text-xs select-text">
      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-surface-card/80 border-b border-hairline text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-400">
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-gray-300">STREAMING AUDIT LOG</span>
          <span className="text-[10px] text-gray-500">({filteredLogs.length} events)</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {(['all', 'tool', 'ws', 'verdict', 'error'] as const).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFilterType(ft)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border transition-all cursor-pointer ${
                filterType === ft
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-surface-elevated border-hairline text-gray-500 hover:text-gray-300'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Log Stream ──────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-3 space-y-1 bg-[#08090a] ${maxHeight}`}
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-600 italic">
            Waiting for live telemetry packets from LangGraph swarm...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const hasPayload = log.payload && Object.keys(log.payload).length > 0;

            return (
              <div
                key={log.id}
                className="group rounded hover:bg-white/[0.03] transition-colors p-1"
              >
                <div className="flex items-start gap-2 leading-relaxed">
                  {/* Timestamp with Tabular Numbers */}
                  <span className="text-gray-500 tabular-nums text-[10px] select-none flex-shrink-0 mt-0.5">
                    [{log.timestamp}]
                  </span>

                  {/* Type / Source Pill */}
                  <span
                    className={`inline-block uppercase text-[9px] px-1.5 py-0.2 rounded border font-semibold select-none flex-shrink-0 ${getTypeStyle(
                      log.type
                    )}`}
                  >
                    {log.source}
                  </span>

                  {/* Message Body */}
                  <span className="text-gray-200 flex-1 break-all font-mono leading-normal">
                    {log.message}
                  </span>

                  {/* Sub-second Execution Latency */}
                  {log.latencyMs !== undefined && (
                    <span className="text-cyan-400/90 text-[10px] font-mono tabular-nums flex-shrink-0 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30">
                      {log.latencyMs}ms
                    </span>
                  )}

                  {/* Payload Expand Toggle */}
                  {hasPayload && (
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-gray-500 hover:text-cyan-400 text-[10px] underline flex-shrink-0 cursor-pointer"
                    >
                      {isExpanded ? 'Hide' : 'Payload'}
                    </button>
                  )}
                </div>

                {/* Expanded JSON Payload Drawer */}
                {isExpanded && hasPayload && (
                  <div className="mt-2 p-2.5 rounded bg-surface-card border border-hairline text-[10px] text-gray-300 relative">
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-hairline/60 text-gray-400">
                      <span>Payload Inspector</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPayload(log)}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === log.id ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-cyan-200/90">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Floating Resume Auto-Scroll Button ─────────────────────── */}
      {userScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 right-4 px-2.5 py-1 rounded-full bg-cyan-600/90 hover:bg-cyan-500 text-white text-[11px] font-mono shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all active:scale-95"
        >
          <ArrowDown className="w-3 h-3 animate-bounce" />
          <span>Resume Auto-Scroll</span>
        </button>
      )}
    </div>
  );
};
