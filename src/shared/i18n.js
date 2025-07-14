/**
 * i18n utility functions for Chrome extension
 * Provides helper functions for internationalization
 */

class I18nManager {
  constructor() {
    this.currentLocale = chrome.i18n.getUILanguage();
    this.supportedLocales = ['en', 'zh_TW', 'ja'];
    this.fallbackLocale = 'en';
    this.messages = {}; // Cache for messages
    this.userSelectedLocale = null; // User-selected locale
  }  /**
   * Get translated message
   * @param {string} messageKey - The message key
   * @param {Array|string|number} substitutions - Optional substitutions for placeholders
   * @returns {string} Translated message
   */
  getMessage(messageKey, substitutions = []) {
    try {
      // Convert substitutions to array if it's not already
      let substitutionsArray;
      if (Array.isArray(substitutions)) {
        substitutionsArray = substitutions;
      } else if (substitutions !== null && substitutions !== undefined) {
        substitutionsArray = [substitutions];
      } else {
        substitutionsArray = [];
      }

      // If user has selected a different locale, try cached messages first
      if (this.userSelectedLocale && this.messages[this.userSelectedLocale]) {
        const message = this.messages[this.userSelectedLocale][messageKey];
        if (message) {
          return this.formatMessage(message, substitutionsArray);
        }
      }

      // Fallback to Chrome's i18n API (this handles placeholders correctly)
      const chromeMessage = chrome.i18n.getMessage(messageKey, substitutionsArray);
      if (chromeMessage) {
        return chromeMessage;
      }
      
      // Fallback to key if message not found
      return messageKey;
    } catch (error) {
      console.warn(`i18n: Failed to get message for key "${messageKey}":`, error);
      return messageKey;
    }
  }

  /**
   * Format message with substitutions
   * @param {string} message - Message template
   * @param {Array|string|number} substitutions - Substitution values
   * @returns {string} Formatted message
   */
  formatMessage(message, substitutions) {
    if (!substitutions || substitutions.length === 0) {
      return message;
    }

    // Convert substitutions to array if it's not already
    let substitutionsArray;
    if (Array.isArray(substitutions)) {
      substitutionsArray = substitutions;
    } else {
      substitutionsArray = [substitutions];
    }

    let formatted = message;
    
    // Handle both numbered placeholders ($1, $2, etc.) and named placeholders ($LANGUAGE$, $COUNT$, etc.)
    substitutionsArray.forEach((sub, index) => {
      // Replace numbered placeholders
      formatted = formatted.replace(new RegExp(`\\$${index + 1}`, 'g'), sub);
      
      // Also handle common named placeholders for backward compatibility
      if (index === 0) {
        formatted = formatted.replace(/\$LANGUAGE\$/g, sub);
        formatted = formatted.replace(/\$TIME\$/g, sub);
        formatted = formatted.replace(/\$COUNT\$/g, sub);
        formatted = formatted.replace(/\$DATE\$/g, sub);
        formatted = formatted.replace(/\$VALUE\$/g, sub);
      }
    });

    return formatted;
  }

  /**
   * Load messages for a specific locale
   * @param {string} locale - Locale to load
   * @returns {Promise<Object>} Messages object
   */
  async loadMessages(locale) {
    try {
      const response = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`));
      const messages = await response.json();

      // Convert Chrome extension format to simple key-value pairs
      const simplified = {};
      for (const [key, value] of Object.entries(messages)) {
        simplified[key] = value.message;
      }

      this.messages[locale] = simplified;
      return simplified;
    } catch (error) {
      console.error(`Failed to load messages for locale ${locale}:`, error);
      return {};
    }
  }

  /**
   * Get current UI language
   * @returns {string} Current locale code
   */
  getCurrentLocale() {
    return this.userSelectedLocale || this.currentLocale;
  }

  /**
   * Check if a locale is supported
   * @param {string} locale - Locale code to check
   * @returns {boolean} Whether the locale is supported
   */
  isLocaleSupported(locale) {
    return this.supportedLocales.includes(locale);
  }

  /**
   * Get the best matching supported locale
   * @param {string} preferredLocale - Preferred locale
   * @returns {string} Best matching supported locale
   */
  getBestMatchingLocale(preferredLocale) {
    if (this.isLocaleSupported(preferredLocale)) {
      return preferredLocale;
    }

    // Try to match language part (e.g., 'zh' from 'zh_CN')
    const language = preferredLocale.split('_')[0];
    const matchingLocale = this.supportedLocales.find(locale =>
      locale.startsWith(language)
    );

    return matchingLocale || this.fallbackLocale;
  }

  /**
   * Get all supported locales with their display names
   * @returns {Array} Array of locale objects with code and display name
   */
  getSupportedLocales() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'zh_TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' }
    ];
  }

  /**
   * Format a message with plural forms
   * @param {string} messageKey - Base message key
   * @param {number} count - Count for plural logic
   * @param {Array} substitutions - Optional substitutions
   * @returns {string} Formatted message
   */
  getPluralMessage(messageKey, count, substitutions = []) {
    // Simple plural logic - can be extended for more complex rules
    const pluralKey = count === 1 ? `${messageKey}_singular` : `${messageKey}_plural`;

    // Try plural key first, fallback to base key
    let message = chrome.i18n.getMessage(pluralKey, [count, ...substitutions]);
    if (!message) {
      message = chrome.i18n.getMessage(messageKey, [count, ...substitutions]);
    }

    return message || `${messageKey} (${count})`;
  }

  /**
   * Localize all elements with data-i18n attribute
   * @param {Element} container - Container element to search within (default: document)
   */
  localizeElements(container = document) {
    const elements = container.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
      const messageKey = element.getAttribute('data-i18n');
      const substitutions = element.getAttribute('data-i18n-args');

      let args = [];
      if (substitutions) {
        try {
          args = JSON.parse(substitutions);
        } catch (e) {
          console.warn(`Invalid i18n args for element: ${substitutions}`);
        }
      }

      const translatedText = this.getMessage(messageKey, args);

      // Check if we should set innerHTML or textContent
      if (element.hasAttribute('data-i18n-html')) {
        element.innerHTML = translatedText;
      } else {
        element.textContent = translatedText;
      }
    });

    // Localize placeholders
    const placeholderElements = container.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.getMessage(messageKey);
    });

    // Localize titles
    const titleElements = container.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const messageKey = element.getAttribute('data-i18n-title');
      element.title = this.getMessage(messageKey);
    });
  }

  /**
   * Set document language attributes
   */
  setDocumentLanguage() {
    const html = document.documentElement;
    const locale = this.userSelectedLocale || this.currentLocale;

    html.setAttribute('lang', locale.replace('_', '-'));
    html.setAttribute('dir', this.isRTL(locale) ? 'rtl' : 'ltr');
  }

  /**
   * Check if a locale uses right-to-left text direction
   * @param {string} locale - Locale code
   * @returns {boolean} Whether the locale is RTL
   */
  isRTL(locale) {
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    return rtlLocales.some(rtl => locale.startsWith(rtl));
  }

  /**
   * Store user's language preference
   * @param {string} locale - Preferred locale
   */
  async setUserPreference(locale) {
    try {
      await chrome.storage.local.set({ userLanguage: locale });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }

  /**
   * Get user's language preference
   * @returns {Promise<string>} User's preferred locale
   */
  async getUserPreference() {
    try {
      const result = await chrome.storage.local.get('userLanguage');
      return result.userLanguage || this.getBestMatchingLocale(this.currentLocale);
    } catch (error) {
      console.error('Failed to load language preference:', error);
      return this.fallbackLocale;
    }
  }

  /**
   * Initialize i18n (async version of localizeElements)
   */
  async init() {
    try {
      // Load user's language preference first
      const userLanguage = await this.getUserPreference();

      // If user has selected a different language, load its messages
      if (userLanguage !== this.currentLocale) {
        this.userSelectedLocale = userLanguage;
        await this.loadMessages(userLanguage);
      }

      this.setDocumentLanguage();
      this.localizeElements();
      return true;
    } catch (error) {
      console.error('i18n initialization failed:', error);
      return false;
    }
  }

  /**
   * Set language and reinitialize
   * @param {string} locale - Locale to set
   */
  async setLanguage(locale) {
    try {
      await this.setUserPreference(locale);
      this.userSelectedLocale = locale;

      // Load messages for the new locale
      await this.loadMessages(locale);

      // Re-initialize UI with new language
      this.setDocumentLanguage();
      this.localizeElements();

      return true;
    } catch (error) {
      console.error('Failed to set language:', error);
      return false;
    }
  }
}

// Create global instance
const i18n = new I18nManager();

// Convenience functions for easier usage
const t = (key, substitutions) => i18n.getMessage(key, substitutions);
const tPlural = (key, count, substitutions) => i18n.getPluralMessage(key, count, substitutions);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18nManager, i18n, t, tPlural };
}

// ES6 export
export { I18nManager, t, tPlural };
export default i18n;

// Auto-localize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      i18n.setDocumentLanguage();
      i18n.localizeElements();
    });
  } else {
    i18n.setDocumentLanguage();
    i18n.localizeElements();
  }
}
