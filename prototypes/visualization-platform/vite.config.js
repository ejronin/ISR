import { defineConfig } from 'vite';
import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../..');
const outputRoot = path.resolve(here, 'dist');

const prototypeDataFiles = [
  'assets/geography/atlas-reference-geography.geojson',
  'data/oil-routes-r1.json',
  'data/sanctions-financial-network-v1.json',
  'data/integration-v1.2/economics.json',
  'data/public-current-state.json'
];

function copyCurrentGuideInputs() {
  return {
    name: 'copy-current-guide-prototype-inputs',
    apply: 'build',
    async closeBundle() {
      for (const relativePath of prototypeDataFiles) {
        const source = path.resolve(repositoryRoot, relativePath);
        const target = path.resolve(outputRoot, relativePath);
        await access(source);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(source, target);
      }
    }
  };
}

export default defineConfig({
  root: repositoryRoot,
  publicDir: false,
  plugins: [copyCurrentGuideInputs()],
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
    outDir: outputRoot,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(here, 'index.html')
    }
  }
});
