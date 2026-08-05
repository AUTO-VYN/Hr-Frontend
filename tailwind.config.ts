import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        line: "var(--border)",
        brand: {
          DEFAULT: "var(--brand)",
          soft: "var(--brand-soft)",
        },
        hoverbg: "var(--hover)",
        sub: "var(--sub)",
        field: "var(--field)",
        navy: {
          DEFAULT: "var(--navy)",
          2: "var(--navy-2)",
          3: "var(--navy-3)",
        },
        sky: "var(--sky)",
        amber: "var(--amber)",
        glass: "var(--glass)",
        danger: {
          bg: "var(--danger-bg)",
          border: "var(--danger-border)",
          fg: "var(--danger-fg)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        card: "var(--shadow)",
      },
    },
  },
  plugins: [],
};
export default config;
