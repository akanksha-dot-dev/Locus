import React, { useState } from 'react';
import { useAgent } from '../../context/AgentContext';
import { downloadICS, downloadMarkdown, downloadJSON, generateMarkdown } from '../../services/export';
import { playTone } from '../../services/audio';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Download,
  Calendar,
  FileText,
  FileJson,
  ExternalLink,
  Check,
  Sparkles,
  Share2,
  Copy,
} from 'lucide-react';

export const ArtifactExportBar: React.FC = () => {
  const { activeAgentResponse, scheduleBlocks } = useAgent();
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = (format: 'ics' | 'md' | 'json') => {
    setDownloadingFormat(format);
    playTone('step');

    try {
      if (format === 'ics') {
        downloadICS(activeAgentResponse, scheduleBlocks);
      } else if (format === 'md') {
        downloadMarkdown(activeAgentResponse, scheduleBlocks);
      } else if (format === 'json') {
        downloadJSON(activeAgentResponse, scheduleBlocks);
      }
    } finally {
      setTimeout(() => {
        setDownloadingFormat(null);
      }, 800);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const mdContent = generateMarkdown(activeAgentResponse, scheduleBlocks);
      await navigator.clipboard.writeText(mdContent);
      setCopied(true);
      playTone('step');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const hasNotionUrl = Boolean(activeAgentResponse.notion_page_url);
  const notionUrl = activeAgentResponse.notion_page_url || 'https://notion.so';

  return (
    <Card surface="card" className="p-4 sm:p-5 shadow-lg relative overflow-hidden card-highlight-glow">
      <div className="absolute inset-0 bg-grid-subtle opacity-15 pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info: Instant Artifact Generator Description */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 flex-shrink-0 shadow-inner">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Instant Artifact Generator
              </h3>
              <Badge variant="cyan" size="sm" className="font-mono text-[10px]">
                100% Client-Side
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-sans">
              1-Click multi-channel synthesis export: standard RFC 5545 iCalendar, Markdown briefing, and JSON
            </p>
          </div>
        </div>

        {/* Right Buttons: 1-Click Export Actions & Notion Deep Link */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* iCalendar (.ics) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownload('ics')}
            icon={<Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
            title="Download RFC 5545 iCalendar file"
            className="text-xs hover:border-indigo-500/40 shadow-xs"
          >
            {downloadingFormat === 'ics' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3 h-3" /> Downloaded
              </span>
            ) : (
              'Export .ics'
            )}
          </Button>

          {/* Formatted Markdown (.md) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownload('md')}
            icon={<FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
            title="Download formatted executive briefing as Markdown"
            className="text-xs hover:border-emerald-500/40 shadow-xs"
          >
            {downloadingFormat === 'md' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3 h-3" /> Downloaded
              </span>
            ) : (
              'Export .md'
            )}
          </Button>

          {/* Structured JSON (.json) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownload('json')}
            icon={<FileJson className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
            title="Download full structured JSON snapshot"
            className="text-xs hover:border-amber-500/40 shadow-xs"
          >
            {downloadingFormat === 'json' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3 h-3" /> Downloaded
              </span>
            ) : (
              'Export .json'
            )}
          </Button>

          {/* Copy Briefing to Clipboard */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyMarkdown}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            title="Copy Markdown briefing to clipboard"
            className="text-xs"
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>

          {/* Notion Database Page Deep Link */}
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer font-sans shadow-xs ${
              activeAgentResponse.notion_logged
                ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white border-slate-900 dark:border-white/20 active:scale-[0.98]'
                : 'bg-surface-elevated border-hairline text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="font-semibold">Notion</span>
            <ExternalLink className="w-3 h-3 text-slate-400 dark:text-gray-400" />
          </a>
        </div>
      </div>
    </Card>
  );
};
