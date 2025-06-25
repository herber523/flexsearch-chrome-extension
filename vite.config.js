import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    outDir: "dist",
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.js'),
        popup: resolve(__dirname, 'src/popup.js'),
        main: resolve(__dirname, 'src/main.js'),
        contentScript: resolve(__dirname, 'src/contentScript.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'copy-html',
      writeBundle() {
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync('dist/src')) {
          fs.mkdirSync('dist/src', { recursive: true });
        }

        fs.copyFileSync('src/popup.html', 'dist/src/popup.html');
        fs.copyFileSync('src/index.html', 'dist/src/index.html');

        fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
      }
    }
  ]
});