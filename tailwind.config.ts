import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#4A7C59",
          foreground: "#FFFFFF",
          50: "#E8F0EA",
          100: "#C5DBC9",
          200: "#9FC5A7",
          300: "#79AF85",
          400: "#5D9A6C",
          500: "#4A7C59",
          600: "#3D6649",
          700: "#305039",
          800: "#233A29",
          900: "#162419",
        },
        secondary: {
          DEFAULT: "#8B6914",
          foreground: "#FFFFFF",
          50: "#F5EFE0",
          100: "#E6D9B3",
          200: "#D4C080",
          300: "#C2A74D",
          400: "#AD8E26",
          500: "#8B6914",
          600: "#725610",
          700: "#59430C",
          800: "#403008",
          900: "#271D04",
        },
        accent: {
          DEFAULT: "#C5E8C5",
          foreground: "#1A3A1A",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        earth: {
          50: "#FAF7F2",
          100: "#F5F1EB",
          200: "#E8DFD0",
          300: "#DBCDB5",
          400: "#CEBB9A",
          500: "#C1A97F",
          600: "#A38A5E",
          700: "#7A6747",
          800: "#514430",
          900: "#282219",
        },
        plant: {
          seedling: "#90EE90",
          growing: "#228B22",
          flowering: "#FFD700",
          ready: "#FF8C00",
          harvested: "#8B4513",
          dead: "#696969",
          disease: "#DC143C",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-grow": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-grow": "pulse-grow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
