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

// 輔助函數：檢查 URL 是否應該被過濾
function shouldFilterUrl(url, filterMode, domainBlacklist, domainWhitelist) {
  if (!url) return true;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // 檢查域名是否匹配
    const matchesDomain = (domain) => {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.substring(2);
        return hostname.endsWith(baseDomain);
      } else {
        return hostname === domain || hostname.endsWith('.' + domain);
      }
    };
    
    if (filterMode === 'whitelist') {
      // 白名單模式：只允許在白名單中的域名
      return !domainWhitelist.some(matchesDomain);
    } else {
      // 黑名單模式：排除在黑名單中的域名
      return domainBlacklist.some(matchesDomain);
    }
  } catch (e) {
    console.error('Error parsing URL for filtering:', e);
    return true; // 出錯時預設為過濾掉
  }
}

// 自動擷取每次瀏覽的網頁內容
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // 僅處理主框架的導航
  if (details.frameId !== 0) {
    return;
  }

  // 從存儲中獲取設定
  const settings = await chrome.storage.local.get([
    'autoCaptureEnabled', 
    'filterMode', 
    'domainBlacklist', 
    'domainWhitelist'
  ]);

  // 檢查是否啟用自動擷取
  if (!settings.autoCaptureEnabled) {
    console.log('[AutoCapture] Auto capture is disabled');
    return;
  }

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab || !tab.url) return;

  // 檢查是否為特殊頁面
  if (isSpecialPage(tab.url)) {
    console.log(`[AutoCapture] Skipped special page: ${tab.url}`);
    return;
  }

  // 檢查是否被域名過濾器過濾
  const filterMode = settings.filterMode || 'blacklist';
  const domainBlacklist = settings.domainBlacklist || [];
  const domainWhitelist = settings.domainWhitelist || [];
  
  if (shouldFilterUrl(tab.url, filterMode, domainBlacklist, domainWhitelist)) {
    console.log(`[AutoCapture] Filtered by ${filterMode}: ${tab.url}`);
    return;
  }

  // 嘗試擷取頁面內容
  try {
    const pageData = await injectAndParseContent(tab.id);
    if (pageData) {
      await savePageData(pageData);
      console.log(`[AutoCapture] Saved pageData for: ${pageData.url}`);
    } else {
      console.log(`[AutoCapture] No valid content extracted for: ${tab.url}`);
    }
  } catch (error) {
    console.error(`[AutoCapture] Error processing ${tab.url}:`, error);
  }
}, { url: [{ schemes: ['http', 'https'] }] });
