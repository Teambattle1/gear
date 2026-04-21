/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teamb: {
          black: "#000000",
          orange: "#ff6600",
          "orange-light": "#ff8a3d",
          "orange-dark": "#cc5200",
        },
      },
      fontFamily: {
        display: ["'Segoe UI'", "Tahoma", "Geneva", "Verdana", "sans-serif"],
      },
    },
  },
  plugins: [],
};
