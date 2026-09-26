import React from 'react';
import { useAgent } from '../../context/AgentContext';
import { JiraSprintHUD } from './JiraSprintHUD';
import { GitHubReviewHUD } from './GitHubReviewHUD';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  Layers,
  CodeXml,
  Flame,
  CheckCircle2,
  Clock,
  Briefcase,
} from 'lucide-react';

export const WorkloadMatrix: React.FC = () => {
  const { activeAgentResponse } = useAgent();

  const jiraHours = activeAgentResponse.jira_estimated_hours || 0;
  const githubHours = activeAgentResponse.github_estimated_hours || 0;
  const totalWorkloadHours = jiraHours + githubHours;
  const jiraTicketCount = activeAgentResponse.jira_tickets?.length || 0;
  const githubPRCount = activeAgentResponse.github_prs?.length || 0;

  return (
    <div className="space-y-4">
      {/* ── Top Summary Ribbon: Combined Dev Capacity ────────────── */}
      <Card surface="card" className="p-4 sm:p-5 border-hairline shadow-lg relative overflow-hidden card-highlight-glow">
        <div className="absolute inset-0 bg-grid-subtle opacity-15 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Dual Workload Command Matrix
                </h2>
                <Badge variant="indigo" size="sm" className="font-mono text-[10px]">
                  Sprint + Code Review
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-sans">
                Real-time engineering load balancing: Atlassian Jira Sprint vs GitHub PR review queue
              </p>
            </div>
          </div>

          {/* Aggregate Metrics Pill Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Total Engineering Hours */}
            <div className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-hairline flex items-center gap-2 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-xs text-slate-500 dark:text-gray-400">Total Dev Load:</span>
              <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300 tabular-nums">
                ~{totalWorkloadHours.toFixed(1)}h
              </span>
            </div>

            {/* Jira Allocation */}
            <div className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-hairline flex items-center gap-2 text-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              <span className="text-slate-500 dark:text-gray-400">Jira:</span>
              <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">
                {jiraTicketCount} items ({jiraHours.toFixed(1)}h)
              </span>
            </div>

            {/* GitHub Allocation */}
            <div className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-hairline flex items-center gap-2 text-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
              <span className="text-slate-500 dark:text-gray-400">GitHub:</span>
              <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-300 tabular-nums">
                {githubPRCount} PRs ({githubHours.toFixed(1)}h)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Coordinated Dual HUD Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JiraSprintHUD />
        <GitHubReviewHUD />
      </div>
    </div>
  );
};
