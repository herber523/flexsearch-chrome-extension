// background-no-imports.js - 不使用 import 的背景腳本版本

// 在建置時，這些導入將被 Vite 處理並捆綁
// import FlexSearch from 'flexsearch';
// import { openDB } from 'idb';

// 初始化資料庫
let db;
let searchIndex;

// 等待 DOM 和所有依賴加載完成
self.onload = () => {
  console.log('背景腳本已載入');
  initializeDB().catch(err => {
    console.error('初始化資料庫失敗:', err);
  });
};

async function initializeDB() {
  console.log('開始初始化資料庫...');
  try {
    // 使用已經捆綁的 idb
    db = await self.openDB('browsing-history-db', 2, { // 更新版本號以觸發升級
      upgrade(db, oldVersion, newVersion) {
        console.log(`資料庫升級: ${oldVersion} -> ${newVersion}`);
        if (oldVersion < 2) {
          // 舊版本才需執行以下操作
          if (db.objectStoreNames.contains('pages')) {
            db.deleteObjectStore('pages');
          }
          const pagesStore = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
          pagesStore.createIndex('url', 'url', { unique: false });
          console.log('建立頁面存儲和索引');
        }
      }
    });

    // 初始化搜尋索引
    searchIndex = new self.FlexSearch.Document({
      document: {
        id: 'id',
        index: ['title', 'content', 'excerpt'] // 增加摘要作為索引欄位
      },
      tokenize: 'full',
      encode: false,
      tokenize: function (str) {
        return str.replace(/[\x00-\x7F]/g, "").split("")
          .concat(str.split(/[^a-zA-Z0-9]/));
      }
    });

    // 載入現有資料到索引
    console.log('載入現有資料到索引');
    const allPages = await db.getAll('pages');
    for (const page of allPages) {
      searchIndex.add(page);
    }
    console.log(`已載入 ${allPages.length} 筆瀏覽記錄到索引`);
    return true;
  } catch (error) {
    console.error('初始化過程發生錯誤:', error);
    throw error;
  }
}

// 儲存頁面資料
async function savePage(pageData) {
  console.log('嘗試儲存頁面:', pageData.title);
  try {
    // 檢查資料庫是否已初始化
    if (!db) {
      console.log('資料庫尚未初始化，進行初始化');
      await initializeDB();
    }

    // 檢查是否已有相同URL的記錄
    const existingPages = await db.getAllFromIndex('pages', 'url', pageData.url);

    if (existingPages.length > 0) {
      // 更新訪問次數和時間戳
      console.log('找到現有記錄，更新訪問資訊');
      const existingPage = existingPages[0];
      existingPage.visitCount = (existingPage.visitCount || 1) + 1;
      existingPage.timestamp = new Date().toISOString();

      await db.put('pages', existingPage);
      searchIndex.update(existingPage);
      return { success: true, page: existingPage };
    } else {
      // 新增記錄
      console.log('新增頁面記錄');
      const timestamp = new Date().toISOString();
      const newPage = {
        ...pageData,
        timestamp,
        visitCount: 1
      };

      const id = await db.add('pages', newPage);
      newPage.id = id;
      searchIndex.add(newPage);

      return { success: true, page: newPage };
    }
  } catch (error) {
    console.error('儲存頁面時發生錯誤:', error);
    return { success: false, error: error.message };
  }
}

// 處理頁面捕獲的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到訊息:', message.action);
  if (message.action === 'captureCurrentPage' && message.pageData) {
    savePage(message.pageData).then(result => {
      console.log('頁面儲存結果:', result.success);
      sendResponse(result);
    }).catch(err => {
      console.error('儲存處理時發生錯誤:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // 表示會異步回覆
  }
  return false;
});

// 全局錯誤處理
self.addEventListener('error', (event) => {
  console.error('未處理的錯誤:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
});
