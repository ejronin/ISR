import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../..');

export default defineConfig({
  root: repositoryRoot,
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: path.resolve(here, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(here, 'index.html')
    }
  }
});
