import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Loader2,
  Sparkles,
  MapPin,
  X,
  ArrowRight,
  Zap,
  CornerDownLeft,
  Compass,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface PromptBarProps {
  onSubmit: (query: string, city?: string) => void;
  isLoading: boolean;
  defaultCity?: string;
  className?: string;
}

const QUICK_SUGGESTIONS = [
  {
    label: '⛈️ Storm in London',
    city: 'London',
    prompt: 'Severe storm warning expected today. Check transit delays, evaluate flight risk, and plan my full workday with Jira priorities.',
  },
  {
    label: '✈️ Delhi Flight Transit',
    city: 'Delhi',
    prompt: 'Early morning airport transit with dense fog risk. Check flight status, prioritize urgent GitHub PR reviews, and format an executive day briefing.',
  },
  {
    label: '🔥 NYC Sprint Crunch',
    city: 'New York',
    prompt: 'Sprint deadline tonight with 4 high-priority Jira blockers. Schedule 6 hours of deep focus time and alert team via Slack.',
  },
  {
    label: '☀️ Clear Mumbai Day',
    city: 'Mumbai',
    prompt: 'Optimal clear weather today. Schedule in-person collaborative architecture review at the office and afternoon code reviews.',
  },
];

const GLOBAL_CITIES = [
  'Mumbai',
  'Bengaluru',
  'Delhi',
  'Hyderabad',
  'Pune',
  'London',
  'New York',
  'San Francisco',
  'Seattle',
  'Tokyo',
  'Singapore',
];

export const PromptBar: React.FC<PromptBarProps> = ({
  onSubmit,
  isLoading,
  defaultCity = 'Mumbai',
  className = '',
}) => {
  const [prompt, setPrompt] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync defaultCity if changed from parent
  useEffect(() => {
    if (defaultCity && !city) {
      setCity(defaultCity);
    }
  }, [defaultCity]);

  // Global Cmd+K / Ctrl+K keyboard shortcut to focus input
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

  const handleApplySuggestion = (text: string, suggestedCity: string) => {
    setPrompt(text);
    setCity(suggestedCity);
    inputRef.current?.focus();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-surface-card border border-hairline-strong p-5 sm:p-6 shadow-2xl transition-all card-highlight-glow ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Keyboard Shortcut Badge & City Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
              Autonomous Command Prompt
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Natural language constraint engine for weather, transit, meetings & sprint workload
            </p>
          </div>
        </div>

        {/* City Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCityPicker(!showCityPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-active border border-hairline text-xs font-mono text-slate-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-semibold">{city || 'Select City'}</span>
          </button>

          {showCityPicker && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCityPicker(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-card border border-hairline-strong shadow-2xl py-2 z-40 text-xs font-mono">
                <div className="px-3 py-1 text-[10px] uppercase text-slate-400 font-semibold border-b border-hairline mb-1">
                  Target City
                </div>
                {GLOBAL_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCity(c);
                      setShowCityPicker(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-surface-active transition-colors cursor-pointer flex items-center justify-between ${
                      city === c ? 'text-indigo-500 font-bold bg-indigo-500/10' : 'text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{c}</span>
                    {city === c && <span className="text-[10px]">Active</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Spacious Input Field */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type your scenario or goal (e.g. 'I have a critical client presentation in London at 3 PM and 3 blocked Jira tickets. Review weather risks and organize my morning for deep code reviews...')"
            rows={3}
            className="w-full text-sm sm:text-base bg-surface-elevated/90 border border-hairline rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none disabled:opacity-50 leading-relaxed font-sans shadow-inner"
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

        {/* Suggestion Chips & Run Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Quick Scenario Preset Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] text-slate-400 dark:text-gray-500 font-mono hidden md:inline mr-1">
              Suggestions:
            </span>
            {QUICK_SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleApplySuggestion(item.prompt, item.city)}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-active border border-hairline text-[11px] font-mono text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white transition-all whitespace-nowrap cursor-pointer hover:border-indigo-500/30"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Submit Action Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
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
