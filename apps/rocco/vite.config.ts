import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import type { ConfigEnv, PluginOption, UserConfig } from "vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isProd = mode === "production";
  const isAnalyze = process.env.ANALYZE === "true";

  return {
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "app",
        filename: "service-worker.ts",
        registerType: "autoUpdate",
        manifest: false, // We'll manage the manifest manually in public/manifest.json
        devOptions: {
          enabled: true,
          type: "module",
        },
      }),
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
      port: 4446,
      strictPort: true,
    },

    build: {
      cssCodeSplit: true,
      minify: isProd ? "terser" : false,
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
        },
      },
      rollupOptions: {
        external: ["node:perf_hooks", "perf_hooks"],
      },
      sourcemap: Boolean(isProd),
    },
  };
});
