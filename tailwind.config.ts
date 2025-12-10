import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",   // samo ako koristiš pages/
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-satoshi)", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "cursive"], // ovo ćemo dole
      },
      colors: {
        primary: {
          DEFAULT: "#FF7B9C",
          light: "#FFC3D0",
          dark: "#E36280",
        },
        navy: {
          DEFAULT: "#1D3557",
          light: "#4E6583",
          dark: "#0F1E33",
        },
        "blue-bell": {
          DEFAULT: "#3E92CC",
          light: "#89C4EA",
          dark: "#2B6A94",
        },
        gold: {
          DEFAULT: "#F9DB6D",
          light: "#FFF1B5",
          dark: "#D9B44D",
        },
        shamrock: {
          DEFAULT: "#499F68",
          light: "#7CCF99",
          dark: "#2F6B46",
        },
        success: {
          DEFAULT: "#499F68",
          dark: "#2F6B46",
        },
        error: {
          DEFAULT: "#D64545",
        },
        warning: {
          DEFAULT: "#E8B63A",
        },
        info: {
          DEFAULT: "#3E92CC",
          dark: "#2B6A94",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
