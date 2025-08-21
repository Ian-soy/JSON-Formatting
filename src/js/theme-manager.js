/**
 * JSON格式化大师 - 主题管理模块
 * 用于处理插件的主题切换功能
 */

class ThemeManager {
  constructor() {
    this.themes = {
      dark: {
        name: '暗黑',
        variables: {
          '--bg-primary': '#1e1e1e',
          '--bg-secondary': '#252526',
          '--text-primary': '#e0e0e0',
          '--text-secondary': '#a0a0a0',
          '--accent-color': '#0078d7',
          '--error-color': '#f44336',
          '--success-color': '#4caf50',
          '--border-color': '#333333',
          '--btn-hover': '#2a2d2e'
        }
      },
      light: {
        name: '明亮',
        variables: {
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f5f5f5',
          '--text-primary': '#333333',
          '--text-secondary': '#666666',
          '--accent-color': '#0078d7',
          '--error-color': '#f44336',
          '--success-color': '#4caf50',
          '--border-color': '#dddddd',
          '--btn-hover': '#e0e0e0'
        }
      },
      blue: {
        name: '蓝色',
        variables: {
          '--bg-primary': '#1a2733',
          '--bg-secondary': '#203746',
          '--text-primary': '#e0e0e0',
          '--text-secondary': '#a0a0a0',
          '--accent-color': '#61afef',
          '--error-color': '#f44336',
          '--success-color': '#4caf50',
          '--border-color': '#2c4052',
          '--btn-hover': '#2c4052'
        }
      },
      green: {
        name: '绿色',
        variables: {
          '--bg-primary': '#1e2a1e',
          '--bg-secondary': '#263326',
          '--text-primary': '#e0e0e0',
          '--text-secondary': '#a0a0a0',
          '--accent-color': '#6baa6b',
          '--error-color': '#f44336',
          '--success-color': '#4caf50',
          '--border-color': '#2d3d2d',
          '--btn-hover': '#2d3d2d'
        }
      }
    };
    
    this.currentTheme = 'dark';
  }
  
  /**
   * 初始化主题
   * @returns {Promise<string>} 当前主题
   */
  async initialize() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('theme', (data) => {
        this.currentTheme = data.theme || 'dark';
        this.applyTheme(this.currentTheme);
        resolve(this.currentTheme);
      });
    });
  }
  
  /**
   * 应用主题
   * @param {string} themeName - 主题名称
   */
  applyTheme(themeName) {
    if (!this.themes[themeName]) {
      console.error(`主题 "${themeName}" 不存在`);
      return;
    }
    
    this.currentTheme = themeName;
    
    // 应用CSS变量
    const theme = this.themes[themeName];
    Object.entries(theme.variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // 添加主题类名
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    
    // 保存到存储
    chrome.storage.sync.set({ theme: themeName });
  }
  
  /**
   * 获取所有可用主题
   * @returns {Array} 主题列表
   */
  getAvailableThemes() {
    return Object.entries(this.themes).map(([id, theme]) => ({
      id,
      name: theme.name
    }));
  }
  
  /**
   * 获取当前主题
   * @returns {string} 当前主题名称
   */
  getCurrentTheme() {
    return this.currentTheme;
  }
}

// 导出主题管理器实例
const themeManager = new ThemeManager();