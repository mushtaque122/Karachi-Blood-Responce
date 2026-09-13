/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E63950",
          dark: "#D32F3F",
          light: "#FF6B81",
        },
        blush: {
          50: "#FFF5F6",
          100: "#FFE4E8",
          200: "#FECDD6",
        },
      },
    },
  },
  plugins: [],
};
