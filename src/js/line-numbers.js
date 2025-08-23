/**
 * 行号显示管理器
 * 负责在JSON编辑器中显示行号，优化处理大量行的性能
 */
class LineNumberManager {
  constructor() {
    this.textarea = document.getElementById('json-input');
    this.lineNumbers = document.getElementById('line-numbers');
    this.fontManager = null;
    this.lastContent = '';
    this.lastLineCount = 0;
    this.debounceTimeout = null;
    this.init();
  }
  
  // 静态方法，用于直接更新行号
  static updateLineNumbersStatic() {
    const instance = new LineNumberManager();
    instance.updateLineNumbers();
  }

  /**
   * 初始化行号管理器
   */
  init() {
    // 初始更新行号
    this.updateLineNumbers();

    // 使用防抖优化输入事件
    this.textarea.addEventListener('input', () => {
      this.debounceLineNumberUpdate();
    });
    
    // 优化滚动性能
    this.textarea.addEventListener('scroll', () => {
      // 使用requestAnimationFrame优化滚动性能
      window.requestAnimationFrame(() => this.syncScroll());
    });
    
    // 处理特殊按键事件
    this.textarea.addEventListener('keydown', (e) => {
      // 只在特定键（回车、删除、退格等）时更新行号
      const specialKeys = ['Enter', 'Delete', 'Backspace'];
      if (specialKeys.includes(e.key)) {
        setTimeout(() => this.updateLineNumbers(), 0);
      }
    });
    
    // 监听窗口大小变化，使用防抖
    window.addEventListener('resize', () => {
      this.debounceLineNumberUpdate();
    });
    
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
   * 防抖处理行号更新
   */
  debounceLineNumberUpdate() {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.updateLineNumbers();
    }, 50); // 50ms防抖延迟
  }

  /**
   * 获取计算后的行高
   */
  getComputedLineHeight() {
    const computedStyle = window.getComputedStyle(this.textarea);
    // 获取精确的行高值
    if (computedStyle.lineHeight !== 'normal') {
      return computedStyle.lineHeight;
    } else {
      // 如果是normal，计算实际行高
      const fontSize = parseFloat(computedStyle.fontSize);
      return (fontSize * 1.5) + 'px'; // 通常normal约为1.2-1.5倍字体大小
    }
  }
  
  /**
   * 同步行高设置
   */
  syncLineHeight() {
    const textareaStyle = window.getComputedStyle(this.textarea);
    const lineHeight = textareaStyle.lineHeight;
    const fontSize = textareaStyle.fontSize;
    const paddingTop = textareaStyle.paddingTop;
    
    // 设置行号容器的行高、字体大小和内边距
    this.lineNumbers.style.fontSize = fontSize;
    this.lineNumbers.style.lineHeight = lineHeight;
    this.lineNumbers.style.paddingTop = paddingTop;
    this.lineNumbers.style.paddingBottom = textareaStyle.paddingBottom;
    
    // 计算每行的实际高度（包括行间距）
    const singleLineHeight = parseFloat(lineHeight);
    
    // 为每个行号元素设置相同的高度
    const lineNumberElements = this.lineNumbers.querySelectorAll('.line-number');
    lineNumberElements.forEach(el => {
      el.style.height = singleLineHeight + 'px';
      el.style.lineHeight = singleLineHeight + 'px';
    });
    
    // 确保滚动位置同步
    this.syncScroll();
  }

  /**
   * 更新行号显示，优化大量行的处理
   */
  updateLineNumbers() {
    // 获取文本内容
    const content = this.textarea.value;
    
    // 如果内容没有变化，只同步滚动位置
    if (content === this.lastContent) {
      this.syncScroll();
      return;
    }
    
    this.lastContent = content;
    
    // 计算行数
    let lines = content.split('\n');
    const lineCount = lines.length;
    
    // 如果行数没变，可能只需要同步滚动
    if (lineCount === this.lastLineCount && lineCount > 0) {
      this.syncScroll();
      return;
    }
    
    this.lastLineCount = lineCount;
    
    // 清空当前行号
    this.lineNumbers.innerHTML = '';
    
    // 创建行号容器
    const fragment = document.createDocumentFragment();
    
    // 对于大量行，使用虚拟化渲染优化
    if (lineCount > 1000) {
      this.renderVirtualizedLineNumbers(lineCount, lines, fragment);
    } else {
      // 正常渲染所有行号
      this.renderAllLineNumbers(lineCount, lines, fragment);
    }
    
    // 确保至少有一行
    if (lineCount === 0) {
      const lineNumber = document.createElement('div');
      lineNumber.textContent = '1';
      lineNumber.className = 'line-number empty-line';
      fragment.appendChild(lineNumber);
    }
    
    this.lineNumbers.appendChild(fragment);
    
    // 同步行高和滚动位置
    this.syncLineHeight();
    this.syncScroll();
  }
  
  /**
   * 渲染所有行号
   */
  renderAllLineNumbers(lineCount, lines, fragment) {
    for (let i = 1; i <= lineCount; i++) {
      const lineNumber = document.createElement('div');
      lineNumber.textContent = i;
      lineNumber.className = 'line-number';
      
      // 检查对应行的内容，调整样式
      if (lines[i-1] && lines[i-1].trim().length > 0) {
        // 有内容的行
        lineNumber.classList.add('has-content');
      } else {
        // 空行
        lineNumber.classList.add('empty-line');
      }
      
      fragment.appendChild(lineNumber);
    }
  }
  
  /**
   * 虚拟化渲染行号（针对大量行优化）
   */
  renderVirtualizedLineNumbers(lineCount, lines, fragment) {
    // 创建一个包含所有行号的字符串
    let lineNumbersHTML = '';
    
    for (let i = 1; i <= lineCount; i++) {
      const hasContent = lines[i-1] && lines[i-1].trim().length > 0;
      const className = hasContent ? 'line-number has-content' : 'line-number empty-line';
      lineNumbersHTML += `<div class="${className}">${i}</div>`;
    }
    
    // 一次性设置HTML，减少DOM操作
    const container = document.createElement('div');
    container.innerHTML = lineNumbersHTML;
    
    // 将所有子节点添加到fragment
    while (container.firstChild) {
      fragment.appendChild(container.firstChild);
    }
  }

  /**
   * 同步滚动位置
   */
  syncScroll() {
    if (this.lineNumbers) {
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    }
  }
}

// 当DOM加载完成后初始化行号管理器
document.addEventListener('DOMContentLoaded', () => {
  new LineNumberManager();
});
