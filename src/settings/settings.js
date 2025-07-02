import { openDB } from 'idb';

class SettingsManager {
  constructor() {
    this.db = null;
    this.domainBlacklist = new Set();
    this.init();
  }

  async init() {
    await this.initDB();
    await this.loadSettings();
    this.bindEvents();
    await this.refreshStats();
  }

  async initDB() {
    this.db = await openDB('browsing-history-db', 3, {
      upgrade(db, oldVersion, newVersion) {
        if (db.objectStoreNames.contains('pages')) {
          db.deleteObjectStore('pages');
        }
        const pagesStore = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
        pagesStore.createIndex('url', 'url', { unique: false });
        pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    });
  }

  async loadSettings() {
    try {
      // Load auto-capture setting
      const result = await chrome.storage.local.get(['autoCaptureEnabled', 'domainBlacklist']);
      
      const autoCaptureToggle = document.getElementById('auto-capture-toggle');
      autoCaptureToggle.checked = !!result.autoCaptureEnabled;

      // Load domain blacklist
      this.domainBlacklist = new Set(result.domainBlacklist || []);
      this.renderDomainList();
    } catch (error) {
      this.showError('載入設定時發生錯誤: ' + error.message);
    }
  }

  bindEvents() {
    // Auto-capture toggle
    document.getElementById('auto-capture-toggle').addEventListener('change', (e) => {
      this.saveAutoCaptureSetting(e.target.checked);
    });

    // Domain management
    document.getElementById('add-domain-btn').addEventListener('click', () => {
      this.addDomain();
    });

    document.getElementById('domain-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addDomain();
      }
    });

    // Database management
    document.getElementById('refresh-stats-btn').addEventListener('click', () => {
      this.refreshStats();
    });

    document.getElementById('export-data-btn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('clear-db-btn').addEventListener('click', () => {
      this.clearDatabase();
    });

    // Navigation
    document.getElementById('back-to-search-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('search/index.html') });
    });
  }

  async saveAutoCaptureSetting(enabled) {
    try {
      await chrome.storage.local.set({ autoCaptureEnabled: enabled });
      this.showSuccess('自動擷取設定已' + (enabled ? '啟用' : '停用'));
    } catch (error) {
      this.showError('儲存設定時發生錯誤: ' + error.message);
    }
  }

  async addDomain() {
    const input = document.getElementById('domain-input');
    const domain = input.value.trim().toLowerCase();

    if (!domain) {
      this.showError('請輸入有效的網域名稱');
      return;
    }

    // Basic domain validation
    if (!this.isValidDomain(domain)) {
      this.showError('請輸入有效的網域格式，例如: example.com 或 *.google.com');
      return;
    }

    if (this.domainBlacklist.has(domain)) {
      this.showError('此網域已在黑名單中');
      return;
    }

    this.domainBlacklist.add(domain);
    await this.saveDomainBlacklist();
    this.renderDomainList();
    input.value = '';
    this.showSuccess(`已新增 "${domain}" 到黑名單`);
  }

  async removeDomain(domain) {
    this.domainBlacklist.delete(domain);
    await this.saveDomainBlacklist();
    this.renderDomainList();
    this.showSuccess(`已從黑名單移除 "${domain}"`);
  }

  async saveDomainBlacklist() {
    try {
      await chrome.storage.local.set({ 
        domainBlacklist: Array.from(this.domainBlacklist) 
      });
    } catch (error) {
      this.showError('儲存黑名單時發生錯誤: ' + error.message);
    }
  }

  renderDomainList() {
    const container = document.getElementById('domain-list');
    const emptyState = document.getElementById('empty-state');

    if (this.domainBlacklist.size === 0) {
      emptyState.style.display = 'block';
      // Remove all domain items
      container.querySelectorAll('.domain-item').forEach(item => item.remove());
      return;
    }

    emptyState.style.display = 'none';
    
    // Clear existing items
    container.querySelectorAll('.domain-item').forEach(item => item.remove());

    // Add domain items
    Array.from(this.domainBlacklist).sort().forEach(domain => {
      const item = document.createElement('div');
      item.className = 'domain-item';
      item.innerHTML = `
        <span class="domain-name">${domain}</span>
        <button class="remove-btn" data-domain="${domain}">移除</button>
      `;

      const removeBtn = item.querySelector('.remove-btn');
      removeBtn.addEventListener('click', () => {
        this.removeDomain(domain);
      });

      container.appendChild(item);
    });
  }

  async refreshStats() {
    const statsGrid = document.getElementById('stats-grid');
    statsGrid.classList.add('loading');

    try {
      const allPages = await this.db.getAll('pages');
      
      // Calculate approximate size
      const approxSize = this.calculateApproximateSize(allPages);
      
      // Find most recent update
      const lastUpdated = allPages.length > 0 
        ? new Date(Math.max(...allPages.map(p => new Date(p.timestamp)))).toLocaleDateString()
        : '無資料';

      document.getElementById('total-pages').textContent = allPages.length.toLocaleString();
      document.getElementById('total-size').textContent = this.formatBytes(approxSize);
      document.getElementById('last-updated').textContent = lastUpdated;

    } catch (error) {
      this.showError('取得統計資訊時發生錯誤: ' + error.message);
    } finally {
      statsGrid.classList.remove('loading');
    }
  }

  calculateApproximateSize(pages) {
    let totalSize = 0;
    pages.forEach(page => {
      totalSize += JSON.stringify(page).length * 2; // Rough estimate in bytes
    });
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async exportData() {
    try {
      const allPages = await this.db.getAll('pages');
      const dataToExport = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalPages: allPages.length,
        pages: allPages
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flexsearch-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess(`已匯出 ${allPages.length} 筆資料`);
    } catch (error) {
      this.showError('匯出資料時發生錯誤: ' + error.message);
    }
  }

  async clearDatabase() {
    const confirmed = confirm(
      '警告：此操作將永久刪除所有儲存的瀏覽記錄資料，無法復原。\n\n確定要繼續嗎？'
    );

    if (!confirmed) return;

    const doubleConfirmed = confirm(
      '最後確認：您確定要清空整個資料庫嗎？\n\n此操作無法復原！'
    );

    if (!doubleConfirmed) return;

    try {
      const tx = this.db.transaction('pages', 'readwrite');
      await tx.objectStore('pages').clear();
      await tx.done;

      this.showSuccess('資料庫已清空');
      await this.refreshStats();
    } catch (error) {
      this.showError('清空資料庫時發生錯誤: ' + error.message);
    }
  }

  isValidDomain(domain) {
    // Allow wildcard domains like *.example.com
    if (domain.startsWith('*.')) {
      domain = domain.substring(2);
    }

    // Basic domain regex - more permissive for development
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length > 0 && domain.length < 254;
  }

  showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    
    errorDiv.style.display = 'none';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }

  showError(message) {
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    
    successDiv.style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Initialize settings manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SettingsManager());
} else {
  new SettingsManager();
}