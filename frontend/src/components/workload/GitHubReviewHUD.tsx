import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import { GitHubPR, GitHubIssue } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  GitPullRequest,
  AlertTriangle,
  Clock,
  ExternalLink,
  GitBranch,
  CircleDot,
  User,
  CheckCircle2,
  FileCode,
} from 'lucide-react';

export interface GitHubReviewHUDProps {
  prs?: GitHubPR[];
  issues?: GitHubIssue[];
  totalReviewHours?: number;
}

export const GitHubReviewHUD: React.FC<GitHubReviewHUDProps> = ({
  prs: propPRs,
  issues: propIssues,
  totalReviewHours: propHours,
}) => {
  const { activeAgentResponse } = useAgent();

  const prs = propPRs ?? activeAgentResponse.github_prs ?? [];
  const issues = propIssues ?? activeAgentResponse.github_issues ?? [];
  const estimatedHours = propHours ?? activeAgentResponse.github_estimated_hours ?? 0;

  const [activeTab, setActiveTab] = useState<'prs' | 'issues'>('prs');
  const [filterStaleOnly, setFilterStaleOnly] = useState(false);

  // Stale PRs count (>2 days old)
  const staleCount = useMemo(() => {
    return prs.filter((pr) => pr.days_old > 2).length;
  }, [prs]);

  const displayedPRs = useMemo(() => {
    if (filterStaleOnly) {
      return prs.filter((pr) => pr.days_old > 2);
    }
    return prs;
  }, [prs, filterStaleOnly]);

  // Generates deterministic avatar colors from handle
  const getAvatarGradient = (handle: string) => {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-cyan-500 to-blue-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
    ];
    let hash = 0;
    for (let i = 0; i < handle.length; i++) {
      hash = handle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  return (
    <Card surface="elevated" className="p-5 space-y-4">
      {/* ── HUD Header with Review Hours & Stale Warning ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
              GitHub Review HUD
              <Badge variant="cyan" size="sm" className="font-mono tabular-nums text-[10px]">
                {prs.length} PRS
              </Badge>
            </h3>
            <p className="text-xs text-gray-400">
              Open pull requests and assigned issue review queues
            </p>
          </div>
        </div>

        {/* Total Review Hours Metric */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card border border-hairline">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-gray-400">Review Est:</span>
          <span className="text-sm font-bold font-mono text-cyan-300 tabular-nums">
            ~{estimatedHours.toFixed(1)}h
          </span>
        </div>
      </div>

      {/* ── Tab Switcher & Stale Warning Chip ──────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-card border border-hairline">
          <button
            type="button"
            onClick={() => setActiveTab('prs')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'prs'
                ? 'bg-surface-elevated text-cyan-300 border border-hairline shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Pull Requests ({prs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('issues')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'issues'
                ? 'bg-surface-elevated text-cyan-300 border border-hairline shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Assigned Issues ({issues.length})
          </button>
        </div>

        {activeTab === 'prs' && staleCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterStaleOnly(!filterStaleOnly)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStaleOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/15'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>
              {staleCount} Overdue PR{staleCount > 1 ? 's' : ''} (&gt;2d)
            </span>
          </button>
        )}
      </div>

      {/* ── Tab 1: Open Pull Requests ──────────────────────────────── */}
      {activeTab === 'prs' && (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          <AnimatePresence>
            {displayedPRs.length === 0 ? (
              <div className="py-8 text-center rounded-lg bg-surface-card/40 border border-dashed border-hairline space-y-1">
                <p className="text-xs text-gray-400 font-medium">No pull requests awaiting review</p>
                <p className="text-[11px] text-gray-500">Your code review inbox is completely cleared.</p>
              </div>
            ) : (
              displayedPRs.map((pr) => {
                const author = pr.author || (typeof pr.user === 'object' ? (pr.user as any)?.login : pr.user) || 'dev';
                const isStale = pr.days_old > 2;
                const hours = pr.estimated_hours || pr.est_hours || pr.review_hours || 1.5;
                const isDraft = pr.is_draft || pr.draft || false;
                const initials = author.slice(0, 2).toUpperCase();

                return (
                  <motion.div
                    key={pr.number}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-xl border transition-all ${
                      isStale
                        ? 'bg-surface-card border-rose-500/30 hover:border-rose-500/50'
                        : 'bg-surface-card border-hairline hover:border-hairline-hover hover:bg-surface-active'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Top Bar: PR number, status badge, and Stale Warning Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-cyan-500" />
                            #{pr.number}
                          </span>

                          {/* Draft / Open Status Pill */}
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium ${
                              isDraft
                                ? 'bg-gray-800 text-gray-400 border-gray-700'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {isDraft ? 'Draft' : 'Open'}
                          </span>
                        </div>

                        {/* Stale Warning Badge (>2 days old) */}
                        {isStale && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            ⚠️ {pr.days_old} days stale - Review Overdue
                          </span>
                        )}
                      </div>

                      {/* PR Title */}
                      <p className="text-xs font-medium text-gray-200 leading-snug line-clamp-2">
                        {pr.title}
                      </p>

                      {/* Bottom Info: Author Avatar/Handle and Review Estimate */}
                      <div className="flex items-center justify-between pt-1 border-t border-hairline text-[11px] font-mono text-gray-400">
                        {/* Author Avatar Pill */}
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(
                              author
                            )} flex items-center justify-center text-[9px] font-bold text-white shadow-xs`}
                          >
                            {initials}
                          </div>
                          <span className="text-gray-300">@{author}</span>
                          <span className="text-gray-500">· {pr.days_old}d ago</span>
                        </div>

                        {/* Review Hours Estimate with Tabular Numbers */}
                        <div className="flex items-center gap-1 text-cyan-400 tabular-nums">
                          <Clock className="w-3 h-3" />
                          <span>~{hours}h review</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Tab 2: Assigned Open Repository Issues ─────────────────── */}
      {activeTab === 'issues' && (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {issues.length === 0 ? (
            <div className="py-8 text-center rounded-lg bg-surface-card/40 border border-dashed border-hairline space-y-1">
              <p className="text-xs text-gray-400 font-medium">No assigned repository issues</p>
              <p className="text-[11px] text-gray-500">All assigned issues are resolved or triaged.</p>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.number}
                className="p-3 rounded-xl bg-surface-card border border-hairline hover:border-hairline-hover hover:bg-surface-active transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-gray-300">Issue #{issue.number}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                    {issue.state || 'open'}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-200 line-clamp-2">{issue.title}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-hairline">
                  <span>Age: {issue.days_old} days open</span>
                  {issue.author && <span>Assigned by @{issue.author}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
};
