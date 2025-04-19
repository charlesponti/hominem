import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs#compile-time
  compilerOptions: {},

  // Consult https://github.com/sveltejs/svelte-preprocess
  preprocess: vitePreprocess(),
};

export default config;