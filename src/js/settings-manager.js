// 设置管理器 - 管理应用设置和配置
class SettingsManager {
  constructor() {
    this.isOpen = false;
    this.dataManager = null;
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
   * 更新存储信息显示
   * @param {Object} storageInfo - 存储信息
   */
  updateStorageInfo(storageInfo) {
    if (!storageInfo) return;

    const currentItemsElement = document.getElementById('current-items-count');
    if (currentItemsElement) {
      currentItemsElement.textContent = `${storageInfo.totalItems}/${storageInfo.maxItems}`;
    }

    const expirationInfoElement = document.getElementById('expiration-info');
    if (expirationInfoElement) {
      expirationInfoElement.textContent = `${storageInfo.expirationDays}天`;
    }

    const oldestItemElement = document.getElementById('oldest-item-date');
    if (oldestItemElement && storageInfo.oldestItem) {
      const date = new Date(storageInfo.oldestItem);
      oldestItemElement.textContent = date.toLocaleDateString('zh-CN');
    } else if (oldestItemElement) {
      oldestItemElement.textContent = '无数据';
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
}

// 创建全局实例
const settingsManager = new SettingsManager();