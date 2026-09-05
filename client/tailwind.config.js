/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F8F0E5',
          50: '#FDFBF7',
          100: '#FAF5EE',
          200: '#F8F0E5',
          300: '#EFE2D2',
        },
        beige: {
          DEFAULT: '#EADBC8',
          100: '#F5ECE1',
          200: '#EADBC8',
          300: '#DFCAA8',
        },
        sand: {
          DEFAULT: '#DAC0A3',
          100: '#E7D5C2',
          200: '#DAC0A3',
          300: '#CBAB83',
        },
        navy: {
          DEFAULT: '#0F2C59',
          50: '#E8EDF4',
          100: '#C5D3E5',
          200: '#9DB5D3',
          500: '#1B4785',
          700: '#0F2C59',
          800: '#0B2042',
          900: '#07152B',
        },
        brand: {
          success: '#1E7E34',
          'success-bg': '#edf8f1',
          warning: '#C4943A',
          'warning-bg': '#fdf6ea',
          danger: '#B84A39',
          'danger-bg': '#fdf0f0',
          info: '#1a68b5',
          'info-bg': '#edf5fd',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 44, 89, 0.05)',
        md: '0 4px 6px -1px rgba(15, 44, 89, 0.08), 0 2px 4px -1px rgba(15, 44, 89, 0.04)',
        lg: '0 10px 15px -3px rgba(15, 44, 89, 0.08), 0 4px 6px -2px rgba(15, 44, 89, 0.04)',
        card: '0 1px 3px rgba(15, 44, 89, 0.04)',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      }
    },
  },
  plugins: [],
}
