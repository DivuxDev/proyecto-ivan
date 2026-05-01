import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Verde oliva — color principal de marca
        brand: {
          50: '#F7F8F5',
          100: '#E8EBE0',
          200: '#D1D7C2',
          300: '#A8B28F',
          400: '#7D8A65',
          500: '#585f35', // Principal
          600: '#464B2A',
          700: '#363A20',
          800: '#292C18',
          900: '#1C1E11',
        },
        // Navy oscuro — para admin dashboard
        navy: {
          50: '#E8EDF5',
          100: '#C5CFDF',
          200: '#9EB0C8',
          300: '#7590B0',
          400: '#4E7099',
          500: '#2E4E7A',
          600: '#1E3A5F',
          700: '#162035',
          800: '#0C1427',
          900: '#060D1E',
        },
        // Verde éxito / Rojo error
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-glow': '0 0 20px rgba(88, 95, 53, 0.3)',
        'brand-glow-lg': '0 0 40px rgba(88, 95, 53, 0.4)',
        'card-dark': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-brand': 'pulseBrand 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBrand: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(88, 95, 53, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(88, 95, 53, 0)' },
        },
      },
      backgroundImage: {
        'grid-dark':
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%231E3A5F' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
