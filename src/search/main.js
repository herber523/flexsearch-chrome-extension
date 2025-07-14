// search/main.js - 重構後的搜尋頁面主要邏輯
import { getAllPages, initializeDB } from '../shared/database.js';
import i18n from '../shared/i18n.js';
import { createSearchIndex, highlightText, loadPagesToIndex, search } from '../shared/search-engine.js';

let allPages = [];
let isInitialized = false;

/**
 * 初始化搜尋頁面
 */
async function initializeSearchPage() {
  if (isInitialized) return;

  try {
    console.log('正在初始化搜尋頁面...');

    // Initialize i18n first and apply user language preference
    await i18n.init();

    // Explicitly localize elements after i18n is initialized
    i18n.localizeElements();

    console.log('Search page initialized with language:', i18n.getCurrentLocale());

    // 初始化資料庫
    await initializeDB();

    // 載入所有頁面資料
    allPages = await getAllPages();

    // 創建並載入搜尋索引
    createSearchIndex();
    if (allPages.length > 0) {
      loadPagesToIndex(allPages);
    }

    console.log(`搜尋頁面初始化完成，共載入 ${allPages.length} 筆記錄`);
    isInitialized = true;
  } catch (error) {
    console.error('搜尋頁面初始化失敗:', error);
    showErrorMessage(i18n.getMessage('error'));
  }
}

/**
 * 顯示錯誤訊息
 * @param {string} message 錯誤訊息
 */
function showErrorMessage(message) {
  const container = document.getElementById('results');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <p style="color: #e74c3c;">❌ ${message}</p>
      </div>
    `;
  }
}

/**
 * 顯示空狀態訊息
 * @param {string} query 搜尋關鍵字
 */
function showEmptyState(query) {
  const container = document.getElementById('results');
  if (!container) return;

  if (query) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${i18n.getMessage('noResults')}</p>
        <p>${i18n.getMessage('searchResultsCount', allPages.length)}</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <p>${i18n.getMessage('noResults')}</p>
      </div>
    `;
  }
}

/**
 * 渲染單個搜尋結果
 * @param {Object} page 頁面資料
 * @param {string} query 搜尋關鍵字
 * @returns {HTMLElement} 結果元素
 */
function renderResultItem(page, query) {
  const div = document.createElement('div');
  div.className = 'result-item';

  const contentPreview = page.excerpt ||
    (page.content ? (page.content.length > 200 ? page.content.substring(0, 200) + '...' : page.content) : '無內容預覽');
  const siteName = page.siteName || (page.url ? new URL(page.url).hostname : 'Unknown Site');
  const localViewId = `local-view-${page.id}`;

  div.innerHTML = `
    <div class="result-header">
      <a href="#" class="result-title" data-local-view="${localViewId}">
        ${highlightText(page.title, query)}
      </a>
      <span class="result-site">${siteName}</span>
    </div>
    <p class="result-content">${highlightText(contentPreview, query)}</p>
    <div class="result-meta">
      ${page.readingTime ? `<span class="meta-item">📖 ${i18n.getMessage('readingTime', page.readingTime)}</span>` : ''}
      ${page.wordCount ? `<span class="meta-item">📝 ${i18n.getMessage('wordCount', page.wordCount)}</span>` : ''}
      <span class="meta-item">👁 ${i18n.getMessage('visitCount', page.visitCount || 1)}</span>
      <span class="meta-item">📅 ${i18n.getMessage('lastVisited', new Date(page.timestamp).toLocaleString())}</span>
    </div>
    <div class="result-links" style="margin-top:8px;">
      <a href="#" data-local-view="${localViewId}" style="margin-right:12px;">🔍 ${i18n.getMessage('viewStoredContent')}</a>
      <a href="${page.url}" target="_blank" rel="noopener noreferrer">🌐 ${i18n.getMessage('goToOriginalPage')}</a>
    </div>
    <div class="local-content-preview" id="${localViewId}" style="display:none; margin-top:10px; background:#f8f8f8; border-radius:6px; padding:12px; color:#333;">
      <div style="font-weight:bold; margin-bottom:6px;">${i18n.getMessage('storedContentPreview')}：</div>
      <div style="white-space:pre-wrap; max-height:300px; overflow-y:auto;">
        ${highlightText(page.content, query)}
      </div>
    </div>
  `;

  // 綁定本地預覽事件
  div.querySelectorAll(`[data-local-view="${localViewId}"]`).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const preview = div.querySelector(`#${localViewId}`);
      if (preview) {
        preview.style.display = (preview.style.display === 'none') ? 'block' : 'none';
      }
    });
  });

  return div;
}

/**
 * 渲染搜尋結果
 * @param {string} query 搜尋關鍵字
 */
function renderResults(query) {
  const container = document.getElementById('results');
  if (!container) return;

  // 清空容器
  container.innerHTML = '';

  let matchedPages;

  if (!query || query.trim().length === 0) {
    // 顯示所有頁面
    matchedPages = [...allPages];
  } else {
    // 執行搜尋
    const resultIds = search(query.trim());
    matchedPages = allPages.filter(page => resultIds.includes(page.id));
  }

  // 檢查是否有結果
  if (matchedPages.length === 0) {
    showEmptyState(query);
    return;
  }

  // 按最新瀏覽時間排序（由新到舊）
  matchedPages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // 渲染每個結果
  matchedPages.forEach(page => {
    const resultElement = renderResultItem(page, query);
    container.appendChild(resultElement);
  });

  // 顯示結果統計
  if (query) {
    const statsDiv = document.createElement('div');
    statsDiv.className = 'search-stats';
    statsDiv.style.cssText = 'margin-bottom: 16px; color: #666; font-size: 14px;';
    statsDiv.textContent = i18n.getMessage('searchResultsCount', matchedPages.length);
    container.insertBefore(statsDiv, container.firstChild);
  }
}

/**
 * 設置搜尋輸入框事件監聽
 */
function setupSearchInput() {
  const searchInput = document.getElementById('search');
  if (!searchInput) {
    console.error('找不到搜尋輸入框元素');
    return;
  }

  // 檢查 URL 參數中是否有預設搜尋關鍵字
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');

  if (queryParam) {
    searchInput.value = queryParam;
    renderResults(queryParam);
  } else {
    // 預設顯示所有頁面
    renderResults('');
  }

  // 監聽輸入事件
  searchInput.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  // 讓搜尋框獲得焦點
  searchInput.focus();
}

/**
 * 主要初始化函數
 */
async function main() {
  try {
    await initializeSearchPage();
    setupSearchInput();
  } catch (error) {
    console.error('搜尋頁面載入失敗:', error);
    showErrorMessage(i18n.getMessage('error'));
  }
}

// 根據文檔載入狀態決定何時執行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}