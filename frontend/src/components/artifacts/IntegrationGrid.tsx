import React from 'react';
import { useAgent } from '../../context/AgentContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  CloudSun,
  Mail,
  CheckSquare,
  GitPullRequest,
  BookOpen,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Radio,
  Server,
} from 'lucide-react';

export const IntegrationGrid: React.FC = () => {
  const { activeAgentResponse } = useAgent();

  const integrations = [
    {
      id: 'openweather',
      name: 'OpenWeather',
      type: 'Telemetry API',
      icon: <CloudSun className="w-5 h-5 text-amber-400" />,
      status: 'Connected',
      statusColor: 'emerald' as const,
      detail: `${activeAgentResponse.city}: ${activeAgentResponse.temperature_c}°C, ${activeAgentResponse.weather_condition}`,
      meta: `Score: ${activeAgentResponse.weather_score}/100`,
      iconBg: 'bg-amber-500/10 border-amber-500/25',
    },
    {
      id: 'gmail',
      name: 'Google Gmail',
      type: 'Calendar & Travel',
      icon: <Mail className="w-5 h-5 text-rose-400" />,
      status: activeAgentResponse.has_travel_plans || activeAgentResponse.has_outdoor_plans ? 'Event Triggered' : 'Synced',
      statusColor: 'emerald' as const,
      detail: `${activeAgentResponse.gmail_events?.length || 0} anchor events parsed`,
      meta: activeAgentResponse.has_travel_plans ? '✈️ Flight Detected' : 'No Commute Hazards',
      iconBg: 'bg-rose-500/10 border-rose-500/25',
    },
    {
      id: 'jira',
      name: 'Atlassian Jira',
      type: 'Sprint & Issues',
      icon: <CheckSquare className="w-5 h-5 text-indigo-400" />,
      status: 'Synced',
      statusColor: 'emerald' as const,
      detail: `${activeAgentResponse.jira_tickets?.length || 0} active sprint issues`,
      meta: `~${activeAgentResponse.jira_estimated_hours || 0}h focus load`,
      iconBg: 'bg-indigo-500/10 border-indigo-500/25',
    },
    {
      id: 'github',
      name: 'GitHub API',
      type: 'Code Review & PRs',
      icon: <GitPullRequest className="w-5 h-5 text-cyan-400" />,
      status: 'Synced',
      statusColor: 'emerald' as const,
      detail: `${activeAgentResponse.github_prs?.length || 0} PRs pending review`,
      meta: `~${activeAgentResponse.github_estimated_hours || 0}h review time`,
      iconBg: 'bg-cyan-500/10 border-cyan-500/25',
    },
    {
      id: 'notion',
      name: 'Notion Database',
      type: 'Workspace Sync',
      icon: <BookOpen className="w-5 h-5 text-gray-200" />,
      status: activeAgentResponse.notion_logged ? 'Page Created' : 'Configured',
      statusColor: activeAgentResponse.notion_logged ? ('emerald' as const) : ('default' as const),
      detail: activeAgentResponse.notion_logged ? 'Day plan logged to DB' : 'Ready for dispatch',
      meta: activeAgentResponse.notion_page_url ? 'Deep Link Active' : 'API Token Verified',
      iconBg: 'bg-white/10 border-white/20',
      actionUrl: activeAgentResponse.notion_page_url,
    },
    {
      id: 'slack',
      name: 'Slack Webhook',
      type: 'Incident Alerts',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      status: activeAgentResponse.slack_message_sent ? 'Delivered' : 'Ready',
      statusColor: activeAgentResponse.slack_message_sent ? ('emerald' as const) : ('default' as const),
      detail: '#locus-briefings',
      meta: 'Block Kit Formatted',
      iconBg: 'bg-emerald-500/10 border-emerald-500/25',
    },
    {
      id: 'resend',
      name: 'Resend SMTP',
      type: 'Executive Email',
      icon: <Send className="w-5 h-5 text-purple-400" />,
      status: activeAgentResponse.email_sent ? 'Sent' : 'Ready',
      statusColor: activeAgentResponse.email_sent ? ('emerald' as const) : ('default' as const),
      detail: activeAgentResponse.resend_message_id ? `ID: ${activeAgentResponse.resend_message_id.slice(0, 14)}...` : 'HTML Template Compiled',
      meta: 'React Email Template',
      iconBg: 'bg-purple-500/10 border-purple-500/25',
    },
  ];

  return (
    <Card surface="elevated" className="p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden card-highlight-glow">
      <div className="absolute inset-0 bg-grid-subtle opacity-15 pointer-events-none" />
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
              7-Channel Integration Delivery Matrix
              <Badge variant="emerald" size="sm" className="font-mono text-[10px] py-0 px-1.5" dot>
                ALL 7 HEALTHY
              </Badge>
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              Bi-directional cloud connectors powering autonomous data aggregation & multi-channel delivery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 bg-surface-card/90 px-3 py-1.5 rounded-lg border border-hairline shadow-xs">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>7 / 7 Online</span>
        </div>
      </div>

      {/* ── 7-Service Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-surface-card border border-hairline hover:border-hairline-hover hover:bg-surface-active transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${item.iconBg} flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-gray-200 block truncate group-hover:text-white">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono block">
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <Badge variant={item.statusColor} size="sm" dot className="text-[10px] py-0 px-1.5">
                {item.status}
              </Badge>
            </div>

            <div className="space-y-1 pt-2 border-t border-hairline/60 text-xs">
              <p className="text-gray-300 font-medium truncate text-[11px]">{item.detail}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>{item.meta}</span>
                {item.actionUrl && (
                  <a
                    href={item.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
