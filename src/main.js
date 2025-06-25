import FlexSearch from 'flexsearch';
import { openDB } from 'idb';

(async function () {
  console.log('=== main.js 開始載入 ===');

  // 初始化資料庫，使用與 background.js 相同的版本號
  const db = await openDB('browsing-history-db', 3, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`main.js 資料庫升級：從版本 ${oldVersion} 到 ${newVersion}`);

      // 刪除舊的 object store 如果存在
      const storeNames = Array.from(db.objectStoreNames);
      storeNames.forEach(storeName => {
        db.deleteObjectStore(storeName);
      });

      // 創建新的 object store，使用自增 ID
      const pagesStore = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });

      // 創建 URL 索引以便檢查重複
      pagesStore.createIndex('url', 'url', { unique: false });
      pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  });

  console.log('資料庫初始化完成');

  // 初始化 FlexSearch 索引，與 background.js 保持一致
  const index = new FlexSearch.Document({
    document: {
      id: 'id',
      index: ['title', 'content', 'excerpt'] // 包含所有搜尋欄位
    },
    tokenize: 'full',
    encode: false,
    // 改進中文支持
    tokenize: function (str) {
      if (!str) return [];

      // 分別處理中文、英文和數字
      const chineseChars = str.match(/[\u4e00-\u9fa5]/g) || [];
      const englishWords = str.match(/[a-zA-Z0-9]+/g) || [];

      return [...chineseChars, ...englishWords];
    }
  });

  console.log('搜尋索引初始化完成');

  // 載入現有資料
  const loadExistingPages = async () => {
    try {
      const allPages = await db.getAll('pages');
      console.log('從資料庫載入的頁面:', allPages);

      for (const page of allPages) {
        index.add(page);
      }
      console.log(`已載入 ${allPages.length} 筆瀏覽記錄到搜尋索引`);
      return allPages;
    } catch (error) {
      console.error('載入現有頁面時發生錯誤:', error);
      return [];
    }
  };

  // 儲存新頁面
  const savePage = async (pageData) => {
    try {
      console.log('準備儲存頁面:', pageData);

      // 檢查是否已有相同URL的記錄
      const existingPages = await db.getAllFromIndex('pages', 'url', pageData.url);

      if (existingPages.length > 0) {
        // 更新訪問次數和時間戳
        const existingPage = existingPages[0];
        existingPage.visitCount = (existingPage.visitCount || 1) + 1;
        existingPage.timestamp = new Date().toISOString();
        existingPage.content = pageData.content; // 更新內容
        existingPage.title = pageData.title; // 更新標題

        await db.put('pages', existingPage);
        index.update(existingPage);
        console.log('已更新現有頁面:', existingPage);
        return existingPage;
      } else {
        // 新增記錄
        const timestamp = new Date().toISOString();
        const newPage = {
          ...pageData,
          timestamp,
          visitCount: 1
        };

        const id = await db.add('pages', newPage);
        newPage.id = id;
        index.add(newPage);
        console.log('已新增頁面:', newPage);
        return newPage;
      }
    } catch (error) {
      console.error('儲存頁面時發生錯誤:', error);
      throw error;
    }
  };

  // 初始化範例資料
  const initializeExampleData = async () => {
    try {
      const count = await db.count('pages');
      console.log('資料庫中現有頁面數量:', count);

      if (count === 0) {
        console.log('初始化範例資料...');
        const currentTime = new Date().toISOString();

        const examplePages = [
          {
            title: "日本旅行指南",
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
          await savePage(page);
        }
        console.log('範例資料初始化完成');
      } else {
        console.log('資料庫已有資料，跳過範例資料初始化');
      }
    } catch (error) {
      console.error('初始化範例資料時發生錯誤:', error);
    }
  };

  // 初始化應用
  await initializeExampleData();
  const allPages = await loadExistingPages();
  console.log('應用初始化完成，總頁面數:', allPages.length);

  // 搜尋功能
  const searchInput = document.getElementById('search');

  if (!searchInput) {
    console.error('找不到搜尋輸入框元素');
    return;
  }

  // 檢查 URL 參數是否包含查詢條件
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('q')) {
    const queryParam = urlParams.get('q');
    searchInput.value = queryParam;
    console.log('從 URL 參數執行搜尋:', queryParam);
    // 觸發搜尋
    performSearch(queryParam);
  }

  searchInput.addEventListener('input', async (e) => {
    const q = e.target.value;
    console.log('搜尋輸入:', q);
    performSearch(q);
  });

  // 搜尋功能抽取為函數
  async function performSearch(q) {
    console.log('執行搜尋，關鍵字:', q);
    const container = document.getElementById('results');

    if (!container) {
      console.error('找不到結果容器元素');
      return;
    }

    if (!q || q.trim().length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>開始輸入以搜尋您的索引內容</p>
          <p>目前共有 ${allPages.length} 筆記錄</p>
        </div>
      `;
      return;
    }

    try {
      // 使用 search 方法而不是 searchAsync
      const results = index.search(q, { enrich: true });
      console.log('搜尋結果:', results);

      const resultIds = new Set();
      if (Array.isArray(results)) {
        results.forEach(group => {
          if (group.result && Array.isArray(group.result)) {
            group.result.forEach(doc => resultIds.add(doc.id));
          }
        });
      }

      console.log('找到的 ID 集合:', Array.from(resultIds));

      const matched = allPages.filter(page => resultIds.has(page.id));
      console.log('符合的頁面:', matched);

      container.innerHTML = '';

      if (matched.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>沒有找到符合 "${q}" 的結果</p>
            <p>嘗試使用不同的關鍵字或檢查拼寫</p>
            <p>目前共有 ${allPages.length} 筆記錄可供搜尋</p>
          </div>
        `;
        return;
      }

      // 按訪問次數排序，訪問次數高的在前面
      matched.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));

      matched.forEach(page => {
        const div = document.createElement('div');
        div.className = 'result-item';

        // 高亮顯示搜尋關鍵詞
        const highlightText = (text, query) => {
          if (!text) return '';
          const words = query.trim().split(/\s+/).filter(w => w.length > 0);
          let result = text;

          words.forEach(word => {
            if (word.length < 1) return;
            const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
          });

          return result;
        };

        // 準備摘要內容，優先使用 excerpt，如果沒有則從 content 生成
        const contentPreview = page.excerpt ||
          (page.content ?
            (page.content.length > 200 ? page.content.substring(0, 200) + '...' : page.content)
            : '無內容預覽');

        // 獲取網站名稱
        const siteName = page.siteName || (page.url ? new URL(page.url).hostname : 'Unknown Site');

        div.innerHTML = `
          <div class="result-header">
            <a href="${page.url}" target="_blank" class="result-title">${highlightText(page.title, q)}</a>
            <span class="result-site">${siteName}</span>
          </div>
          <p class="result-content">${highlightText(contentPreview, q)}</p>
          <div class="result-meta">
            ${page.readingTime ? `<span class="meta-item">📖 ${page.readingTime} 分鐘閱讀</span>` : ''}
            ${page.wordCount ? `<span class="meta-item">📝 ${page.wordCount} 字</span>` : ''}
            <span class="meta-item">👁 訪問 ${page.visitCount || 1} 次</span>
            <span class="meta-item">📅 ${new Date(page.timestamp).toLocaleString()}</span>
          </div>
        `;
        container.appendChild(div);
      });

      console.log(`顯示了 ${matched.length} 個搜尋結果`);
    } catch (error) {
      console.error('搜尋時發生錯誤:', error);
      container.innerHTML = `
        <div class="empty-state">
          <p>搜尋時發生錯誤，請重試</p>
          <p>錯誤訊息: ${error.message}</p>
        </div>
      `;
    }
  }

  console.log('=== main.js 載入完成 ===');
})();