import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        experimental: {
          async: true,
        },
      },
    }),
    tailwindcss(),
  ],
  base: '/ploskowscan',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
