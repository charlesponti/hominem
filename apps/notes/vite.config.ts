import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import type { ConfigEnv, PluginOption, UserConfig } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isProd = mode === "production";

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()].filter(
      Boolean
    ) as PluginOption[],

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
      port: 4445,
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
      sourcemap: false,
    },
  };
});
