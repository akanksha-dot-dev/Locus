import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import { JiraTicket, PriorityLevel } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  CheckSquare,
  Clock,
  Search,
  ExternalLink,
  Flame,
  AlertOctagon,
  ArrowUpRight,
  ChevronRight,
  Filter,
} from 'lucide-react';

export interface JiraSprintHUDProps {
  tickets?: JiraTicket[];
  totalHours?: number;
}

export const JiraSprintHUD: React.FC<JiraSprintHUDProps> = ({
  tickets: propTickets,
  totalHours: propHours,
}) => {
  const { activeAgentResponse } = useAgent();

  const tickets = propTickets ?? activeAgentResponse.jira_tickets ?? [];
  const estimatedHours = propHours ?? activeAgentResponse.jira_estimated_hours ?? 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Priority Chip Styling Rule:
  // Highest / High in Crimson, Medium in Amber, Low / Lowest in Emerald
  const getPriorityStyle = (priority: PriorityLevel) => {
    switch (priority) {
      case 'Highest':
      case 'High':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
        };
      case 'Medium':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'Low':
      case 'Lowest':
      default:
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
    }
  };

  const getStatusStyle = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('progress')) {
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    }
    if (lower.includes('review')) {
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    }
    if (lower.includes('done') || lower.includes('closed')) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (lower.includes('block')) {
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
    return 'bg-white/5 text-gray-300 border-white/10';
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.status.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (priorityFilter === 'High') {
        return t.priority === 'Highest' || t.priority === 'High';
      }
      if (priorityFilter === 'Medium') {
        return t.priority === 'Medium';
      }
      if (priorityFilter === 'Low') {
        return t.priority === 'Low' || t.priority === 'Lowest';
      }
      return true;
    });
  }, [tickets, searchQuery, priorityFilter]);

  return (
    <Card surface="elevated" className="p-5 space-y-4">
      {/* ── HUD Header with Total Sprint Hours Counter ────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
              Jira Sprint HUD
              <Badge variant="indigo" size="sm" className="font-mono tabular-nums text-[10px]">
                {tickets.length} ACTIVE
              </Badge>
            </h3>
            <p className="text-xs text-gray-400">
              Active sprint workload and critical issue velocity tracker
            </p>
          </div>
        </div>

        {/* Total Sprint Hours Metric */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card border border-hairline">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs text-gray-400">Sprint Est:</span>
          <span className="text-sm font-bold font-mono text-indigo-300 tabular-nums">
            ~{estimatedHours.toFixed(1)}h
          </span>
        </div>
      </div>

      {/* ── Search & Priority Filter Controls ──────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search key, summary, or status..."
            className="w-full text-xs bg-surface-card border border-hairline rounded-lg pl-8 pr-3 py-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Priority Filter Chips */}
        <div className="flex items-center gap-1">
          {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                priorityFilter === p
                  ? p === 'High'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : p === 'Medium'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : p === 'Low'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/10 text-white border-white/25'
                  : 'bg-surface-card border-hairline text-gray-400 hover:text-gray-200 hover:bg-surface-active'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Interactive Issue Cards ─────────────────────────────────── */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        <AnimatePresence>
          {filteredTickets.length === 0 ? (
            <div className="py-8 text-center rounded-lg bg-surface-card/40 border border-dashed border-hairline space-y-1">
              <p className="text-xs text-gray-400 font-medium">No Jira sprint tickets match your filter</p>
              <p className="text-[11px] text-gray-500">All sprint tasks in this category are completed or clear.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const priorityStyle = getPriorityStyle(ticket.priority);
              const statusStyle = getStatusStyle(ticket.status);
              const isExpanded = expandedKey === ticket.key;

              return (
                <motion.div
                  key={ticket.key}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpandedKey(isExpanded ? null : ticket.key)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isExpanded
                      ? 'bg-surface-elevated border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-md'
                      : 'bg-surface-card border-hairline hover:border-hairline-hover hover:bg-surface-active'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Ticket Key, Priority Chip, and Status Pill */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1">
                          {ticket.key}
                          <ArrowUpRight className="w-3 h-3 opacity-60" />
                        </span>

                        {/* Priority Chip (Crimson for High/Highest, Amber for Medium, Emerald for Low) */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold select-none ${priorityStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                          {ticket.priority}
                        </span>

                        {/* Status Pill */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium ${statusStyle}`}
                        >
                          {ticket.status}
                        </span>

                        {ticket.issue_type && (
                          <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                            [{ticket.issue_type}]
                          </span>
                        )}
                      </div>

                      {/* Ticket Summary */}
                      <p className="text-xs font-medium text-gray-200 leading-snug line-clamp-2">
                        {ticket.summary}
                      </p>
                    </div>

                    {/* Estimated Hours Counter Badge */}
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-indigo-300 tabular-nums bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                        {ticket.estimated_hours}h
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 mt-0.5">estimate</span>
                    </div>
                  </div>

                  {/* Expanded Detail Tray */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-2.5 border-t border-hairline text-xs space-y-2 text-gray-300"
                    >
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-gray-500">Board:</span> Atlassian Sprint Q3
                        </div>
                        <div>
                          <span className="text-gray-500">Allocation:</span> Primary Focus
                        </div>
                      </div>
                      <div className="p-2 rounded bg-surface-base border border-hairline text-[11px] text-gray-400">
                        💡 Sprint Advisor: Focus on this ticket during morning high-velocity slots before midday syncs.
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};
