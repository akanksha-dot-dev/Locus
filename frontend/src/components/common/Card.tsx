import React from 'react';
import { cn } from '../../constants/theme';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: 'base' | 'card' | 'elevated' | 'active' | 'glass';
  glowing?: 'indigo' | 'emerald' | 'amber' | 'crimson' | 'cyan';
  hoverable?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  surface = 'card',
  glowing,
  hoverable = false,
  className,
  children,
  ...props
}) => {
  const surfaceStyles = {
    base: 'bg-surface-base border-hairline',
    card: 'bg-surface-card border-hairline',
    elevated: 'bg-surface-elevated border-hairline-strong',
    active: 'bg-surface-active border-white/20',
    glass: 'glassmorphic',
  };

  const glowStyles = {
    indigo: 'glow-indigo border-indigo-500/30',
    emerald: 'glow-emerald border-emerald-500/30',
    amber: 'glow-amber border-amber-500/30',
    crimson: 'glow-crimson border-rose-500/30',
    cyan: 'glow-cyan border-cyan-500/30',
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        surfaceStyles[surface],
        glowing && glowStyles[glowing],
        hoverable && 'hover:border-hairline-hover hover:bg-surface-active hover:shadow-lg cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
