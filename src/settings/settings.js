import { openDB } from 'idb';

class SettingsManager {
  constructor() {
    this.db = null;
    this.filterMode = 'blacklist'; // 'blacklist' or 'whitelist'
    this.domainBlacklist = new Set();
    this.domainWhitelist = new Set();
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
      // Load settings with migration support
      const result = await chrome.storage.local.get([
        'autoCaptureEnabled', 
        'filterMode', 
        'domainBlacklist', 
        'domainWhitelist'
      ]);
      
      // Migration for old data structure
      if (result.domainBlacklist && !result.filterMode) {
        this.filterMode = 'blacklist';
        await chrome.storage.local.set({ filterMode: 'blacklist' });
      } else {
        this.filterMode = result.filterMode || 'blacklist';
      }

      const autoCaptureToggle = document.getElementById('auto-capture-toggle');
      autoCaptureToggle.checked = !!result.autoCaptureEnabled;

      // Load domain lists
      this.domainBlacklist = new Set(result.domainBlacklist || []);
      this.domainWhitelist = new Set(result.domainWhitelist || []);
      
      this.updateUIForCurrentMode();
      this.renderCurrentDomainList();
    } catch (error) {
      this.showError('載入設定時發生錯誤: ' + error.message);
    }
  }

  bindEvents() {
    // Auto-capture toggle
    document.getElementById('auto-capture-toggle').addEventListener('change', (e) => {
      this.saveAutoCaptureSetting(e.target.checked);
    });

    // Filter mode radio buttons
    document.querySelectorAll('input[name="filterMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.switchFilterMode(e.target.value);
        }
      });
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

  async switchFilterMode(newMode) {
    if (newMode === this.filterMode) return;

    const confirmMsg = `切換到${newMode === 'whitelist' ? '白名單' : '黑名單'}模式？`;
    if (!confirm(confirmMsg)) {
      // Revert radio button
      document.querySelector(`input[name="filterMode"][value="${this.filterMode}"]`).checked = true;
      return;
    }

    this.filterMode = newMode;
    await chrome.storage.local.set({ filterMode: newMode });
    this.updateUIForCurrentMode();
    this.renderCurrentDomainList();
    this.showSuccess(`已切換到${newMode === 'whitelist' ? '白名單' : '黑名單'}模式`);
  }

  updateUIForCurrentMode() {
    // Update radio buttons
    document.querySelector(`input[name="filterMode"][value="${this.filterMode}"]`).checked = true;
    
    // Update section title and description
    const isWhitelist = this.filterMode === 'whitelist';
    const sectionTitle = document.querySelector('.domain-section .section-title');
    const description = document.querySelector('.domain-section .section-description');
    
    sectionTitle.textContent = isWhitelist ? '🎯 網域白名單' : '🚫 網域黑名單';
    description.textContent = isWhitelist 
      ? '只擷取以下網域的內容，其他網域將被忽略' 
      : '排除以下網域，其他網域都會被擷取';
  }

  getCurrentDomainSet() {
    return this.filterMode === 'whitelist' ? this.domainWhitelist : this.domainBlacklist;
  }

  renderCurrentDomainList() {
    const currentSet = this.getCurrentDomainSet();
    this.renderDomainList(currentSet);
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

    const currentSet = this.getCurrentDomainSet();
    const modeText = this.filterMode === 'whitelist' ? '白名單' : '黑名單';

    if (currentSet.has(domain)) {
      this.showError(`此網域已在${modeText}中`);
      return;
    }

    currentSet.add(domain);
    await this.saveDomainSettings();
    this.renderCurrentDomainList();
    input.value = '';
    this.showSuccess(`已新增 "${domain}" 到${modeText}`);
  }

  async removeDomain(domain) {
    const currentSet = this.getCurrentDomainSet();
    const modeText = this.filterMode === 'whitelist' ? '白名單' : '黑名單';
    
    currentSet.delete(domain);
    await this.saveDomainSettings();
    this.renderCurrentDomainList();
    this.showSuccess(`已從${modeText}移除 "${domain}"`);
  }

  async saveDomainSettings() {
    try {
      await chrome.storage.local.set({ 
        domainBlacklist: Array.from(this.domainBlacklist),
        domainWhitelist: Array.from(this.domainWhitelist)
      });
    } catch (error) {
      this.showError('儲存域名設定時發生錯誤: ' + error.message);
    }
  }

  renderDomainList(domainSet) {
    const container = document.getElementById('domain-list');
    const emptyState = document.getElementById('empty-state');
    const modeText = this.filterMode === 'whitelist' ? '白名單' : '黑名單';

    if (domainSet.size === 0) {
      emptyState.style.display = 'block';
      emptyState.textContent = `尚未新增任何網域到${modeText}`;
      // Remove all domain items
      container.querySelectorAll('.domain-item').forEach(item => item.remove());
      return;
    }

    emptyState.style.display = 'none';
    
    // Clear existing items
    container.querySelectorAll('.domain-item').forEach(item => item.remove());

    // Add domain items
    Array.from(domainSet).sort().forEach(domain => {
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