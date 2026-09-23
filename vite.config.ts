import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5177, strictPort: true },
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } }, chunkSizeWarningLimit: 1600 },
});
