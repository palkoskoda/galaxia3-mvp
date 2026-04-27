/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#f05252',
          600: '#dc3545',
          700: '#c82333',
          800: '#9b1c1c',
          900: '#771d1d',
        },
        galaxia: {
          dark: '#1a1a2e',
          purple: '#16213e',
          blue: '#0f3460',
          accent: '#e94560',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'Inter', 'sans-serif'],
        logo: ['Bangers', 'cursive'],
      },
    },
  },
  plugins: [],
}
