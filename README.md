# FlexSearch Finder Chrome Extension

[![CI](https://github.com/herber523/flexsearch-chrome-extension/workflows/CI/badge.svg)](https://github.com/herber523/flexsearch-chrome-extension/actions)
[![Release](https://github.com/herber523/flexsearch-chrome-extension/workflows/Release/badge.svg)](https://github.com/herber523/flexsearch-chrome-extension/releases)

## 🌟 Project Overview

FlexSearch Finder is a powerful Chrome extension that helps you record, index, and search through your browsing history. It uses FlexSearch full-text search engine and IndexedDB for data storage and retrieval, with support for multiple languages including CJK (Chinese, Japanese, Korean) and Western languages.

## ✨ Key Features

- **🚀 Auto Capture**: Intelligent page monitoring with automatic content saving (toggleable)
- **🔍 Fast Search**: Quickly search through previously visited web pages and titles
- **� Multi-language Support**: Full internationalization with English, Traditional Chinese, and Japanese
- **⚙️ Language Switching**: Dynamic language switching in settings without page reload
- **🚫 Domain Filtering**: Blacklist/whitelist system for precise capture control
- **📄 Content Parsing**: Clean content extraction using Mozilla Readability
- **💡 Smart Retry**: Enhanced capture mechanism for SPAs and complex websites
- **⚡ Efficient Search**: Direct search from popup or full search page
- **🎯 Result Highlighting**: Highlighted matching keywords in search results
- **📊 Browse Statistics**: Track page visit counts and last visit times

## 🏗️ Technical Architecture

- **Frontend**: Vanilla JavaScript + ES6 Modules
- **Search Engine**: [FlexSearch](https://github.com/nextapps-de/flexsearch) - High-performance full-text search
- **Data Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via idb library)
- **Build Tool**: [Vite](https://vitejs.dev/) - Modern frontend build tool
- **Content Parsing**: [Mozilla Readability](https://github.com/mozilla/readability) - Web content extraction
- **Internationalization**: Chrome extension i18n API with custom management system
- **CI/CD**: GitHub Actions for automated build and release

## 📦 Installation

### From Release (Recommended)

1. Go to [Releases page](https://github.com/herber523/flexsearch-chrome-extension/releases)
2. Download the latest `flexsearch-chrome-extension-vX.X.X.zip`
3. Extract the zip file
4. Open Chrome browser and go to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the extracted folder

### Development Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/herber523/flexsearch-chrome-extension.git
   cd flexsearch-chrome-extension
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Load the `dist` folder in Chrome extensions

## 🚀 Usage Guide

### Multi-language Support

The extension supports multiple languages with seamless switching:

1. **Supported Languages**:
   - English (default)
   - Traditional Chinese (繁體中文)
   - Japanese (日本語)

2. **Language Switching**:
   - Go to Settings page
   - Select your preferred language from the dropdown
   - Language changes immediately without page reload
   - Your preference is saved and synchronized across all extension pages

### Domain Filtering

Control which websites are automatically captured:

1. **Filter Modes**:
   - **Blacklist Mode**: Exclude specified domains (default)
   - **Whitelist Mode**: Allow only specified domains

2. **Domain Management**:
   - Add domains with wildcard support (e.g., `*.example.com`)
   - Switch between modes with confirmation
   - Real-time domain list management

### Auto Capture Mode (Recommended)

The extension features intelligent auto-capture for seamless browsing:

1. **Enable Auto Capture**: Click the extension icon and toggle auto-capture in settings
2. **Smart Monitoring**: Automatically monitors URL changes and SPA route changes
3. **Enhanced Retry**: Retry mechanism for complex websites (Atlassian, Notion, GitHub)
4. **Background Operation**: Runs silently in the background

### Quick Search

1. Click the FlexSearch Finder icon in Chrome toolbar
2. Enter keywords in the search box of the popup
3. Press Enter to open the full search results page

### Manual Page Capture

1. Browse to the webpage you want to save
2. Click the extension icon to open the popup
3. Click "Capture this page" button
4. The system will automatically save the page title, URL, and content to the index

### Full Search Page

1. Click the extension icon, then click "Open Search Page" button
2. In the full search page, you can:
   - Enter keywords to search
   - View matching results with title and content summary
   - See visit count and last visit time for each page
   - Click title links to navigate directly to original pages

### Auto Capture Features

- **Smart URL Monitoring**: Listens to `chrome.tabs.onUpdated` and `chrome.webNavigation.onHistoryStateUpdated`
- **SPA Support**: Perfect support for single-page application route changes
- **Retry Mechanism**: Up to 5 retries to ensure complete content capture
- **Fallback Strategy**: Automatically uses simplified capture when main parsing fails
- **Memory Management**: Automatic cleanup of closed tab URL cache

## 🛠️ Development Guide

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build Production Version

```bash
npm run build
```

### Package Extension

```bash
npm run package  # Build and package as zip file
```

### Clean Build Files

```bash
npm run clean
```

### CI/CD Automation

The project is configured with GitHub Actions for automated build and release:

- **CI Workflow** (`.github/workflows/ci.yml`):
  - Triggered on push to `main`/`develop` branches or PRs
  - Executes build validation and file integrity checks
  - Uploads build artifacts

- **Release Workflow** (`.github/workflows/release.yml`):
  - Triggered when pushing tags starting with `v` (e.g., `v1.0.0`)
  - Automatically builds and creates GitHub Release
  - Packages and uploads Chrome extension zip file

#### Release New Version

1. Update version and push:
   ```bash
   npm version patch  # or minor, major
   git push origin main
   ```

2. Create and push tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. GitHub Actions will automatically build and create release

### 🏗️ Technical Architecture Details

#### Core File Structure

```
src/
├── background/
│   ├── background.js     # Background service: auto-capture, database management
│   └── auto-capture.js   # Auto-capture logic and retry mechanism
├── content/
│   └── contentScript.js  # Content script: page content parsing
├── popup/
│   ├── popup.html        # Popup window HTML
│   └── popup.js          # Popup window: quick search and settings
├── search/
│   ├── index.html        # Main search page HTML
│   └── main.js           # Main search page: full search interface
├── settings/
│   ├── settings.html     # Settings page HTML
│   └── settings.js       # Settings page: configuration management
├── shared/
│   ├── database.js       # Database operations: IndexedDB wrapper
│   ├── search-engine.js  # Search engine: FlexSearch configuration
│   ├── tokenizer.js      # Custom tokenizer: CJK search optimization
│   └── i18n.js           # Internationalization: multi-language support
├── _locales/
│   ├── en/messages.json  # English translations
│   ├── zh_TW/messages.json # Traditional Chinese translations
│   └── ja/messages.json  # Japanese translations
├── utils/
│   └── constants.js      # Constants and configuration
├── utils.js              # Utility functions
└── db.js                 # Database schema and initialization

public/
└── manifest.json         # Extension configuration

.github/workflows/
├── ci.yml                # Continuous integration workflow
└── release.yml           # Automatic release workflow
```

#### Auto-Capture Mechanism

- **URL Change Monitoring**: Uses `chrome.tabs.onUpdated` to monitor page status changes
- **SPA Route Monitoring**: Uses `chrome.webNavigation.onHistoryStateUpdated` to handle single-page applications
- **Smart Retry System**:
  - Up to 5 retries with 800ms intervals
  - Checks page load status and main content areas
  - Extended wait time for complex websites
- **Fallback Capture Mechanism**: Uses simplified method when main parsing fails
- **Memory Management**: Tracks tab URL states, automatically cleans up closed tabs

#### Data Structure

```javascript
{
  id: Number,           // Auto-generated unique ID
  title: String,        // Page title
  content: String,      // Page content (cleaned text)
  excerpt: String,      // Content excerpt
  url: String,          // Page URL
  siteName: String,     // Website name
  timestamp: String,    // ISO format timestamp
  visitCount: Number,   // Visit count
  wordCount: Number,    // Word count
  readingTime: Number   // Estimated reading time (minutes)
}
```

#### Search Index Configuration

- Supports mixed search of Chinese, English, and numbers
- Creates full-text index for title, content, and excerpt
- Uses custom tokenizer to optimize Chinese search experience
- FlexSearch Document mode with multi-field search support

## ⚠️ Known Issues & Limitations

### Website Compatibility
- Some websites with strict CSP (Content Security Policy) may not be capturable
- Modern websites that heavily use Shadow DOM may require additional handling
- Dynamic content loading websites have been improved through retry mechanisms, but some content may still be missed

### Performance Limitations
- Large pages (over 10,000 words) may process slowly
- IndexedDB storage space is limited, regular cleanup of old data is recommended
- Opening many tabs simultaneously may affect capture performance

### Feature Limitations
- Cannot capture private content that requires login
- Cannot process non-HTML content like PDFs or images
- Search result ranking is still being continuously optimized

## 🔒 Privacy Statement

FlexSearch Finder highly values your privacy and security:

- **Local Storage**: All data is stored only in your local browser
- **No Upload**: No content is uploaded to external servers
- **No Tracking**: No user behavior data is collected
- **User Control**: You can clear all stored data at any time
- **Open Source**: Code is completely open source for inspection and modification

Removing the extension will automatically delete all stored index data.

## 💻 System Requirements

- **Browser**: Chrome 88 or higher (requires Manifest V3 support)
- **API Support**: IndexedDB, chrome.scripting, chrome.webNavigation
- **Storage Space**: Recommended at least 50MB available space (for index data)
- **Memory**: Recommended 4GB+ RAM (when processing large amounts of pages)

## 🙏 Acknowledgments

This project uses the following excellent open source projects:

- [FlexSearch](https://github.com/nextapps-de/flexsearch) - High-performance full-text search library
- [idb](https://github.com/jakearchibald/idb) - Promise wrapper for IndexedDB
- [Mozilla Readability](https://github.com/mozilla/readability) - Web content extraction tool
- [Vite](https://vitejs.dev/) - Modern frontend toolchain

## 🤝 Contributing

Contributions of any kind are welcome! Particularly welcome:

### Issue Reports
- 🐛 Bug reports: Please provide detailed reproduction steps
- 💡 Feature suggestions: Describe use cases and expected effects
- 🧪 Testing feedback: Share usage experience and improvement suggestions

### Code Contributions
1. Fork this project
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines
- Use English commit messages (following Conventional Commits)
- Ensure CI checks pass
- Add appropriate comments and documentation
- Keep code clean and readable

## 📞 Contact

For any questions or suggestions, please contact us through:

- 📝 [GitHub Issues](https://github.com/herber523/flexsearch-chrome-extension/issues) - Report issues or feature requests
- 🔀 [Pull Requests](https://github.com/herber523/flexsearch-chrome-extension/pulls) - Submit code contributions
- 📖 [GitHub Discussions](https://github.com/herber523/flexsearch-chrome-extension/discussions) - Technical discussions and Q&A

---

**Development Status**: ✅ Stable Version  
**Version**: 1.0.0  
**Last Updated**: July 2025
