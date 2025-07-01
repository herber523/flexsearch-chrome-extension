// background.js - 處理擴充功能的背景任務
import FlexSearch from 'flexsearch';
import { openDB } from 'idb';

// 初始化資料庫
let db;
let searchIndex;

async function initializeDB() {
  db = await openDB('browsing-history-db', 3, {
    upgrade(db, oldVersion, newVersion) {
      // 每次升級都安全重建 pages store
      if (db.objectStoreNames.contains('pages')) {
        db.deleteObjectStore('pages');
      }
      const pagesStore = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
      pagesStore.createIndex('url', 'url', { unique: false });
      pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  });

  // 初始化搜尋索引，與 main.js 保持一致
  searchIndex = new FlexSearch.Document({
    document: {
      id: 'id',
      index: ['title', 'content', 'excerpt']
    },
    tokenize: 'full',
    encode: false,
    tokenize: function (str) {
      if (!str) return [];
      const chineseChars = str.match(/[\u4e00-\u9fa5]/g) || [];
      const englishWords = str.match(/[a-zA-Z0-9]+/g) || [];
      return [...chineseChars, ...englishWords];
    }
  });

  // 載入現有資料到索引
  const allPages = await db.getAll('pages');
  for (const page of allPages) {
    if (!page.title) page.title = '(無標題)';
    if (!page.excerpt) page.excerpt = '';
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
      existingPage.content = pageData.content || existingPage.content;
      existingPage.title = pageData.title || existingPage.title || '(無標題)';
      existingPage.excerpt = pageData.excerpt || existingPage.excerpt || '';
      existingPage.siteName = pageData.siteName || existingPage.siteName || '';
      existingPage.wordCount = pageData.wordCount || existingPage.wordCount || 0;
      existingPage.readingTime = pageData.readingTime || existingPage.readingTime || 0;
      await db.put('pages', existingPage);
      searchIndex.update(existingPage);
      return { success: true, page: existingPage };
    } else {
      // 新增記錄
      const timestamp = new Date().toISOString();
      const newPage = {
        title: pageData.title || '(無標題)',
        content: pageData.content || '',
        excerpt: pageData.excerpt || '',
        url: pageData.url,
        siteName: pageData.siteName || '',
        wordCount: pageData.wordCount || 0,
        readingTime: pageData.readingTime || 0,
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
