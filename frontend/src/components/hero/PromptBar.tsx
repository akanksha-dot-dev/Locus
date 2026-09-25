import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, CornerDownLeft, Sparkles, MapPin, X } from 'lucide-react';
import { Button } from '../common/Button';

export interface PromptBarProps {
  onSubmit: (query: string, city?: string) => void;
  isLoading: boolean;
  defaultCity?: string;
  className?: string;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSubmit,
  isLoading,
  defaultCity = '',
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApplySuggestion = (text: string, suggestedCity?: string) => {
    setPrompt(text);
    if (suggestedCity) setCity(suggestedCity);
    inputRef.current?.focus();
  };

  return (
    <div
      className={`rounded-2xl bg-surface-card border border-hairline p-4 space-y-3 shadow-lg select-none ${className}`}
    >
      {/* Header bar with shortcut guide */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Natural Language Autonomous Prompt
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-hairline text-gray-300">
            ⌘/Ctrl + K
          </kbd>
          <span>to focus</span>
        </div>
      </div>

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Describe your schedule, commute, flight, or workload (e.g. 'I have an early 6 AM flight from Delhi, check fog risks and plan my day...')"
            rows={2}
            className="w-full text-xs sm:text-sm bg-surface-elevated border border-hairline rounded-xl p-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none disabled:opacity-50 leading-relaxed font-sans"
          />

          {prompt && !isLoading && (
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="absolute top-2.5 right-2.5 p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              title="Clear prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom controls: City Override + Submit Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* City override input */}
          <div className="relative flex-1">
            <MapPin className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isLoading}
              placeholder="City override (e.g. London, Delhi, NYC)"
              className="w-full text-xs font-mono bg-surface-elevated border border-hairline rounded-xl pl-8 pr-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Action button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={!prompt.trim()}
            icon={!isLoading && <CornerDownLeft className="w-3.5 h-3.5" />}
            className="text-xs sm:text-sm font-semibold flex-shrink-0"
          >
            {isLoading ? 'Synthesizing Plan...' : 'Execute Swarm'}
          </Button>
        </div>
      </form>

      {/* Quick Suggestion Pills */}
      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-[10px] font-mono text-gray-500 uppercase mr-1">Suggestions:</span>
        <button
          type="button"
          onClick={() =>
            handleApplySuggestion(
              'Severe storm warning in London. I have outdoor client meetings. Check risks and suggest WFH schedule.',
              'London'
            )
          }
          className="px-2 py-0.5 rounded-lg bg-surface-elevated border border-hairline text-gray-400 hover:text-white hover:border-hairline-hover transition-colors truncate max-w-[200px]"
        >
          🌧️ Storm in London
        </button>
        <button
          type="button"
          onClick={() =>
            handleApplySuggestion(
              'Early morning flight from Delhi at 6 AM. Need to reach terminal by 4 AM. Check fog & weather delays.',
              'Delhi'
            )
          }
          className="px-2 py-0.5 rounded-lg bg-surface-elevated border border-hairline text-gray-400 hover:text-white hover:border-hairline-hover transition-colors truncate max-w-[200px]"
        >
          ✈️ 6 AM Delhi Flight
        </button>
        <button
          type="button"
          onClick={() =>
            handleApplySuggestion(
              'Sprint crunch in NYC: Check high priority Jira backlog and GitHub PRs, balance workload vs weather.',
              'New York'
            )
          }
          className="px-2 py-0.5 rounded-lg bg-surface-elevated border border-hairline text-gray-400 hover:text-white hover:border-hairline-hover transition-colors truncate max-w-[200px]"
        >
          ⚡ Sprint Crunch NYC
        </button>
      </div>
    </div>
  );
};
