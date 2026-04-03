import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    reporter: "verbose",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", "tests/benchmarks"],
    coverage: {
      provider: "v8",
      all: false,
      reporter: ["text", "lcov", "json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/core/types.ts", "src/index.ts"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
