// background.js - 處理擴充功能的背景任務
import FlexSearch from 'flexsearch';
import { openDB } from 'idb';

// 初始化資料庫
let db;
let searchIndex;

async function initializeDB() {
  db = await openDB('browsing-history-db', 2, { // 更新版本號以觸發升級
    upgrade(db, oldVersion, newVersion) {
      if (oldVersion < 2) {
        // 舊版本才需執行以下操作
        if (db.objectStoreNames.contains('pages')) {
          db.deleteObjectStore('pages');
        }
        const pagesStore = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
        pagesStore.createIndex('url', 'url', { unique: false });
      }
    }
  });

  // 初始化搜尋索引
  searchIndex = new FlexSearch.Document({
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
  const allPages = await db.getAll('pages');
  for (const page of allPages) {
    searchIndex.add(page);
  }
  console.log(`已載入 ${allPages.length} 筆瀏覽記錄到索引`);
}

// 儲存頁面資料
async function savePage(pageData) {
  try {
    // 檢查資料庫是否已初始化
    if (!db) {
      await initializeDB();
    }

    // 檢查是否已有相同URL的記錄
    const existingPages = await db.getAllFromIndex('pages', 'url', pageData.url);

    if (existingPages.length > 0) {
      // 更新訪問次數和時間戳
      const existingPage = existingPages[0];
      existingPage.visitCount = (existingPage.visitCount || 1) + 1;
      existingPage.timestamp = new Date().toISOString();

      await db.put('pages', existingPage);
      searchIndex.update(existingPage);
      return { success: true, page: existingPage };
    } else {
      // 新增記錄
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

// 初始化擴充功能
initializeDB();

// 處理頁面捕獲的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureCurrentPage' && message.pageData) {
    savePage(message.pageData).then(result => {
      sendResponse(result);
    });
    return true; // 表示會異步回覆
  }
});

// 當點擊擴充功能圖示時（如果未設定 popup）
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/index.html') });
});
