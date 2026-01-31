import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
        script: ["var(--font-script)", "cursive"],
      },
      colors: {
        // Tweakcn theme colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // Legacy colors for backward compatibility during migration
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
      },
      zIndex: {
        "5": "5",
        "100": "100",
      },
    },
  },
  plugins: [],
} satisfies Config;
