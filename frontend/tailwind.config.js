/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}-rgb) / ${opacityValue})`;
    }
    return `var(${variableName})`;
  };
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          base: withOpacity('--bg-base'),
          card: withOpacity('--surface-card'),
          elevated: withOpacity('--surface-elevated'),
          active: withOpacity('--surface-active'),
        },
        content: {
          primary: withOpacity('--text-primary'),
          secondary: withOpacity('--text-secondary'),
          muted: withOpacity('--text-muted'),
        },
        semantic: {
          emerald: '#10b981',
          indigo: '#6366f1',
          amber: '#f59e0b',
          crimson: '#ef4444',
          cyan: '#06b6d4',
        },
      },
      borderColor: {
        hairline: 'var(--border-hairline)',
        'hairline-hover': 'var(--border-hairline-hover)',
        'hairline-strong': 'var(--border-hairline-strong)',
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
