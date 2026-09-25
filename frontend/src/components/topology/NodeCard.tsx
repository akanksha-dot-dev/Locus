import React from 'react';
import { TopologyNode } from '../../types';
import { NODE_STATUS_CONFIG } from '../../constants/theme';
import {
  SunMedium,
  Mail,
  CheckSquare,
  GitPullRequest,
  BrainCircuit,
  BookOpen,
  MessageSquare,
  Send,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';

export interface NodeCardProps {
  node: TopologyNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isSelected = false,
  onClick,
  className = '',
}) => {
  const statusCfg = NODE_STATUS_CONFIG[node.status] || NODE_STATUS_CONFIG.idle;

  const renderServiceIcon = () => {
    const props = { className: 'w-4 h-4' };
    switch (node.iconName) {
      case 'CloudSun':
      case 'SunMedium':
        return <SunMedium {...props} className="w-4 h-4 text-amber-400" />;
      case 'Mail':
        return <Mail {...props} className="w-4 h-4 text-rose-400" />;
      case 'CheckSquare':
        return <CheckSquare {...props} className="w-4 h-4 text-blue-400" />;
      case 'GitPullRequest':
        return <GitPullRequest {...props} className="w-4 h-4 text-purple-400" />;
      case 'BrainCircuit':
        return <BrainCircuit {...props} className="w-4 h-4 text-indigo-400" />;
      case 'BookOpen':
        return <BookOpen {...props} className="w-4 h-4 text-gray-200" />;
      case 'MessageSquare':
        return <MessageSquare {...props} className="w-4 h-4 text-emerald-400" />;
      case 'Send':
        return <Send {...props} className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity {...props} className="w-4 h-4 text-indigo-400" />;
    }
  };

  const renderStatusIcon = () => {
    switch (node.status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'fallback':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'running':
        return (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
        );
      default:
        return <span className="w-2 h-2 rounded-full bg-gray-600" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between overflow-hidden ${
        isSelected
          ? 'bg-surface-active border-indigo-500 ring-2 ring-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
          : `${statusCfg.border} ${statusCfg.glow} bg-surface-card hover:bg-surface-active hover:border-hairline-hover`
      } ${className}`}
    >
      {/* Active Pulse Ring Effect for running node */}
      {node.status === 'running' && (
        <div className="absolute inset-0 border-2 border-indigo-500/60 rounded-xl animate-pulse pointer-events-none" />
      )}

      {/* Top Header: Step # and Status Indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-gray-500 group-hover:text-gray-400 font-semibold">
          STEP #{node.index + 1}
        </span>
        <div className="flex items-center gap-1.5">{renderStatusIcon()}</div>
      </div>

      {/* Node Brand & Title */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-surface-base border border-hairline flex-shrink-0">
            {renderServiceIcon()}
          </div>
          <span className="text-xs font-bold text-gray-100 group-hover:text-white truncate">
            {node.name}
          </span>
        </div>
        <p className="text-[10px] font-mono text-gray-400 truncate pl-0.5">
          {node.service}
        </p>
      </div>

      {/* Bottom Footer: Status Label & Latency */}
      <div className="pt-2 border-t border-hairline flex items-center justify-between text-[10px] font-mono">
        <span
          className={`px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
            node.status === 'running'
              ? 'text-cyan-400 bg-cyan-500/10'
              : node.status === 'completed'
              ? 'text-emerald-400'
              : node.status === 'fallback'
              ? 'text-amber-400'
              : 'text-gray-500'
          }`}
        >
          {statusCfg.label}
        </span>

        {node.latencyMs ? (
          <span className="text-cyan-400 tabular-nums flex items-center gap-0.5 font-medium">
            <Clock className="w-2.5 h-2.5 text-cyan-500" />
            {node.latencyMs}ms
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </div>
    </div>
  );
};
