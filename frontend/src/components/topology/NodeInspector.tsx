import React, { useState, useEffect } from 'react';
import { TopologyNode } from '../../types';
import { NODE_STATUS_CONFIG } from '../../constants/theme';
import { Button } from '../common/Button';
import {
  X,
  Copy,
  Check,
  Clock,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface NodeInspectorProps {
  node: TopologyNode | null;
  onClose: () => void;
  className?: string;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onClose,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const statusCfg = NODE_STATUS_CONFIG[node.status] || NODE_STATUS_CONFIG.idle;

  const handleCopy = () => {
    const payloadStr = JSON.stringify(
      {
        node_id: node.id,
        node_name: node.name,
        service: node.service,
        status: node.status,
        latency_ms: node.latencyMs,
        payload: node.payload || {},
      },
      null,
      2
    );
    navigator.clipboard?.writeText(payloadStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Associated tool name helper
  const getToolCallName = (nodeId: string) => {
    switch (nodeId) {
      case 'weather':
        return 'openweather.current.get + openweather.forecast.hourly';
      case 'gmail':
        return 'gmail.messages.list + gmail.messages.get';
      case 'jira':
        return 'jira.search.jql (sprint = active)';
      case 'github':
        return 'github.pullRequests.list + github.issues.list';
      case 'ai_advisor':
        return 'gemini-1.5-flash.generateContent (Decision Engine)';
      case 'notion':
        return 'notion.pages.create (Day Plan Database)';
      case 'slack':
        return 'slack.chat.postMessage (Block Kit Dispatch)';
      case 'resend':
        return 'resend.emails.send (Executive Day Briefing)';
      default:
        return 'langgraph.tool_node.invoke';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface-card border border-hairline-strong shadow-2xl overflow-hidden select-text ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-hairline flex items-center justify-between bg-surface-elevated/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white">
                  {node.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-hairline text-gray-300">
                  STEP #{node.index + 1}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">{node.service}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${statusCfg.badge}`}
            >
              {statusCfg.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-surface-elevated border border-hairline">
              <span className="text-[10px] text-gray-500 block uppercase">Execution Latency</span>
              <span className="text-cyan-400 font-semibold tabular-nums flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-cyan-500" />
                {node.latencyMs ? `${node.latencyMs} ms` : '—'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-elevated border border-hairline">
              <span className="text-[10px] text-gray-500 block uppercase">LangGraph Node ID</span>
              <span className="text-indigo-400 font-semibold mt-0.5 block truncate">
                {node.id}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-elevated border border-hairline col-span-2 sm:col-span-1">
              <span className="text-[10px] text-gray-500 block uppercase">Service Adapter</span>
              <span className="text-emerald-400 font-semibold mt-0.5 block truncate">
                {node.service}
              </span>
            </div>
          </div>

          {/* Description Callout */}
          <div className="p-3 rounded-xl bg-surface-base border border-hairline text-xs text-gray-300 space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-500 font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" /> Swarm Role & Logic
            </span>
            <p className="leading-relaxed">{node.description}</p>
          </div>

          {/* Tool Invocation Record */}
          <div className="p-3 rounded-xl bg-surface-base border border-hairline text-xs space-y-1 font-mono">
            <span className="text-[10px] uppercase text-gray-500 font-semibold flex items-center gap-1">
              <Terminal className="w-3 h-3 text-cyan-400" /> Registered Tool Call
            </span>
            <p className="text-cyan-300 text-[11px] truncate">
              {getToolCallName(node.id)}
            </p>
          </div>

          {/* Payload Raw Data Inspector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Step Output Payload
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                icon={copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                className="text-[11px] h-7 px-2"
              >
                {copied ? 'Copied' : 'Copy JSON'}
              </Button>
            </div>

            <div className="rounded-xl bg-surface-base border border-hairline p-3 font-mono text-[11px] text-gray-300 max-h-56 overflow-y-auto">
              {node.payload ? (
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(node.payload, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500 italic py-4 text-center">
                  Node payload is idle. Run a prompt or scenario to inspect live execution telemetry.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-5 border-t border-hairline flex items-center justify-between bg-surface-elevated/40 text-xs">
          <span className="text-gray-500 font-mono text-[10px]">
            LangGraph Swarm State Machine v2.0
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};
