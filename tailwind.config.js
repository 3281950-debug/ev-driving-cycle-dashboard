/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'obd-blue': '#3b82f6',
        'obd-red': '#ef4444',
        'obd-green': '#10b981',
        'obd-yellow': '#f59e0b',
        'obd-purple': '#8b5cf6',
        'obd-cyan': '#06b6d4',
        'obd-orange': '#f97316',
        'obd-pink': '#ec4899',
      },
      animation: {
        'needle-swing': 'needle-swing 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'needle-swing': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(10deg)' },
        }
      }
    },
  },
  plugins: [],
}