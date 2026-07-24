import type { Config } from "tailwindcss";

/**
 * Kaivannam design system.
 * Palette rooted in Indian craft traditions on a warm khadi-cream base.
 * Every foreground/background pair used in the UI is checked against WCAG AA
 * (4.5:1 body text, 3:1 UI components) — see docs in globals.css.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Structural anchors
        cream: "#FDF8F0", // base / background — khadi cream
        surface: "#FFFFFF", // cards
        terracotta: {
          DEFAULT: "#C1440E", // primary — madder red
          600: "#A83A0C",
          700: "#8F320A",
        },
        haldi: "#E9A319", // secondary — turmeric yellow
        teal: {
          DEFAULT: "#1F6F78", // accent — peacock teal (trust/verification)
          700: "#185A61",
        },
        marigold: "#F26B21", // highlight
        indigo: {
          DEFAULT: "#2E3192", // deep accent — headers/footer
          700: "#262A7A",
        },
        ink: "#2B1D14", // text primary — deep brown-black
        muted: "#6B5546", // text secondary — warm grey-brown
        success: "#2E7D4F",
        warning: "#B3261E", // alert — passes contrast on cream
      },
      fontFamily: {
        sans: [
          "var(--font-noto-sans)",
          "Noto Sans",
          "system-ui",
          "sans-serif",
        ],
        deva: ["var(--font-noto-deva)", "Noto Sans Devanagari", "sans-serif"],
        tamil: ["var(--font-noto-tamil)", "Noto Sans Tamil", "sans-serif"],
      },
      fontSize: {
        // Body never below 16px per accessibility spec.
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
      },
      boxShadow: {
        // Warm-toned soft shadow for cards, not the usual cold grey.
        card: "0 2px 8px rgba(120, 78, 45, 0.10), 0 1px 2px rgba(120, 78, 45, 0.06)",
        lift: "0 8px 24px rgba(120, 78, 45, 0.14)",
      },
      minHeight: { tap: "48px" },
      minWidth: { tap: "48px" },
      backgroundImage: {
        // Subtle block-print motif, decoration only — kept very low contrast.
        "block-print":
          "radial-gradient(circle at 1px 1px, rgba(46,49,146,0.05) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
