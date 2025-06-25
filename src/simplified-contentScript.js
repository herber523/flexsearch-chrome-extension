// simplified-contentScript.js - 提取頁面內容，無需 import 語句
// 此版本不使用 Readability 庫，改為基本的頁面內容提取

// 此函數將由 popup.js 透過 executeScript 調用
window.parsePageContent = function () {
  try {
    // 使用基本的方法提取頁面內容
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
      title: document.title || 'Unknown Title',
      content: '',
      url: window.location.href || 'Unknown URL',
      error: e.message,
      timestamp: new Date().toISOString()
    };
  }
};
