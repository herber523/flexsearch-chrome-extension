# FlexSearch Finder Chrome 擴充功能

## 專案簡介

FlexSearch Finder 是一個功能強大的 Chrome 擴充功能，可幫助您記錄、索引和搜尋您瀏覽過的網頁內容。它使用 FlexSearch 全文搜索引擎和 IndexedDB 來存儲和檢索數據，支持多種語言（包含中文）的快速搜尋功能。

![FlexSearch Finder 螢幕截圖](./screenshot.png)

## 功能特點

- **瀏覽記錄搜尋**：可快速搜尋曾經瀏覽過的網頁內容和標題
- **多語言支援**：支持中文、英文等多語言搜尋，無需額外設定
- **頁面捕獲**：一鍵保存當前瀏覽頁面到搜尋索引中
- **快速搜尋**：從彈出視窗直接進行搜尋或開啟完整搜尋頁面
- **搜尋結果高亮**：在搜尋結果中高亮顯示匹配的關鍵詞
- **瀏覽統計**：記錄頁面訪問次數和最後訪問時間

## 技術架構

- **前端框架**：使用原生 JavaScript 開發
- **搜尋引擎**：[FlexSearch](https://github.com/nextapps-de/flexsearch) - 高效能的全文搜索庫
- **資料存儲**：[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (透過 idb 函式庫)
- **構建工具**：使用 Vite 進行打包和開發

## 安裝方法

### 從 Chrome 線上應用商店安裝

1. 前往 [Chrome Web Store](https://chrome.google.com/webstore/category/extensions) 搜尋 "FlexSearch Finder"
2. 點擊 "加到 Chrome" 按鈕安裝擴充功能

### 手動安裝開發版本

1. 下載或克隆此儲存庫
2. 打開 Chrome 瀏覽器，進入 `chrome://extensions/`
3. 開啟 "開發者模式"
4. 點擊 "載入未封裝項目"，選擇專案的 `dist` 資料夾
5. 擴充功能應該已加入到您的 Chrome 瀏覽器中

## 使用說明

### 快速搜尋

1. 點擊 Chrome 工具列中的 FlexSearch Finder 圖示
2. 在彈出視窗中的搜尋框輸入關鍵字
3. 按下 Enter 鍵，將開啟完整的搜尋結果頁面

### 儲存當前頁面

1. 瀏覽您希望保存的網頁
2. 點擊擴充功能圖示打開彈出視窗
3. 點擊 "捕獲此頁面" 按鈕
4. 系統會自動保存此頁面的標題、URL 和內容到索引中

### 完整搜尋頁面

1. 點擊擴充功能圖示，然後點擊 "開啟搜尋頁面" 按鈕
2. 在完整搜尋頁中，您可以：
   - 輸入關鍵字進行搜尋
   - 查看匹配結果的標題、內容摘要
   - 查看每頁的訪問次數和最後訪問時間
   - 點擊標題鏈接直接前往原始頁面

## 開發指南

### 安裝依賴

```bash
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

### 建構生產版本

```bash
npm run build
```

### 技術細節

- **核心檔案**:
  - `background.js`: 處理頁面捕獲和資料儲存
  - `main.js`: 搜尋頁面的主要邏輯
  - `popup.js`: 處理彈出視窗操作

- **資料結構**:
  ```javascript
  {
    id: Number,           // 自動生成的唯一 ID
    title: String,        // 頁面標題
    content: String,      // 頁面內容
    url: String,          // 頁面 URL
    timestamp: String,    // ISO 格式的時間戳
    visitCount: Number    // 訪問次數
  }
  ```

## 隱私聲明

FlexSearch Finder 僅在您的本地瀏覽器儲存資料。所有頁面內容和索引都保存在您的設備上，不會上傳到任何伺服器或與第三方共享。您可以隨時從 Chrome 擴充功能頁面中移除此擴充功能，這將刪除所有已儲存的資料。

## 系統需求

- Chrome 87 或更高版本
- 支援 IndexedDB 的瀏覽器

## 授權

此專案採用 MIT 授權。詳情請參閱 [LICENSE](./LICENSE) 文件。

## 致謝

- [FlexSearch](https://github.com/nextapps-de/flexsearch) - 高效能的全文搜索庫
- [idb](https://github.com/jakearchibald/idb) - IndexedDB 的 Promise 包裝庫
- [Vite](https://vitejs.dev/) - 前端工具鏈

## 貢獻指南

歡迎任何形式的貢獻！如果您發現任何問題或有功能請求，請開設 issue 或提交 pull request。

---

開發者: [Your Name]
版本: 1.0
最後更新: 2025年6月26日
