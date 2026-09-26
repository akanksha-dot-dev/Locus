import React from 'react';
import { PRESET_SCENARIOS } from '../../constants/presets';
import { PresetScenario } from '../../types';
import {
  CloudLightning,
  PlaneTakeoff,
  CodeXml,
  SunMedium,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export interface PresetShowcaseProps {
  onSelectScenario: (scenarioKey: string, city: string) => void;
  isRunning: boolean;
  activeCity?: string;
  className?: string;
}

export const PresetShowcase: React.FC<PresetShowcaseProps> = ({
  onSelectScenario,
  isRunning,
  activeCity,
  className = '',
}) => {
  const renderIcon = (iconName: string, isHazard: boolean) => {
    const props = { className: 'w-4 h-4' };
    switch (iconName) {
      case 'CloudLightning':
        return <CloudLightning {...props} className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case 'PlaneTakeoff':
        return <PlaneTakeoff {...props} className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
      case 'CodeXml':
        return <CodeXml {...props} className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'SunMedium':
        return <SunMedium {...props} className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      default:
        return isHazard ? (
          <CloudLightning {...props} className="w-4 h-4 text-rose-500 dark:text-rose-400" />
        ) : (
          <Sparkles {...props} className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        );
    }
  };

  const getVerdictBadge = (verdict: PresetScenario['expectedVerdict']) => {
    switch (verdict) {
      case 'office':
        return {
          label: 'OFFICE',
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
        };
      case 'wfh':
        return {
          label: 'WFH',
          className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25',
        };
      case 'hybrid':
        return {
          label: 'HYBRID',
          className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
        };
      default:
        return {
          label: 'AUTO',
          className: 'bg-slate-500/10 text-slate-700 dark:text-gray-400 border-slate-500/25',
        };
    }
  };

  return (
    <div className={`space-y-3 select-none ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold text-slate-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Benchmark Scenarios
        </span>
        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">1-Click Live Replay</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {PRESET_SCENARIOS.map((preset) => {
          const isActive =
            activeCity && activeCity.toLowerCase() === preset.city.toLowerCase();
          const verdictInfo = getVerdictBadge(preset.expectedVerdict);

          return (
            <button
              key={preset.id}
              onClick={() => onSelectScenario(preset.key, preset.city)}
              disabled={isRunning}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group flex items-start gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden shadow-xs ${
                isActive
                  ? 'bg-surface-active border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                  : 'bg-surface-elevated/60 border-hairline hover:border-hairline-hover hover:bg-surface-active'
              }`}
            >
              {/* Active Indicator Accent Bar */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              )}

              {/* Icon Container */}
              <div
                className={`p-2 rounded-lg border flex-shrink-0 transition-colors ${
                  isActive
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                    : 'bg-surface-card border-hairline group-hover:border-slate-300 dark:group-hover:border-white/15'
                }`}
              >
                {renderIcon(preset.iconName, preset.expectedVerdict === 'wfh')}
              </div>

              {/* Scenario Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                    {preset.title}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${verdictInfo.className}`}
                    >
                      {verdictInfo.label}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card border border-hairline text-slate-700 dark:text-gray-300">
                      {preset.city}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-1 leading-snug group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">
                  {preset.description}
                </p>

                {/* Status Pill Tag */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                    {preset.tag}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Trigger <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
