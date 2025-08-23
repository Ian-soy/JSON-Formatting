/**
 * JSON格式化大师 - 主题管理模块
 * 用于处理插件的主题切换功能
 */

class ThemeManager {
  constructor() {
    this.themes = {
      monitor: {
        name: '监控',
        variables: {
          '--bg-primary': '#171b2e',
          '--bg-secondary': '#1e2235',
          '--text-primary': '#e0e0e0',
          '--text-secondary': '#a0a0a0',
          '--accent-color': '#6366f1',
          '--error-color': '#ef4444',
          '--success-color': '#22c55e',
          '--warning-color': '#f59e0b',
          '--info-color': '#3b82f6',
          '--border-color': '#252a40',
          '--btn-hover': '#2f3650',
          '--card-bg': '#232840',
          '--purple-color': '#8b5cf6',
          '--status-normal': '#22c55e',
          '--status-error': '#ef4444',
          '--status-warning': '#f59e0b',
          '--status-unknown': '#f8fafc',
          '--status-pending': '#8b5cf6'
        }
      }
    };
    
    this.currentTheme = 'monitor';
  }
  
  /**
   * 初始化主题
   * @returns {Promise<string>} 当前主题
   */
  async initialize() {
    return new Promise((resolve) => {
      // 始终使用监控主题
      this.currentTheme = 'monitor';
      this.applyTheme(this.currentTheme);
      resolve(this.currentTheme);
    });
  }
  
  /**
   * 应用主题
   * @param {string} themeName - 主题名称
   */
  applyTheme(themeName) {
    if (themeName !== 'monitor') {
      themeName = 'monitor';
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
    
    // 显示监控主题特殊元素
    const monitorAddBtnContainer = document.getElementById('monitor-add-btn-container');
    if (monitorAddBtnContainer) {
      monitorAddBtnContainer.style.display = 'block';
    }
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