import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DecisionType, PriorityLevel, RiskLevel, ScheduleCategory, NodeStatus } from '../types';

/**
 * Utility for combining Tailwind CSS class names with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// 4-Tier Surface Ladder (Incident Command Center dark aesthetic)
export const SURFACES = {
  base: '#08090a',
  card: '#0f1011',
  elevated: '#141516',
  active: '#1c1d20',
} as const;

// Hairline Borders
export const BORDERS = {
  hairline: 'rgba(255, 255, 255, 0.08)',
  hairlineHover: 'rgba(255, 255, 255, 0.16)',
} as const;

// Semantic Tokens
export const SEMANTIC = {
  emerald: '#10b981',
  indigo: '#6366f1',
  amber: '#f59e0b',
  crimson: '#ef4444',
  cyan: '#06b6d4',
} as const;

// Decision Verdict Styling
export const DECISION_CONFIG: Record<
  DecisionType,
  {
    label: string;
    sublabel: string;
    badgeBg: string;
    border: string;
    textColor: string;
    glowClass: string;
    icon: string;
  }
> = {
  office: {
    label: 'WORK FROM OFFICE',
    sublabel: 'Optimal commute conditions & high collaboration density',
    badgeBg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    glowClass: 'glow-emerald',
    icon: 'Building2',
  },
  wfh: {
    label: 'WORK FROM HOME',
    sublabel: 'Severe weather advisory or heavy isolated deep focus required',
    badgeBg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    textColor: 'text-indigo-400',
    glowClass: 'glow-indigo',
    icon: 'Home',
  },
  hybrid: {
    label: 'HYBRID COMMUTE',
    sublabel: 'Partial morning remote, transition to office for afternoon syncs',
    badgeBg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    textColor: 'text-amber-400',
    glowClass: 'glow-amber',
    icon: 'Shuffle',
  },
  undecided: {
    label: 'ANALYZING CONDITIONS',
    sublabel: 'LangGraph swarm currently aggregating real-world data telemetry',
    badgeBg: 'bg-gray-800/40',
    border: 'border-gray-700/50',
    textColor: 'text-gray-300',
    glowClass: '',
    icon: 'Compass',
  },
};

// Risk Level Styling
export const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; bg: string; text: string; border: string }
> = {
  low: {
    label: 'LOW RISK',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  medium: {
    label: 'MODERATE RISK',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  high: {
    label: 'HIGH RISK',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  critical: {
    label: 'CRITICAL HAZARD',
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
  },
};

// Schedule Category Styling
export const CATEGORY_CONFIG: Record<
  ScheduleCategory,
  { label: string; badgeClass: string; dotClass: string }
> = {
  deep_work: {
    label: 'Deep Work',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    dotClass: 'bg-indigo-400',
  },
  meeting: {
    label: 'Meeting',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-400',
  },
  commute: {
    label: 'Commute',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    dotClass: 'bg-cyan-400',
  },
  break: {
    label: 'Break & Outdoor',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dotClass: 'bg-emerald-400',
  },
  general: {
    label: 'General',
    badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    dotClass: 'bg-gray-400',
  },
};

// Jira Priority Styling
export const JIRA_PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; bg: string; text: string; border: string }
> = {
  Highest: {
    label: 'Highest',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  High: {
    label: 'High',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  Medium: {
    label: 'Medium',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
  },
  Low: {
    label: 'Low',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  Lowest: {
    label: 'Lowest',
    bg: 'bg-gray-500/15',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
};

// Node Status Visual Tokens
export const NODE_STATUS_CONFIG: Record<
  NodeStatus,
  { label: string; badge: string; border: string; glow: string; dot: string }
> = {
  idle: {
    label: 'Standby',
    badge: 'bg-gray-800/40 text-gray-400',
    border: 'border-white/5',
    glow: '',
    dot: 'bg-gray-600',
  },
  running: {
    label: 'Active',
    badge: 'bg-indigo-500/20 text-indigo-300 animate-pulse',
    border: 'border-indigo-500/50',
    glow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]',
    dot: 'bg-cyan-400 animate-ping',
  },
  completed: {
    label: 'Success',
    badge: 'bg-emerald-500/15 text-emerald-400',
    border: 'border-emerald-500/30',
    glow: '',
    dot: 'bg-emerald-400',
  },
  fallback: {
    label: 'Fallback',
    badge: 'bg-amber-500/15 text-amber-400',
    border: 'border-amber-500/30',
    glow: '',
    dot: 'bg-amber-400',
  },
  error: {
    label: 'Failed',
    badge: 'bg-red-500/15 text-red-400',
    border: 'border-red-500/30',
    glow: '',
    dot: 'bg-red-500',
  },
};
