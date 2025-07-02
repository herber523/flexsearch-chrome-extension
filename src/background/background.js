// background/background.js - 主要的背景服務腳本
import { initializeDB, savePage, getAllPages } from '../shared/database.js';
import { createSearchIndex, loadPagesToIndex, addToIndex, updateInIndex } from '../shared/search-engine.js';
import { initializeAutoCapture } from './auto-capture.js';

/**
 * 初始化擴充功能
 */
async function initializeExtension() {
  try {
    console.log('正在初始化 FlexSearch Finder 擴充功能...');
    
    // 初始化資料庫
    await initializeDB();
    
    // 創建搜尋索引
    createSearchIndex();
    
    // 載入現有資料到索引
    const allPages = await getAllPages();
    if (allPages.length > 0) {
      loadPagesToIndex(allPages);
    }
    
    // 初始化自動捕獲功能
    initializeAutoCapture();
    
    console.log('FlexSearch Finder 擴充功能初始化完成');
  } catch (error) {
    console.error('擴充功能初始化失敗:', error);
  }
}

/**
 * 處理來自其他腳本的訊息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureCurrentPage' && message.pageData) {
    // 處理手動頁面捕獲
    handleManualCapture(message.pageData)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('處理頁面捕獲訊息時發生錯誤:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 表示會異步回覆
  }
  
  // 可以在這裡添加其他訊息處理邏輯
  return false;
});

/**
 * 處理手動頁面捕獲
 * @param {Object} pageData 頁面資料
 * @returns {Promise<Object>} 處理結果
 */
async function handleManualCapture(pageData) {
  try {
    const result = await savePage(pageData);
    
    if (result.success) {
      // 更新搜尋索引
      if (result.isUpdate) {
        updateInIndex(result.page);
      } else {
        addToIndex(result.page);
      }
    }
    
    return result;
  } catch (error) {
    console.error('手動捕獲頁面時發生錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 當點擊擴充功能圖示時（如果未設定 popup）
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('search/index.html') });
});

/**
 * 擴充功能安裝或更新時的處理
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('擴充功能已安裝/更新:', details.reason);
  
  if (details.reason === 'install') {
    // 首次安裝時的處理
    console.log('歡迎使用 FlexSearch Finder！');
    
    // 設置預設的自動捕獲選項
    chrome.storage.local.set({ 
      autoCaptureEnabled: true 
    });
  } else if (details.reason === 'update') {
    // 更新時的處理
    console.log('擴充功能已更新到新版本');
  }
});

/**
 * 擴充功能啟動時初始化
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('瀏覽器啟動，正在初始化擴充功能...');
  initializeExtension();
});

// 立即初始化擴充功能
initializeExtension();