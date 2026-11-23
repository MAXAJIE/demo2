import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        brand: "var(--primary)",
        primary: "var(--primary)",
        "on-brand": "var(--on-primary)",
        accent: "var(--accent)",
        "accent-on": "var(--accent-on)",
        "accent-ink": "var(--accent-ink)",
        line: "var(--border)",
      },
      fontFamily: {
        display: ['"Newsreader"', '"Noto Serif SC"', "Georgia", "serif"],
        body: ['"Manrope"', '"Noto Sans SC"', "system-ui", "sans-serif"],
        serif: ['"Newsreader"', '"Noto Serif SC"', "Georgia", "serif"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      maxWidth: {
        content: "1200px",
      },
      boxShadow: {
        soft: "0 18px 50px -24px rgba(17, 21, 26, 0.35)",
        lift: "0 28px 70px -32px rgba(17, 21, 26, 0.45)",
      },
      keyframes: {
        scroll: {
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        scroll:
          "scroll var(--animation-duration, 90s) var(--animation-direction, forwards) linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
