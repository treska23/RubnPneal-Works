/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // si usas la carpeta /app de Next 13:
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#ffffff',
        accent: {
          50: '#ffe5e5',
          100: '#ffb8b8',
          200: '#ff8a8a',
          300: '#ff5d5d',
          400: '#ff2f2f',
          500: '#e60000',
          600: '#b40000',
          700: '#820000',
          800: '#510000',
          900: '#210000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        notable: ['Notable', 'cursive'],
      },
      fontSize: {
        '2xs': '0.875rem',
        xs: '1rem',
        sm: '1.125rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
        '10xl': '9rem',
        '11xl': '10rem',
        hero: 'clamp(2rem, 8vw, 6rem)',
      },
      letterSpacing: {
        widest: '.25em',
      },
    },
  },
  plugins: [],
};
