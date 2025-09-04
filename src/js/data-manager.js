// 数据管理器 - 处理JSON数据的保存、读取、过期清理
class DataManager {
  constructor() {
    this.storageKey = 'json_formatter_saved_data';
    this.settingsKey = 'json_formatter_settings';
    this.defaultSettings = {
      maxSavedItems: 10,
      expirationDays: 5
    };
  }

  /**
   * 初始化数据管理器
   */
  async initialize() {
    try {
      // 检查并清理过期数据
      await this.cleanExpiredData();
      return true;
    } catch (error) {
      console.error('数据管理器初始化失败:', error);
      return false;
    }
  }

  /**
   * 保存JSON数据
   * @param {string} title - 数据标题
   * @param {string} jsonData - JSON数据字符串
   * @returns {Object} 保存结果
   */
  async saveJsonData(title, jsonData) {
    try {
      // 验证输入
      if (!title || !title.trim()) {
        return { success: false, error: '标题不能为空' };
      }

      if (!jsonData || !jsonData.trim()) {
        return { success: false, error: 'JSON数据不能为空' };
      }

      // 验证JSON格式
      try {
        JSON.parse(jsonData);
      } catch (e) {
        return { success: false, error: '无效的JSON格式' };
      }

      // 获取现有数据
      const savedData = await this.getSavedData();
      const settings = await this.getSettings();

      // 检查标题是否重复
      const titleExists = savedData.some(item => item.title === title.trim());
      if (titleExists) {
        return { success: false, error: '标题已存在，请使用不同的标题' };
      }

      // 创建新的数据项
      const newItem = {
        id: this.generateId(),
        title: title.trim(),
        data: jsonData,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };

      // 添加到数据列表
      savedData.unshift(newItem);

      // 限制保存条数，严格按照设置执行
      if (savedData.length > settings.maxSavedItems) {
        // 移除超出限制的最旧数据
        savedData.splice(settings.maxSavedItems);
      }

      // 按时间倒序排序（最新的在前面）
      savedData.sort((a, b) => b.timestamp - a.timestamp);

      // 保存到存储
      await this.setSavedData(savedData);

      return { success: true, data: newItem };
    } catch (error) {
      console.error('保存数据失败:', error);
      return { success: false, error: '保存失败，请重试' };
    }
  }

  /**
   * 获取所有保存的数据
   * @returns {Array} 保存的数据列表
   */
  async getSavedData() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('获取保存数据失败:', error);
      return [];
    }
  }

  /**
   * 设置保存的数据
   * @param {Array} data - 数据列表
   */
  async setSavedData(data) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: data });
    } catch (error) {
      console.error('设置保存数据失败:', error);
      throw error;
    }
  }

  /**
   * 删除指定的数据项
   * @param {string} id - 数据项ID
   * @returns {Object} 删除结果
   */
  async deleteJsonData(id) {
    try {
      const savedData = await this.getSavedData();
      const index = savedData.findIndex(item => item.id === id);
      
      if (index === -1) {
        return { success: false, error: '数据不存在' };
      }

      savedData.splice(index, 1);
      await this.setSavedData(savedData);

      return { success: true };
    } catch (error) {
      console.error('删除数据失败:', error);
      return { success: false, error: '删除失败，请重试' };
    }
  }

  /**
   * 根据ID获取数据项
   * @param {string} id - 数据项ID
   * @returns {Object|null} 数据项或null
   */
  async getJsonDataById(id) {
    try {
      const savedData = await this.getSavedData();
      return savedData.find(item => item.id === id) || null;
    } catch (error) {
      console.error('获取数据失败:', error);
      return null;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanExpiredData() {
    try {
      const savedData = await this.getSavedData();
      const settings = await this.getSettings();
      const expirationTime = settings.expirationDays * 24 * 60 * 60 * 1000; // 转换为毫秒
      const now = Date.now();

      // 过滤掉过期的数据
      const validData = savedData.filter(item => {
        const age = now - item.timestamp;
        return age < expirationTime;
      });

      // 如果有数据被过期清理，更新存储
      if (validData.length !== savedData.length) {
        await this.setSavedData(validData);
        console.log(`清理了 ${savedData.length - validData.length} 条过期数据`);
      }

      return validData.length;
    } catch (error) {
      console.error('清理过期数据失败:', error);
      return -1;
    }
  }

  /**
   * 获取设置
   * @returns {Object} 设置对象
   */
  async getSettings() {
    try {
      const result = await chrome.storage.local.get([this.settingsKey]);
      return { ...this.defaultSettings, ...result[this.settingsKey] };
    } catch (error) {
      console.error('获取设置失败:', error);
      return this.defaultSettings;
    }
  }

  /**
   * 保存设置
   * @param {Object} settings - 设置对象
   */
  async saveSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      // 验证设置值
      if (newSettings.maxSavedItems < 1 || newSettings.maxSavedItems > 50) {
        throw new Error('保存条数必须在1-50之间');
      }
      
      if (newSettings.expirationDays < 1 || newSettings.expirationDays > 365) {
        throw new Error('过期天数必须在1-365之间');
      }

      await chrome.storage.local.set({ [this.settingsKey]: newSettings });
      
      // 如果减少了最大保存数量，需要清理多余数据
      if (newSettings.maxSavedItems < currentSettings.maxSavedItems) {
        await this.trimDataToLimit(newSettings.maxSavedItems);
      }

      return { success: true };
    } catch (error) {
      console.error('保存设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 将数据限制到指定数量
   * @param {number} limit - 限制数量
   */
  async trimDataToLimit(limit) {
    try {
      const savedData = await this.getSavedData();
      if (savedData.length > limit) {
        const trimmedData = savedData.slice(0, limit);
        await this.setSavedData(trimmedData);
      }
    } catch (error) {
      console.error('裁剪数据失败:', error);
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData() {
    try {
      await chrome.storage.local.remove([this.storageKey]);
      return { success: true };
    } catch (error) {
      console.error('清除所有数据失败:', error);
      return { success: false, error: '清除失败，请重试' };
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Object} 存储使用信息
   */
  async getStorageInfo() {
    try {
      const savedData = await this.getSavedData();
      const settings = await this.getSettings();
      
      return {
        totalItems: savedData.length,
        maxItems: settings.maxSavedItems,
        expirationDays: settings.expirationDays,
        oldestItem: savedData.length > 0 ? savedData[savedData.length - 1].createdAt : null
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 格式化文件大小
   * @param {string} jsonString - JSON字符串
   * @returns {string} 格式化后的大小
   */
  formatSize(jsonString) {
    const bytes = new Blob([jsonString]).size;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 验证JSON格式
   * @param {string} jsonString - JSON字符串
   * @returns {Object} 验证结果
   */
  validateJson(jsonString) {
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

// 创建全局实例
const dataManager = new DataManager();