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
        // TeamBox hub uses the same tokens as CrewCenter (CCC) so the markup
        // can be kept identical with the GAMES vanilla-HTML version.
        battle: {
          black: "#0a0a0a",
          dark: "#121212",
          grey: "#2a2a2a",
          orange: "#ff6600",
          "orange-light": "#ff8533",
          white: "#ffffff",
        },
      },
      screens: {
        tablet: "1024px",
        "tablet-landscape": "1024px",
        desktop: "1280px",
      },
      fontFamily: {
        display: ["'Segoe UI'", "Tahoma", "Geneva", "Verdana", "sans-serif"],
      },
    },
  },
  plugins: [],
};
