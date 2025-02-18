import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    clearMocks: true,
    coverage: {
      provider: "v8",
      clean: true,
      enabled: true,
      exclude: ["src/**/*.spec.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
      reporter: ["lcov"],
      reportsDirectory: "coverage",
    },
  },
});
