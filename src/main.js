import FlexSearch from 'flexsearch';
import { openDB } from 'idb';

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
    tokenize: 'full',
    encode: false,
    tokenize: function (str) {
      if (!str) return [];
      const chineseChars = str.match(/[\u4e00-\u9fa5]/g) || [];
      const englishWords = str.match(/[a-zA-Z0-9]+/g) || [];
      return [...chineseChars, ...englishWords];
    }
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

async function initializeExampleData() {
  const count = await db.count('pages');
  if (count === 0) {
    const currentTime = new Date().toISOString();
    const examplePages = [
      {
        content: "京都には美しいお寺があります。東京タワーや秋葉原も人気の観光スポットです。日本料理も素晴らしく、寿司やラーメンは世界中で愛されています。",
        excerpt: "探索日本的美麗寺廟和熱門觀光景點",
        url: "https://example.com/japan-travel",
        siteName: "example.com",
        timestamp: currentTime,
        visitCount: 2,
        wordCount: 150,
        readingTime: 2
      },
      {
        title: "環保議題討論",
        content: "Global warming 對海洋造成嚴重影響。我們必須採取緊急行動保護地球環境，減少碳排放，推廣再生能源。每個人都應該為環境保護盡一份力。",
        excerpt: "全球暖化和環境保護的重要性",
        url: "https://example.com/environmental-issues",
        siteName: "example.com",
        timestamp: currentTime,
        visitCount: 1,
        wordCount: 200,
        readingTime: 3
      },
      {
        title: "程式設計學習筆記",
        content: "記錄學習過程是很有幫助的。程式設計、語言學習、知識管理等都需要良好的筆記方法。JavaScript、Python、React 都是很受歡迎的技術。",
        excerpt: "分享程式設計和學習的經驗心得",
        url: "https://example.com/study-notes",
        siteName: "example.com",
        timestamp: currentTime,
        visitCount: 3,
        wordCount: 180,
        readingTime: 2
      },
      {
        title: "美食探索之旅",
        content: "台灣小吃非常豐富多樣，從夜市美食到精緻餐廳都有。牛肉麵、珍珠奶茶、小籠包都是必嚐美食。每個城市都有獨特的在地料理。",
        excerpt: "台灣美食文化的深度探索",
        url: "https://example.com/food-journey",
        siteName: "example.com",
        timestamp: currentTime,
        visitCount: 1,
        wordCount: 120,
        readingTime: 1
      }
    ];


    for (const page of examplePages) {
      await db.add('pages', page);
    }
    console.log('main.js: 範例資料初始化完成');
  }
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
  if (!query || query.trim().length === 0) {
    container.innerHTML = `<div class="empty-state"><p>開始輸入以搜尋您的索引內容</p><p>目前共有 ${allPages.length} 筆記錄</p></div>`;
    return;
  }
  const results = index.search(query, { enrich: true });
  const resultIds = new Set();
  if (Array.isArray(results)) {
    results.forEach(group => {
      if (group.result && Array.isArray(group.result)) {
        group.result.forEach(doc => resultIds.add(doc));
      }
    });
  }
  const matched = allPages.filter(page => resultIds.has(page.id));
  container.innerHTML = '';
  if (matched.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>沒有找到符合 "${query}" 的結果</p><p>嘗試使用不同的關鍵字或檢查拼寫</p><p>目前共有 ${allPages.length} 筆記錄可供搜尋</p></div>`;
    return;
  }
  matched.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
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
  await initializeExampleData();
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
    renderResults('');
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