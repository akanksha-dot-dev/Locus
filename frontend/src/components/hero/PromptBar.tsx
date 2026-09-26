import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  MapPin,
  X,
  Zap,
  Loader2,
  Globe,
  CornerDownLeft,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface PromptBarProps {
  onSubmit: (query: string, city?: string) => void;
  isLoading: boolean;
  defaultCity?: string;
  className?: string;
}

const GLOBAL_POPULAR_CITIES = [
  'Mumbai',
  'Bengaluru',
  'Delhi',
  'London',
  'New York',
  'San Francisco',
  'Tokyo',
  'Paris',
  'Berlin',
  'Singapore',
  'Sydney',
];

export const PromptBar: React.FC<PromptBarProps> = ({
  onSubmit,
  isLoading,
  defaultCity = 'Mumbai',
  className = '',
}) => {
  const [prompt, setPrompt] = useState('');
  const [city, setCity] = useState(defaultCity);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync defaultCity if changed from parent
  useEffect(() => {
    if (defaultCity && !city) {
      setCity(defaultCity);
    }
  }, [defaultCity]);

  // Global Cmd+K / Ctrl+K keyboard shortcut to focus prompt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt.trim(), city.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Dynamic suggestions based on currently selected or typed city
  const activeCityName = city.trim() || 'your city';
  const dynamicSuggestions = [
    {
      label: `⛈️ Storm in ${activeCityName}`,
      prompt: `Severe storm warning in ${activeCityName}. Review commute delays, evaluate transit risk, and prioritize deep code reviews with my Jira tickets.`,
    },
    {
      label: `☀️ Clear Day in ${activeCityName}`,
      prompt: `Favorable clear weather in ${activeCityName}. Plan an in-person office day with collaborative sprint planning and team architecture reviews.`,
    },
    {
      label: `✈️ Transit & Travel in ${activeCityName}`,
      prompt: `Airport departure and early commute in ${activeCityName}. Check flight delays, triage urgent GitHub PRs, and format an executive day schedule.`,
    },
    {
      label: `🚨 Production Fire`,
      prompt: `Urgent incident response and sprint crunch. Schedule uninterrupted focus blocks, prioritize critical blockers, and notify team via Slack.`,
    },
  ];

  return (
    <div
      className={`rounded-3xl bg-surface-card border border-hairline-strong p-4 sm:p-5 shadow-2xl transition-all card-highlight-glow ${className}`}
    >
      {/* ── 1. Top Header: Title & Direct City Input ────────────── */}
      <div className="space-y-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
              Autonomous Command Prompt
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Natural language constraint engine for weather, transit, meetings & sprint workload
            </p>
          </div>
        </div>

        {/* ── 2. Direct Editable Target City Input ─────────────────── */}
        <div className="p-3 rounded-2xl bg-surface-elevated/70 border border-hairline space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-[11px] font-mono text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-500" />
              <span>Target City</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">(type any city name)</span>
            </label>

            {/* Quick city presets */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 mr-1 hidden md:inline">
                Presets:
              </span>
              {GLOBAL_POPULAR_CITIES.slice(0, 7).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                    city.toLowerCase() === c.toLowerCase()
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'bg-surface-card hover:bg-surface-active text-slate-600 dark:text-gray-300 border border-hairline'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isLoading}
              placeholder="Enter any city worldwide (e.g. London, Paris, Tokyo, Mumbai, Berlin, Sydney, Singapore...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-card border border-hairline text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner disabled:opacity-50"
            />
            {city && !isLoading && (
              <button
                type="button"
                onClick={() => setCity('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                title="Clear city"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Main Natural Language Prompt Field ─────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={`Type your custom scenario or goal (e.g. 'I have a critical presentation in ${activeCityName} at 3 PM and 3 blocked Jira tickets. Review weather risks and organize my morning for deep code reviews...')`}
            rows={3}
            className="w-full text-xs sm:text-sm bg-surface-elevated/90 border border-hairline rounded-2xl p-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none disabled:opacity-50 leading-relaxed font-sans shadow-inner"
          />

          {prompt && !isLoading && (
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear prompt"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── 4. Suggestion Chips & Run Action Bar ───────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Quick Scenario Preset Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {dynamicSuggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setPrompt(item.prompt)}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-active border border-hairline text-[11px] font-mono text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white transition-all whitespace-nowrap cursor-pointer hover:border-indigo-500/30"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Submit Action Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 hidden sm:inline">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-hairline">⌘+Enter</kbd>
            </span>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading || !prompt.trim()}
              icon={
                isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Zap className="w-4 h-4 text-white" />
                )
              }
              className="px-5 font-mono text-xs shadow-md glow-indigo cursor-pointer font-bold tracking-wide"
            >
              {isLoading ? 'Synthesizing Plan...' : 'Run Autonomous Plan'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
