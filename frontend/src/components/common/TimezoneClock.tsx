import React, { useState, useEffect } from 'react';
import { Clock, Globe, ChevronDown, Check } from 'lucide-react';

export type TimezoneMode = 'IST' | 'LOCAL' | 'UTC';

interface TimezoneClockProps {
  className?: string;
  onTimezoneChange?: (mode: TimezoneMode) => void;
}

export const TimezoneClock: React.FC<TimezoneClockProps> = ({
  className = '',
  onTimezoneChange,
}) => {
  const [mode, setMode] = useState<TimezoneMode>(() => {
    return (localStorage.getItem('locus_timezone_pref') as TimezoneMode) || 'IST';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      if (mode === 'IST') {
        // Indian Standard Time is UTC+5:30
        const istFormatter = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        const istDateFormatter = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        setTimeString(`${istFormatter.format(now)} IST`);
        setDateString(istDateFormatter.format(now));
      } else if (mode === 'UTC') {
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        setTimeString(`${hours}:${minutes}:${seconds} UTC`);
        const utcDate = new Intl.DateTimeFormat('en-US', {
          timeZone: 'UTC',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        setDateString(utcDate.format(now));
      } else {
        // Local Browser Time
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        setTimeString(`${hours}:${minutes}:${seconds} LOCAL`);
        const localDate = new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        setDateString(localDate.format(now));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const selectMode = (newMode: TimezoneMode) => {
    setMode(newMode);
    localStorage.setItem('locus_timezone_pref', newMode);
    if (onTimezoneChange) onTimezoneChange(newMode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-active border border-hairline text-xs font-mono text-slate-700 dark:text-gray-300 tabular-nums select-none transition-all cursor-pointer shadow-inner group"
        title="Click to toggle timezone (IST, Local, UTC)"
      >
        <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-slate-900 dark:text-white">{timeString || '14:00:00 IST'}</span>
        <span className="text-[10px] text-slate-400 dark:text-gray-500 hidden sm:inline">({dateString})</span>
        <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-surface-card border border-hairline-strong shadow-2xl py-1.5 z-50 text-xs font-mono backdrop-blur-md">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-gray-500 font-semibold border-b border-hairline">
              Select Timezone
            </div>

            <button
              type="button"
              onClick={() => selectMode('IST')}
              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-active transition-colors cursor-pointer ${
                mode === 'IST' ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/5' : 'text-slate-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🇮🇳 IST (UTC+5:30)</span>
              </div>
              {mode === 'IST' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
            </button>

            <button
              type="button"
              onClick={() => selectMode('LOCAL')}
              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-active transition-colors cursor-pointer ${
                mode === 'LOCAL' ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/5' : 'text-slate-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🌐 Local Browser</span>
              </div>
              {mode === 'LOCAL' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
            </button>

            <button
              type="button"
              onClick={() => selectMode('UTC')}
              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-active transition-colors cursor-pointer ${
                mode === 'UTC' ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/5' : 'text-slate-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>⏱️ UTC (Zulu Standard)</span>
              </div>
              {mode === 'UTC' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
