/// <reference types="vitest/config" />
import { readdirSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { isShippedAsset } from './src/config/shippedAssets';

function removeUnshippedAssets(): Plugin {
  let outDir = 'dist';
  return {
    name: 'remove-unshipped-assets',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      for (const entry of readdirSync(outDir, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const file = join(entry.parentPath, entry.name);
        if (!isShippedAsset(relative(outDir, file).split(sep).join('/'))) rmSync(file);
      }
    },
  };
}

export default defineConfig({
  plugins: [removeUnshippedAssets()],
  server: {
    port: 5173,
    host: 'localhost'
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
