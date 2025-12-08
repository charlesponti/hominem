// vite.config.ts
import { reactRouter } from "file:///Users/charlesponti/Developer/hominem/node_modules/.bun/@react-router+dev@7.9.6+5c42936c75888f01/node_modules/@react-router/dev/dist/vite.js";
import tailwindcss from "file:///Users/charlesponti/Developer/hominem/node_modules/.bun/@tailwindcss+vite@4.1.17+6df2da020637c0a8/node_modules/@tailwindcss/vite/dist/index.mjs";
import { defineConfig } from "file:///Users/charlesponti/Developer/hominem/node_modules/.bun/vite@5.4.21+e5fc1144fa51c08c/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///Users/charlesponti/Developer/hominem/node_modules/.bun/vite-tsconfig-paths@5.1.4+aeb4a129cdbc2750/node_modules/vite-tsconfig-paths/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: 4444,
    strictPort: true
  },
  ssr: {
    external: ["node:fs", "node:path", "node:url", "node:http"],
    resolve: {
      conditions: ["node"]
    }
  },
  optimizeDeps: {
    exclude: ["@react-router/node"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2hhcmxlc3BvbnRpL0RldmVsb3Blci9ob21pbmVtL2FwcHMvZmxvcmluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvY2hhcmxlc3BvbnRpL0RldmVsb3Blci9ob21pbmVtL2FwcHMvZmxvcmluL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9jaGFybGVzcG9udGkvRGV2ZWxvcGVyL2hvbWluZW0vYXBwcy9mbG9yaW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyByZWFjdFJvdXRlciB9IGZyb20gJ0ByZWFjdC1yb3V0ZXIvZGV2L3ZpdGUnXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSAndml0ZS10c2NvbmZpZy1wYXRocydcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3RhaWx3aW5kY3NzKCksIHJlYWN0Um91dGVyKCksIHRzY29uZmlnUGF0aHMoKV0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDQ0NDQsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgfSxcbiAgc3NyOiB7XG4gICAgZXh0ZXJuYWw6IFsnbm9kZTpmcycsICdub2RlOnBhdGgnLCAnbm9kZTp1cmwnLCAnbm9kZTpodHRwJ10sXG4gICAgcmVzb2x2ZToge1xuICAgICAgY29uZGl0aW9uczogWydub2RlJ10sXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydAcmVhY3Qtcm91dGVyL25vZGUnXSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFVLFNBQVMsbUJBQW1CO0FBQ2pXLE9BQU8saUJBQWlCO0FBQ3hCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBRTFCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxZQUFZLEdBQUcsWUFBWSxHQUFHLGNBQWMsQ0FBQztBQUFBLEVBQ3ZELFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxVQUFVLENBQUMsV0FBVyxhQUFhLFlBQVksV0FBVztBQUFBLElBQzFELFNBQVM7QUFBQSxNQUNQLFlBQVksQ0FBQyxNQUFNO0FBQUEsSUFDckI7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsb0JBQW9CO0FBQUEsRUFDaEM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
