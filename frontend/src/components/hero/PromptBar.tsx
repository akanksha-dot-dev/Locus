import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  X,
  Zap,
  Loader2,
  Globe,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface PromptBarProps {
  onSubmit: (query: string, city?: string) => void;
  isLoading: boolean;
  defaultCity?: string;
  defaultMinimized?: boolean;
  className?: string;
}

const GLOBAL_POPULAR_CITIES = [
  'Gurugram',
  'Bengaluru',
  'Delhi',
  'Mumbai',
  'London',
  'New York',
  'San Francisco',
  'Tokyo',
  'Paris',
  'Berlin',
  'Sydney',
  'Trivandrum',
  'Singapore',
];

export const PromptBar: React.FC<PromptBarProps> = ({
  onSubmit,
  isLoading,
  defaultCity = 'Gurugram',
  defaultMinimized = false,
  className = '',
}) => {
  const [prompt, setPrompt] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
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
        if (isMinimized) {
          setIsMinimized(false);
        }
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMinimized]);

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

  // Dynamic sample scenarios tailored to the typed/selected city
  const activeCityName = city.trim() || 'your city';
  const dynamicSuggestions = [
    {
      id: 'storm',
      icon: '⛈️',
      title: 'Storm Warning',
      badge: activeCityName,
      prompt: `Severe storm warning in ${activeCityName}. Review commute delays, evaluate transit risk, and prioritize deep code reviews with my Jira tickets.`,
      themeHover: 'hover:border-indigo-500/60',
      activeBorder: 'border-indigo-500 ring-1 ring-indigo-500/30',
    },
    {
      id: 'clear',
      icon: '☀️',
      title: 'Clear Office Day',
      badge: activeCityName,
      prompt: `Favorable clear weather in ${activeCityName}. Plan an in-person office day with collaborative sprint planning and team architecture reviews.`,
      themeHover: 'hover:border-emerald-500/60',
      activeBorder: 'border-emerald-500 ring-1 ring-emerald-500/30',
    },
    {
      id: 'airport',
      icon: '✈️',
      title: 'Airport Transit',
      badge: activeCityName,
      prompt: `Airport departure and early commute in ${activeCityName}. Check flight delays, triage urgent GitHub PRs, and format an executive day schedule.`,
      themeHover: 'hover:border-cyan-500/60',
      activeBorder: 'border-cyan-500 ring-1 ring-cyan-500/30',
    },
    {
      id: 'crunch',
      icon: '🚨',
      title: 'Production Crunch',
      badge: activeCityName,
      prompt: `Critical sprint blockers and urgent review in ${activeCityName}. Schedule 6h deep focus blocks, triage high-priority PRs, and alert team via Slack.`,
      themeHover: 'hover:border-amber-500/60',
      activeBorder: 'border-amber-500 ring-1 ring-amber-500/30',
    },
  ];

  return (
    <div
      className={`rounded-3xl bg-surface-card border border-hairline-strong p-4 sm:p-6 shadow-2xl transition-all card-highlight-glow relative overflow-hidden ${className}`}
    >
      {/* ── 1. Header: Title, Description, Active City & Minimize/Expand Controls ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => isMinimized && setIsMinimized(false)}
          title={isMinimized ? 'Click to expand' : undefined}
        >
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex-shrink-0 shadow-inner">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Autonomous Command Prompt
              </h3>
              {/* Minimized Pill Preview */}
              {isMinimized && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 font-semibold">
                  <MapPin className="w-3 h-3 text-cyan-500" />
                  <span>{city || 'Global'}</span>
                </span>
              )}
            </div>
            {isMinimized ? (
              <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-xs sm:max-w-md font-sans">
                {prompt.trim() ? `"${prompt}"` : 'Prompt collapsed. Click expand to customize constraints.'}
              </p>
            ) : (
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 font-sans">
                Natural language constraint engine for weather, transit, meetings & sprint workload
              </p>
            )}
          </div>
        </div>

        {/* Right Header Action Bar */}
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated border border-hairline text-[10px] font-mono text-slate-500 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>Gemini 2.5 Flash Swarm</span>
            </div>
          )}

          {/* Quick Run in Minimized Mode */}
          {isMinimized && prompt.trim() && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isLoading}
              onClick={handleSubmit}
              icon={isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              className="text-xs font-mono py-1 px-3"
            >
              Run
            </Button>
          )}

          {/* Minimize / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-xs ${
              isMinimized
                ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-indigo-500/20'
                : 'bg-surface-elevated hover:bg-surface-active text-slate-600 dark:text-gray-300 border-hairline hover:border-hairline-hover'
            }`}
            title={isMinimized ? 'Expand Autonomous Command Prompt' : 'Minimize Autonomous Command Prompt'}
          >
            {isMinimized ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expand Prompt</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Minimize</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. Collapsible Body Container ─────────────────────────── */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden pt-4 space-y-4"
          >
            {/* Target City Section (Direct Input + Popular Chips) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-surface-elevated/70 border border-hairline space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Target City & Location Constraint</span>
                </label>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                  Type any city worldwide or select below
                </span>
              </div>

              {/* City Input with Globe Icon & Clear Action */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Globe className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isLoading}
                  placeholder="Type any city worldwide (e.g. Gurugram, Bengaluru, London, Paris, Tokyo, Mumbai, Berlin, Seattle...)"
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-card border border-hairline text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner disabled:opacity-50"
                />
                {city && !isLoading && (
                  <button
                    type="button"
                    onClick={() => setCity('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    title="Clear city"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick popular city presets (wrapped cleanly, zero horizontal scrollbar) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 mr-1 flex items-center gap-1">
                  Popular:
                </span>
                {GLOBAL_POPULAR_CITIES.map((c) => {
                  const isSelected = city.toLowerCase().trim() === c.toLowerCase().trim();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap border ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-xs'
                          : 'bg-surface-card hover:bg-surface-active text-slate-600 dark:text-gray-300 border-hairline hover:border-indigo-500/40'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Natural Language Prompt Field */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder={`Type your custom scenario or goal (e.g. 'I have a critical presentation in ${activeCityName} at 3 PM and 3 blocked Jira tickets. Review weather risks and organize my morning for deep code reviews...')`}
                  rows={3}
                  className="w-full text-xs sm:text-sm bg-surface-elevated/80 dark:bg-[#10121b] border border-hairline rounded-2xl p-4 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all resize-none disabled:opacity-50 leading-relaxed font-sans shadow-inner"
                />

                {prompt && !isLoading && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Clear prompt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dedicated Sample Scenarios Section (100% VISIBLE, ZERO OVERFLOW) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sample Scenarios (Click to Load)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500">
                    4 Scenarios Ready
                  </span>
                </div>

                {/* Responsive Grid — ALL 4 SCENARIOS FULLY VISIBLE WITH ZERO OVERFLOW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {dynamicSuggestions.map((item) => {
                    const isSelected = prompt.trim() === item.prompt.trim();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPrompt(item.prompt)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer group shadow-xs hover:shadow-md min-w-0 overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? `bg-surface-active shadow-md ${item.activeBorder}`
                            : `bg-surface-elevated/70 hover:bg-surface-active border-hairline ${item.themeHover}`
                        }`}
                      >
                        <div className="min-w-0 w-full">
                          {/* Header: Icon + Title + City Pill */}
                          <div className="flex items-center justify-between gap-1.5 min-w-0 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-base flex-shrink-0">{item.icon}</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate font-sans">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card border border-hairline text-slate-600 dark:text-gray-300 flex-shrink-0 truncate max-w-[90px]">
                              {item.badge}
                            </span>
                          </div>

                          {/* Prompt preview (2 lines, clean, zero overflow) */}
                          <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {item.prompt}
                          </p>
                        </div>

                        {/* Action indicator at bottom */}
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-hairline/60">
                          <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                            {isSelected ? 'Loaded' : 'Preset'}
                          </span>
                          <span
                            className={`text-[11px] font-mono flex items-center gap-1 font-semibold transition-transform ${
                              isSelected
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <span>Active</span>
                                <Check className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>Load</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Execution Bar (Dedicated & Uncramped) */}
              <div className="flex items-center justify-between pt-3 border-t border-hairline/60">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 dark:text-gray-500">
                  <kbd className="px-2 py-0.5 rounded-md bg-surface-elevated border border-hairline text-[10px] font-semibold">
                    ⌘+Enter
                  </kbd>
                  <span className="hidden sm:inline">to synthesize plan</span>
                </div>

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
                  className="px-6 py-2.5 font-mono text-xs shadow-lg glow-indigo cursor-pointer font-bold tracking-wide"
                >
                  {isLoading ? 'Synthesizing Plan...' : 'Run Autonomous Plan'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
