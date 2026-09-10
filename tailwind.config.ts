import type { Config } from 'tailwindcss';

// Cloudera brand palette, drawn from the AI Discovery Workshop deck.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cloudera: {
          navy: '#1a1a4e',
          'navy-deep': '#0f0f38',
          orange: '#EA2A0C',
          'orange-bright': '#FF5C28',
          indigo: '#4b4bd6',
          slate: '#5b5b7a',
        },
        surface: {
          light: '#f6f6f9',
          card: '#ffffff',
          border: '#e6e6ee',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        standard: '8px',
        large: '12px',
        pill: '980px',
      },
      boxShadow: {
        card: 'rgba(26, 26, 78, 0.10) 0px 6px 24px 0px',
      },
    },
  },
  plugins: [],
};

export default config;
