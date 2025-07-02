import { savePageData, getDbStatus, clearAllData } from './db.js';
import { injectAndParseContent } from './utils.js';

// 處理頁面捕獲的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureCurrentPage' && message.pageData) {
    savePageData(message.pageData).then(result => {
      sendResponse(result);
    });
    return true; // 表示會異步回覆
  } else if (message.type === 'GET_DB_STATUS') {
    (async () => {
      const status = await getDbStatus();
      sendResponse(status);
    })();
    return true;
  } else if (message.type === 'CLEAR_DB') {
    (async () => {
      const result = await clearAllData();
      sendResponse(result);
    })();
    return true;
  }
});

// 輔助函數：檢查是否為特殊頁面
function isSpecialPage(url) {
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://');
}

// 輔助函數：檢查是否在忽略清單中
function isIgnoredDomain(url, ignoredDomains) {
  try {
    const currentHostname = new URL(url).hostname;
    return ignoredDomains.some(domain => currentHostname.includes(domain));
  } catch (e) {
    console.error('Error parsing URL for ignore list:', e);
    return false;
  }
}

// 自動擷取每次瀏覽的網頁內容
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // 僅處理主框架的導航
  if (details.frameId !== 0) {
    return;
  }

  // 從存儲中獲取設定
  const settings = await chrome.storage.sync.get(['autoCapture', 'ignoreList']);

  if (!settings.autoCapture) {
    return; // 如果未啟用自動擷取，則直接返回
  }

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab || !tab.url) return;

  // 檢查是否為特殊頁面或在忽略清單中
  if (isSpecialPage(tab.url) || isIgnoredDomain(tab.url, settings.ignoreList || [])) {
    console.log(`[AutoCapture] Skipped page: ${tab.url}`);
    return;
  }

  const pageData = await injectAndParseContent(tab.id);
  if (pageData) {
    savePageData(pageData);
    console.log(`[AutoCapture] Saved pageData for: ${pageData.url}`);
  } else {
    console.log(`[AutoCapture] No valid content extracted for: ${tab.url}`);
  }
}, { url: [{ schemes: ['http', 'https'] }] });
