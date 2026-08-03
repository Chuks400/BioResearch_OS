import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Core surface ────────────────────────────────────────
        background:  "#111111",
        sidebar:     "#151515",
        card:        "#1C1C1C",
        "card-hover":"#222222",
        border:      "#2A2A2A",
        "border-subtle": "#1F1F1F",

        // ── Text ────────────────────────────────────────────────
        foreground:  "#FAFAFA",
        muted:       "#B3B3B3",
        "muted-dark":"#666666",
        placeholder: "#4A4A4A",

        // ── Accent / brand ───────────────────────────────────────
        accent:      { DEFAULT: "#4F46E5", hover: "#4338CA", light: "rgba(79,70,229,0.12)" },
        success:     { DEFAULT: "#10B981", light: "rgba(16,185,129,0.12)" },
        warning:     { DEFAULT: "#F59E0B", light: "rgba(245,158,11,0.12)" },
        error:       { DEFAULT: "#EF4444", light: "rgba(239,68,68,0.12)" },
        info:        { DEFAULT: "#3B82F6", light: "rgba(59,130,246,0.12)" },

        // ── Semantic surface ─────────────────────────────────────
        surface: {
          1: "#151515",
          2: "#1C1C1C",
          3: "#222222",
          4: "#2A2A2A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        xs:   ["11px", "16px"],
        sm:   ["13px", "20px"],
        base: ["14px", "22px"],
        md:   ["15px", "24px"],
        lg:   ["16px", "26px"],
        xl:   ["18px", "28px"],
        "2xl":["22px", "32px"],
        "3xl":["28px", "36px"],
        "4xl":["36px", "44px"],
        "5xl":["48px", "56px"],
      },
      borderRadius: {
        sm:  "6px",
        DEFAULT: "8px",
        md:  "10px",
        lg:  "12px",
        xl:  "16px",
        "2xl":"20px",
        "3xl":"24px",
      },
      spacing: {
        sidebar: "240px",
        "right-panel": "320px",
        topbar: "48px",
      },
      animation: {
        "fade-in":   "fadeIn 0.15s ease-out",
        "slide-up":  "slideUp 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "scale-in":  "scaleIn 0.15s ease-out",
        "shimmer":   "shimmer 1.5s infinite",
        "pulse-soft":"pulseSoft 2s ease-in-out infinite",
        "stream":    "stream 0.3s ease-out",
      },
      keyframes: {
        fadeIn:      { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:     { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideInRight:{ from: { opacity: "0", transform: "translateX(12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        scaleIn:     { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        shimmer:     { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pulseSoft:   { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        stream:      { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      boxShadow: {
        "glow-accent":  "0 0 20px rgba(79,70,229,0.25)",
        "glow-success": "0 0 20px rgba(16,185,129,0.20)",
        "panel":        "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
        "card":         "0 0 0 1px rgba(255,255,255,0.04)",
        "popover":      "0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6)",
        "command":      "0 0 0 1px rgba(255,255,255,0.1), 0 16px 64px rgba(0,0,0,0.8)",
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
      },
      transitionDuration: {
        fast: "100ms",
        DEFAULT: "150ms",
        slow: "200ms",
        slower: "300ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
