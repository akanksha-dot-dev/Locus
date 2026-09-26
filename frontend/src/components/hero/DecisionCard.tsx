import React from 'react';
import { DecisionType, RiskLevel } from '../../types';
import { DECISION_CONFIG, RISK_CONFIG } from '../../constants/theme';
import { ScoreGauge } from './ScoreGauge';
import { WeatherCanvas } from './WeatherCanvas';
import { TemperatureCurve } from './TemperatureCurve';
import {
  Building2,
  Home,
  Shuffle,
  Compass,
  Quote,
  Sparkles,
  MapPin,
  Flame,
  Briefcase,
} from 'lucide-react';

export interface DecisionCardProps {
  decision: DecisionType;
  riskLevel: RiskLevel;
  officeReason: string;
  aiSummary: string;
  city: string;
  temperature: number;
  feelsLike: number;
  weatherScore: number;
  weatherCondition: string;
  windSpeed?: number;
  humidity?: number;
  productiveHours: number;
  workloadHours: number;
  hourlyTemps?: number[];
  showTemperatureCurve?: boolean;
  className?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  riskLevel,
  officeReason,
  aiSummary,
  city,
  temperature,
  feelsLike,
  weatherScore,
  weatherCondition,
  windSpeed = 8,
  humidity = 60,
  productiveHours,
  workloadHours,
  hourlyTemps,
  showTemperatureCurve = false,
  className = '',
}) => {
  const decisionCfg = DECISION_CONFIG[decision] || DECISION_CONFIG.undecided;
  const riskCfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;

  const renderVerdictIcon = () => {
    switch (decision) {
      case 'office':
        return <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />;
      case 'hybrid':
        return <Shuffle className="w-7 h-7 sm:w-8 sm:h-8" />;
      case 'wfh':
        return <Home className="w-7 h-7 sm:w-8 sm:h-8" />;
      default:
        return <Compass className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />;
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-surface-card border border-hairline p-5 sm:p-7 shadow-xl transition-all card-highlight-glow ${decisionCfg.glowClass} ${className}`}
    >
      {/* Dynamic atmospheric weather canvas backdrop */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <WeatherCanvas
          condition={weatherCondition}
          temperature={temperature}
          windSpeed={windSpeed}
          humidity={humidity}
        />
      </div>

      {/* Ambient radial lighting */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 space-y-6">
        {/* Header Tag Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AUTONOMOUS VERDICT</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
              <span className="text-slate-800 dark:text-gray-200 font-semibold">{city}</span>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-wider ${riskCfg.bg} ${riskCfg.text} ${riskCfg.border}`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{riskCfg.label}</span>
          </div>
        </div>

        {/* Illuminated Verdict Display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-3.5 px-5 py-3.5 rounded-2xl border text-xl sm:text-3xl font-extrabold tracking-tight shadow-md backdrop-blur-md ${decisionCfg.badgeBg} ${decisionCfg.border} ${decisionCfg.textColor}`}
            >
              <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex-shrink-0">
                {renderVerdictIcon()}
              </div>
              <span className="drop-shadow-xs">{decisionCfg.label}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 max-w-xl font-normal leading-relaxed">
              {decisionCfg.sublabel}
            </p>
          </div>

          {/* Inline circular score gauge */}
          <div className="hidden sm:flex flex-shrink-0 items-center justify-center p-3 rounded-2xl bg-surface-elevated/80 border border-hairline backdrop-blur-md shadow-xs">
            <ScoreGauge score={weatherScore} size={94} strokeWidth={8} showLabel={false} />
          </div>
        </div>

        {/* AI Commute Disruption & Schedule Rationale Quote */}
        <div className="relative rounded-xl bg-surface-elevated/80 border border-hairline p-4 sm:p-5 backdrop-blur-md shadow-xs">
          <Quote className="w-6 h-6 text-indigo-400/30 absolute top-3 right-3 pointer-events-none" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold block mb-1.5">
            Synthesis & Commute Rationale
          </span>
          <p className="text-sm sm:text-base text-slate-900 dark:text-gray-100 font-medium italic leading-relaxed">
            "{officeReason || 'Analyzing commute risks against workload commitments...'}"
          </p>
          {aiSummary && (
            <p className="mt-2.5 pt-2.5 border-t border-hairline text-xs text-slate-600 dark:text-gray-400 leading-normal">
              {aiSummary}
            </p>
          )}
        </div>

        {/* Key Metrics HUD Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Temperature & Feels Like */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-hairline flex flex-col justify-between shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-gray-400">Current Temp</span>
            <div className="my-1">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                {temperature}°C
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
              Feels <strong className="text-slate-800 dark:text-gray-200">{feelsLike}°C</strong>
            </span>
          </div>

          {/* Weather Score */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-hairline flex flex-col justify-between shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-gray-400">Weather Quality</span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400 tabular-nums tracking-tight">
                {weatherScore}
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-gray-500">/ 100</span>
            </div>
            <span className="text-[11px] font-mono text-slate-700 dark:text-gray-300 truncate">
              {weatherCondition}
            </span>
          </div>

          {/* Productive Hours */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-hairline flex flex-col justify-between shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-gray-400">Focus Hours</span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                {productiveHours.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-gray-500">/ 8h</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400/90 flex items-center gap-1 font-medium">
              <Flame className="w-3 h-3" /> Focus Cap.
            </span>
          </div>

          {/* Workload Hours */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-hairline flex flex-col justify-between shadow-xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-gray-400">Total Workload</span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
                {workloadHours.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-gray-500">hrs</span>
            </div>
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400/90 flex items-center gap-1 font-medium">
              <Briefcase className="w-3 h-3" /> Jira + GitHub
            </span>
          </div>
        </div>

        {/* Optional 24H Temperature Curve inside Decision Card */}
        {showTemperatureCurve && (
          <div className="pt-2">
            <TemperatureCurve
              currentTemp={temperature}
              hourlyTemps={hourlyTemps}
              feelsLike={feelsLike}
              condition={weatherCondition}
            />
          </div>
        )}
      </div>
    </div>
  );
};
