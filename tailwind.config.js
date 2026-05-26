/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A6B',
          light: '#2A5298',
          dark: '#0F2347',
        },
        accent: '#F59E0B',
        success: '#10B981',
        danger: '#EF4444',
        surface: '#F8FAFC',
      },
    },
  },
  plugins: [],
}
