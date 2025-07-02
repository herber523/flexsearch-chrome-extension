import { openDB } from 'idb';
import FlexSearch from 'flexsearch';
import { tokenizer } from './shared/tokenizer.js';

const DB_NAME = 'browsing-history-db';
const DB_VERSION = 3;
const STORE_NAME = 'pages';

let dbInstance;
let searchIndexInstance;

async function initializeDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const pagesStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      pagesStore.createIndex('url', 'url', { unique: false });
      pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  });

  return dbInstance;
}

async function initializeSearchIndex() {
  if (searchIndexInstance) return searchIndexInstance;

  searchIndexInstance = new FlexSearch.Document({
    document: {
      id: 'id',
      index: ['title', 'content', 'excerpt']
    },
    encode: tokenizer,
    tokenize: 'forward',
    cache: 100,
    async: false
  });

  const db = await initializeDB();
  const allPages = await db.getAll(STORE_NAME);
  for (const page of allPages) {
    if (!page.title) page.title = '(無標題)';
    if (!page.excerpt) page.excerpt = '';
    searchIndexInstance.add(page);
  }
  console.log(`已載入 ${allPages.length} 筆瀏覽記錄到索引`);

  return searchIndexInstance;
}

export async function getDbInstance() {
  return await initializeDB();
}

export async function getSearchIndex() {
  return await initializeSearchIndex();
}

export async function savePageData(pageData) {
  try {
    const db = await initializeDB();
    const searchIndex = await initializeSearchIndex();

    const existingPages = await db.getAllFromIndex(STORE_NAME, 'url', pageData.url);

    if (existingPages.length > 0) {
      const existingPage = existingPages[0];
      existingPage.visitCount = (existingPage.visitCount || 1) + 1;
      existingPage.timestamp = new Date().toISOString();
      existingPage.content = pageData.content || existingPage.content;
      existingPage.title = pageData.title || existingPage.title || '(無標題)';
      existingPage.excerpt = pageData.excerpt || existingPage.excerpt || '';
      existingPage.siteName = pageData.siteName || existingPage.siteName || '';
      existingPage.wordCount = pageData.wordCount || existingPage.wordCount || 0;
      existingPage.readingTime = pageData.readingTime || existingPage.readingTime || 0;
      await db.put(STORE_NAME, existingPage);
      searchIndex.update(existingPage);
      return { success: true, page: existingPage };
    } else {
      const timestamp = new Date().toISOString();
      const newPage = {
        title: pageData.title || '(無標題)',
        content: pageData.content || '',
        excerpt: pageData.excerpt || '',
        url: pageData.url,
        siteName: pageData.siteName || '',
        wordCount: pageData.wordCount || 0,
        readingTime: pageData.readingTime || 0,
        timestamp,
        visitCount: 1
      };
      const id = await db.add(STORE_NAME, newPage);
      newPage.id = id;
      searchIndex.add(newPage);
      return { success: true, page: newPage };
    }
  } catch (error) {
    console.error('儲存頁面時發生錯誤:', error);
    return { success: false, error: error.message };
  }
}

export async function getDbStatus() {
  const db = await initializeDB();
  const allPages = await db.getAll(STORE_NAME);
  const count = allPages.length;
  const totalSize = new Blob([JSON.stringify(allPages)]).size;
  return { status: 'Active', recordCount: count, totalSize };
}

export async function clearAllData() {
  const db = await initializeDB();
  const searchIndex = await initializeSearchIndex();
  await db.clear(STORE_NAME);
  await searchIndex.clear();
  return { success: true };
}
