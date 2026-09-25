import React, { useMemo } from 'react';
import { useAgent } from '../../context/AgentContext';
import { NodeCard } from './NodeCard';
import { TopologyConnector } from './DataPacket';
import { NodeInspector } from './NodeInspector';
import { Layers, Activity, CheckCircle2, Clock, Sparkles } from 'lucide-react';
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

  // Calculate total pipeline latency across completed nodes
  const totalLatencyMs = useMemo(() => {
    return nodes.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
  }, [nodes]);

  const completedCount = useMemo(() => {
    return nodes.filter((n) => n.status === 'completed').length;
  }, [nodes]);

  return (
    <div
      className={`rounded-2xl bg-surface-card border border-hairline p-5 sm:p-6 space-y-5 shadow-xl select-none ${className}`}
    >
      {/* Topology Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
              8-Node LangGraph Swarm Topology
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Sequential tool execution graph: OpenWeather → Gmail → Jira → GitHub → Gemini AI → Notion → Slack → Resend
          </p>
        </div>

        {/* Live Pipeline Telemetry Status */}
        <div className="flex items-center gap-3">
          {totalLatencyMs > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-hairline text-xs font-mono text-cyan-400 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-cyan-500" />
              <span>{totalLatencyMs}ms total</span>
            </div>
          )}

          {isRunning ? (
            <Badge variant="indigo" size="md" dot pulse>
              <Activity className="w-3.5 h-3.5 mr-1" />
              EXECUTING NODE #{activeNodeIndex >= 0 ? activeNodeIndex + 1 : 1}
            </Badge>
          ) : completedCount === nodes.length ? (
            <Badge variant="emerald" size="md" dot>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              ALL 8 NODES SYNCHRONIZED
            </Badge>
          ) : (
            <Badge variant="default" size="md" dot>
              <Sparkles className="w-3.5 h-3.5 mr-1 text-gray-400" />
              STANDBY ({completedCount}/8 COMPLETED)
            </Badge>
          )}
        </div>
      </div>

      {/* 8-Node Swarm Visual Track */}
      {/* On desktop (lg+), render horizontal pipeline with connectors */}
      <div className="hidden lg:flex items-center justify-between gap-1 py-2 overflow-x-auto">
        {nodes.map((node, idx) => {
          const isSelected = selectedNode?.id === node.id;
          const isNextActive =
            isRunning && (idx === activeNodeIndex || idx === activeNodeIndex - 1);
          const isLinkCompleted =
            completedNodes.includes(node.id) &&
            idx + 1 < nodes.length &&
            completedNodes.includes(nodes[idx + 1].id);

          return (
            <React.Fragment key={node.id}>
              <div className="flex-1 min-w-[120px] max-w-[145px]">
                <NodeCard
                  node={node}
                  isSelected={isSelected}
                  onClick={() => setSelectedNode(node)}
                />
              </div>

              {/* Connector line with animated glowing data packet between nodes */}
              {idx < nodes.length - 1 && (
                <TopologyConnector
                  isActive={Boolean(isNextActive)}
                  isCompleted={isLinkCompleted}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* On mobile / tablet (below lg), render clean 2x4 responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:hidden gap-3">
        {nodes.map((node) => {
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

      {/* Footer Helper Note */}
      <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-gray-500">
        <span>Click any node card to inspect raw step payload and execution telemetry</span>
        <span className="tabular-nums">Completed: {completedCount} / {nodes.length}</span>
      </div>

      {/* Interactive Node Inspector Modal Drawer */}
      {selectedNode && (
        <NodeInspector node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
};
