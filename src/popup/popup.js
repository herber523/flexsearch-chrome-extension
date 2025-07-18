// popup/popup.js - 重構後的彈出視窗功能模組
import i18n from '../shared/i18n.js';
import { SKIP_URLS } from '../utils/constants.js';

/**
 * 檢查 URL 是否應該跳過
 * @param {string} url 要檢查的 URL
 * @returns {boolean} 是否應該跳過
 */
function shouldSkipUrl(url) {
  return SKIP_URLS.some(skipUrl => url.startsWith(skipUrl));
}

/**
 * 顯示狀態訊息
 * @param {string} message 訊息內容
 * @param {string} type 訊息類型 ('success' | 'error')
 */
function showStatusMessage(message, type = 'success') {
  const statusEl = document.createElement('div');
  statusEl.className = `${type}-msg`;
  statusEl.textContent = message;

  document.body.appendChild(statusEl);

  // 2秒後移除訊息
  setTimeout(() => {
    statusEl.remove();
  }, 2000);
}

/**
 * 提取頁面內容的函數（在目標頁面中執行）
 * @returns {Object} 頁面資料
 */
function extractPageContent() {
  try {
    const title = document.title || '(無標題)';
    const content = document.body ? document.body.innerText.substring(0, 10000) : '';
    const description = document.querySelector('meta[name="description"]')?.content || '';
    const url = window.location.href;
    const siteName = new URL(url).hostname;

    const words = content ? content.split(/\s+/).filter(w => w.length > 0) : [];

    return {
      title: title.trim(),
      content: content.trim(),
      excerpt: description || content.substring(0, 200).trim(),
      url: url,
      siteName: siteName,
      timestamp: new Date().toISOString(),
      wordCount: words.length,
      readingTime: Math.ceil(words.length / 200) || 0
    };
  } catch (error) {
    console.error('頁面內容擷取錯誤:', error);
    return {
      error: error.message,
      title: document.title || '(無標題)',
      url: window.location.href || '(未知 URL)',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 處理手動頁面捕獲
 * @param {Object} currentTab 當前標籤頁
 */
async function handleManualCapture(currentTab) {
  // 檢查是否為可捕獲的頁面
  if (!currentTab.url || shouldSkipUrl(currentTab.url)) {
    showStatusMessage(i18n.getMessage('cannotCapturePage'), 'error');
    return;
  }

  const captureBtn = document.getElementById('capture-page');
  const originalText = captureBtn.textContent;

  // 顯示處理中狀態
  captureBtn.textContent = i18n.getMessage('processing');
  captureBtn.disabled = true;

  try {
    // 在目標頁面中執行內容提取
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: extractPageContent
    });

    if (!results || results.length === 0) {
      throw new Error(i18n.getMessage('cannotCapturePage'));
    }

    const pageData = results[0].result;
    if (!pageData || pageData.error) {
      throw new Error(pageData?.error || i18n.getMessage('cannotCapturePage'));
    }

    // 將頁面資訊發送給背景腳本處理
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'captureCurrentPage',
        pageData: pageData
      }, resolve);
    });

    if (response && response.success) {
      showStatusMessage(i18n.getMessage('captureSuccess'), 'success');
    } else {
      throw new Error(response?.error || i18n.getMessage('captureError'));
    }
  } catch (error) {
    console.error('捕獲頁面時發生錯誤:', error);
    showStatusMessage(i18n.getMessage('captureError', error.message), 'error');
  } finally {
    // 恢復按鈕狀態
    captureBtn.textContent = originalText;
    captureBtn.disabled = false;
  }
}

/**
 * 處理快速搜尋
 * @param {string} query 搜尋關鍵字
 */
function handleQuickSearch(query) {
  if (query.trim()) {
    chrome.tabs.create({
      url: `${chrome.runtime.getURL('index.html')}?q=${encodeURIComponent(query)}`
    });
  }
}

/**
 * 開啟完整搜尋頁面
 */
function openSearchPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
}

/**
 * 開啟設定頁面
 */
function openSettingsPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('settings.html')
  });
}

/**
 * 初始化彈出視窗功能
 */
async function initializePopup() {
  try {
    // Initialize i18n first and apply user language preference
    await i18n.init();

    // Explicitly localize elements after i18n is initialized
    i18n.localizeElements();

    console.log('Popup initialized with language:', i18n.getCurrentLocale());
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
  }

  // 開啟搜尋頁面按鈕
  const openSearchBtn = document.getElementById('open-search-page');
  if (openSearchBtn) {
    openSearchBtn.addEventListener('click', openSearchPage);
  }

  // 快速搜尋輸入框
  const searchInput = document.getElementById('popup-search');
  if (searchInput) {
    searchInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        handleQuickSearch(event.target.value);
      }
    });
  }

  // 捕獲當前頁面按鈕
  const captureBtn = document.getElementById('capture-page');
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          handleManualCapture(tabs[0]);
        }
      });
    });
  }

  // 開啟設定頁面按鈕
  const settingsBtn = document.getElementById('open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsPage);
  }
}

// 當 DOM 載入完成時初始化
document.addEventListener('DOMContentLoaded', initializePopup);