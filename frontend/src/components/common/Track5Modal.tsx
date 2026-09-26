import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  X,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Code,
  CheckCircle2,
  Terminal,
  FileText,
  Workflow,
} from 'lucide-react';
import { Badge } from './Badge';

interface Track5ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Track5Modal: React.FC<Track5ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-surface-card border border-hairline-strong rounded-3xl shadow-2xl overflow-hidden z-10 my-8 text-content-primary"
        >
          {/* Header Banner */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-r from-indigo-900/40 via-cyan-900/30 to-purple-900/40 border-b border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-surface-elevated/80 hover:bg-surface-active text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Trophy className="w-6 h-6" />
              </div>
              <Badge variant="amber" size="sm" className="font-mono text-xs font-semibold">
                BUILD WITH SWYTCHCODE HACKATHON 2026
              </Badge>
              <Badge variant="indigo" size="sm" className="font-mono text-xs font-semibold">
                TRACK 5: AI REAL WORLD AGENT
              </Badge>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              Locus — Autonomous Incident Command Center & Day Planner
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              An intelligent, context-aware AI agent that synthesizes real-world atmospheric conditions, Gmail calendar commitments, and Jira/GitHub workloads with Gemini 2.5 Flash reasoning to orchestrate automated schedules across Notion, Slack, and Resend.
            </p>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto font-sans">
            {/* 7 Swytchcode Tool Bindings Grid */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono mb-3 flex items-center gap-2">
                <Workflow className="w-4 h-4 text-cyan-500" /> 7 Real-World Swytchcode Tool Bindings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: 'OpenWeather', fn: 'openweather.current.get', desc: 'Real-time weather & 24h diurnal forecast' },
                  { name: 'Google Gmail', fn: 'gmail.messages.list', desc: 'Inbox calendar events, flights & meetings' },
                  { name: 'Atlassian Jira', fn: 'jira.issues.list', desc: 'Sprint tickets & priority work backlog' },
                  { name: 'GitHub', fn: 'github.pullRequests.list', desc: 'PR review queue & stale review alerts' },
                  { name: 'Notion', fn: 'notion.pages.create', desc: 'Executive Day Plan documentation' },
                  { name: 'Slack', fn: 'slack.messages.send', desc: 'Block Kit summary cards to team channels' },
                  { name: 'Resend', fn: 'resend.email.create', desc: 'Responsive HTML executive daily digest' },
                  { name: 'Google Gemini', fn: 'gemini-2.5-flash', desc: 'Multi-source autonomous reasoning core' },
                ].map((tool) => (
                  <div key={tool.name} className="p-3 rounded-xl bg-surface-elevated border border-hairline text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{tool.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <code className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono block mt-0.5 truncate">
                      {tool.fn}
                    </code>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {tool.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Judging Rubric Alignment Table */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Hackathon Judging Rubric Alignment
              </h3>
              <div className="border border-hairline rounded-xl overflow-hidden bg-surface-elevated text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-card border-b border-hairline font-mono text-[11px] text-slate-400">
                    <tr>
                      <th className="p-2.5 font-semibold">Rubric Criteria</th>
                      <th className="p-2.5 font-semibold">Weight</th>
                      <th className="p-2.5 font-semibold">Locus Architecture & Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">Swytchcode Tool Usage</td>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">30%</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">All 7 Swytchcode tool bindings implemented with managed auth, policy guardrails, and audit ledger.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">Technical Implementation</td>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">25%</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">8-node LangGraph DAG state machine, WebSocket live streaming feed, and fail-fast heuristic fallback.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">Innovation & Autonomy</td>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">20%</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">Multi-source constraint solver balancing commute risks against developer sprint workload automatically.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">Production Polish & UX</td>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">15%</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">Dual-theme engine (Dark #090a0f & Light #f8fafc), Manifest V3 Chrome Extension, and 110 automated tests.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">Real-World Utility</td>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">10%</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">1-click RFC 5545 iCalendar sync, Jira backlog triage, and executive briefing delivery across Notion & Slack.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Verification Commands */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" /> 1-Click Verification & Launch
              </h3>
              <div className="p-3 rounded-xl bg-surface-elevated border border-hairline font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Launch All Services:</span>
                  <code className="text-indigo-400 font-bold">START_APP.bat</code>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Run CLI Benchmark:</span>
                  <code className="text-cyan-400">python backend/main.py --demo</code>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Swytchcode Audit:</span>
                  <code className="text-emerald-400">swy audit</code>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-surface-elevated/70 border-t border-hairline flex items-center justify-between text-xs font-mono text-slate-500">
            <span>High-Assurance AI Swarm • Zero-CLS Hydration</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
