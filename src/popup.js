// popup.js - 處理擴充套件彈出視窗的功能

document.addEventListener('DOMContentLoaded', () => {
  // 開啟搜尋頁面按鈕
  document.getElementById('open-search-page').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/index.html') });
  });

  // 快速搜尋輸入
  document.getElementById('popup-search').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      const query = event.target.value;
      if (query.trim()) {
        chrome.tabs.create({
          url: `${chrome.runtime.getURL('src/index.html')}?q=${encodeURIComponent(query)}`
        });
      }
    }
  });

  // 捕獲當前頁面按鈕
  document.getElementById('capture-page').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];

        // 忽略擴充功能頁面和特殊頁面
        if (!currentTab.url ||
          currentTab.url.startsWith('chrome://') ||
          currentTab.url.startsWith('chrome-extension://')) {
          alert('無法捕獲此頁面');
          return;
        }

        // 顯示加載中訊息
        const captureBtn = document.getElementById('capture-page');
        const originalText = captureBtn.textContent;
        captureBtn.textContent = '處理中...';
        captureBtn.disabled = true;

        // 使用 chrome.scripting API 直接在頁面上執行腳本
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          function: () => {
            // 內聯的頁面內容提取函數
            try {
              return {
                title: document.title,
                content: document.body ? document.body.innerText.substring(0, 10000) : '',
                excerpt: document.querySelector('meta[name="description"]')?.content || '',
                url: window.location.href,
                siteName: (new URL(window.location.href)).hostname,
                timestamp: new Date().toISOString(),
                wordCount: document.body ? document.body.innerText.split(/\s+/).length : 0,
                readingTime: document.body ? Math.ceil(document.body.innerText.split(/\s+/).length / 200) : 0
              };
            } catch (e) {
              console.error('頁面內容擷取錯誤:', e);
              return {
                error: e.message,
                title: document.title || 'Unknown Title',
                url: window.location.href || 'Unknown URL',
                timestamp: new Date().toISOString()
              };
            }
          }
        }).then((results) => {
          // 重置按鈕狀態
          captureBtn.textContent = originalText;
          captureBtn.disabled = false;

          if (!results || results.length === 0) {
            alert('無法獲取頁面內容');
            return;
          }

          const pageData = results[0].result;
          if (!pageData) {
            alert('頁面內容解析失敗');
            return;
          }

          // 將頁面資訊發送給背景腳本處理
          chrome.runtime.sendMessage({
            action: 'captureCurrentPage',
            pageData: pageData
          }, (response) => {
            if (response && response.success) {
              const statusEl = document.createElement('div');
              statusEl.className = 'success-msg';
              statusEl.textContent = '成功儲存此頁面！';

              // 顯示成功訊息
              document.body.appendChild(statusEl);

              // 2秒後移除訊息
              setTimeout(() => {
                statusEl.remove();
              }, 2000);
            } else {
              alert('儲存頁面失敗: ' + (response?.error || '未知錯誤'));
            }
          });
        }).catch(error => {
          captureBtn.textContent = originalText;
          captureBtn.disabled = false;
          alert('執行腳本錯誤: ' + error.message);
        });
      }
    });
  });

  // 自動擷取模式開關
  const autoCaptureToggle = document.getElementById('auto-capture-toggle');
  chrome.storage.local.get(['autoCaptureEnabled'], (result) => {
    autoCaptureToggle.checked = !!result.autoCaptureEnabled;
  });
  autoCaptureToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoCaptureEnabled: e.target.checked });
  });
});
