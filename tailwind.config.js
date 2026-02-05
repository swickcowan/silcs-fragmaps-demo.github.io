/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'molstar-bg': '#0a0a0a',
        'molstar-surface': '#1a1a1a',
        'fragmap-hydrophobic': '#ffeb3b',
        'fragmap-hbond-donor': '#2196f3',
        'fragmap-hbond-acceptor': '#f44336',
        'fragmap-positive': '#4caf50',
        'fragmap-negative': '#9c27b0',
        'fragmap-aromatic': '#ff9800'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
