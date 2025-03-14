import { defineConfig } from 'vite'
import { VitePluginNode } from 'vite-plugin-node'

export default defineConfig({
  plugins: [
    ...VitePluginNode({
      adapter: 'aws-lambda',
      appPath: './src/aws-lambda/prolog-email-lambda.ts',
    }),
    ...VitePluginNode({
      adapter: 'aws-lambda',
      appPath: './src/aws-lambda/prolog-csv-lambda.ts',
    }),
  ],
  build: {
    lib: {
      entry: {
        'prolog-email-lambda': './src/aws-lambda/prolog-email-lambda.ts',
        'prolog-csv-lambda': './src/aws-lambda/prolog-csv-lambda.ts',
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['aws-sdk', 'axios', 'mailparser', 'pdf-parse', 'csv-parser'],
    },
    sourcemap: true,
    minify: false,
    outDir: 'dist',
  },
})
