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

  // Color thresholds
  let color = '#10b981'; // Emerald
  let glowColor = 'rgba(16, 185, 129, 0.35)';
  let labelText = 'OPTIMAL';
  let labelColor = 'text-emerald-400';
  let badgeBg = 'bg-emerald-500/10 border-emerald-500/25';

  if (clampedScore < 40) {
    color = '#ef4444'; // Crimson
    glowColor = 'rgba(239, 68, 68, 0.35)';
    labelText = 'ADVERSE';
    labelColor = 'text-rose-400';
    badgeBg = 'bg-rose-500/10 border-rose-500/25';
  } else if (clampedScore < 70) {
    color = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.35)';
    labelText = 'MODERATE';
    labelColor = 'text-amber-400';
    badgeBg = 'bg-amber-500/10 border-amber-500/25';
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

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.07)"
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
          <span
            className="text-2xl font-extrabold font-mono text-white tabular-nums tracking-tight leading-none"
            style={{ textShadow: `0 0 16px ${glowColor}` }}
          >
            {clampedScore}
          </span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {showLabel && (
        <div className={`mt-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold tracking-wider ${labelColor} ${badgeBg}`}>
          {labelText}
        </div>
      )}
    </div>
  );
};
