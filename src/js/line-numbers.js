/**
 * 行号显示管理器
 * 负责在JSON编辑器中显示行号
 */
class LineNumberManager {
  constructor() {
    this.textarea = document.getElementById('json-input');
    this.lineNumbers = document.getElementById('line-numbers');
    this.fontManager = null;
    this.init();
  }

  /**
   * 初始化行号管理器
   */
  init() {
    // 初始更新行号
    this.updateLineNumbers();

    // 监听文本变化事件
    this.textarea.addEventListener('input', () => this.updateLineNumbers());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('keydown', (e) => {
      // 延迟更新以确保文本变化后再更新行号
      setTimeout(() => this.updateLineNumbers(), 0);
    });
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => this.updateLineNumbers());
    
    // 监听字体大小变化
    document.addEventListener('fontSizeChanged', (e) => {
      // 更新行号字体大小
      this.lineNumbers.style.fontSize = e.detail.fontSize + 'px';
      // 确保行高一致
      this.lineNumbers.style.lineHeight = this.getComputedLineHeight();
      // 重新计算行号
      this.updateLineNumbers();
    });
    
    // 初始化时设置行高
    this.lineNumbers.style.lineHeight = this.getComputedLineHeight();
  }

  /**
   * 获取计算后的行高
   */
  getComputedLineHeight() {
    const computedStyle = window.getComputedStyle(this.textarea);
    return computedStyle.lineHeight;
  }

  /**
   * 更新行号显示
   */
  updateLineNumbers() {
    const content = this.textarea.value;
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    // 清空当前行号
    this.lineNumbers.innerHTML = '';
    
    // 创建行号容器
    const fragment = document.createDocumentFragment();
    
    // 创建新的行号
    for (let i = 1; i <= lineCount; i++) {
      const lineNumber = document.createElement('div');
      lineNumber.textContent = i;
      lineNumber.className = 'line-number';
      fragment.appendChild(lineNumber);
    }
    
    // 确保至少有一行
    if (lineCount === 0) {
      const lineNumber = document.createElement('div');
      lineNumber.textContent = '1';
      lineNumber.className = 'line-number';
      fragment.appendChild(lineNumber);
    }
    
    this.lineNumbers.appendChild(fragment);
    
    // 同步滚动位置
    this.syncScroll();
  }

  /**
   * 同步滚动位置
   */
  syncScroll() {
    this.lineNumbers.scrollTop = this.textarea.scrollTop;
  }
}

// 当DOM加载完成后初始化行号管理器
document.addEventListener('DOMContentLoaded', () => {
  new LineNumberManager();
});
