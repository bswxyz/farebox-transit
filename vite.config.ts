import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/farebox-transit/',
  build: {
    outDir: 'docs',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        guide: resolve(__dirname, 'guide/index.html'),
      },
    },
  },
});
