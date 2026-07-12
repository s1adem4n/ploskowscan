import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 80,
  singleQuote: true,
  htmlWhitespaceSensitivity: 'ignore',
  sortTailwindcss: {
    stylesheet: './src/app.css',
  },
  sortImports: true,
  svelte: true,
});
