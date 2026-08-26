/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aman: "#16a34a",
        siaga: "#eab308",
        waspada: "#f97316",
        awas: "#dc2626",
      },
    },
  },
  plugins: [],
};
