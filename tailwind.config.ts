import type { Config } from "tailwindcss";

// Tailwind v4: design tokens are defined in src/styles/theme.css via @theme.
// This file is retained only for IDE tooling compatibility.
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
};

export default config;
