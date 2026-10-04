import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import {
  Building2,
  Home,
  Shuffle,
  Compass,
  TrendingUp,
  Clock,
  CloudSun,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const DailyInsightBanner: React.FC = () => {
  const { activeAgentResponse, isRunning, progressPercentage, completedCount, totalBlocksCount } = useAgent();

  const { decision, city, temperature, weatherScore, productiveHours, officeReason } = {
    decision: activeAgentResponse.go_to_office,
    city: activeAgentResponse.city,
    temperature: activeAgentResponse.temperature_c,
    weatherScore: activeAgentResponse.weather_score,
    productiveHours: activeAgentResponse.estimated_productive_hours,
    officeReason: activeAgentResponse.office_reason,
  };

  const verdictConfig = useMemo(() => {
    switch (decision) {
      case 'office':
        return {
          icon: <Building2 className="w-4 h-4" />,
          label: 'Go to Office',
          gradient: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/20',
          border: 'border-emerald-500/30',
          textColor: 'text-emerald-700 dark:text-emerald-400',
          dotColor: 'bg-emerald-500',
        };
      case 'wfh':
        return {
          icon: <Home className="w-4 h-4" />,
          label: 'Work From Home',
          gradient: 'from-indigo-500/20 via-purple-500/10 to-violet-500/20',
          border: 'border-indigo-500/30',
          textColor: 'text-indigo-700 dark:text-indigo-400',
          dotColor: 'bg-indigo-500',
        };
      case 'hybrid':
        return {
          icon: <Shuffle className="w-4 h-4" />,
          label: 'Hybrid Day',
          gradient: 'from-amber-500/20 via-orange-500/10 to-rose-500/20',
          border: 'border-amber-500/30',
          textColor: 'text-amber-700 dark:text-amber-400',
          dotColor: 'bg-amber-500',
        };
      default:
        return {
          icon: <Compass className="w-4 h-4 animate-spin" />,
          label: 'Analyzing...',
          gradient: 'from-slate-500/10 via-slate-500/5 to-slate-500/10',
          border: 'border-hairline',
          textColor: 'text-slate-600 dark:text-gray-400',
          dotColor: 'bg-slate-400',
        };
    }
  }, [decision]);

  if (isRunning) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-cyan-500/5 to-indigo-500/10 p-4 flex items-center gap-4 overflow-hidden relative"
      >
        {/* Animated shimmer sweep */}
        <div className="absolute inset-0 shimmer pointer-events-none rounded-2xl" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 animate-pulse">
            <Zap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300">
              Autonomous Agent Running
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 font-sans">
              Synthesizing weather, sprint backlog & GitHub load into your optimal day plan...
            </p>
          </div>
          {/* Mini progress bar */}
          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-surface-elevated overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPercentage || 15}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  if (decision === 'undecided') return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`banner-${decision}-${city}`}
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className={`rounded-2xl border ${verdictConfig.border} bg-gradient-to-r ${verdictConfig.gradient} p-4 flex flex-wrap sm:flex-nowrap items-center gap-4`}
      >
        {/* Verdict pill */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 dark:bg-black/20 border ${verdictConfig.border} flex-shrink-0`}>
          <span className={`${verdictConfig.dotColor} w-2 h-2 rounded-full animate-pulse`} />
          <span className={`${verdictConfig.textColor} flex items-center gap-1.5 font-bold text-xs font-mono`}>
            {verdictConfig.icon}
            {verdictConfig.label}
          </span>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-gray-300">
            <CloudSun className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold tabular-nums">{temperature}°C</span>
            <span className="text-slate-400 dark:text-gray-500">· Score</span>
            <span className="font-semibold tabular-nums text-cyan-600 dark:text-cyan-400">{weatherScore}/100</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-gray-300">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold tabular-nums">{productiveHours.toFixed(1)}h</span>
            <span className="text-slate-400 dark:text-gray-500">focus window</span>
          </div>
          {totalBlocksCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-gray-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold tabular-nums">{completedCount}/{totalBlocksCount}</span>
              <span className="text-slate-400 dark:text-gray-500">tasks done</span>
            </div>
          )}
          {officeReason && (
            <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-xs hidden lg:block italic">
              "{officeReason.length > 80 ? officeReason.slice(0, 80) + '…' : officeReason}"
            </p>
          )}
        </div>

        {/* Trend indicator */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-gray-500 flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Synthesized</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
