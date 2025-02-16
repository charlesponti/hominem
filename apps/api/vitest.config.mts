import "dotenv/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const { CI } = process.env;

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: true,
		environment: "node",
		setupFiles: "./test/test.setup.ts",
		clearMocks: true,
		exclude: ["**/node_modules/**", "**/build/**"],
		env: {
			DATABASE_URL: CI
				? "postgres://postgres:postgres@localhost:5432/hominem-test"
				: "postgres://postgres:postgres@localhost:4433/hominem-test",
		},
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
