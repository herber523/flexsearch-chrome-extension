import { resolve } from 'path';
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.js'),
        contentScript: resolve(__dirname, 'src/contentScript.js'),
        popup: resolve(__dirname, 'src/popup.js'),
        main: resolve(__dirname, 'src/main.js'),
        settings: resolve(__dirname, 'src/settings.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
      },
    },
  },
  plugins: [
    {
      name: 'copy-files',
      writeBundle() {
        fs.copyFileSync(resolve(__dirname, 'src/popup.html'), resolve(__dirname, 'dist/popup.html'));
        fs.copyFileSync(resolve(__dirname, 'src/index.html'), resolve(__dirname, 'dist/index.html'));
        fs.copyFileSync(resolve(__dirname, 'src/settings.html'), resolve(__dirname, 'dist/settings.html'));
        fs.copyFileSync(resolve(__dirname, 'public/manifest.json'), resolve(__dirname, 'dist/manifest.json'));
      },
    },
  ],
});