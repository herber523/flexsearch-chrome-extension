// shared/database.js - 統一的資料庫操作模組
import { openDB } from 'idb';
import { DATABASE_CONFIG } from '../utils/constants.js';

let db = null;

/**
 * 初始化資料庫連接
 * @returns {Promise<IDBDatabase>} 資料庫實例
 */
export async function initializeDB() {
  if (db) return db;
  
  try {
    db = await openDB(DATABASE_CONFIG.name, DATABASE_CONFIG.version, {
      upgrade(database, oldVersion, newVersion) {
        console.log(`資料庫升級: ${oldVersion} -> ${newVersion}`);
        
        // 每次升級都安全重建 pages store
        if (database.objectStoreNames.contains(DATABASE_CONFIG.storeName)) {
          database.deleteObjectStore(DATABASE_CONFIG.storeName);
        }
        
        const pagesStore = database.createObjectStore(DATABASE_CONFIG.storeName, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        pagesStore.createIndex('url', 'url', { unique: false });
        pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    });
    
    console.log('資料庫初始化成功');
    return db;
  } catch (error) {
    console.error('資料庫初始化失敗:', error);
    throw error;
  }
}

/**
 * 獲取資料庫實例
 * @returns {Promise<IDBDatabase>} 資料庫實例
 */
export async function getDB() {
  if (!db) {
    await initializeDB();
  }
  return db;
}

/**
 * 儲存或更新頁面資料
 * @param {Object} pageData 頁面資料
 * @returns {Promise<Object>} 操作結果
 */
export async function savePage(pageData) {
  try {
    const database = await getDB();
    
    // 檢查是否已有相同URL的記錄
    const existingPages = await database.getAllFromIndex(DATABASE_CONFIG.storeName, 'url', pageData.url);
    
    if (existingPages.length > 0) {
      // 更新現有記錄
      const existingPage = existingPages[0];
      const updatedPage = {
        ...existingPage,
        visitCount: (existingPage.visitCount || 1) + 1,
        timestamp: new Date().toISOString(),
        content: pageData.content || existingPage.content,
        title: pageData.title || existingPage.title || '(無標題)',
        excerpt: pageData.excerpt || existingPage.excerpt || '',
        siteName: pageData.siteName || existingPage.siteName || '',
        wordCount: pageData.wordCount || existingPage.wordCount || 0,
        readingTime: pageData.readingTime || existingPage.readingTime || 0
      };
      
      await database.put(DATABASE_CONFIG.storeName, updatedPage);
      return { success: true, page: updatedPage, isUpdate: true };
    } else {
      // 新增記錄
      const newPage = {
        title: pageData.title || '(無標題)',
        content: pageData.content || '',
        excerpt: pageData.excerpt || '',
        url: pageData.url,
        siteName: pageData.siteName || '',
        wordCount: pageData.wordCount || 0,
        readingTime: pageData.readingTime || 0,
        timestamp: new Date().toISOString(),
        visitCount: 1
      };
      
      const id = await database.add(DATABASE_CONFIG.storeName, newPage);
      newPage.id = id;
      return { success: true, page: newPage, isUpdate: false };
    }
  } catch (error) {
    console.error('儲存頁面時發生錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 獲取所有頁面資料
 * @returns {Promise<Array>} 頁面資料陣列
 */
export async function getAllPages() {
  try {
    const database = await getDB();
    const pages = await database.getAll(DATABASE_CONFIG.storeName);
    return pages;
  } catch (error) {
    console.error('獲取頁面資料時發生錯誤:', error);
    return [];
  }
}

/**
 * 根據 ID 獲取頁面資料
 * @param {number} id 頁面 ID
 * @returns {Promise<Object|null>} 頁面資料
 */
export async function getPageById(id) {
  try {
    const database = await getDB();
    const page = await database.get(DATABASE_CONFIG.storeName, id);
    return page || null;
  } catch (error) {
    console.error('獲取頁面資料時發生錯誤:', error);
    return null;
  }
}

/**
 * 刪除頁面資料
 * @param {number} id 頁面 ID
 * @returns {Promise<boolean>} 是否成功刪除
 */
export async function deletePage(id) {
  try {
    const database = await getDB();
    await database.delete(DATABASE_CONFIG.storeName, id);
    return true;
  } catch (error) {
    console.error('刪除頁面時發生錯誤:', error);
    return false;
  }
}

/**
 * 清空所有資料
 * @returns {Promise<boolean>} 是否成功清空
 */
export async function clearAllPages() {
  try {
    const database = await getDB();
    await database.clear(DATABASE_CONFIG.storeName);
    return true;
  } catch (error) {
    console.error('清空資料時發生錯誤:', error);
    return false;
  }
}