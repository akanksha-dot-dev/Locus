import React from 'react';
import { cn } from '../../constants/theme';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-md border border-indigo-500/40 active:scale-[0.98]',
    secondary:
      'bg-surface-card hover:bg-surface-active text-slate-800 dark:text-gray-200 border border-hairline hover:border-hairline-hover shadow-xs active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 border border-transparent',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-white/15 hover:border-slate-400 dark:hover:border-white/30',
    glass:
      'glassmorphic hover:bg-white/80 dark:hover:bg-white/[0.08] text-slate-900 dark:text-gray-100 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 font-medium',
    md: 'text-sm px-3.5 py-2 rounded-lg gap-2 font-medium',
    lg: 'text-base px-4 py-2.5 rounded-xl gap-2.5 font-semibold',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {iconRight && !isLoading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};
