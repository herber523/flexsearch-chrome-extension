# FlexSearch Finder Chrome 擴充功能

[![CI](https://github.com/herber523/flexsearch-chrome-extension/workflows/CI/badge.svg)](https://github.com/herber523/flexsearch-chrome-extension/actions)
[![Release](https://github.com/herber523/flexsearch-chrome-extension/workflows/Release/badge.svg)](https://github.com/herber523/flexsearch-chrome-extension/releases)

## 專案簡介

FlexSearch Finder 是一個功能強大的 Chrome 擴充功能，可幫助您記錄、索引和搜尋您瀏覽過的網頁內容。它使用 FlexSearch 全文搜索引擎和 IndexedDB 來存儲和檢索數據，支持多種語言（包含中文）的快速搜尋功能。

## ✨ 功能特點

- **🚀 自動捕獲**：智慧監測頁面變化，自動保存瀏覽內容（可開關）
- **🔍 快速搜尋**：可快速搜尋曾經瀏覽過的網頁內容和標題
- **🌏 多語言支援**：支持中文、英文等多語言搜尋，無需額外設定
- **📄 內容解析**：使用 Mozilla Readability 提取乾淨的頁面內容
- **💡 智慧重試**：針對 SPA 和複雜網站的強化捕獲機制
- **⚡ 高效搜尋**：從彈出視窗直接進行搜尋或開啟完整搜尋頁面
- **🎯 結果高亮**：在搜尋結果中高亮顯示匹配的關鍵詞
- **📊 瀏覽統計**：記錄頁面訪問次數和最後訪問時間

## 🏗️ 技術架構

- **前端框架**：原生 JavaScript + ES6 Modules
- **搜尋引擎**：[FlexSearch](https://github.com/nextapps-de/flexsearch) - 高效能的全文搜索庫
- **資料存儲**：[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (透過 idb 函式庫)
- **構建工具**：[Vite](https://vitejs.dev/) - 現代前端建置工具
- **內容解析**：[Mozilla Readability](https://github.com/mozilla/readability) - 提取網頁主要內容
- **CI/CD**：GitHub Actions 自動化建置和發布

## 📦 安裝方法

### 從 Release 安裝 (推薦)

1. 前往 [Releases 頁面](https://github.com/herber523/flexsearch-chrome-extension/releases)
2. 下載最新版本的 `flexsearch-chrome-extension-vX.X.X.zip`
3. 解壓縮檔案
4. 打開 Chrome 瀏覽器，進入 `chrome://extensions/`
5. 開啟右上角的「開發者模式」
6. 點擊「載入未封裝項目」，選擇解壓縮後的資料夾

### 開發版本安裝

1. 下載或克隆此儲存庫：
   ```bash
   git clone https://github.com/herber523/flexsearch-chrome-extension.git
   cd flexsearch-chrome-extension
   ```

2. 安裝依賴並構建專案：
   ```bash
   npm install
   npm run build
   ```

3. 在 Chrome 中載入 `dist` 資料夾

## 🚀 使用說明

### 自動捕獲模式 (推薦)

擴充功能具備智慧自動捕獲功能，可自動保存您瀏覽的頁面：

1. **啟用自動捕獲**：點擊擴充功能圖示，在彈出視窗中開啟「自動捕獲」選項
2. **智慧監測**：系統會自動監測 URL 變化和 SPA 路由變化
3. **強化重試**：針對複雜網站（如 Atlassian、Notion、GitHub）提供重試機制
4. **無感體驗**：背景自動運行，無需手動操作

### 快速搜尋

1. 點擊 Chrome 工具列中的 FlexSearch Finder 圖示
2. 在彈出視窗中的搜尋框輸入關鍵字
3. 按下 Enter 鍵，將開啟完整的搜尋結果頁面

### 手動捕獲頁面

1. 瀏覽您希望保存的網頁
2. 點擊擴充功能圖示打開彈出視窗
3. 點擊「捕獲此頁面」按鈕
4. 系統會自動保存此頁面的標題、URL 和內容到索引中

### 完整搜尋頁面

1. 點擊擴充功能圖示，然後點擊「開啟搜尋頁面」按鈕
2. 在完整搜尋頁中，您可以：
   - 輸入關鍵字進行搜尋
   - 查看匹配結果的標題、內容摘要
   - 查看每頁的訪問次數和最後訪問時間
   - 點擊標題鏈接直接前往原始頁面

### 自動捕獲特色

- **智慧 URL 監測**：監聽 `chrome.tabs.onUpdated` 和 `chrome.webNavigation.onHistoryStateUpdated`
- **SPA 支援**：完美支援單頁應用程式的路由變化
- **重試機制**：最多 5 次重試，確保內容完整捕獲
- **備用方案**：主要解析失敗時自動使用簡化捕獲
- **記憶體管理**：自動清理已關閉分頁的 URL 快取

## 🛠️ 開發指南

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

### 建構生產版本

```bash
npm run build
```

### 打包擴充功能

```bash
npm run package  # 會建置並打包成 zip 檔案
```

### 清理建置檔案

```bash
npm run clean
```

### CI/CD 自動化

專案配置了 GitHub Actions 來自動化建置和發布：

- **CI 工作流程** (`.github/workflows/ci.yml`)：
  - 在推送到 `main`/`develop` 分支或 PR 時觸發
  - 執行建置驗證和檔案完整性檢查
  - 上傳建置產物

- **Release 工作流程** (`.github/workflows/release.yml`)：
  - 推送以 `v` 開頭的 tag 時觸發（如 `v1.0.0`）
  - 自動建置並創建 GitHub Release
  - 打包並上傳 Chrome 擴充功能 zip 檔案

#### 發布新版本

1. 更新版本號並推送：
   ```bash
   npm version patch  # 或 minor, major
   git push origin main
   ```

2. 創建並推送 tag：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. GitHub Actions 會自動建置並創建 release

### 🏗️ 技術架構詳細

#### 核心檔案結構

```
src/
├── background.js      # 背景服務：自動捕獲、資料庫管理
├── contentScript.js   # 內容腳本：頁面內容解析
├── popup.js          # 彈出視窗：快速搜尋和設定
├── main.js          # 主搜尋頁面：完整搜尋介面
├── tokenizer.js     # 自定義分詞器：中文搜尋優化
├── popup.html       # 彈出視窗 HTML
└── index.html       # 主搜尋頁面 HTML

public/
└── manifest.json    # 擴充功能配置

.github/workflows/
├── ci.yml          # 持續整合工作流程
└── release.yml     # 自動發布工作流程
```

#### 自動捕獲機制

- **URL 變化監聽**：使用 `chrome.tabs.onUpdated` 監聽頁面狀態變化
- **SPA 路由監聽**：使用 `chrome.webNavigation.onHistoryStateUpdated` 處理單頁應用
- **智慧重試系統**：
  - 最多 5 次重試，每次間隔 800ms
  - 檢查頁面載入狀態和主要內容區域
  - 針對複雜網站延長等待時間
- **備用捕獲機制**：主要解析失敗時使用簡化方法
- **記憶體管理**：追蹤分頁 URL 狀態，自動清理已關閉分頁
#### 資料結構

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

#### 搜尋索引配置

- 支援中文、英文、數字的混合搜尋
- 針對標題、內容、摘要建立全文索引
- 使用自定義分詞器優化中文搜尋體驗
- FlexSearch Document 模式，支援多欄位搜尋

## ⚠️ 已知問題與限制

### 網站相容性
- 部分具有嚴格 CSP (Content Security Policy) 的網站可能無法捕獲
- 某些大量使用 Shadow DOM 的現代網站需要額外處理
- 動態載入內容的網站已透過重試機制改善，但仍可能有遺漏

### 效能限制
- 大型頁面（超過 10,000 字）的處理可能較慢
- IndexedDB 儲存空間有限，建議定期清理舊資料
- 同時開啟大量分頁時可能影響捕獲效能

### 功能限制
- 無法捕獲需要登入的私密內容
- 無法處理 PDF、圖片等非 HTML 內容
- 搜尋結果排序仍在持續優化中

## 🔒 隱私聲明

FlexSearch Finder 高度重視您的隱私安全：

- **本地儲存**：所有資料僅存儲在您的本地瀏覽器中
- **零上傳**：不會上傳任何內容到外部伺服器
- **無追蹤**：不收集任何使用者行為資料
- **可控制**：您可以隨時清除所有已儲存的資料
- **開源透明**：程式碼完全開源，可自行檢視和修改

移除擴充功能將會自動刪除所有已儲存的索引資料。

## 💻 系統需求

- **瀏覽器**：Chrome 88 或更高版本（需支援 Manifest V3）
- **API 支援**：IndexedDB、chrome.scripting、chrome.webNavigation
- **儲存空間**：建議至少 50MB 可用空間（用於索引資料）
- **記憶體**：建議 4GB 以上 RAM（處理大量頁面時）

## 🙏 致謝

本專案使用了以下優秀的開源專案：

- [FlexSearch](https://github.com/nextapps-de/flexsearch) - 高效能的全文搜索庫
- [idb](https://github.com/jakearchibald/idb) - IndexedDB 的 Promise 包裝庫
- [Mozilla Readability](https://github.com/mozilla/readability) - 網頁內容提取工具
- [Vite](https://vitejs.dev/) - 現代前端工具鏈

## 🤝 貢獻指南

歡迎任何形式的貢獻！特別歡迎：

### 回報問題
- 🐛 Bug 回報：請提供詳細的重現步驟
- 💡 功能建議：說明使用場景和預期效果
- 🧪 測試回饋：分享使用體驗和改進建議

### 程式碼貢獻
1. Fork 本專案
2. 創建功能分支：`git checkout -b feature/amazing-feature`
3. 提交變更：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 開啟 Pull Request

### 開發規範
- 使用英文 commit 訊息（遵循 Conventional Commits）
- 確保 CI 檢查通過
- 添加適當的註解和文件
- 保持程式碼簡潔和可讀性

## 📞 聯絡方式

如有任何問題或建議，歡迎通過以下方式聯絡：

- 📝 [GitHub Issues](https://github.com/herber523/flexsearch-chrome-extension/issues) - 回報問題或功能請求
- 🔀 [Pull Requests](https://github.com/herber523/flexsearch-chrome-extension/pulls) - 提交程式碼貢獻
- 📖 [GitHub Discussions](https://github.com/herber523/flexsearch-chrome-extension/discussions) - 技術討論和問答

---

**開發狀態**: ✅ 穩定版本  
**版本**: 1.0.0  
**最後更新**: 2025年7月2日
