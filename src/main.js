import { getDbInstance, getSearchIndex } from './db.js';

let allPages = []; // 用於儲存所有頁面資料，以便在空搜尋時顯示
let searchIndex;

// 輔助函數：去抖
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

function highlightText(text, query) {
  if (!text) return '';
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  let result = text;
  words.forEach(word => {
    if (word.length > 0) {
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    }
  });
  return result;
}

async function renderResults(query) {
  const container = document.getElementById('results');
  if (!container) return;

  let matched = [];
  if (!searchIndex) {
    searchIndex = await getSearchIndex();
  n}

  if (!query || query.trim().length === 0) {
    // 如果搜尋框為空，顯示所有頁面
    const db = await getDbInstance();
    allPages = await db.getAll('pages');
    matched = allPages.slice();
  } else {
    const results = searchIndex.search(query, { enrich: true });
    const resultIds = new Set();
    if (Array.isArray(results)) {
      results.forEach(group => {
        if (group.result && Array.isArray(group.result)) {
          group.result.forEach(doc => resultIds.add(doc));
        }
      });
    }
    // 從 allPages 中過濾出匹配的頁面，確保資料完整性
    matched = allPages.filter(page => resultIds.has(page.id));
  }

  container.innerHTML = '';
  if (matched.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>沒有找到符合 "${query}" 的結果</p><p>嘗試使用不同的關鍵字或檢查拼寫</p><p>目前共有 ${allPages.length} 筆記錄可供搜尋</p></div>`;
    return;
  }

  // 依照最新瀏覽時間排序（由新到舊）
  matched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  matched.forEach(page => {
    const div = document.createElement('div');
    div.className = 'result-item';
    const contentPreview = page.excerpt || (page.content ? (page.content.length > 200 ? page.content.substring(0, 200) + '...' : page.content) : '無內容預覽');
    const siteName = page.siteName || (page.url ? new URL(page.url).hostname : 'Unknown Site');
    const localViewId = `local-view-${page.id}`;

    div.innerHTML = `
      <div class="result-header">
        <a href="#" class="result-title" data-local-view="${localViewId}">${highlightText(page.title, query)}</a>
        <span class="result-site">${siteName}</span>
      </div>
      <p class="result-content">${highlightText(contentPreview, query)}</p>
      <div class="result-meta">
        ${page.readingTime ? `<span class="meta-item">📖 ${page.readingTime} 分鐘閱讀</span>` : ''}
        ${page.wordCount ? `<span class="meta-item">📝 ${page.wordCount} 字</span>` : ''}
        <span class="meta-item">👁 訪問 ${page.visitCount || 1} 次</span>
        <span class="meta-item">📅 ${new Date(page.timestamp).toLocaleString()}</span>
      </div>
      <div class="result-links" style="margin-top:8px;">
        <a href="#" data-local-view="${localViewId}" style="margin-right:12px;">🔍 查看儲存內容</a>
        <a href="${page.url}" target="_blank" rel="noopener noreferrer">🌐 前往原始網頁</a>
      </div>
      <div class="local-content-preview" id="${localViewId}" style="display:none; margin-top:10px; background:#f8f8f8; border-radius:6px; padding:12px; color:#333;">
        <div style="font-weight:bold; margin-bottom:6px;">儲存內容預覽：</div>
        <div style="white-space:pre-wrap;">${highlightText(page.content, query)}</div>
      </div>
    `;
    container.appendChild(div);

    div.querySelectorAll(`[data-local-view="${localViewId}"]`).forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const preview = div.querySelector(`#${localViewId}`);
        if (preview) {
          preview.style.display = (preview.style.display === 'none') ? 'block' : 'none';
        }
      });
    });
  });
}

async function main() {
  // 初始化資料庫和搜尋索引
  await getDbInstance();
  searchIndex = await getSearchIndex();

  // 載入所有頁面資料，用於空搜尋時顯示
  const db = await getDbInstance();
  allPages = await db.getAll('pages');

  const searchInput = document.getElementById('search');
  if (!searchInput) {
    console.error('main.js: 找不到搜尋輸入框元素');
    return;
  }

  // 檢查 URL 參數
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');

  if (queryParam) {
    searchInput.value = queryParam;
    renderResults(queryParam);
  } else {
    renderResults(''); // 預設顯示所有網頁
  }

  // 為搜尋輸入框添加去抖的事件監聽器
  const debouncedRenderResults = debounce(renderResults, 300);
  searchInput.addEventListener('input', (e) => {
    debouncedRenderResults(e.target.value);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}