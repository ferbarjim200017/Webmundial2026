import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: verde esmeralda deportivo + acentos
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        ink: {
          950: "#070b14",
          900: "#0b1220",
          850: "#0f1729",
          800: "#131c30",
          700: "#1c2740",
          600: "#2a3550",
        },
        gold: "#fbbf24",
        silver: "#cbd5e1",
        bronze: "#d97706",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(16,185,129,0.25), 0 8px 30px -8px rgba(16,185,129,0.35)",
        "glow-lg": "0 0 0 1px rgba(16,185,129,0.3), 0 12px 45px -10px rgba(16,185,129,0.5)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -16px rgba(0,0,0,0.7)",
        gold: "0 0 25px -5px rgba(251,191,36,0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-15deg)" },
          "60%, 100%": { transform: "translateX(220%) skewX(-15deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pop-in": "pop-in 0.25s ease-out both",
        float: "float 3.5s ease-in-out infinite",
        shine: "shine 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
