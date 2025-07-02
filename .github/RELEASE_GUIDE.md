# GitHub Actions 使用說明

本專案已設置 GitHub Actions 來自動化建置和發布流程。

## 工作流程說明

### 1. CI 工作流程 (`.github/workflows/ci.yml`)

**觸發條件：**
- 推送至 `main` 或 `develop` 分支
- 對 `main` 分支的 Pull Request

**功能：**
- 安裝依賴項
- 建置專案
- 驗證建置檔案
- 檢查 manifest.json 格式
- 上傳建置產物作為 artifact

### 2. Release 工作流程 (`.github/workflows/release.yml`)

**觸發條件：**
- 推送以 `v` 開頭的 tag（例如：`v1.0.0`、`v1.2.3`）

**功能：**
- 建置專案
- 打包成 zip 檔案
- 自動生成更新日誌
- 創建 GitHub Release
- 上傳 Chrome 擴充功能檔案

## 如何發布新版本

1. **更新版本號：**
   ```bash
   # 更新 package.json 中的版本
   npm version patch  # 或 minor, major
   
   # 手動更新 public/manifest.json 中的版本（如果需要）
   ```

2. **推送變更：**
   ```bash
   git add .
   git commit -m "chore: bump version to x.x.x"
   git push origin main
   ```

3. **創建並推送 tag：**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **自動發布：**
   - GitHub Actions 會自動觸發
   - 建置專案並創建 release
   - 上傳 Chrome 擴充功能 zip 檔案

## 本地開發腳本

```bash
# 開發模式
npm run dev

# 建置專案
npm run build

# 打包成 zip（用於手動發布）
npm run package

# 清理建置檔案
npm run clean
```

## 注意事項

- 確保 `package.json` 和 `public/manifest.json` 中的版本號保持同步
- Release 會自動生成更新日誌，基於兩個 tag 之間的 commit 訊息
- 建議使用有意義的 commit 訊息，因為它們會出現在更新日誌中
- Tag 名稱必須以 `v` 開頭才會觸發 release 工作流程
