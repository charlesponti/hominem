// vite.config.ts
import { reactRouter } from "file:///Users/charlesponti/Developer/hominem/node_modules/.pnpm/@react-router+dev@7.6.2_@react-router+serve@7.6.2_react-router@7.6.2_react-dom@19.1.0_r_49479c850672ecfc62d0ee69c08bd181/node_modules/@react-router/dev/dist/vite.js";
import tailwindcss from "file:///Users/charlesponti/Developer/hominem/node_modules/.pnpm/@tailwindcss+vite@4.1.10_vite@5.4.19_@types+node@22.15.32_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
import { config } from "file:///Users/charlesponti/Developer/hominem/node_modules/.pnpm/dotenv@16.5.0/node_modules/dotenv/lib/main.js";
import { defineConfig, loadEnv } from "file:///Users/charlesponti/Developer/hominem/node_modules/.pnpm/vite@5.4.19_@types+node@22.15.32_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///Users/charlesponti/Developer/hominem/node_modules/.pnpm/vite-tsconfig-paths@5.1.4_typescript@5.7.3_vite@5.4.19_@types+node@22.15.32_lightningcss@1.30.1_/node_modules/vite-tsconfig-paths/dist/index.js";
config();
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
    server: {
      port: 4446,
      strictPort: true
    },
    define: {
      // Make process.env available in server-side code
      "process.env.DATABASE_URL": JSON.stringify(process.env.DATABASE_URL),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2hhcmxlc3BvbnRpL0RldmVsb3Blci9ob21pbmVtL2FwcHMvY2hhdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2NoYXJsZXNwb250aS9EZXZlbG9wZXIvaG9taW5lbS9hcHBzL2NoYXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2NoYXJsZXNwb250aS9EZXZlbG9wZXIvaG9taW5lbS9hcHBzL2NoYXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyByZWFjdFJvdXRlciB9IGZyb20gJ0ByZWFjdC1yb3V0ZXIvZGV2L3ZpdGUnXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXG5pbXBvcnQgeyBjb25maWcgfSBmcm9tICdkb3RlbnYnXG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSAndml0ZS10c2NvbmZpZy1wYXRocydcblxuLy8gTG9hZCBkb3RlbnYgZm9yIHNlcnZlci1zaWRlIGVudmlyb25tZW50IHZhcmlhYmxlc1xuY29uZmlnKClcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAvLyBMb2FkIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKVxuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW3JlYWN0Um91dGVyKCksIHRzY29uZmlnUGF0aHMoKSwgdGFpbHdpbmRjc3MoKV0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA0NDQ2LFxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgLy8gTWFrZSBwcm9jZXNzLmVudiBhdmFpbGFibGUgaW4gc2VydmVyLXNpZGUgY29kZVxuICAgICAgJ3Byb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCc6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCksXG4gICAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOViksXG4gICAgfSxcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1QsU0FBUyxtQkFBbUI7QUFDM1YsT0FBTyxpQkFBaUI7QUFDeEIsU0FBUyxjQUFjO0FBQ3ZCLFNBQVMsY0FBYyxlQUFlO0FBQ3RDLE9BQU8sbUJBQW1CO0FBRzFCLE9BQU87QUFFUCxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUV4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFFM0MsU0FBTztBQUFBLElBQ0wsU0FBUyxDQUFDLFlBQVksR0FBRyxjQUFjLEdBQUcsWUFBWSxDQUFDO0FBQUEsSUFDdkQsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLElBQ2Q7QUFBQSxJQUNBLFFBQVE7QUFBQTtBQUFBLE1BRU4sNEJBQTRCLEtBQUssVUFBVSxRQUFRLElBQUksWUFBWTtBQUFBLE1BQ25FLHdCQUF3QixLQUFLLFVBQVUsUUFBUSxJQUFJLFFBQVE7QUFBQSxJQUM3RDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
