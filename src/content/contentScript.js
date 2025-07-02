// content/contentScript.js - 重構後的內容腳本
import { Readability } from '@mozilla/readability';
import { CONTENT_LIMITS } from '../utils/constants.js';

/**
 * 解析頁面內容的主要函數
 * @returns {Object|null} 解析後的頁面資料
 */
window.parsePageContent = function() {
  try {
    // 創建文檔的深層複製，以防止修改原始 DOM
    const documentClone = document.cloneNode(true);
    
    // 建立 Readability 實例
    const reader = new Readability(documentClone);
    
    // 解析頁面
    const article = reader.parse();
    
    if (article && article.textContent) {
      const content = article.textContent.substring(0, CONTENT_LIMITS.maxContentLength);
      const words = content.split(/\s+/).filter(w => w.length > 0);
      
      return {
        title: article.title || document.title || '(無標題)',
        content: content,
        excerpt: article.excerpt || content.substring(0, CONTENT_LIMITS.excerptLength),
        siteName: article.siteName || new URL(window.location.href).hostname,
        url: window.location.href,
        wordCount: words.length,
        readingTime: Math.ceil(words.length / CONTENT_LIMITS.wordsPerMinute),
        timestamp: new Date().toISOString(),
        isReadabilityParsed: true
      };
    }
  } catch (error) {
    console.error('Readability 解析錯誤:', error);
  }
  
  // 如果 Readability 解析失敗，使用備用方案
  return parseWithFallback();
};

/**
 * 備用的內容解析方法
 * @returns {Object|null} 解析後的頁面資料
 */
function parseWithFallback() {
  try {
    const title = document.title || '(無標題)';
    const bodyText = document.body ? document.body.innerText : '';
    
    if (bodyText.length < CONTENT_LIMITS.minContentLength) {
      return null;
    }
    
    const content = bodyText.substring(0, CONTENT_LIMITS.maxContentLength);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const excerpt = getMetaDescription() || content.substring(0, CONTENT_LIMITS.excerptLength);
    
    return {
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt.trim(),
      url: window.location.href,
      siteName: new URL(window.location.href).hostname,
      wordCount: words.length,
      readingTime: Math.ceil(words.length / CONTENT_LIMITS.wordsPerMinute),
      timestamp: new Date().toISOString(),
      isReadabilityParsed: false
    };
  } catch (error) {
    console.error('備用解析方法錯誤:', error);
    return null;
  }
}

/**
 * 獲取頁面的 meta description
 * @returns {string} Meta description 內容
 */
function getMetaDescription() {
  const metaDesc = document.querySelector('meta[name="description"]');
  return metaDesc ? metaDesc.content : '';
}

/**
 * 檢查頁面是否適合進行內容提取
 * @returns {boolean} 是否適合提取
 */
function isPageSuitableForExtraction() {
  // 檢查頁面是否有足夠的內容
  const bodyText = document.body ? document.body.innerText.trim() : '';
  if (bodyText.length < CONTENT_LIMITS.minContentLength) {
    return false;
  }
  
  // 檢查頁面是否完全載入
  if (document.readyState !== 'complete') {
    return false;
  }
  
  // 檢查是否有主要內容區域
  const hasMainContent = document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('#main') ||
    document.querySelector('.main-content') ||
    document.querySelector('article') ||
    document.querySelector('.content') ||
    document.querySelector('[data-testid]') ||
    document.body;
  
  return !!hasMainContent;
}

/**
 * 等待頁面內容載入完成
 * @param {number} maxWaitTime 最大等待時間（毫秒）
 * @returns {Promise<boolean>} 是否成功載入
 */
function waitForContentReady(maxWaitTime = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkContent = () => {
      if (isPageSuitableForExtraction()) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > maxWaitTime) {
        resolve(false);
        return;
      }
      
      setTimeout(checkContent, 100);
    };
    
    checkContent();
  });
}

// 如果需要，可以暴露一些工具函數給其他腳本使用
window.contentScriptUtils = {
  isPageSuitableForExtraction,
  waitForContentReady,
  getMetaDescription
};

console.debug('[ContentScript] Content script loaded for:', window.location.href);