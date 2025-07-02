import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    outDir: "dist",
    rollupOptions: {
      input: {
        // 更新為新的目錄結構
        background: resolve(__dirname, 'src/background/background.js'),
        popup: resolve(__dirname, 'src/popup/popup.js'),
        main: resolve(__dirname, 'src/search/main.js'),
        contentScript: resolve(__dirname, 'src/content/contentScript.js')
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
      name: 'copy-files',
      writeBundle() {
        const fs = require('fs');

        // 創建必要的目錄結構
        const dirs = ['dist/popup', 'dist/search'];
        dirs.forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        });

        // 複製 HTML 檔案到對應目錄
        fs.copyFileSync('src/popup/popup.html', 'dist/popup/popup.html');
        fs.copyFileSync('src/search/index.html', 'dist/search/index.html');

        // 複製 manifest.json
        fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
        
        console.log('✅ 檔案複製完成');
      }
    }
  ]
});