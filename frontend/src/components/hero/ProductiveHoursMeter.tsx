import React, { useEffect, useRef, useState } from 'react';
import { Clock, Zap, TrendingUp } from 'lucide-react';

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
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const hasAnimated = useRef(false);

  // Animate the ring on mount and whenever percentage changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
      hasAnimated.current = true;
    }, 120);
    return () => clearTimeout(timer);
  }, [percentage]);

  // Focus tier classification
  let tierLabel = 'BALANCED CAPACITY';
  let tierColor = 'text-cyan-700 dark:text-cyan-400';
  let tierBg = 'bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/25';
  let ringColorClass = 'text-cyan-500';
  let ringStroke = '#06b6d4'; // cyan-500
  let trackStroke = 'rgba(6, 182, 212, 0.12)';

  if (productiveHours >= 7.0) {
    tierLabel = 'HIGH FOCUS DENSITY';
    tierColor = 'text-emerald-700 dark:text-emerald-400';
    tierBg = 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25';
    ringColorClass = 'text-emerald-500';
    ringStroke = '#10b981'; // emerald-500
    trackStroke = 'rgba(16, 185, 129, 0.12)';
  } else if (productiveHours < 5.0) {
    tierLabel = 'FRAGMENTED SCHEDULE';
    tierColor = 'text-amber-700 dark:text-amber-400';
    tierBg = 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/25';
    ringColorClass = 'text-amber-500';
    ringStroke = '#f59e0b'; // amber-500
    trackStroke = 'rgba(245, 158, 11, 0.12)';
  }

  // SVG arc ring calculations
  const size = 120;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 270° arc (start at 135°, go 270° clockwise)
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const dashOffset = arcLength - (arcLength * animatedPercentage) / 100;
  const gapLength = circumference - arcLength;

  // 8-hour segments
  const segments = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-surface-card border border-hairline flex flex-col select-none shadow-lg card-highlight-glow ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="uppercase tracking-wider font-mono text-[11px]">Focus Capacity</span>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold tracking-wider ${tierColor} ${tierBg}`}
        >
          {tierLabel}
        </span>
      </div>

      {/* Main Content: SVG Ring + Stats side by side */}
      <div className="flex items-center gap-5 mt-1">
        {/* SVG Arc Ring */}
        <div className="relative flex-shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rotate-[135deg]"
            aria-label={`Focus capacity: ${productiveHours} of ${totalDayHours} hours`}
          >
            {/* Track arc (background) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={trackStroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${gapLength}`}
              strokeDashoffset={0}
            />
            {/* Progress arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringStroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${gapLength}`}
              strokeDashoffset={dashOffset}
              className="ring-progress"
              style={{
                filter: `drop-shadow(0 0 6px ${ringStroke}80)`,
              }}
            />
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-0">
            <span
              className={`text-2xl font-extrabold font-mono tabular-nums tracking-tight ${ringColorClass}`}
              style={{ marginTop: '6px' }}
            >
              {productiveHours.toFixed(1)}
            </span>
            <span className="text-[9px] font-mono text-slate-500 dark:text-gray-400 uppercase tracking-wider">
              / {totalDayHours.toFixed(0)}h
            </span>
          </div>
        </div>

        {/* Right Stats Column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Big percentage number */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold font-mono tabular-nums tracking-tight ${ringColorClass}`}>
              {percentage}
            </span>
            <span className="text-sm font-mono text-slate-500 dark:text-gray-400">%</span>
            <div className={`flex items-center gap-1 text-[11px] font-mono ${tierColor} ml-auto`}>
              <TrendingUp className="w-3 h-3" />
              <span className="font-semibold">focus</span>
            </div>
          </div>

          {/* 8-segment horizontal tick bar */}
          <div className="space-y-1.5">
            <div className="flex gap-0.5">
              {segments.map((seg) => (
                <div
                  key={seg}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                    seg <= Math.floor(productiveHours)
                      ? ringStroke === '#10b981'
                        ? 'bg-emerald-500'
                        : ringStroke === '#f59e0b'
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                      : seg - 0.5 <= productiveHours
                      ? ringStroke === '#10b981'
                        ? 'bg-emerald-400/50'
                        : ringStroke === '#f59e0b'
                        ? 'bg-amber-400/50'
                        : 'bg-cyan-400/50'
                      : 'bg-slate-200 dark:bg-surface-active'
                  }`}
                  title={`${seg}h`}
                />
              ))}
            </div>

            {/* Hour labels */}
            <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-gray-500 tabular-nums">
              <span>1h</span>
              <span>4h</span>
              <span>8h</span>
            </div>
          </div>

          {/* Efficiency insight */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-500/25 flex-shrink-0" />
            <span className="text-[11px] font-mono text-slate-600 dark:text-gray-300">
              {productiveHours >= 7
                ? 'Peak performance window'
                : productiveHours >= 5
                ? 'Good capacity reserve'
                : 'Schedule fragmented'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
