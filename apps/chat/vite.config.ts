import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'
import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// Load dotenv for server-side environment variables
config()

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
    server: {
      port: 4446,
      strictPort: true,
    },
    define: {
      // Make process.env available in server-side code
      'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  }
})
