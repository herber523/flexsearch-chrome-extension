// background.js - 處理擴充功能的背景任務
import FlexSearch from 'flexsearch';
import { openDB } from 'idb';
import { tokenizer } from './tokenizer.js';

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
    encode: tokenizer,
    tokenize: 'forward',
    cache: 100,
    async: false
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

// 移除或註解掉原本的 onCompleted 監聽器，改用 URL 變化監聽

// 儲存每個 tab 的當前 URL，用於比較變化
const tabUrls = new Map();

// 監聽 tab 更新事件（包含 URL 變化）
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  chrome.storage.local.get(['autoCaptureEnabled'], (result) => {
    if (!result.autoCaptureEnabled) return;

    // 只處理 URL 變化且載入完成的情況
    if (changeInfo.status === 'complete' && tab.url) {
      const previousUrl = tabUrls.get(tabId);
      const currentUrl = tab.url;

      // 跳過特殊頁面
      if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
        return;
      }

      // 檢查 URL 是否真的改變了
      if (previousUrl !== currentUrl) {
        console.debug('[AutoCapture] URL changed:', previousUrl, '->', currentUrl);
        tabUrls.set(tabId, currentUrl);

        // 處理新頁面
        handlePageCapture(tabId, tab);
      }
    }
  });
});

// 監聽歷史狀態變化（SPA 路由變化）
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  chrome.storage.local.get(['autoCaptureEnabled'], (result) => {
    if (!result.autoCaptureEnabled) return;

    // 只處理主框架
    if (details.frameId !== 0) return;

    chrome.tabs.get(details.tabId, (tab) => {
      if (!tab || !tab.url) return;

      const previousUrl = tabUrls.get(details.tabId);
      const currentUrl = tab.url;

      if (previousUrl !== currentUrl) {
        console.debug('[AutoCapture] SPA navigation detected:', previousUrl, '->', currentUrl);
        tabUrls.set(details.tabId, currentUrl);

        // SPA 導航需要稍長的等待時間
        setTimeout(() => {
          handlePageCapture(details.tabId, tab, true);
        }, 1500);
      }
    });
  });
}, { url: [{ schemes: ['http', 'https'] }] });

// 統一的頁面捕獲處理函數
async function handlePageCapture(tabId, tab, isSPA = false) {
  if (!tab || !tab.url) return;

  console.debug('[AutoCapture] Capturing page:', tab.url, isSPA ? '(SPA)' : '(Regular)');

  // 統一等待時間，SPA 稍長一些
  const delay = isSPA ? 2000 : 1000;

  setTimeout(async () => {
    try {
      // 首先注入 contentScript
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['contentScript.js']
      });

      // 執行內容解析，統一使用重試機制
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          return new Promise((resolve) => {
            const maxRetries = 5; // 統一重試次數
            let retryCount = 0;

            const attemptCapture = () => {
              // 檢查頁面是否準備好
              const hasContent = document.body && document.body.innerText.trim().length > 50;
              const readyState = document.readyState === 'complete';

              // 檢查是否有主要內容區域（適用於所有網站）
              const hasMainContent = document.querySelector('main') ||
                document.querySelector('[role="main"]') ||
                document.querySelector('#main') ||
                document.querySelector('.main-content') ||
                document.querySelector('article') ||
                document.querySelector('.content') ||
                document.querySelector('[data-testid]') ||
                document.body; // 最後備選

              const isContentReady = hasContent && readyState && hasMainContent;

              if (isContentReady && window.parsePageContent) {
                console.debug('[AutoCapture] Content ready, parsing...');
                const result = window.parsePageContent();
                resolve(result);
              } else if (retryCount < maxRetries) {
                retryCount++;
                console.debug(`[AutoCapture] Retry ${retryCount}/${maxRetries} - waiting for content...`);
                setTimeout(attemptCapture, 800);
              } else {
                // 最後嘗試基本捕獲
                console.debug('[AutoCapture] Max retries reached, attempting final capture...');
                resolve(window.parsePageContent ? window.parsePageContent() : null);
              }
            };

            attemptCapture();
          });
        }
      });

      if (results && results[0] && results[0].result && results[0].result.content) {
        const saveResult = await savePage(results[0].result);
        console.debug('[AutoCapture] Saved successfully:', tab.url);
      } else {
        console.debug('[AutoCapture] No content captured, trying fallback for:', tab.url);
        // 統一使用備用捕獲方法
        await attemptFallbackCapture(tabId, tab);
      }
    } catch (error) {
      console.warn('[AutoCapture] Failed to capture:', tab.url, error.message);

      // 處理權限錯誤
      if (error.message.includes('Cannot access')) {
        console.debug('[AutoCapture] Permission denied, likely CSP restriction');
      } else {
        // 其他錯誤也嘗試備用方法
        await attemptFallbackCapture(tabId, tab);
      }
    }
  }, delay);
}

// 統一的備用捕獲方法
async function attemptFallbackCapture(tabId, tab) {
  try {
    console.debug('[AutoCapture] Attempting fallback capture for:', tab.url);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // 簡化但強健的內容擷取
        const title = document.title ||
          document.querySelector('h1')?.textContent ||
          document.querySelector('h2')?.textContent ||
          '(無標題)';

        const content = document.body?.innerText || '';
        const url = window.location.href;

        if (content.length > 20) {
          const words = content.split(/\s+/).filter(w => w.length > 0);
          return {
            title: title.trim(),
            content: content.trim(),
            excerpt: content.substring(0, 200).trim(),
            url: url,
            siteName: new URL(url).hostname,
            wordCount: words.length,
            readingTime: Math.ceil(words.length / 200)
          };
        }
        return null;
      }
    });

    if (results && results[0] && results[0].result) {
      await savePage(results[0].result);
      console.debug('[AutoCapture] Fallback capture successful:', tab.url);
    }
  } catch (error) {
    console.warn('[AutoCapture] Fallback capture also failed:', error);
  }
}

// 清理已關閉的 tab
chrome.tabs.onRemoved.addListener((tabId) => {
  tabUrls.delete(tabId);
});

// 擴充功能啟動時初始化現有 tabs 的 URL
chrome.runtime.onStartup.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.url && !tab.url.startsWith('chrome://')) {
        tabUrls.set(tab.id, tab.url);
      }
    });
    console.debug('[AutoCapture] Initialized URLs for', tabs.length, 'tabs');
  } catch (error) {
    console.warn('[AutoCapture] Failed to initialize tab URLs:', error);
  }
});
