/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          900: "#2a1810",
          800: "#3a2418",
          700: "#4a3020",
          600: "#5a3c28",
          500: "#6a4830",
        },
        parchment: {
          50: "#fbf6ea",
          100: "#f4ecd8",
          200: "#e8dcc0",
          300: "#d9c9a3",
        },
        gold: {
          DEFAULT: "#d97706",
          light: "#f59e0b",
          dark: "#b45309",
        },
        crimson: {
          DEFAULT: "#be123c",
          light: "#e11d48",
        },
        moss: {
          DEFAULT: "#059669",
          light: "#10b981",
        },
      },
      fontFamily: {
        // 思源黑体统一字族，通过字重区分层级
        display: ['"Source Han Sans SC"', "sans-serif"],   // 大标题：用 900 Heavy
        serif: ['"Source Han Sans SC"', "sans-serif"],     // 正文：用 400 Regular
        mono: ['"Source Han Sans SC"', "monospace"],       // 等宽场景：仍用思源（数字会等宽）
        sans: ['"Source Han Sans SC"', "sans-serif"],      // 默认无衬线
      },
      fontWeight: {
        extralight: "200",
        light: "300",
        normal: "350",
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },
      boxShadow: {
        seal: "0 0 0 1px rgba(245,158,11,0.4), 0 8px 30px rgba(0,0,0,0.45)",
        gold: "0 0 24px rgba(245,158,11,0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "card-rise": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pulse-gold": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.5)" },
          "50%": { boxShadow: "0 0 0 6px rgba(245,158,11,0)" },
        },
        "flip-down": {
          "0%": { transform: "rotateX(90deg)", opacity: "0" },
          "100%": { transform: "rotateX(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "slide-in": "slide-in 0.4s ease-out both",
        "card-rise": "card-rise 0.45s cubic-bezier(0.2,0.7,0.2,1) both",
        "pulse-gold": "pulse-gold 1.2s ease-out",
        "flip-down": "flip-down 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
