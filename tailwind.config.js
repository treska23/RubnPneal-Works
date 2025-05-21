/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}", // si tienes carpeta /app
  ],
  theme: {
    extend: {
      fontFamily: {
        // This is what you need for font-notable to work
        notable: ["Notable", "cursive"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
