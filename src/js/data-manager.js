// 数据管理器 - 处理JSON数据的保存、读取、过期清理
class DataManager {
  constructor() {
    this.storageKey = 'json_formatter_saved_data';
    this.settingsKey = 'json_formatter_settings';
    this.metaKey = 'json_formatter_meta';
    
    // Chrome Extension存储限制
    this.STORAGE_LIMITS = {
      LOCAL_STORAGE_QUOTA: 10 * 1024 * 1024, // 10MB总限制
      SINGLE_ITEM_LIMIT: 8 * 1024 * 1024,    // 8MB单项限制
      WARNING_THRESHOLD: 0.8,                 // 80%使用率警告
      CRITICAL_THRESHOLD: 0.9                 // 90%使用率严重警告
    };
    
    this.defaultSettings = {
      maxSavedItems: 10,
      expirationDays: 5,
      enableCompression: true,    // 启用压缩
      maxItemSizeKB: 500,        // 单项最大500KB
      autoCleanup: true          // 自动清理
    };
  }

  /**
   * 初始化数据管理器
   */
  async initialize() {
    try {
      // 检查存储配额
      await this.checkStorageQuota();
      
      // 检查并清理过期数据
      await this.cleanExpiredData();
      
      // 检查存储使用情况
      const usage = await this.getStorageUsage();
      if (usage.usageRatio > this.STORAGE_LIMITS.WARNING_THRESHOLD) {
        console.warn(`存储使用率超过${(this.STORAGE_LIMITS.WARNING_THRESHOLD * 100).toFixed(0)}%: ${(usage.usageRatio * 100).toFixed(1)}%`);
      }
      
      return true;
    } catch (error) {
      console.error('数据管理器初始化失败:', error);
      return false;
    }
  }

  /**
   * 保存JSON数据（优化版）
   * @param {string} title - 数据标题
   * @param {string} jsonData - JSON数据字符串
   * @returns {Object} 保存结果
   */
  async saveJsonData(title, jsonData) {
    try {
      // 验证输入
      const validation = await this.validateInput(title, jsonData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 检查存储空间
      const spaceCheck = await this.checkStorageSpace(jsonData);
      if (!spaceCheck.hasSpace) {
        return { 
          success: false, 
          error: spaceCheck.error,
          storageInfo: spaceCheck.info,
          suggestions: spaceCheck.suggestions
        };
      }

      // 获取现有数据和设置
      const savedData = await this.getSavedData();
      const settings = await this.getSettings();

      // 检查标题是否重复
      const titleExists = savedData.some(item => item.title === title.trim());
      if (titleExists) {
        return { success: false, error: '标题已存在，请使用不同的标题' };
      }

      // 压缩数据（如果启用）
      const processedData = settings.enableCompression ? 
        await this.compressData(jsonData) : { data: jsonData, compressed: false };

      // 创建新的数据项
      const newItem = {
        id: this.generateId(),
        title: title.trim(),
        data: processedData.data,
        compressed: processedData.compressed,
        originalSize: jsonData.length,
        compressedSize: processedData.data.length,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        version: '2.0' // 数据版本标识
      };

      // 添加到数据列表
      savedData.unshift(newItem);

      // 限制保存条数
      if (savedData.length > settings.maxSavedItems) {
        const removedItems = savedData.splice(settings.maxSavedItems);
        console.log(`移除了 ${removedItems.length} 个旧数据项`);
      }

      // 按时间倒序排序
      savedData.sort((a, b) => b.timestamp - a.timestamp);

      // 保存到存储
      await this.setSavedData(savedData);
      
      // 更新元数据
      await this.updateMetadata();

      return { 
        success: true, 
        data: newItem,
        storageInfo: await this.getStorageUsage(),
        compressionRatio: processedData.compressed ? 
          Math.round((1 - processedData.data.length / jsonData.length) * 100) : 0
      };
    } catch (error) {
      console.error('保存数据失败:', error);
      return { success: false, error: '保存失败，请重试' };
    }
  }

  /**
   * 获取所有保存的数据（优化版）
   * @returns {Array} 保存的数据列表
   */
  async getSavedData() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      const rawData = result[this.storageKey] || [];
      
      // 解压缩数据
      const processedData = await Promise.all(rawData.map(async item => {
        if (item.compressed && item.version === '2.0') {
          try {
            const decompressed = await this.decompressData(item.data);
            return { ...item, data: decompressed };
          } catch (error) {
            console.warn(`解压缩失败 ${item.id}:`, error);
            return item; // 返回原始数据
          }
        }
        return item;
      }));
      
      return processedData;
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
      
      if (newSettings.maxItemSizeKB < 10 || newSettings.maxItemSizeKB > 5000) {
        throw new Error('单项最大尺寸必须在10KB-5MB之间');
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
   * 获取存储使用情况（增强版）
   * @returns {Object} 存储使用信息
   */
  async getStorageInfo() {
    try {
      const savedData = await this.getSavedData();
      const settings = await this.getSettings();
      const usage = await this.getStorageUsage();
      
      // 计算压缩统计
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;
      let compressedItems = 0;
      
      savedData.forEach(item => {
        if (item.originalSize && item.compressedSize) {
          totalOriginalSize += item.originalSize;
          totalCompressedSize += item.compressedSize;
          if (item.compressed) compressedItems++;
        }
      });
      
      const compressionRatio = totalOriginalSize > 0 ? 
        Math.round((1 - totalCompressedSize / totalOriginalSize) * 100) : 0;
      
      return {
        totalItems: savedData.length,
        maxItems: settings.maxSavedItems,
        expirationDays: settings.expirationDays,
        oldestItem: savedData.length > 0 ? savedData[savedData.length - 1].createdAt : null,
        storage: usage,
        compression: {
          enabled: settings.enableCompression,
          compressedItems: compressedItems,
          totalItems: savedData.length,
          compressionRatio: compressionRatio,
          savedBytes: totalOriginalSize - totalCompressedSize
        }
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
   * 格式化文件大小（增强版）
   * @param {string|number} input - JSON字符串或字节数
   * @returns {string} 格式化后的大小
   */
  formatSize(input) {
    let bytes;
    if (typeof input === 'string') {
      bytes = new Blob([input]).size;
    } else {
      bytes = input;
    }
    
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 检查存储配额
   */
  async checkStorageQuota() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        console.log('存储配额估算:', {
          quota: this.formatSize(estimate.quota),
          usage: this.formatSize(estimate.usage),
          usageRatio: (estimate.usage / estimate.quota * 100).toFixed(1) + '%'
        });
      }
    } catch (error) {
      console.warn('无法检查存储配额:', error);
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage() {
    try {
      const allData = await chrome.storage.local.get(null);
      const totalSize = JSON.stringify(allData).length;
      const usageRatio = totalSize / this.STORAGE_LIMITS.LOCAL_STORAGE_QUOTA;
      
      return {
        usedBytes: totalSize,
        quotaBytes: this.STORAGE_LIMITS.LOCAL_STORAGE_QUOTA,
        usageRatio: usageRatio,
        formatted: {
          used: this.formatSize(totalSize),
          quota: this.formatSize(this.STORAGE_LIMITS.LOCAL_STORAGE_QUOTA),
          percentage: (usageRatio * 100).toFixed(1) + '%'
        }
      };
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      return {
        usedBytes: 0,
        quotaBytes: this.STORAGE_LIMITS.LOCAL_STORAGE_QUOTA,
        usageRatio: 0,
        formatted: { used: '0 B', quota: '10 MB', percentage: '0%' }
      };
    }
  }

  /**
   * 更新元数据
   */
  async updateMetadata() {
    try {
      const usage = await this.getStorageUsage();
      const metadata = {
        lastUpdated: Date.now(),
        storageUsage: usage,
        version: '2.0'
      };
      await chrome.storage.local.set({ [this.metaKey]: metadata });
    } catch (error) {
      console.warn('更新元数据失败:', error);
    }
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

  /**
   * 验证输入数据
   */
  async validateInput(title, jsonData) {
    if (!title || !title.trim()) {
      return { valid: false, error: '标题不能为空' };
    }
    if (!jsonData || !jsonData.trim()) {
      return { valid: false, error: 'JSON数据不能为空' };
    }
    try {
      JSON.parse(jsonData);
    } catch (e) {
      return { valid: false, error: '无效的JSON格式' };
    }
    
    const settings = await this.getSettings();
    const sizeKB = jsonData.length / 1024;
    if (sizeKB > settings.maxItemSizeKB) {
      return { 
        valid: false, 
        error: `数据过大：${sizeKB.toFixed(1)}KB 超过限制 ${settings.maxItemSizeKB}KB` 
      };
    }
    
    return { valid: true };
  }

  /**
   * 检查存储空间
   */
  async checkStorageSpace(jsonData) {
    try {
      const usage = await this.getStorageUsage();
      const newDataSize = new Blob([jsonData]).size;
      const projectedUsage = (usage.usedBytes + newDataSize) / this.STORAGE_LIMITS.LOCAL_STORAGE_QUOTA;
      
      if (projectedUsage > 1.0) {
        return {
          hasSpace: false,
          error: '存储空间不足，无法保存数据',
          info: usage,
          suggestions: [
            '删除一些旧的数据项',
            '减少最大保存条数',
            '启用数据压缩功能'
          ]
        };
      }
      
      if (projectedUsage > this.STORAGE_LIMITS.CRITICAL_THRESHOLD) {
        return {
          hasSpace: true,
          warning: '存储空间即将用完，建议清理旧数据',
          info: usage
        };
      }
      
      return { hasSpace: true, info: usage };
    } catch (error) {
      console.error('检查存储空间失败:', error);
      return { hasSpace: true }; // 默认允许
    }
  }

  /**
   * 压缩数据
   */
  async compressData(data) {
    try {
      // 使用简单的LZ压缩算法
      const compressed = this.lzCompress(data);
      const compressionRatio = compressed.length / data.length;
      
      // 只有在压缩率超过20%才使用压缩
      if (compressionRatio < 0.8) {
        return { data: compressed, compressed: true };
      } else {
        return { data: data, compressed: false };
      }
    } catch (error) {
      console.warn('压缩失败，使用原始数据:', error);
      return { data: data, compressed: false };
    }
  }

  /**
   * 解压缩数据
   */
  async decompressData(compressedData) {
    try {
      return this.lzDecompress(compressedData);
    } catch (error) {
      console.error('解压缩失败:', error);
      throw error;
    }
  }

  /**
   * 简单LZ压缩
   */
  lzCompress(str) {
    const dict = {};
    const data = (str + "").split("");
    const out = [];
    let currChar;
    let phrase = data[0];
    let code = 256;
    
    for (let i = 1; i < data.length; i++) {
      currChar = data[i];
      if (dict[phrase + currChar] != null) {
        phrase += currChar;
      } else {
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        dict[phrase + currChar] = code;
        code++;
        phrase = currChar;
      }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    
    return JSON.stringify(out);
  }

  /**
   * 简单LZ解压缩
   */
  lzDecompress(compressedStr) {
    const dict = {};
    const data = JSON.parse(compressedStr);
    let currChar = String.fromCharCode(data[0]);
    let oldPhrase = currChar;
    const out = [currChar];
    let code = 256;
    let phrase;
    
    for (let i = 1; i < data.length; i++) {
      const currCode = data[i];
      if (currCode < 256) {
        phrase = String.fromCharCode(data[i]);
      } else {
        phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
      }
      out.push(phrase);
      currChar = phrase.charAt(0);
      dict[code] = oldPhrase + currChar;
      code++;
      oldPhrase = phrase;
    }
    
    return out.join("");
  }
}

// 创建全局实例
const dataManager = new DataManager();