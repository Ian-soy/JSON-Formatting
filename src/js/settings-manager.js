// 设置管理器 - 管理应用设置和配置
class SettingsManager {
  constructor() {
    this.isOpen = false;
    this.dataManager = null;
    this.storageUpdateInterval = null;
  }

  /**
   * 初始化设置管理器
   * @param {DataManager} dataManagerInstance - 数据管理器实例
   */
  initialize(dataManagerInstance) {
    this.dataManager = dataManagerInstance;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 设置按钮点击事件
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.toggleSettings());
    }

    // 设置保存按钮
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    }

    // 设置取消按钮
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
    }

    // 设置重置按钮
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }

    // 清除所有数据按钮
    const clearAllDataBtn = document.getElementById('clear-all-data-btn');
    if (clearAllDataBtn) {
      clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    }

    // 输入验证
    const maxItemsInput = document.getElementById('max-items-input');
    if (maxItemsInput) {
      maxItemsInput.addEventListener('input', (e) => this.validateMaxItems(e.target));
    }

    const expirationDaysInput = document.getElementById('expiration-days-input');
    if (expirationDaysInput) {
      expirationDaysInput.addEventListener('input', (e) => this.validateExpirationDays(e.target));
    }
  }

  /**
   * 切换设置面板显示/隐藏
   */
  async toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) return;

    if (this.isOpen) {
      this.closeSettings();
    } else {
      await this.openSettings();
    }
  }

  /**
   * 打开设置面板
   */
  async openSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) return;

    try {
      // 加载当前设置
      await this.loadCurrentSettings();
      
      // 显示设置面板
      settingsPanel.style.display = 'block';
      this.isOpen = true;

      // 更新按钮状态
      this.updateSettingsButtonState();
      
      // 立即刷新存储信息
      await this.refreshStorageInfo();
      
      // 启动存储信息实时更新
      this.startStorageInfoUpdate();
    } catch (error) {
      console.error('打开设置失败:', error);
      this.showMessage('设置加载失败', 'error');
    }
  }

  /**
   * 关闭设置面板
   */
  closeSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) return;

    settingsPanel.style.display = 'none';
    this.isOpen = false;

    // 更新按钮状态
    this.updateSettingsButtonState();
    
    // 停止存储信息实时更新
    this.stopStorageInfoUpdate();
  }

  /**
   * 加载当前设置到界面
   */
  async loadCurrentSettings() {
    if (!this.dataManager) return;

    try {
      const settings = await this.dataManager.getSettings();
      const storageInfo = await this.dataManager.getStorageInfo();

      // 更新输入框
      const maxItemsInput = document.getElementById('max-items-input');
      if (maxItemsInput) {
        maxItemsInput.value = settings.maxSavedItems;
      }

      const expirationDaysInput = document.getElementById('expiration-days-input');
      if (expirationDaysInput) {
        expirationDaysInput.value = settings.expirationDays;
      }

      // 更新存储信息显示
      this.updateStorageInfo(storageInfo);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    if (!this.dataManager) return;

    try {
      const maxItemsInput = document.getElementById('max-items-input');
      const expirationDaysInput = document.getElementById('expiration-days-input');

      if (!maxItemsInput || !expirationDaysInput) {
        this.showMessage('设置输入框未找到', 'error');
        return;
      }

      const maxSavedItems = parseInt(maxItemsInput.value);
      const expirationDays = parseInt(expirationDaysInput.value);

      // 验证输入
      if (!this.validateInputs(maxSavedItems, expirationDays)) {
        return;
      }

      // 保存设置
      const result = await this.dataManager.saveSettings({
        maxSavedItems,
        expirationDays
      });

      if (result.success) {
        this.showMessage('设置保存成功', 'success');
        
        // 更新存储信息
        const storageInfo = await this.dataManager.getStorageInfo();
        this.updateStorageInfo(storageInfo);
        
        // 触发历史数据刷新
        this.triggerHistoryRefresh();
      } else {
        this.showMessage(result.error || '设置保存失败', 'error');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showMessage('保存设置失败，请重试', 'error');
    }
  }

  /**
   * 重置设置到默认值
   */
  async resetSettings() {
    try {
      const confirmed = confirm('确定要重置所有设置到默认值吗？');
      if (!confirmed) return;

      const maxItemsInput = document.getElementById('max-items-input');
      const expirationDaysInput = document.getElementById('expiration-days-input');

      if (maxItemsInput && expirationDaysInput) {
        maxItemsInput.value = 10; // 默认值
        expirationDaysInput.value = 5; // 默认值
        
        // 保存默认设置
        await this.saveSettings();
      }
    } catch (error) {
      console.error('重置设置失败:', error);
      this.showMessage('重置设置失败', 'error');
    }
  }

  /**
   * 清除所有保存的数据
   */
  async clearAllData() {
    if (!this.dataManager) return;

    try {
      const confirmed = confirm('确定要清除所有保存的JSON数据吗？此操作不可恢复！');
      if (!confirmed) return;

      const result = await this.dataManager.clearAllData();
      
      if (result.success) {
        this.showMessage('所有数据已清除', 'success');
        
        // 更新存储信息
        const storageInfo = await this.dataManager.getStorageInfo();
        this.updateStorageInfo(storageInfo);
        
        // 触发历史数据刷新
        this.triggerHistoryRefresh();
      } else {
        this.showMessage(result.error || '清除数据失败', 'error');
      }
    } catch (error) {
      console.error('清除数据失败:', error);
      this.showMessage('清除数据失败，请重试', 'error');
    }
  }

  /**
   * 验证最大保存条数输入
   * @param {HTMLInputElement} input - 输入框元素
   */
  validateMaxItems(input) {
    const value = parseInt(input.value);
    const errorElement = document.getElementById('max-items-error');

    if (isNaN(value) || value < 1 || value > 50) {
      input.classList.add('error');
      if (errorElement) {
        errorElement.textContent = '请输入1-50之间的数字';
        errorElement.style.display = 'block';
      }
      return false;
    } else {
      input.classList.remove('error');
      if (errorElement) {
        errorElement.style.display = 'none';
      }
      return true;
    }
  }

  /**
   * 验证过期天数输入
   * @param {HTMLInputElement} input - 输入框元素
   */
  validateExpirationDays(input) {
    const value = parseInt(input.value);
    const errorElement = document.getElementById('expiration-days-error');

    if (isNaN(value) || value < 1 || value > 365) {
      input.classList.add('error');
      if (errorElement) {
        errorElement.textContent = '请输入1-365之间的数字';
        errorElement.style.display = 'block';
      }
      return false;
    } else {
      input.classList.remove('error');
      if (errorElement) {
        errorElement.style.display = 'none';
      }
      return true;
    }
  }

  /**
   * 验证所有输入
   * @param {number} maxItems - 最大条数
   * @param {number} expirationDays - 过期天数
   * @returns {boolean} 验证结果
   */
  validateInputs(maxItems, expirationDays) {
    let isValid = true;

    if (isNaN(maxItems) || maxItems < 1 || maxItems > 50) {
      this.showMessage('最大保存条数必须在1-50之间', 'error');
      isValid = false;
    }

    if (isNaN(expirationDays) || expirationDays < 1 || expirationDays > 365) {
      this.showMessage('过期天数必须在1-365之间', 'error');
      isValid = false;
    }

    return isValid;
  }

  /**
   * 更新存储信息显示（增强版）
   * @param {Object} storageInfo - 存储信息
   */
  async updateStorageInfo(storageInfo) {
    if (!storageInfo) {
      storageInfo = await this.dataManager.getStorageInfo();
    }

    // 注意：存储信息显示已从设置面板中移除，仅保留动态创建的存储使用情况显示
    
    // 更新存储使用情况显示
    await this.updateStorageUsageDisplay(storageInfo.storage);
    
    // 更新压缩信息显示
    this.updateCompressionDisplay(storageInfo.compression);
  }
  
  /**
   * 更新存储使用情况显示
   * 注意：已移除设置面板中的存储显示，此函数仅保留以保持兼容性
   */
  async updateStorageUsageDisplay(storageUsage) {
    // 仅更新已存在的存储容器，不再创建新的
    const storageContainer = document.getElementById('storage-usage-container');
    if (!storageContainer) {
      // 不再在设置面板中创建存储使用情况显示
      return;
    }
    
    if (!storageUsage) {
      storageUsage = await this.dataManager.getStorageUsage();
    }
    
    // 更新数值
    const usageBar = storageContainer.querySelector('.storage-usage-bar .usage-fill');
    const usageText = storageContainer.querySelector('.storage-usage-text');
    const usagePercentage = storageContainer.querySelector('.storage-usage-percentage');
    const quotaInfo = storageContainer.querySelector('.storage-quota-info');
    
    if (usageBar) {
      const percentage = Math.min(storageUsage.usageRatio * 100, 100);
      usageBar.style.width = `${percentage}%`;
      
      // 根据使用率设置颜色
      if (storageUsage.usageRatio > 0.9) {
        usageBar.style.background = '#dc3545'; // 红色 - 危险
      } else if (storageUsage.usageRatio > 0.8) {
        usageBar.style.background = '#ffc107'; // 黄色 - 警告
      } else {
        usageBar.style.background = '#28a745'; // 绿色 - 安全
      }
    }
    
    if (usageText) {
      usageText.textContent = `${storageUsage.formatted.used} / ${storageUsage.formatted.quota}`;
    }
    
    if (usagePercentage) {
      usagePercentage.textContent = storageUsage.formatted.percentage;
      // 根据使用率设置样式
      usagePercentage.className = 'storage-usage-percentage';
      if (storageUsage.usageRatio > 0.9) {
        usagePercentage.classList.add('critical');
      } else if (storageUsage.usageRatio > 0.8) {
        usagePercentage.classList.add('warning');
      } else {
        usagePercentage.classList.add('safe');
      }
    }
    
    if (quotaInfo) {
      const remainingBytes = storageUsage.quotaBytes - storageUsage.usedBytes;
      quotaInfo.innerHTML = `
        <div class="quota-item">
          <span class="quota-label">已使用:</span>
          <span class="quota-value">${storageUsage.formatted.used}</span>
        </div>
        <div class="quota-item">
          <span class="quota-label">可用:</span>
          <span class="quota-value">${this.dataManager.formatSize(remainingBytes)}</span>
        </div>
        <div class="quota-item">
          <span class="quota-label">总配额:</span>
          <span class="quota-value">${storageUsage.formatted.quota}</span>
        </div>
      `;
    }
  }
  
  /**
   * 创建存储使用情况容器
   */
  createStorageUsageContainer() {
    const container = document.createElement('div');
    container.id = 'storage-usage-container';
    container.className = 'storage-usage-section';
    
    container.innerHTML = `
      <h3 class="section-title">
        <span class="section-icon">📊</span>
        存储使用情况
        <button class="refresh-storage-btn" title="刷新存储信息">
          🔄
        </button>
      </h3>
      <div class="storage-usage-content">
        <div class="storage-usage-visual">
          <div class="storage-usage-bar">
            <div class="usage-fill"></div>
          </div>
          <div class="storage-usage-info">
            <span class="storage-usage-text">0 B / 10 MB</span>
            <span class="storage-usage-percentage safe">0%</span>
          </div>
        </div>
        <div class="storage-quota-info">
          <div class="quota-item">
            <span class="quota-label">已使用:</span>
            <span class="quota-value">0 B</span>
          </div>
          <div class="quota-item">
            <span class="quota-label">可用:</span>
            <span class="quota-value">10 MB</span>
          </div>
          <div class="quota-item">
            <span class="quota-label">总配额:</span>
            <span class="quota-value">10 MB</span>
          </div>
        </div>
      </div>
    `;
    
    // Add event listener for refresh button after DOM insertion
    setTimeout(() => {
      const refreshBtn = container.querySelector('.refresh-storage-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshStorageInfo());
      }
    }, 0);
    
    return container;
  }
  
  /**
   * 更新压缩信息显示
   * 注意：已移除设置面板中的存储显示，此函数仅保留以保持兼容性
   */
  updateCompressionDisplay(compressionInfo) {
    if (!compressionInfo) return;
    
    // 仅更新已存在的压缩容器，不再创建新的
    const compressionContainer = document.getElementById('compression-info-container');
    if (!compressionContainer) {
      // 不再在设置面板中创建压缩信息显示
      return;
    }
    
    const enabledStatus = compressionContainer.querySelector('.compression-enabled');
    const compressionRatio = compressionContainer.querySelector('.compression-ratio');
    const compressedItems = compressionContainer.querySelector('.compressed-items');
    const savedBytes = compressionContainer.querySelector('.saved-bytes');
    
    if (enabledStatus) {
      enabledStatus.textContent = compressionInfo.enabled ? '✅ 已启用' : '❌ 未启用';
      enabledStatus.className = compressionInfo.enabled ? 'compression-enabled enabled' : 'compression-enabled disabled';
    }
    
    if (compressionRatio) {
      compressionRatio.textContent = `${compressionInfo.compressionRatio}%`;
    }
    
    if (compressedItems) {
      compressedItems.textContent = `${compressionInfo.compressedItems}/${compressionInfo.totalItems}`;
    }
    
    if (savedBytes) {
      savedBytes.textContent = this.dataManager.formatSize(compressionInfo.savedBytes);
    }
  }
  
  /**
   * 创建压缩信息容器
   */
  createCompressionInfoContainer() {
    const container = document.createElement('div');
    container.id = 'compression-info-container';
    container.className = 'compression-info-section';
    
    container.innerHTML = `
      <h3 class="section-title">
        <span class="section-icon">🗃️</span>
        数据压缩信息
      </h3>
      <div class="compression-info-content">
        <div class="compression-stat-grid">
          <div class="compression-stat">
            <span class="stat-label">压缩状态:</span>
            <span class="compression-enabled">❌ 未启用</span>
          </div>
          <div class="compression-stat">
            <span class="stat-label">压缩率:</span>
            <span class="compression-ratio">0%</span>
          </div>
          <div class="compression-stat">
            <span class="stat-label">压缩项目:</span>
            <span class="compressed-items">0/0</span>
          </div>
          <div class="compression-stat">
            <span class="stat-label">节省空间:</span>
            <span class="saved-bytes">0 B</span>
          </div>
        </div>
      </div>
    `;
    
    return container;
  }
  
  /**
   * 刷新存储信息
   */
  async refreshStorageInfo() {
    try {
      const storageInfo = await this.dataManager.getStorageInfo();
      await this.updateStorageInfo(storageInfo);
      this.showMessage('存储信息已刷新', 'success');
    } catch (error) {
      console.error('刷新存储信息失败:', error);
      this.showMessage('刷新失败', 'error');
    }
  }

  /**
   * 更新设置按钮状态
   */
  updateSettingsButtonState() {
    const settingsBtn = document.getElementById('settings-btn');
    if (!settingsBtn) return;

    if (this.isOpen) {
      settingsBtn.classList.add('active');
    } else {
      settingsBtn.classList.remove('active');
    }
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success, error, info)
   */
  showMessage(message, type = 'info') {
    // 使用现有的状态更新机制
    if (typeof updateStatus === 'function') {
      updateStatus(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * 触发历史数据刷新
   */
  triggerHistoryRefresh() {
    // 发送自定义事件通知历史数据面板刷新
    const event = new CustomEvent('historyDataChanged');
    document.dispatchEvent(event);
  }

  /**
   * 获取当前设置状态
   * @returns {Object} 设置状态
   */
  getState() {
    return {
      isOpen: this.isOpen
    };
  }
  
  /**
   * 启动存储信息实时更新
   */
  startStorageInfoUpdate() {
    // 清除之前的定时器
    this.stopStorageInfoUpdate();
    
    // 立即更新一次
    this.refreshStorageInfo();
    
    // 每10秒更新一次（设置面板中更频繁）
    this.storageUpdateInterval = setInterval(() => {
      this.refreshStorageInfo();
    }, 10000);
  }
  
  /**
   * 停止存储信息实时更新
   */
  stopStorageInfoUpdate() {
    if (this.storageUpdateInterval) {
      clearInterval(this.storageUpdateInterval);
      this.storageUpdateInterval = null;
    }
  }
}

// 创建全局实例
const settingsManager = new SettingsManager();