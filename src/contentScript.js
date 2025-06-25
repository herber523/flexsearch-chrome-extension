// contentScript.js - 提取頁面內容
import { Readability } from '@mozilla/readability';

// 此函數將由 popup.js 透過 executeScript 調用
window.parsePageContent = function () {
  try {
    // 創建文檔的深層複製，以防止修改原始 DOM
    const documentClone = document.cloneNode(true);

    // 建立 Readability 實例
    const reader = new Readability(documentClone);

    // 解析頁面
    const article = reader.parse();

    if (article) {
      return {
        title: article.title || document.title,
        content: article.textContent || '',
        excerpt: article.excerpt || '',
        siteName: article.siteName || (new URL(window.location.href)).hostname,
        url: window.location.href,
        wordCount: article.length || 0,
        readingTime: Math.ceil(article.length / 200) || 0 // 估計閱讀時間(分鐘)
      };
    }
  } catch (e) {
    console.error('Readability 解析錯誤:', e);
  }

  // 如果 Readability 解析失敗，使用備用方案
  return {
    title: document.title,
    content: document.body ? document.body.innerText.substring(0, 10000) : '',
    url: window.location.href,
    siteName: (new URL(window.location.href)).hostname,
    isReadabilityFailed: true
  };
};
