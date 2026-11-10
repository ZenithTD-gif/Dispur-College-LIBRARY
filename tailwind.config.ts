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
        charcoal: {
          950: '#100B0D',
          900: '#171013',
          850: '#1F1519',
          800: '#271B20',
          700: '#34242B',
        },
        maroon: {
          950: '#24060C',
          900: '#3D0915',
          800: '#520D1D',
          700: '#681226',
          600: '#7D172E',
        },
        burgundy: {
          900: '#490B19',
          800: '#681024',
          700: '#7D162E',
          600: '#941E38',
        },
        wine: {
          700: '#881931',
          600: '#A1223E',
          500: '#BA314E',
          400: '#CF4D68',
        },
        rose: {
          400: '#DD7B8E',
          300: '#EBA4B2',
          200: '#F4CBD3',
          100: '#FAE6EA',
        },
        champagne: {
          500: '#B8915C',
          400: '#D1B183',
          300: '#E5CFAF',
          200: '#F2E5CF',
          100: '#FAF2E6',
        },
        offwhite: {
          50: '#FFFEFC',
          100: '#FAF7F2',
          200: '#F2EBE2',
          300: '#E4D8CA',
          400: '#CFC0B0',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Merriweather"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 10px 36px -10px rgba(10, 5, 7, 0.65), inset 0 1px 0 rgba(250, 247, 242, 0.16)',
        'card-hover':
          '0 22px 48px -12px rgba(10, 5, 7, 0.8), 0 0 32px -8px rgba(148, 30, 56, 0.32), inset 0 1px 0 rgba(242, 229, 207, 0.28)',
        academic:
          '0 28px 65px -16px rgba(10, 5, 7, 0.82), 0 0 40px -12px rgba(125, 22, 46, 0.28), inset 0 1px 0 rgba(250, 247, 242, 0.2)',
        'glass-btn':
          '0 4px 18px -3px rgba(10, 5, 7, 0.55), inset 0 1px 0 rgba(250, 247, 242, 0.28)',
        'glass-btn-hover':
          '0 12px 28px -6px rgba(136, 25, 49, 0.45), 0 0 18px -4px rgba(229, 207, 175, 0.25), inset 0 1px 0 rgba(250, 247, 242, 0.45)',
        'book-3d':
          '14px 20px 38px -10px rgba(10, 5, 7, 0.8), 2px 4px 12px -2px rgba(61, 9, 21, 0.45)',
      },
      transitionTimingFunction: {
        liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        pageEnter: {
          '0%': { opacity: '0', transform: 'translate3d(0, 12px, 0) scale(0.992)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        modalPop: {
          '0%': { opacity: '0', transform: 'translate3d(0, 10px, 0) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translate3d(0, 16px, 0) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -10px, 0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'page-enter': 'pageEnter 0.48s cubic-bezier(0.22, 1, 0.36, 1) both',
        'modal-pop': 'modalPop 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toastIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-slow': 'floatSlow 7s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

