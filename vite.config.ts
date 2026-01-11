import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ecs': path.resolve(__dirname, './src/ecs'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@physics': path.resolve(__dirname, './src/physics'),
      '@world': path.resolve(__dirname, './src/world'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'ES2020',
    sourcemap: true,
  },
});
