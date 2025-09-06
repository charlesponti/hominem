import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import type { ConfigEnv, PluginOption, UserConfig } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
	const isProd = mode === "production";
	const isAnalyze = process.env.ANALYZE === "true";

	return {
		plugins: [
			tailwindcss(),
			reactRouter(),
			tsconfigPaths(),
			// Add bundle analyzer when ANALYZE flag is set
			isAnalyze &&
				visualizer({
					open: true,
					filename: "dist/stats.html",
					gzipSize: true,
					brotliSize: true,
				}),
		].filter(Boolean) as PluginOption[],

		// CSS optimization options
		css: {
			// Enable CSS modules
			modules: {
				localsConvention: "camelCaseOnly" as const,
			},
			// Optimize in production
			devSourcemap: !isProd,
			preprocessorOptions: {
				scss: {
					charset: false,
				},
			},
		},

		server: {
			port: 4454,
			strictPort: true,
			// Enable CORS for development
			cors: true,
			allowedHosts: ["rocco.ponti.local"],
		},

		// General performance optimizations
		build: {
			// Smaller chunks are better for caching
			// cssCodeSplit: true,
			// Reduce bundle size
			minify: isProd ? "terser" : false,
			terserOptions: {
				compress: {
					drop_console: isProd,
					drop_debugger: isProd,
				},
			},
			// Improve source maps in production
			sourcemap: isProd ? "hidden" : true,
		},
	};
});
