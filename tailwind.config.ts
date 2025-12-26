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
          DEFAULT: "#ff74b1",
          light: "#ffb4d5",
          dark: "#d85a9a",
        },
        navy: {
          DEFAULT: "#1D3557",
          light: "#4E6583",
          dark: "#0F1E33",
        },
        "blue-bell": {
          DEFAULT: "#65dbff",
          light: "#a6eaff",
          dark: "#4bc4e6",
        },
        gold: {
          DEFAULT: "#ffeb76",
          light: "#fff4a3",
          dark: "#e6d468",
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
          DEFAULT: "#65dbff",
          dark: "#4bc4e6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
