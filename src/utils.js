// src/utils.js

/**
 * 注入內容腳本並獲取頁面內容
 * @param {number} tabId - 要注入腳本的 Tab ID
 * @returns {Promise<object|null>} 頁面內容物件或 null
 */
export async function injectAndParseContent(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['contentScript.js']
    });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => window.parsePageContent && window.parsePageContent(),
    });
    return results && results[0] && results[0].result && results[0].result.content ? results[0].result : null;
  } catch (err) {
    console.error('Failed to inject script or parse content: ', err);
    return null;
  }
}

/**
 * 顯示成功或錯誤訊息
 * @param {string} message - 要顯示的訊息
 * @param {boolean} isSuccess - 是否為成功訊息 (true) 或錯誤訊息 (false)
 */
export function displayMessage(message, isSuccess) {
  const statusEl = document.createElement('div');
  statusEl.className = isSuccess ? 'success-msg' : 'error-msg';
  statusEl.textContent = message;

  document.body.appendChild(statusEl);

  setTimeout(() => {
    statusEl.remove();
  }, 2000);
}
