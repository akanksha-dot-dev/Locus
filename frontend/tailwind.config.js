/** @type {import('tailwindcss').Config} */
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
          base: '#08090a',      // Base canvas
          card: '#0f1011',      // Surface cards
          elevated: '#141516',  // Elevated panels
          active: '#1c1d20',    // Hover / active
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
        hairline: 'rgba(255, 255, 255, 0.08)',
        'hairline-hover': 'rgba(255, 255, 255, 0.16)',
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
