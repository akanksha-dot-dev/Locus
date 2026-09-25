import React from 'react';
import { Clock, Zap } from 'lucide-react';

export interface ProductiveHoursMeterProps {
  productiveHours: number;
  totalDayHours?: number;
  className?: string;
}

export const ProductiveHoursMeter: React.FC<ProductiveHoursMeterProps> = ({
  productiveHours,
  totalDayHours = 8.0,
  className = '',
}) => {
  const percentage = Math.max(0, Math.min(100, Math.round((productiveHours / totalDayHours) * 100)));

  // Focus tier classification
  let tierLabel = 'BALANCED CAPACITY';
  let tierColor = 'text-cyan-400';
  let tierBg = 'bg-cyan-500/10 border-cyan-500/25';
  let barGradient = 'from-cyan-500 to-indigo-500';

  if (productiveHours >= 7.0) {
    tierLabel = 'HIGH FOCUS DENSITY';
    tierColor = 'text-emerald-400';
    tierBg = 'bg-emerald-500/10 border-emerald-500/25';
    barGradient = 'from-emerald-500 to-teal-400';
  } else if (productiveHours < 5.0) {
    tierLabel = 'FRAGMENTED SCHEDULE';
    tierColor = 'text-amber-400';
    tierBg = 'bg-amber-500/10 border-amber-500/25';
    barGradient = 'from-amber-500 to-rose-400';
  }

  // Segmented ticks (8 1-hour slots)
  const segments = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className={`p-4 rounded-xl bg-surface-card border border-hairline flex flex-col justify-between select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="uppercase tracking-wider font-mono text-[11px]">Focus Capacity</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold tracking-wider ${tierColor} ${tierBg}`}>
          {tierLabel}
        </span>
      </div>

      {/* Main Metric */}
      <div className="my-2 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold font-mono text-white tabular-nums tracking-tight">
            {productiveHours.toFixed(1)}
          </span>
          <span className="text-sm font-mono text-gray-400">/ {totalDayHours.toFixed(1)} hrs</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-gray-300 tabular-nums">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Progress Bar with 8 Segment Markers */}
      <div className="space-y-1.5 mt-1">
        <div className="relative w-full h-2.5 rounded-full bg-surface-base border border-hairline overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* 8-Hour Slot Segment Markers */}
        <div className="flex justify-between px-0.5 text-[9px] font-mono text-gray-500 tabular-nums">
          {segments.map((seg) => (
            <span
              key={seg}
              className={seg <= productiveHours ? 'text-gray-300 font-semibold' : 'text-gray-600'}
            >
              {seg}h
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
