/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}', // si tienes carpeta /app
  ],
  theme: {
    extend: {
      fontFamily: {
        // This is what you need for font-notable to work
        notable: ['Notable', 'cursive'],
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        avatar: {
          '0%': { backgroundPositionX: '0' },
          '100%': { backgroundPositionX: 'calc(var(--w) * var(--frames) * -1)' },
        },
        'ghost-move': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' },
        },
      },
      animation: {
        ghost: 'ghost-move 8s linear infinite',
        avatar: 'avatar var(--dur) steps(var(--frames)) infinite',
      },
    },
  },
  plugins: [],
};
