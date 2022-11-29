/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mytheme: {
          "primary": "#C08C69ff",
          "secondary": "#CBB099ff",
          "accent": "#ECEAE8ff",
          "neutral": "#40251Fff",
          "base-100": "#312422"
        }
      }
    ]
  }
}