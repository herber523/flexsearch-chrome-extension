import FlexSearch from 'flexsearch';
import { openDB } from 'idb';
import { tokenizer } from './tokenizer.js';

let db;
let index;
let allPages = [];

async function initializeDB() {
  db = await openDB('browsing-history-db', 3, {
    upgrade(db, oldVersion, newVersion) {
      // 只在升級時安全重建 pages store
      if (db.objectStoreNames.contains('pages')) {
        db.deleteObjectStore('pages');
      }
      const pagesStore = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
      pagesStore.createIndex('url', 'url', { unique: false });
      pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  });
}

function createIndex() {
  index = new FlexSearch.Document({
    document: {
      id: 'id',
      index: ['title', 'content', 'excerpt']
    },
    encode: tokenizer,
    tokenize: 'forward',
    cache: 100,
    async: false
  });
}

async function loadAllPages() {
  allPages = await db.getAll('pages');
  createIndex();
  for (const page of allPages) {
    index.add(page);
  }
  console.log('main.js: 已載入', allPages.length, '筆瀏覽記錄到搜尋索引');
}

function highlightText(text, query) {
  if (!text) return '';
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

function renderResults(query) {
  const container = document.getElementById('results');
  if (!container) return;
  let matched;
  if (!query || query.trim().length === 0) {
    // 顯示所有資料卡片
    matched = allPages.slice();
  } else {
    const results = index.search(query, { enrich: true });
    const resultIds = new Set();
    if (Array.isArray(results)) {
      results.forEach(group => {
        if (group.result && Array.isArray(group.result)) {
          group.result.forEach(doc => resultIds.add(doc));
        }
      });
    }
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
    // 新增一個本地預覽頁面的連結
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
  });
}

async function main() {
  await initializeDB();
  await loadAllPages();
  const searchInput = document.getElementById('search');
  if (!searchInput) {
    console.error('main.js: 找不到搜尋輸入框元素');
    return;
  }
  // 檢查 URL 參數
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('q')) {
    const queryParam = urlParams.get('q');
    searchInput.value = queryParam;
    renderResults(queryParam);
  } else {
    // 預設顯示所有網頁
    renderResults('');
    // 讓搜尋框為空時也顯示所有資料
    searchInput.addEventListener('input', (e) => {
      renderResults(e.target.value);
    });
    return;
  }
  searchInput.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}