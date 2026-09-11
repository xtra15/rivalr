/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#fbf9f5",
          100: "#1c1b18",
          200: "#2a2823",
          300: "#57534e",
          400: "#756e62",
          500: "#a39a8a",
          600: "#b7ae9c",
          700: "#d3c9b6",
          800: "#ede8dd",
          850: "#ffffff",
          900: "#f5f1ea",
          950: "#1c1b18",
        },
        indigo: {
          300: "#3b66e4",
          400: "#1d4ed8",
          500: "#1d4ed8",
          600: "#1e40af",
        },
        signal: {
          success: "#15803d",
          danger: "#b91c1c",
          warning: "#b45309",
          info: "#1d4ed8",
        },
        paper: "#f5f1ea",
        surface: "#ffffff",
        wash: "#ede8dd",
        ink: "#1c1b18",
        "ink-soft": "#57534e",
        "ink-muted": "#756e62",
        "ink-faint": "#a39a8a",
        line: "#e3dccd",
        "line-strong": "#d3c9b6",
        accent: {
          DEFAULT: "#1d4ed8",
          soft: "#3b66e4",
          hover: "#1e40af",
        },
        success: "#15803d",
        danger: "#b91c1c",
        warning: "#b45309",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Segoe UI",
          "Roboto",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(70, 60, 40, 0.06), 0 10px 30px -18px rgba(70, 60, 40, 0.25)",
        pop: "0 2px 4px rgba(70, 60, 40, 0.08), 0 20px 50px -24px rgba(70, 60, 40, 0.35)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
    },
  },
  plugins: [],
};