document.addEventListener('DOMContentLoaded', () => {
  const autoCaptureCheckbox = document.getElementById('auto-capture');
  const ignoreListTextarea = document.getElementById('ignore-list');
  const dbStatusSpan = document.getElementById('db-status');
  const dbRecordCountSpan = document.getElementById('db-record-count');
  const dbSizeSpan = document.getElementById('db-size');
  const clearDatabaseButton = document.getElementById('clear-database');
  const updateDatabaseInfoButton = document.getElementById('update-database-info');

  // Load settings from chrome.storage
  chrome.storage.sync.get(['autoCapture', 'ignoreList'], (result) => {
    autoCaptureCheckbox.checked = !!result.autoCapture;
    ignoreListTextarea.value = result.ignoreList ? result.ignoreList.join('\n') : '';
  });

  // Save settings
  autoCaptureCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ autoCapture: autoCaptureCheckbox.checked });
  });

  ignoreListTextarea.addEventListener('input', () => {
    const ignoreList = ignoreListTextarea.value.split('\n').filter(d => d.trim() !== '');
    chrome.storage.sync.set({ ignoreList });
  });

  // Format bytes to a human-readable string
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Database management
  function updateDbStatus() {
    chrome.runtime.sendMessage({ type: 'GET_DB_STATUS' }, (response) => {
      if (response) {
        dbStatusSpan.textContent = response.status;
        dbRecordCountSpan.textContent = response.recordCount;
        dbSizeSpan.textContent = formatBytes(response.totalSize);
      }
    });
  }

  clearDatabaseButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DB' }, () => {
        updateDbStatus();
      });
    }
  });

  updateDatabaseInfoButton.addEventListener('click', (e) => {
    e.preventDefault();
    updateDbStatus();
  });

  // Initial status update
  updateDbStatus();
});