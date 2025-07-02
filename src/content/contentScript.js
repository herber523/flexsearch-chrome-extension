// content/contentScript.js - 重構後的內容腳本（不使用 ES6 modules）

(function() {
  'use strict';
  
  // 定義常數（內嵌，避免 import）
  const CONTENT_LIMITS = {
    maxContentLength: 10000,
    excerptLength: 200,
    minContentLength: 50,
    wordsPerMinute: 200
  };

  /**
   * 解析頁面內容的主要函數（無需 Readability，使用簡化版本）
   * @returns {Object|null} 解析後的頁面資料
   */
  window.parsePageContent = function() {
    try {
      // 使用簡化的內容提取方法
      return parseWithBuiltinMethods();
    } catch (error) {
      console.error('頁面內容解析錯誤:', error);
      return null;
    }
  };

  /**
   * 使用內建方法進行內容解析
   * @returns {Object|null} 解析後的頁面資料
   */
  function parseWithBuiltinMethods() {
    try {
      const title = document.title || '(無標題)';
      let content = '';
      
      // 嘗試多種方法提取主要內容
      content = extractMainContent();
      
      if (content.length < CONTENT_LIMITS.minContentLength) {
        return null;
      }
      
      const trimmedContent = content.substring(0, CONTENT_LIMITS.maxContentLength);
      const words = trimmedContent.split(/\s+/).filter(w => w.length > 0);
      const excerpt = getMetaDescription() || trimmedContent.substring(0, CONTENT_LIMITS.excerptLength);
      
      return {
        title: title.trim(),
        content: trimmedContent.trim(),
        excerpt: excerpt.trim(),
        url: window.location.href,
        siteName: new URL(window.location.href).hostname,
        wordCount: words.length,
        readingTime: Math.ceil(words.length / CONTENT_LIMITS.wordsPerMinute),
        timestamp: new Date().toISOString(),
        isReadabilityParsed: false
      };
    } catch (error) {
      console.error('內建方法解析錯誤:', error);
      return null;
    }
  }

  /**
   * 提取頁面主要內容
   * @returns {string} 提取的內容
   */
  function extractMainContent() {
    // 按優先級順序嘗試不同的內容選擇器
    const contentSelectors = [
      'main',
      '[role="main"]',
      'article',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '#content',
      '#main',
      '.container .content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = extractTextFromElement(element);
        if (text.length > CONTENT_LIMITS.minContentLength) {
          return text;
        }
      }
    }

    // 如果沒有找到合適的內容，使用 body
    return document.body ? extractTextFromElement(document.body) : '';
  }

  /**
   * 從元素中提取文字內容（移除不需要的元素）
   * @param {Element} element 要處理的元素
   * @returns {string} 提取的文字
   */
  function extractTextFromElement(element) {
    // 複製元素以避免修改原始 DOM
    const clone = element.cloneNode(true);
    
    // 移除不需要的元素
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer',
      '.navigation', '.nav', '.menu', '.sidebar',
      '.ads', '.advertisement', '.social-share',
      '.comments', '.comment', '.related-posts',
      '[class*="ad"]', '[id*="ad"]'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    return clone.innerText || clone.textContent || '';
  }

  /**
   * 獲取頁面的 meta description
   * @returns {string} Meta description 內容
   */
  function getMetaDescription() {
    const metaDesc = document.querySelector('meta[name="description"]') ||
                     document.querySelector('meta[property="og:description"]');
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

  // 暴露工具函數給其他腳本使用
  window.contentScriptUtils = {
    isPageSuitableForExtraction: isPageSuitableForExtraction,
    waitForContentReady: waitForContentReady,
    getMetaDescription: getMetaDescription
  };

  console.debug('[ContentScript] Content script loaded for:', window.location.href);
})();