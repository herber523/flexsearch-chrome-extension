// shared/search-engine.js - 統一的搜尋引擎模組
import FlexSearch from 'flexsearch';
import { tokenizer } from './tokenizer.js';
import { SEARCH_CONFIG } from '../utils/constants.js';

let searchIndex = null;

/**
 * 創建搜尋索引
 * @returns {FlexSearch.Document} 搜尋索引實例
 */
export function createSearchIndex() {
  if (searchIndex) return searchIndex;
  
  searchIndex = new FlexSearch.Document({
    ...SEARCH_CONFIG,
    encode: tokenizer
  });
  
  return searchIndex;
}

/**
 * 獲取搜尋索引實例
 * @returns {FlexSearch.Document} 搜尋索引實例
 */
export function getSearchIndex() {
  if (!searchIndex) {
    return createSearchIndex();
  }
  return searchIndex;
}

/**
 * 將頁面添加到搜尋索引
 * @param {Object} page 頁面資料
 */
export function addToIndex(page) {
  const index = getSearchIndex();
  
  // 確保必要欄位不為空
  const pageData = {
    ...page,
    title: page.title || '(無標題)',
    excerpt: page.excerpt || '',
    content: page.content || ''
  };
  
  try {
    index.add(pageData);
  } catch (error) {
    console.error('添加到搜尋索引時發生錯誤:', error);
  }
}

/**
 * 更新搜尋索引中的頁面
 * @param {Object} page 頁面資料
 */
export function updateInIndex(page) {
  const index = getSearchIndex();
  
  // 確保必要欄位不為空
  const pageData = {
    ...page,
    title: page.title || '(無標題)',
    excerpt: page.excerpt || '',
    content: page.content || ''
  };
  
  try {
    index.update(pageData);
  } catch (error) {
    console.error('更新搜尋索引時發生錯誤:', error);
  }
}

/**
 * 從搜尋索引中移除頁面
 * @param {number} id 頁面 ID
 */
export function removeFromIndex(id) {
  const index = getSearchIndex();
  
  try {
    index.remove(id);
  } catch (error) {
    console.error('從搜尋索引移除時發生錯誤:', error);
  }
}

/**
 * 批量載入頁面到搜尋索引
 * @param {Array} pages 頁面資料陣列
 */
export function loadPagesToIndex(pages) {
  const index = getSearchIndex();
  
  console.log(`正在載入 ${pages.length} 筆記錄到搜尋索引...`);
  
  for (const page of pages) {
    // 確保必要欄位不為空
    const pageData = {
      ...page,
      title: page.title || '(無標題)',
      excerpt: page.excerpt || '',
      content: page.content || ''
    };
    
    try {
      index.add(pageData);
    } catch (error) {
      console.error(`載入頁面 ${page.id} 到索引時發生錯誤:`, error);
    }
  }
  
  console.log(`已成功載入 ${pages.length} 筆記錄到搜尋索引`);
}

/**
 * 執行搜尋
 * @param {string} query 搜尋關鍵字
 * @param {Object} options 搜尋選項
 * @returns {Array} 搜尋結果 ID 陣列
 */
export function search(query, options = {}) {
  const index = getSearchIndex();
  
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  try {
    const results = index.search(query, { enrich: true, ...options });
    const resultIds = new Set();
    
    if (Array.isArray(results)) {
      results.forEach(group => {
        if (group.result && Array.isArray(group.result)) {
          group.result.forEach(doc => resultIds.add(doc));
        }
      });
    }
    
    return Array.from(resultIds);
  } catch (error) {
    console.error('搜尋時發生錯誤:', error);
    return [];
  }
}

/**
 * 清空搜尋索引
 */
export function clearIndex() {
  if (searchIndex) {
    try {
      // FlexSearch 沒有直接的 clear 方法，需要重新創建
      searchIndex = null;
      createSearchIndex();
      console.log('搜尋索引已清空');
    } catch (error) {
      console.error('清空搜尋索引時發生錯誤:', error);
    }
  }
}

/**
 * 高亮搜尋關鍵字
 * @param {string} text 原始文字
 * @param {string} query 搜尋關鍵字
 * @returns {string} 高亮後的 HTML
 */
export function highlightText(text, query) {
  if (!text || !query) return text || '';
  
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  let result = text;
  
  words.forEach(word => {
    if (word.length > 0) {
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    }
  });
  
  return result;
}