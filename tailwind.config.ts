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
          950: '#091527',
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
        card: '0 2px 12px -2px rgba(15, 33, 59, 0.06), 0 1px 4px -1px rgba(15, 33, 59, 0.04)',
        'card-hover': '0 14px 28px -8px rgba(15, 33, 59, 0.12), 0 4px 10px -4px rgba(15, 33, 59, 0.06)',
        academic: '0 20px 45px -15px rgba(15, 33, 59, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;

