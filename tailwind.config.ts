import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6f8',
          100: '#e4e9ef',
          200: '#c9d3de',
          700: '#2c3a4a',
          800: '#1c2834',
          900: '#121a22',
          950: '#0b1016'
        },
        accent: {
          DEFAULT: '#0f766e',
          soft: '#ccfbf1',
          dark: '#115e59'
        }
      },
      fontFamily: {
        sans: ['var(--font-source-sans)', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-ibm-plex)', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
