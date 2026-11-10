import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4F9',
          100: '#DAE3F0',
          200: '#B6C7E0',
          300: '#8BA5CA',
          400: '#5D7EAD',
          500: '#3B5C8E',
          600: '#274472',
          700: '#1B3459',
          800: '#142846',
          900: '#0F213B',
          950: '#060D1D',
        },
        abyss: {
          950: '#040814',
          900: '#070E20',
          850: '#0A1530',
          800: '#0E1C3F',
          700: '#152856',
        },
        amethyst: {
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#5B21B6',
        },
        burgundy: {
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#E11D48',
          600: '#BE123C',
          700: '#9F1239',
          800: '#881337',
          900: '#4C0519',
        },
        ivory: {
          50: '#FFFFFF',
          100: '#FCFBF8',
          200: '#FAF8F4',
          300: '#F5F1E8',
        },
        parchment: {
          100: '#F7F4EC',
          200: '#F3EFE6',
          300: '#EAE3D2',
          400: '#DDD2BA',
        },
        gold: {
          100: '#FAF3E1',
          200: '#F1DFB3',
          300: '#DFC179',
          400: '#C6A45C',
          500: '#B59148',
          600: '#977434',
          700: '#785A26',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Merriweather"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 8px 32px -8px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        'card-hover':
          '0 20px 44px -12px rgba(2, 6, 23, 0.72), 0 0 28px -6px rgba(124, 58, 237, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        academic: '0 24px 60px -15px rgba(2, 6, 23, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        'glass-btn':
          '0 4px 18px -2px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
        'glass-btn-hover':
          '0 10px 26px -4px rgba(59, 130, 246, 0.35), 0 0 18px -4px rgba(159, 18, 57, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.42)',
      },
      transitionTimingFunction: {
        liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;

