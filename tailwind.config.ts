import type { Config } from "tailwindcss";

// Deliberately unbranded — puck.config.tsx's blocks use only generic Tailwind utilities plus
// CSS custom properties (--brand-accent/--brand-ink) for per-tenant color, so no theme
// extension is needed here the way a single-tenant site's config would have one.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
