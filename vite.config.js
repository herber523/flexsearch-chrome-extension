import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.js'),
        contentScript: resolve(__dirname, 'src/content/contentScript.js'),
        popup: resolve(__dirname, 'src/popup/popup.js'),
        main: resolve(__dirname, 'src/search/main.js'),
        settings: resolve(__dirname, 'src/settings/settings.js'),
        i18n: resolve(__dirname, 'src/shared/i18n.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // 特殊處理 contentScript，放在 content/ 目錄
          if (chunkInfo.name === 'contentScript') {
            return 'content/[name].js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].js',
      },
    },
  },
  plugins: [
    {
      name: 'copy-files',
      writeBundle() {
        // Ensure content directory exists
        const contentDir = resolve(__dirname, 'dist/content');
        if (!fs.existsSync(contentDir)) {
          fs.mkdirSync(contentDir, { recursive: true });
        }

        // Copy HTML files
        fs.copyFileSync(resolve(__dirname, 'src/popup/popup.html'), resolve(__dirname, 'dist/popup.html'));
        fs.copyFileSync(resolve(__dirname, 'src/search/index.html'), resolve(__dirname, 'dist/index.html'));
        fs.copyFileSync(resolve(__dirname, 'src/settings/settings.html'), resolve(__dirname, 'dist/settings.html'));
        fs.copyFileSync(resolve(__dirname, 'public/manifest.json'), resolve(__dirname, 'dist/manifest.json'));

        // Copy _locales directory for i18n
        const localesSource = resolve(__dirname, 'src/_locales');
        const localesTarget = resolve(__dirname, 'dist/_locales');

        if (fs.existsSync(localesSource)) {
          // Create target directory if it doesn't exist
          if (!fs.existsSync(localesTarget)) {
            fs.mkdirSync(localesTarget, { recursive: true });
          }

          // Copy all locale directories
          const locales = fs.readdirSync(localesSource, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          locales.forEach(locale => {
            const sourceDir = resolve(localesSource, locale);
            const targetDir = resolve(localesTarget, locale);

            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            // Copy messages.json
            const messagesSource = resolve(sourceDir, 'messages.json');
            const messagesTarget = resolve(targetDir, 'messages.json');

            if (fs.existsSync(messagesSource)) {
              fs.copyFileSync(messagesSource, messagesTarget);
            }
          });
        }
      },
    },
  ],
});