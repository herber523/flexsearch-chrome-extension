// background/auto-capture.js - 自動捕獲頁面內容的模組
import { savePage } from '../shared/database.js';
import { addToIndex, updateInIndex } from '../shared/search-engine.js';
import { AUTO_CAPTURE_CONFIG, SKIP_URLS } from '../utils/constants.js';

// 儲存每個 tab 的當前 URL，用於比較變化
const tabUrls = new Map();

/**
 * 檢查 URL 是否應該跳過
 * @param {string} url 要檢查的 URL
 * @param {string} filterMode 過濾模式 ('blacklist' 或 'whitelist')
 * @param {Set<string>} domainBlacklist 網域黑名單
 * @param {Set<string>} domainWhitelist 網域白名單
 * @returns {boolean} 是否應該跳過
 */
function shouldSkipUrl(url, filterMode = 'blacklist', domainBlacklist = new Set(), domainWhitelist = new Set()) {
  // 檢查預設跳過的 URL
  if (SKIP_URLS.some(skipUrl => url.startsWith(skipUrl))) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // 根據過濾模式決定邏輯
    if (filterMode === 'whitelist') {
      // 白名單模式：只有在白名單中的域名才不跳過
      return !isHostnameInDomainList(hostname, domainWhitelist);
    } else {
      // 黑名單模式：在黑名單中的域名要跳過
      return isHostnameInDomainList(hostname, domainBlacklist);
    }
  } catch (error) {
    console.warn('[AutoCapture] Invalid URL for domain check:', url, error);
    return true; // 無效 URL 默認跳過
  }
}

/**
 * 檢查主機名是否在域名列表中
 * @param {string} hostname 主機名
 * @param {Set<string>} domainList 域名列表
 * @returns {boolean} 是否在列表中
 */
function isHostnameInDomainList(hostname, domainList) {
  // 檢查完整網域匹配
  if (domainList.has(hostname)) {
    return true;
  }

  // 檢查萬用字元匹配 (*.example.com)
  for (const domain of domainList) {
    if (domain.startsWith('*.')) {
      const pattern = domain.substring(2);
      if (hostname.endsWith('.' + pattern) || hostname === pattern) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 統一的頁面捕獲處理函數
 * @param {number} tabId Tab ID
 * @param {Object} tab Tab 物件
 * @param {boolean} isSPA 是否為 SPA 導航
 */
export async function handlePageCapture(tabId, tab, isSPA = false) {
  // 取得域名過濾設定
  const storage = await chrome.storage.local.get([
    'filterMode',
    'domainBlacklist',
    'domainWhitelist'
  ]);
  
  const filterMode = storage.filterMode || 'blacklist';
  const domainBlacklist = new Set(storage.domainBlacklist || []);
  const domainWhitelist = new Set(storage.domainWhitelist || []);
  
  if (!tab || !tab.url || shouldSkipUrl(tab.url, filterMode, domainBlacklist, domainWhitelist)) {
    console.debug('[AutoCapture] Skipping URL:', tab.url, 'Mode:', filterMode);
    return;
  }

  console.debug('[AutoCapture] Capturing page:', tab.url, isSPA ? '(SPA)' : '(Regular)');

  // 統一等待時間，SPA 稍長一些
  const delay = isSPA ? AUTO_CAPTURE_CONFIG.spaPageDelay : AUTO_CAPTURE_CONFIG.regularPageDelay;

  setTimeout(async () => {
    try {
      // 首先注入 contentScript
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/contentScript.js']
      });

      // 執行內容解析，統一使用重試機制
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: captureWithRetry
      });

      if (results && results[0] && results[0].result && results[0].result.content) {
        const saveResult = await savePage(results[0].result);
        
        if (saveResult.success) {
          // 更新搜尋索引
          if (saveResult.isUpdate) {
            updateInIndex(saveResult.page);
          } else {
            addToIndex(saveResult.page);
          }
          console.debug('[AutoCapture] Saved successfully:', tab.url);
        }
      } else {
        console.debug('[AutoCapture] No content captured, trying fallback for:', tab.url);
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

/**
 * 帶重試機制的內容捕獲函數（在頁面中執行）
 * @returns {Promise<Object|null>} 捕獲的頁面內容
 */
function captureWithRetry() {
  return new Promise((resolve) => {
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
      } else if (retryCount < 5) { // AUTO_CAPTURE_CONFIG.maxRetries
        retryCount++;
        console.debug(`[AutoCapture] Retry ${retryCount}/5 - waiting for content...`);
        setTimeout(attemptCapture, 800); // AUTO_CAPTURE_CONFIG.retryDelay
      } else {
        // 最後嘗試基本捕獲
        console.debug('[AutoCapture] Max retries reached, attempting final capture...');
        resolve(window.parsePageContent ? window.parsePageContent() : null);
      }
    };

    attemptCapture();
  });
}

/**
 * 統一的備用捕獲方法
 * @param {number} tabId Tab ID
 * @param {Object} tab Tab 物件
 */
async function attemptFallbackCapture(tabId, tab) {
  try {
    console.debug('[AutoCapture] Attempting fallback capture for:', tab.url);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: simpleFallbackCapture
    });

    if (results && results[0] && results[0].result) {
      const saveResult = await savePage(results[0].result);
      
      if (saveResult.success) {
        // 更新搜尋索引
        if (saveResult.isUpdate) {
          updateInIndex(saveResult.page);
        } else {
          addToIndex(saveResult.page);
        }
        console.debug('[AutoCapture] Fallback capture successful:', tab.url);
      }
    }
  } catch (error) {
    console.warn('[AutoCapture] Fallback capture also failed:', error);
  }
}

/**
 * 簡化的備用內容擷取函數（在頁面中執行）
 * @returns {Object|null} 捕獲的頁面內容
 */
function simpleFallbackCapture() {
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

/**
 * 初始化自動捕獲功能
 */
export function initializeAutoCapture() {
  // 監聽 tab 更新事件（包含 URL 變化）
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    chrome.storage.local.get(['autoCaptureEnabled', 'domainBlacklist'], (result) => {
      if (!result.autoCaptureEnabled) return;

      // 只處理 URL 變化且載入完成的情況
      if (changeInfo.status === 'complete' && tab.url) {
        const previousUrl = tabUrls.get(tabId);
        const currentUrl = tab.url;
        const domainBlacklist = new Set(result.domainBlacklist || []);

        // 跳過特殊頁面和黑名單網域
        if (shouldSkipUrl(currentUrl, domainBlacklist)) {
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
          }, AUTO_CAPTURE_CONFIG.contentCheckDelay);
        }
      });
    });
  }, { url: [{ schemes: ['http', 'https'] }] });

  // 清理已關閉的 tab
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabUrls.delete(tabId);
  });

  // 擴充功能啟動時初始化現有 tabs 的 URL
  chrome.runtime.onStartup.addListener(async () => {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && !shouldSkipUrl(tab.url, new Set())) {
          tabUrls.set(tab.id, tab.url);
        }
      });
      console.debug('[AutoCapture] Initialized URLs for', tabs.length, 'tabs');
    } catch (error) {
      console.warn('[AutoCapture] Failed to initialize tab URLs:', error);
    }
  });
}