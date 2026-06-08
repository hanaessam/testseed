import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        error: "var(--error)",
        success: "var(--success)",
        "info-subtle": "var(--info-subtle)",
        "info-border": "var(--info-border)",
        "info-text": "var(--info-text)",
        "warning-subtle": "var(--warning-subtle)",
        "warning-border": "var(--warning-border)",
        "warning-text": "var(--warning-text)",
        "danger-subtle": "var(--danger-subtle)",
        "danger-border": "var(--danger-border)",
        "danger-text": "var(--danger-text)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"]
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        pulse: "pulse 1.8s ease-in-out infinite"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      boxShadow: {
        focus: "0 0 0 1px var(--accent), 0 0 24px var(--focus-ring)",
        panel: "0 1px 2px var(--shadow-color)"
      }
    }
  },
  plugins: [animate]
};

export default config;
