// @ts-check
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "public/sw.js",
      "prisma/migrations/**",
      "playwright.config.ts",
      "prisma/seed.ts",
      "src/app/sw.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
      import: importPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // ---------------------------------------------------------------------------
      // Module boundary enforcement (TECH_PRD §3.1)
      //
      // Rule 1: app/ may import modules/* only via index.ts (public surface)
      // Rule 2: A module imports another module only via its index.ts
      // Rule 3: lib/ is leaf-level — no module imports
      // Rule 4: Cross-module data access through service calls, not shared queries
      // ---------------------------------------------------------------------------
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // lib/ must not import from modules/
            {
              target: "./src/lib",
              from: "./src/modules",
              message:
                "lib/ is a leaf-level layer — it must not import from modules/. Invert the dependency.",
            },

            // tournament module internals — other modules must use index.ts
            {
              target: "./src/modules/team",
              from: "./src/modules/tournament/service.ts",
              message: "Import from @modules/tournament (index.ts), not from internal service.ts",
            },
            {
              target: "./src/modules/team",
              from: "./src/modules/tournament/types.ts",
              message: "Import from @modules/tournament (index.ts), not from internal types.ts",
            },

            // match module internals
            {
              target: "./src/modules/attendance",
              from: "./src/modules/match/service.ts",
              message: "Import from @modules/match (index.ts), not from internal service.ts",
            },

            // player module internals
            {
              target: "./src/modules/attendance",
              from: "./src/modules/player/service.ts",
              message: "Import from @modules/player (index.ts), not from internal service.ts",
            },
            {
              target: "./src/modules/medical",
              from: "./src/modules/player/service.ts",
              message: "Import from @modules/player (index.ts), not from internal service.ts",
            },

            // shared/auth/can.ts may import lib/ only — not module internals
            {
              target: "./src/modules/shared",
              from: [
                "./src/modules/tournament/service.ts",
                "./src/modules/team/service.ts",
                "./src/modules/player/service.ts",
                "./src/modules/match/service.ts",
              ],
              message:
                "modules/shared must not import module internals. Use lib/db directly for DB checks.",
            },
          ],
        },
      ],

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],

      // General
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
];
