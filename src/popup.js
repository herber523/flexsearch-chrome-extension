import { injectAndParseContent, displayMessage } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // 開啟搜尋頁面按鈕
  document.getElementById('open-search-page').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });

  // 快速搜尋輸入
  document.getElementById('popup-search').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      const query = event.target.value;
      if (query.trim()) {
        chrome.tabs.create({
          url: `${chrome.runtime.getURL('index.html')}?q=${encodeURIComponent(query)}`
        });
      }
    }
  });

  // 捕獲當前頁面按鈕
  document.getElementById('capture-page').addEventListener('click', async () => {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!currentTab || !currentTab.url) {
      displayMessage('無法捕獲此頁面: 無效的 Tab', false);
      return;
    }

    // 忽略擴充功能頁面和特殊頁面
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
      displayMessage('無法捕獲此頁面: 特殊頁面', false);
      return;
    }

    const captureBtn = document.getElementById('capture-page');
    const originalText = captureBtn.textContent;
    captureBtn.textContent = '處理中...';
    captureBtn.disabled = true;

    try {
      const pageData = await injectAndParseContent(currentTab.id);

      if (!pageData) {
        displayMessage('頁面內容解析失敗', false);
        return;
      }

      // 將頁面資訊發送給背景腳本處理
      chrome.runtime.sendMessage({
        action: 'captureCurrentPage',
        pageData: pageData
      }, (response) => {
        if (response && response.success) {
          displayMessage('成功儲存此頁面！', true);
        } else {
          displayMessage('儲存頁面失敗: ' + (response?.error || '未知錯誤'), false);
        }
      });
    } catch (error) {
      displayMessage('捕獲頁面時發生錯誤: ' + error.message, false);
    } finally {
      captureBtn.textContent = originalText;
      captureBtn.disabled = false;
    }
  });

  // 自動擷取模式開關
  const autoCaptureToggle = document.getElementById('auto-capture-toggle');
  chrome.storage.local.get(['autoCaptureEnabled'], (result) => {
    autoCaptureToggle.checked = !!result.autoCaptureEnabled;
  });
  autoCaptureToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoCaptureEnabled: e.target.checked });
  });

  // 開啟設定頁面
  document.getElementById('open-settings-page').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});