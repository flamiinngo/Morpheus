/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        morpheus: {
          void: '#000000',
          deep: '#0a0a0f',
          dark: '#12121a',
          panel: '#1a1a25',
          border: '#2a2a3a',
          glow: '#a78bfa',
          pulse: '#7c3aed',
          dream: '#c4b5fd',
          ghost: '#6366f1',
          nerve: '#22d3ee',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171',
          text: '#e2e8f0',
          muted: '#94a3b8',
          faint: '#475569',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'morpheus-breathe': 'breathe 4s ease-in-out infinite',
        'morpheus-pulse': 'morphPulse 2s ease-in-out infinite',
        'morpheus-think': 'think 1.5s ease-in-out infinite',
        'glow-ring': 'glowRing 3s ease-in-out infinite',
        'code-stream': 'codeStream 0.5s ease-out',
        'fade-up': 'fadeUp 0.6s ease-out',
        'nerve-fire': 'nerveFire 0.3s ease-out',
        'scan-line': 'scanLine 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        morphPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(167, 139, 250, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(167, 139, 250, 0.3)' },
        },
        think: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        glowRing: {
          '0%, 100%': { 
            boxShadow: '0 0 15px rgba(167,139,250,0.2), inset 0 0 15px rgba(167,139,250,0.05)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(167,139,250,0.4), inset 0 0 30px rgba(167,139,250,0.1)' 
          },
        },
        codeStream: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        nerveFire: {
          '0%': { backgroundColor: 'rgba(34, 211, 238, 0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
