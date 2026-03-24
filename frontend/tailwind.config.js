/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      colors: {
        base: '#09090B',
        surface: '#111115',
        elevated: '#1C1C22',
        border: 'rgba(255,255,255,0.07)',
        accent: '#00D68F',
        'accent-dim': 'rgba(0,214,143,0.12)',
        amber: '#F59E0B',
        'amber-dim': 'rgba(245,158,11,0.12)',
        danger: '#F04747',
        'danger-dim': 'rgba(240,71,71,0.12)',
        purple: '#8B5CF6',
        'purple-dim': 'rgba(139,92,246,0.12)',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(0,214,143,0.25)',
        'glow-sm': '0 0 10px rgba(0,214,143,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
