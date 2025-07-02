// utils/constants.js - 專案常數定義

export const DATABASE_CONFIG = {
  name: 'browsing-history-db',
  version: 3,
  storeName: 'pages'
};

export const SEARCH_CONFIG = {
  encode: 'advanced',
  tokenize: 'forward',
  cache: 100,
  async: false,
  document: {
    id: 'id',
    index: ['title', 'content', 'excerpt']
  }
};

export const AUTO_CAPTURE_CONFIG = {
  maxRetries: 5,
  retryDelay: 800,
  regularPageDelay: 1000,
  spaPageDelay: 2000,
  contentCheckDelay: 1500
};

export const CONTENT_LIMITS = {
  maxContentLength: 10000,
  excerptLength: 200,
  wordsPerMinute: 200,
  minContentLength: 50
};

export const SKIP_URLS = [
  'chrome://',
  'chrome-extension://',
  'moz-extension://',
  'edge://'
];