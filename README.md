# FlexSearch Finder Chrome 擴充功能

## ⚠️ 開發狀態

**本專案目前正在開發中，尚未完成最終版本，請勿用於正式環境使用。**

功能可能不穩定，API 可能會有變更。歡迎開發者參與測試和回饋問題。

## 專案簡介

FlexSearch Finder 是一個功能強大的 Chrome 擴充功能，可幫助您記錄、索引和搜尋您瀏覽過的網頁內容。它使用 FlexSearch 全文搜索引擎和 IndexedDB 來存儲和檢索數據，支持多種語言（包含中文）的快速搜尋功能。

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
- **內容解析**：[Mozilla Readability](https://github.com/mozilla/readability) - 提取網頁主要內容

## 安裝方法

### 開發版本安裝 (僅供測試)

**注意：本專案仍在開發中，僅供開發者測試使用**

1. 下載或克隆此儲存庫：
   ```bash
   git clone https://github.com/your-username/flexsearch-chrome-extension.git
   cd flexsearch-chrome-extension
   ```

2. 安裝依賴並構建專案：
   ```bash
   npm install
   npm run build
   ```

3. 安裝到 Chrome：
   - 打開 Chrome 瀏覽器，進入 `chrome://extensions/`
   - 開啟右上角的「開發者模式」
   - 點擊「載入未封裝項目」，選擇專案的 `dist` 資料夾
   - 擴充功能應該已加入到您的 Chrome 瀏覽器中

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
  - `background.js`: 處理頁面捕獲和資料儲存的後台服務
  - `main.js`: 搜尋頁面的主要邏輯和索引管理
  - `popup.js`: 處理彈出視窗操作和快速搜尋
  - `contentScript.js`: 注入頁面的內容腳本，用於提取頁面內容

- **資料結構**:
  ```javascript
  {
    id: Number,           // 自動生成的唯一 ID
    title: String,        // 頁面標題
    content: String,      // 頁面內容（已清理的文字）
    excerpt: String,      // 內容摘要
    url: String,          // 頁面 URL
    siteName: String,     // 網站名稱
    timestamp: String,    // ISO 格式的時間戳
    visitCount: Number,   // 訪問次數
    wordCount: Number,    // 字數統計
    readingTime: Number   // 預估閱讀時間（分鐘）
  }
  ```

- **搜尋索引配置**:
  - 支援中文、英文、數字的混合搜尋
  - 針對標題、內容、摘要建立全文索引
  - 使用自定義分詞器優化中文搜尋體驗

## 已知問題與限制

- 某些使用 JavaScript 動態載入內容的網站可能無法完整捕獲
- 大型頁面的處理可能較慢
- 搜尋功能仍在優化中，部分關鍵字可能無法正確匹配
- IndexedDB 資料庫版本升級時可能需要清除舊資料

## 開發計劃

- [ ] 改進內容提取演算法
- [ ] 優化搜尋演算法和中文分詞
- [ ] 加入搜尋結果排序選項
- [ ] 新增資料匯出/匯入功能
- [ ] 改善使用者介面設計
- [ ] 加入更多設定選項

## 隱私聲明

FlexSearch Finder 僅在您的本地瀏覽器儲存資料。所有頁面內容和索引都保存在您的設備上，不會上傳到任何伺服器或與第三方共享。您可以隨時從 Chrome 擴充功能頁面中移除此擴充功能，這將刪除所有已儲存的資料。

## 系統需求

- Chrome 88 或更高版本（需支援 Manifest V3）
- 支援 IndexedDB 的瀏覽器
- 至少 50MB 可用儲存空間（用於索引資料）

## 致謝

- [FlexSearch](https://github.com/nextapps-de/flexsearch) - 高效能的全文搜索庫
- [idb](https://github.com/jakearchibald/idb) - IndexedDB 的 Promise 包裝庫
- [Mozilla Readability](https://github.com/mozilla/readability) - 網頁內容提取工具
- [Vite](https://vitejs.dev/) - 現代前端工具鏈

## 貢獻指南

歡迎任何形式的貢獻！由於專案仍在開發中，特別歡迎：

- 🐛 回報 Bug 和問題
- 💡 提出功能建議
- 🧪 協助測試
- 📝 改善文件
- 🔧 提交程式碼修正

如果您發現任何問題或有功能請求，請開設 issue 或提交 pull request。

## 聯絡方式

如有任何問題或建議，歡迎通過以下方式聯絡：

- 開設 [GitHub Issue](https://github.com/your-username/flexsearch-chrome-extension/issues)
- 提交 [Pull Request](https://github.com/your-username/flexsearch-chrome-extension/pulls)

---

**開發狀態**: 🚧 開發中  
**版本**: 1.0.0-dev  
**最後更新**: 2025年6月26日
