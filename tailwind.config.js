/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#111111',
          dark: '#F0F0F0',
          accent: '#534AB7', // purple
        },
        secondary: {
          light: '#666666',
          dark: '#A0A0A0',
          accent: '#1D9E75', // teal
        },
        background: {
          light: '#F5F5F3',
          dark: '#0F0F0F',
        },
        card: {
          light: '#FFFFFF',
          dark: '#1A1A1A',
        },
        border: {
          light: '#E5E5E3',
          dark: '#2E2E2E',
        },
        difficulty: {
          easy: '#97C459',
          medium: '#EF9F27',
          hard: '#E24B4A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
