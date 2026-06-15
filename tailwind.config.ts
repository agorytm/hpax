import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      colors: {
        bg: '#0a0a0a',
        surface: '#111',
        border: '#333',
        muted: '#555',
        dimmed: '#444',
      },
      letterSpacing: {
        widest2: '0.3em',
        wide2: '0.12em',
      },
    },
  },
  plugins: [],
}

export default config
