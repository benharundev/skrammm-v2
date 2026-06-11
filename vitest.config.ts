import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    exclude: ["node_modules/**", "src/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "src/tests/**",
        "**/*.d.ts",
        "**/*.config.*",
        "prisma/**",
        "docker/**",
        ".next/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@modules": path.resolve(__dirname, "./src/modules"),
    },
  },
});
