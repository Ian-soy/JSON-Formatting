/**
 * JSON格式化大师 - 字体管理模块
 * 用于处理插件的字体大小调整功能
 */

class FontManager {
  constructor() {
    this.minSize = 8;
    this.maxSize = 24;
    this.defaultSize = 14;
    this.currentSize = this.defaultSize;
  }
  
  /**
   * 初始化字体大小
   * @returns {Promise<number>} 当前字体大小
   */
  async initialize() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('fontSize', (data) => {
        this.currentSize = data.fontSize || this.defaultSize;
        this.applyFontSize(this.currentSize);
        resolve(this.currentSize);
      });
    });
  }
  
  /**
   * 应用字体大小
   * @param {number} size - 字体大小（像素）
   */
  applyFontSize(size) {
    // 确保字体大小在有效范围内
    if (size < this.minSize) size = this.minSize;
    if (size > this.maxSize) size = this.maxSize;
    
    this.currentSize = size;
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--font-size', `${size}px`);
    
    // 更新编辑器字体大小
    const editor = document.getElementById('json-input');
    if (editor) {
      editor.style.fontSize = `${size}px`;
    }
    
    // 更新显示
    const display = document.getElementById('font-size-display');
    if (display) {
      display.textContent = `${size}px`;
    }
    
    // 保存到存储
    chrome.storage.sync.set({ fontSize: size });
  }
  
  /**
   * 增加字体大小
   */
  increase() {
    if (this.currentSize < this.maxSize) {
      this.applyFontSize(this.currentSize + 1);
    }
  }
  
  /**
   * 减小字体大小
   */
  decrease() {
    if (this.currentSize > this.minSize) {
      this.applyFontSize(this.currentSize - 1);
    }
  }
  
  /**
   * 获取当前字体大小
   * @returns {number} 当前字体大小
   */
  getCurrentSize() {
    return this.currentSize;
  }
}

// 导出字体管理器实例
const fontManager = new FontManager();