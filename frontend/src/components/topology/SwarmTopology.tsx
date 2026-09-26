import React, { useState, useMemo } from 'react';
import { useAgent } from '../../context/AgentContext';
import { NodeCard } from './NodeCard';
import { NodeInspector } from './NodeInspector';
import {
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart2,
  GitBranch,
  ArrowRight,
  Zap,
  ShieldCheck,
  Server,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface SwarmTopologyProps {
  className?: string;
}

export const SwarmTopology: React.FC<SwarmTopologyProps> = ({ className = '' }) => {
  const {
    nodes,
    isRunning,
    activeNodeIndex,
    completedNodes,
    selectedNode,
    setSelectedNode,
  } = useAgent();

  const [viewMode, setViewMode] = useState<'pipeline' | 'gantt'>('pipeline');

  // Calculate total pipeline latency across completed nodes
  const totalLatencyMs = useMemo(() => {
    return nodes.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
  }, [nodes]);

  const completedCount = useMemo(() => {
    return nodes.filter((n) => n.status === 'completed').length;
  }, [nodes]);

  // Group 8 nodes into 4 functional cognitive stages
  const stages = useMemo(() => {
    return [
      {
        id: 'stage-1',
        title: 'Phase 1: Ingestion Sensors',
        subtitle: 'Atmospheric conditions & calendar commitments',
        color: 'from-amber-500/10 to-rose-500/10 border-amber-500/20 text-amber-500',
        nodeIds: ['weather', 'gmail'],
      },
      {
        id: 'stage-2',
        title: 'Phase 2: Workload Engine',
        subtitle: 'Sprint tickets & pull request review queue',
        color: 'from-blue-500/10 to-purple-500/10 border-blue-500/20 text-blue-500',
        nodeIds: ['jira', 'github'],
      },
      {
        id: 'stage-3',
        title: 'Phase 3: Autonomous AI Core',
        subtitle: 'Multi-source constraint solver (Gemini 2.5 Flash)',
        color: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/25 text-indigo-500',
        nodeIds: ['gemini'],
      },
      {
        id: 'stage-4',
        title: 'Phase 4: Multi-Channel Dispatch',
        subtitle: 'Executive Notion page, Slack alerts & Resend digest',
        color: 'from-emerald-500/10 to-cyan-500/10 border-emerald-500/20 text-emerald-500',
        nodeIds: ['notion', 'slack', 'resend'],
      },
    ];
  }, []);

  return (
    <div
      className={`rounded-3xl bg-surface-card border border-hairline-strong p-6 sm:p-7 space-y-6 shadow-xl select-none card-highlight-glow ${className}`}
    >
      {/* ── Topology Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  8-Node LangGraph Swarm Pipeline
                </h2>
                <Badge variant="indigo" size="sm" className="font-mono text-[10px]">
                  Track 5 Multi-Agent DAG
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-sans">
                Autonomous directed acyclic state machine orchestrating 7 Swytchcode tool integrations
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Pipeline Flow vs Gantt Latency */}
          <div className="flex items-center p-1 rounded-xl bg-surface-elevated border border-hairline text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'pipeline'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Pipeline Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'gantt'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Latency Waterfall</span>
            </button>
          </div>

          {/* Latency counter */}
          {totalLatencyMs > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-hairline text-xs font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-cyan-500" />
              <span className="font-semibold">{totalLatencyMs}ms total latency</span>
            </div>
          )}

          {/* Status Badge */}
          {isRunning ? (
            <Badge variant="indigo" size="md" dot pulse className="font-mono text-xs">
              <Activity className="w-3.5 h-3.5 mr-1" />
              EXECUTING NODE #{activeNodeIndex >= 0 ? activeNodeIndex + 1 : 1}
            </Badge>
          ) : completedCount === nodes.length ? (
            <Badge variant="emerald" size="md" dot className="font-mono text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              ALL 8 NODES SYNCHRONIZED
            </Badge>
          ) : (
            <Badge variant="default" size="md" dot className="font-mono text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-slate-400" />
              STANDBY ({completedCount}/8 COMPLETED)
            </Badge>
          )}
        </div>
      </div>

      {/* ── View 1: 4-Phase Neural Pipeline Visualizer ───────────────── */}
      {viewMode === 'pipeline' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {stages.map((stage, stageIdx) => {
              const stageNodes = nodes.filter((n) => stage.nodeIds.includes(n.id));
              const isStageActive = stageNodes.some((n) => n.status === 'running');
              const isStageComplete = stageNodes.every((n) => n.status === 'completed');
              const stageLatency = stageNodes.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);

              return (
                <div
                  key={stage.id}
                  className={`relative flex flex-col justify-between p-4 rounded-2xl bg-surface-elevated/70 border transition-all ${
                    isStageActive
                      ? 'border-indigo-500/80 shadow-lg glow-indigo bg-indigo-500/5'
                      : isStageComplete
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-hairline'
                  }`}
                >
                  {/* Stage Header */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isStageComplete ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : isStageActive ? (
                          <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-gray-600" />
                        )}
                        {stage.title}
                      </span>
                      {stageLatency > 0 && (
                        <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
                          {stageLatency}ms
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-1">
                      {stage.subtitle}
                    </p>
                  </div>

                  {/* Stage Nodes List */}
                  <div className="space-y-2.5 flex-1">
                    {stageNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <NodeCard
                          key={node.id}
                          node={node}
                          isSelected={isSelected}
                          onClick={() => setSelectedNode(node)}
                        />
                      );
                    })}
                  </div>

                  {/* Connector indicator for next stage */}
                  {stageIdx < stages.length - 1 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-surface-card border border-hairline items-center justify-center text-slate-400 shadow-sm">
                      <ArrowRight className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Click any tool card to inspect raw step JSON, headers & latencies
            </span>
            <span>Deterministic DAG • Zero Credential Code</span>
          </div>
        </div>
      ) : (
        /* ── View 2: Execution Latency Gantt Chart ─────────────────── */
        <div className="space-y-4 p-4 rounded-2xl bg-surface-elevated/70 border border-hairline">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>Tool / Service</span>
            <span>Sub-Second Execution Latency (ms)</span>
          </div>

          <div className="space-y-2">
            {nodes.map((node) => {
              const latency = node.latencyMs || 80;
              const maxLatency = Math.max(...nodes.map((n) => n.latencyMs || 100), 2000);
              const percentage = Math.max(Math.min((latency / maxLatency) * 100, 100), 6);

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-active transition-colors cursor-pointer text-xs font-mono"
                >
                  <span className="w-32 font-semibold text-slate-800 dark:text-gray-200 truncate">
                    {node.name}
                  </span>

                  <div className="flex-1 h-5 bg-surface-card rounded-md overflow-hidden relative border border-hairline">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${
                        node.status === 'completed'
                          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                          : node.status === 'running'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-slate-300 dark:bg-gray-700'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-16 text-right tabular-nums text-slate-600 dark:text-gray-300 font-bold">
                    {node.status === 'completed' ? `${latency}ms` : node.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Node Inspector Modal ────────────────────────────── */}
      <NodeInspector
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};
