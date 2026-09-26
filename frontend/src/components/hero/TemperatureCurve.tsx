import React, { useState, useMemo } from 'react';

export interface TemperatureCurveProps {
  currentTemp: number;
  hourlyTemps?: number[];
  feelsLike?: number;
  condition?: string;
  className?: string;
}

export const TemperatureCurve: React.FC<TemperatureCurveProps> = ({
  currentTemp,
  hourlyTemps,
  feelsLike,
  condition,
  className = '',
}) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const temps = useMemo<number[]>(() => {
    if (hourlyTemps && hourlyTemps.length === 24) {
      return hourlyTemps;
    }
    const generated: number[] = [];
    const base = currentTemp;
    for (let h = 0; h < 24; h++) {
      const angle = ((h - 15) / 24) * 2 * Math.PI;
      const diurnalOffset = Math.cos(angle) * 4.5;
      const val = Math.round((base + diurnalOffset) * 10) / 10;
      generated.push(val);
    }
    return generated;
  }, [currentTemp, hourlyTemps]);

  const currentHour = useMemo(() => new Date().getHours(), []);

  const width = 600;
  const height = 140;
  const paddingX = 35;
  const paddingTop = 25;
  const paddingBottom = 30;

  const minTemp = useMemo(() => Math.min(...temps), [temps]);
  const maxTemp = useMemo(() => Math.max(...temps), [temps]);
  const tempRange = Math.max(maxTemp - minTemp, 3);

  const getX = (hour: number) => {
    return paddingX + (hour / 23) * (width - paddingX * 2);
  };

  const getY = (temp: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    const normalized = (temp - minTemp) / tempRange;
    return height - paddingBottom - normalized * usableHeight;
  };

  const points = useMemo(() => {
    return temps.map((temp, hour) => ({
      hour,
      temp,
      x: getX(hour),
      y: getY(temp),
    }));
  }, [temps, minTemp, maxTemp, tempRange]);

  const { strokePath, fillPath } = useMemo(() => {
    if (points.length === 0) return { strokePath: '', fillPath: '' };

    let d = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const fill = `${d} L ${last.x},${height - paddingBottom} L ${first.x},${height - paddingBottom} Z`;

    return { strokePath: d, fillPath: fill };
  }, [points]);

  const minIndex = temps.indexOf(minTemp);
  const maxIndex = temps.indexOf(maxTemp);

  const activeIndex = hoveredHour !== null ? hoveredHour : currentHour;
  const activePoint = points[activeIndex] || points[currentHour];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (mouseX - paddingX) / (width - paddingX * 2)));
    const hour = Math.round(ratio * 23);
    setHoveredHour(hour);
  };

  return (
    <div className={`relative w-full rounded-xl bg-surface-card border border-hairline p-3 select-none ${className}`}>
      {/* Header bar with live summary */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-gray-400 tracking-wider font-medium">
            24H Temperature Forecast
          </span>
          {condition && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-slate-700 dark:text-gray-300 border border-hairline">
              {condition}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Min <strong className="text-slate-900 dark:text-gray-200">{minTemp}°</strong>
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Max <strong className="text-slate-900 dark:text-gray-200">{maxTemp}°</strong>
          </span>
          {feelsLike !== undefined && (
            <span className="text-slate-500 dark:text-gray-400 hidden sm:inline">
              Feels <strong className="text-slate-900 dark:text-gray-200">{feelsLike}°C</strong>
            </span>
          )}
        </div>
      </div>

      {/* Interactive SVG Curve */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredHour(null)}
      >
        <defs>
          <linearGradient id="tempFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="tempStrokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#6366f1" />
            <stop offset="70%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>

          <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <line
          x1={paddingX}
          y1={getY(minTemp)}
          x2={width - paddingX}
          y2={getY(minTemp)}
          stroke="currentColor"
          className="text-slate-200 dark:text-white/10"
          strokeDasharray="2 4"
        />
        <line
          x1={paddingX}
          y1={getY(maxTemp)}
          x2={width - paddingX}
          y2={getY(maxTemp)}
          stroke="currentColor"
          className="text-slate-200 dark:text-white/10"
          strokeDasharray="2 4"
        />
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="currentColor"
          className="text-slate-300 dark:text-white/15"
          strokeWidth="1"
        />

        <path d={fillPath} fill="url(#tempFillGrad)" />

        <path
          d={strokePath}
          fill="none"
          stroke="url(#tempStrokeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#curveGlow)"
        />

        {points[minIndex] && (
          <g>
            <circle
              cx={points[minIndex].x}
              cy={points[minIndex].y}
              r="3.5"
              fill="#38bdf8"
              stroke="white"
              className="dark:stroke-[#090a0f]"
              strokeWidth="2"
            />
            <text
              x={points[minIndex].x}
              y={points[minIndex].y + 16}
              textAnchor="middle"
              className="text-[9px] fill-blue-600 dark:fill-blue-300 font-mono tabular-nums select-none font-bold"
            >
              {minTemp}°
            </text>
          </g>
        )}

        {points[maxIndex] && (
          <g>
            <circle
              cx={points[maxIndex].x}
              cy={points[maxIndex].y}
              r="3.5"
              fill="#fbbf24"
              stroke="white"
              className="dark:stroke-[#090a0f]"
              strokeWidth="2"
            />
            <text
              x={points[maxIndex].x}
              y={points[maxIndex].y - 8}
              textAnchor="middle"
              className="text-[9px] fill-amber-600 dark:fill-amber-300 font-mono tabular-nums select-none font-bold"
            >
              {maxTemp}°
            </text>
          </g>
        )}

        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={paddingTop - 5}
              x2={activePoint.x}
              y2={height - paddingBottom}
              stroke={hoveredHour !== null ? 'rgba(6, 182, 212, 0.8)' : 'rgba(99, 102, 241, 0.7)'}
              strokeWidth="1.5"
              strokeDasharray={hoveredHour !== null ? 'none' : '3 3'}
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill={hoveredHour !== null ? '#22d3ee' : '#6366f1'}
              stroke="white"
              className="dark:stroke-[#090a0f]"
              strokeWidth="2"
            />
            <g
              transform={`translate(${Math.max(
                45,
                Math.min(width - 45, activePoint.x)
              )}, ${Math.max(16, activePoint.y - 18)})`}
            >
              <rect
                x="-36"
                y="-13"
                width="72"
                height="20"
                rx="5"
                fill="#0f172a"
                className="dark:fill-[#141516]"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-white font-mono tabular-nums select-none font-semibold"
              >
                {activePoint.hour.toString().padStart(2, '0')}:00 • {activePoint.temp}°
              </text>
            </g>
          </g>
        )}

        {[0, 6, 12, 18, 23].map((hr) => (
          <text
            key={hr}
            x={getX(hr)}
            y={height - paddingBottom + 16}
            textAnchor="middle"
            className="text-[10px] fill-slate-500 dark:fill-gray-500 font-mono tabular-nums select-none"
          >
            {hr.toString().padStart(2, '0')}:00
          </text>
        ))}
      </svg>
    </div>
  );
};
