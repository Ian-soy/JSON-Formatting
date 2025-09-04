// 历史数据管理器 - 处理历史数据的显示和交互
class HistoryManager {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.historyListElement = null;
    this.currentActiveItem = null;
    this.isCollapsed = false; // 添加折叠状态
  }

  /**
   * 初始化历史管理器
   */
  async initialize() {
    this.historyListElement = document.getElementById('history-list');
    this.setupEventListeners();
    this.initializeToggleButton(); // 初始化展开/折叠按钮
    
    // 默认折叠历史面板
    this.collapseHistoryPanel();
    
    await this.refreshHistoryList();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 刷新按钮事件
    const refreshBtn = document.getElementById('refresh-history-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshHistoryList());
    }

    // 展开/折叠按钮事件
    const toggleBtn = document.getElementById('history-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleHistoryPanel());
    }

    // 监听历史数据变化事件
    document.addEventListener('historyDataChanged', () => {
      this.refreshHistoryList();
    });
  }

  /**
   * 刷新历史数据列表
   */
  async refreshHistoryList() {
    if (!this.historyListElement || !this.dataManager) return;

    try {
      const savedData = await this.dataManager.getSavedData();
      
      if (savedData.length === 0) {
        this.showNoDataMessage();
        return;
      }

      this.renderHistoryItems(savedData);
    } catch (error) {
      console.error('刷新历史数据失败:', error);
      this.showErrorMessage('加载历史数据失败');
    }
  }

  /**
   * 渲染历史数据项
   * @param {Array} savedData - 保存的数据列表
   */
  renderHistoryItems(savedData) {
    this.historyListElement.innerHTML = '';

    savedData.forEach(item => {
      const historyItem = this.createHistoryItem(item);
      this.historyListElement.appendChild(historyItem);
    });
  }

  /**
   * 创建历史数据项元素
   * @param {Object} item - 数据项
   * @returns {HTMLElement} 历史数据项元素
   */
  createHistoryItem(item) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.dataset.id = item.id;

    // 计算数据大小
    const size = this.dataManager.formatSize(item.data);
    
    // 格式化时间
    const date = new Date(item.timestamp);
    const formattedDate = this.formatDate(date);

    div.innerHTML = `
      <div class="history-item-header">
        <div class="history-item-title" title="${this.escapeHtml(item.title)}">${this.escapeHtml(item.title)}</div>
        <div class="history-item-actions">
          <button class="btn danger delete-btn">
            ${IconManager.getIcon('delete')}
          </button>
        </div>
      </div>
      <div class="history-item-info">
        <span class="history-item-date">${formattedDate}</span>
        <span class="history-item-size">${size}</span>
      </div>
    `;

    // 绑定事件
    this.bindHistoryItemEvents(div, item);

    return div;
  }

  /**
   * 绑定历史数据项事件
   * @param {HTMLElement} element - 历史数据项元素
   * @param {Object} item - 数据项
   */
  bindHistoryItemEvents(element, item) {
    // 点击加载数据
    const loadBtn = element.querySelector('.load-btn');
    if (loadBtn) {
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadHistoryItem(item);
      });
    }

    // 点击删除数据
    const deleteBtn = element.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHistoryItem(item);
      });
    }

    // 点击项目本身也加载数据
    element.addEventListener('click', () => {
      this.loadHistoryItem(item);
    });
  }

  /**
   * 加载历史数据项
   * @param {Object} item - 数据项
   */
  async loadHistoryItem(item) {
    try {
      const jsonInput = document.getElementById('json-input');
      if (!jsonInput) return;

      // 设置数据到编辑器
      jsonInput.value = item.data;
      
      // 更新全局数据
      jsonData = JSON.parse(item.data);
      
      // 更新字符计数
      updateCharCount();
      
      // 更新行号
      if (typeof LineNumberManager !== 'undefined') {
        setTimeout(() => {
          LineNumberManager.updateLineNumbersStatic();
        }, 10);
      }

      // 更新活跃状态
      this.setActiveItem(item.id);
      
      // 显示成功消息
      if (typeof updateStatus === 'function') {
        updateStatus(`已加载数据：${item.title}`, 'success');
      }
    } catch (error) {
      console.error('加载历史数据失败:', error);
      if (typeof updateStatus === 'function') {
        updateStatus('加载数据失败，请重试', 'error');
      }
    }
  }

  /**
   * 删除历史数据项
   * @param {Object} item - 数据项
   */
  async deleteHistoryItem(item) {
    try {
      const confirmed = confirm(`确定要删除"${item.title}"吗？此操作不可恢复！`);
      if (!confirmed) return;

      const result = await this.dataManager.deleteJsonData(item.id);
      
      if (result.success) {
        await this.refreshHistoryList();
        
        // 如果删除的是当前活跃项，清除活跃状态
        if (this.currentActiveItem === item.id) {
          this.currentActiveItem = null;
        }
        
        if (typeof updateStatus === 'function') {
          updateStatus(`已删除：${item.title}`, 'success');
        }
      } else {
        if (typeof updateStatus === 'function') {
          updateStatus(result.error || '删除失败', 'error');
        }
      }
    } catch (error) {
      console.error('删除历史数据失败:', error);
      if (typeof updateStatus === 'function') {
        updateStatus('删除失败，请重试', 'error');
      }
    }
  }

  /**
   * 设置活跃项
   * @param {string} itemId - 项目ID
   */
  setActiveItem(itemId) {
    // 清除之前的活跃状态
    const previousActive = this.historyListElement.querySelector('.history-item.active');
    if (previousActive) {
      previousActive.classList.remove('active');
    }

    // 设置新的活跃状态
    const newActive = this.historyListElement.querySelector(`[data-id="${itemId}"]`);
    if (newActive) {
      newActive.classList.add('active');
      this.currentActiveItem = itemId;
    }
  }

  /**
   * 显示无数据消息
   */
  showNoDataMessage() {
    this.historyListElement.innerHTML = '<div class="no-data">暂无保存的数据</div>';
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showErrorMessage(message) {
    this.historyListElement.innerHTML = `<div class="no-data" style="color: var(--error-color);">${message}</div>`;
  }

  /**
   * 格式化日期
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    
    // 小于1小时
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }
    
    // 小于1天
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }
    
    // 小于7天
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    }
    
    // 超过7天显示具体日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * HTML转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 获取当前活跃项ID
   * @returns {string|null} 活跃项ID
   */
  getCurrentActiveItem() {
    return this.currentActiveItem;
  }

  /**
   * 清除活跃状态
   */
  clearActiveItem() {
    const activeItem = this.historyListElement.querySelector('.history-item.active');
    if (activeItem) {
      activeItem.classList.remove('active');
    }
    this.currentActiveItem = null;
  }

  /**
   * 切换历史面板的展开/折叠状态
   */
  toggleHistoryPanel() {
    const historySection = document.getElementById('history-section');
    const toggleBtn = document.getElementById('history-toggle-btn');
    
    if (!historySection || !toggleBtn) return;

    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      // 折叠状态
      historySection.classList.add('collapsed');
      toggleBtn.title = '展开历史面板';
      // 更新图标为向右箭头
      toggleBtn.querySelector('.icon-container').innerHTML = IconManager.getIcon('chevron-right');
    } else {
      // 展开状态
      historySection.classList.remove('collapsed');
      toggleBtn.title = '折叠历史面板';
      // 更新图标为向左箭头
      toggleBtn.querySelector('.icon-container').innerHTML = IconManager.getIcon('chevron-left');
    }
  }

  /**
   * 初始化展开/折叠按钮图标
   */
  initializeToggleButton() {
    const toggleBtn = document.getElementById('history-toggle-btn');
    if (toggleBtn) {
      // 默认状态为展开，显示向左箭头（折叠）
      toggleBtn.querySelector('.icon-container').innerHTML = IconManager.getIcon('chevron-left');
    }
  }

  /**
   * 折叠历史面板
   */
  collapseHistoryPanel() {
    const historySection = document.getElementById('history-section');
    const toggleBtn = document.getElementById('history-toggle-btn');

    if (historySection && toggleBtn) {
      historySection.classList.add('collapsed');
      toggleBtn.querySelector('.icon-container').innerHTML = IconManager.getIcon('chevron-right');
    }
  }
}