import React from 'react';
import { cn } from '../../constants/theme';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'emerald' | 'indigo' | 'amber' | 'crimson' | 'cyan' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotColor?: string;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  dotColor,
  pulse = false,
  children,
  className,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10',
    emerald: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    indigo: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/25',
    amber: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    crimson: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25',
    cyan: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/25',
    outline: 'bg-transparent text-slate-700 dark:text-gray-300 border-slate-300 dark:border-white/15',
    glass: 'bg-white/60 dark:bg-white/[0.04] backdrop-blur-md text-slate-800 dark:text-gray-200 border-slate-200 dark:border-white/10',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 tracking-tight',
    md: 'text-xs px-2.5 py-1 tracking-tight',
    lg: 'text-sm px-3 py-1.5',
  };

  const defaultDotColors = {
    default: 'bg-slate-400 dark:bg-gray-400',
    emerald: 'bg-emerald-500 dark:bg-emerald-400',
    indigo: 'bg-indigo-500 dark:bg-indigo-400',
    amber: 'bg-amber-500 dark:bg-amber-400',
    crimson: 'bg-rose-500 dark:bg-rose-400',
    cyan: 'bg-cyan-500 dark:bg-cyan-400',
    outline: 'bg-slate-400 dark:bg-gray-300',
    glass: 'bg-cyan-500 dark:bg-cyan-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
            dotColor || defaultDotColors[variant],
            pulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
};
