import React from 'react';

export interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 110,
  strokeWidth = 9,
  showLabel = true,
  className = '',
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let color = '#10b981';
  let labelText = 'OPTIMAL';
  let labelColor = 'text-emerald-700 dark:text-emerald-400';
  let badgeBg = 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30';

  if (clampedScore < 40) {
    color = '#ef4444';
    labelText = 'ADVERSE';
    labelColor = 'text-rose-700 dark:text-rose-400';
    badgeBg = 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30';
  } else if (clampedScore < 70) {
    color = '#f59e0b';
    labelText = 'MODERATE';
    labelColor = 'text-amber-700 dark:text-amber-400';
    badgeBg = 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30';
  }

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          <defs>
            <filter id={`gaugeGlow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`gaugeGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background Track with light and dark mode adaptive stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            className="stroke-slate-200 dark:stroke-white/[0.08]"
            strokeWidth={strokeWidth}
          />

          {/* Animated Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#gaugeGradient-${size})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#gaugeGlow-${size})`}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Inner Centered Metrics */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
            {clampedScore}
          </span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">
            / 100
          </span>
        </div>
      </div>

      {showLabel && (
        <div className={`mt-2 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-semibold tracking-wider ${labelColor} ${badgeBg}`}>
          {labelText}
        </div>
      )}
    </div>
  );
};
