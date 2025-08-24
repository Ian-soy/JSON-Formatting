/**
 * IndexedDB API服务
 * 基于浏览器IndexedDB的持久化API服务实现
 */

class IndexedDBApiService {
  constructor(dbName = 'JsonMasterAPI', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.isRunning = false;
    this.serverStats = {
      startTime: new Date().toISOString(),
      requestsCount: 0,
      lastUpdate: null,
      dataSize: 0
    };
  }

  /**
   * 初始化IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`IndexedDB打开失败: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建JSON数据存储
        if (!db.objectStoreNames.contains('jsonData')) {
          const jsonStore = db.createObjectStore('jsonData', { keyPath: 'id' });
          jsonStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 创建统计信息存储
        if (!db.objectStoreNames.contains('serverStats')) {
          db.createObjectStore('serverStats', { keyPath: 'key' });
        }

        // 创建请求日志存储
        if (!db.objectStoreNames.contains('requestLogs')) {
          const logStore = db.createObjectStore('requestLogs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('endpoint', 'endpoint', { unique: false });
        }
      };
    });
  }

  /**
   * 启动API服务
   */
  async start(initialData = {}) {
    try {
      await this.initDB();
      this.isRunning = true;

      // 初始化统计信息
      this.serverStats = {
        startTime: new Date().toISOString(),
        requestsCount: 0,
        lastUpdate: null,
        dataSize: 0
      };

      // 保存初始数据
      if (initialData && Object.keys(initialData).length > 0) {
        await this.saveJsonData(initialData);
        this.serverStats.lastUpdate = new Date().toISOString();
        this.serverStats.dataSize = JSON.stringify(initialData).length;
      }

      await this.saveServerStats();

      console.log('🚀 IndexedDB API服务已启动');
      return {
        success: true,
        message: 'IndexedDB API服务启动成功',
        server_type: 'IndexedDB',
        database: this.dbName
      };
    } catch (error) {
      console.error('IndexedDB API服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止API服务
   */
  async stop() {
    this.isRunning = false;
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    return {
      success: true,
      message: 'IndexedDB API服务已停止'
    };
  }

  /**
   * 处理API请求
   */
  async handleRequest(method, path, data = null, params = {}) {
    if (!this.isRunning) {
      throw new Error('API服务未运行');
    }

    const startTime = performance.now();
    this.serverStats.requestsCount++;

    try {
      let result;

      switch (`${method.toUpperCase()}:${path}`) {
        case 'GET:/health':
          result = await this.handleHealthCheck();
          break;
        case 'GET:/info':
          result = await this.handleServerInfo();
          break;
        case 'GET:/stats':
          result = await this.handleGetStats();
          break;
        case 'GET:/json-data':
          result = await this.handleGetJsonData();
          break;
        case 'POST:/json-data':
          result = await this.handleUpdateJsonData(data);
          break;
        case 'POST:/validate':
          result = await this.handleValidateJsonData(data);
          break;
        case 'POST:/format':
          result = await this.handleFormatJsonData(data, params);
          break;
        case 'POST:/minify':
          result = await this.handleMinifyJsonData(data);
          break;
        case 'POST:/reset':
          result = await this.handleReset();
          break;
        case 'POST:/shutdown':
          result = await this.handleShutdown();
          break;
        default:
          throw new Error(`不支持的端点: ${method} ${path}`);
      }

      const responseTime = performance.now() - startTime;

      // 记录请求日志
      await this.logRequest(method, path, responseTime, true);
      await this.saveServerStats();

      return {
        success: true,
        data: result,
        response_time: Math.round(responseTime * 100) / 100,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.logRequest(method, path, responseTime, false, error.message);
      
      console.error(`IndexedDB API请求处理错误 [${method} ${path}]:`, error);
      return {
        success: false,
        error: error.message,
        response_time: Math.round(responseTime * 100) / 100,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 健康检查处理
   */
  async handleHealthCheck() {
    const uptime = new Date() - new Date(this.serverStats.startTime);
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(uptime / 1000),
      server_type: 'IndexedDB API Service',
      database: this.dbName
    };
  }

  /**
   * 服务器信息处理
   */
  async handleServerInfo() {
    const uptime = new Date() - new Date(this.serverStats.startTime);
    return {
      title: 'JSON Master IndexedDB API',
      version: '3.0.0',
      description: 'JSON格式化大师IndexedDB持久化API服务',
      docs_url: 'indexed-db://docs',
      redoc_url: 'indexed-db://redoc',
      uptime: this.formatDuration(uptime),
      server_type: 'IndexedDB',
      database: this.dbName,
      environment: 'Browser Native'
    };
  }

  /**
   * 获取统计信息
   */
  async handleGetStats() {
    const uptime = new Date() - new Date(this.serverStats.startTime);
    const dbSize = await this.getDatabaseSize();
    
    return {
      ...this.serverStats,
      uptime: this.formatDuration(uptime),
      uptime_seconds: Math.floor(uptime / 1000),
      current_time: new Date().toISOString(),
      database_size: dbSize
    };
  }

  /**
   * 获取JSON数据
   */
  async handleGetJsonData() {
    const jsonData = await this.loadJsonData();
    return {
      data: jsonData || {},
      size: JSON.stringify(jsonData || {}).length,
      last_update: this.serverStats.lastUpdate,
      timestamp: new Date().toISOString(),
      storage_type: 'IndexedDB'
    };
  }

  /**
   * 更新JSON数据
   */
  async handleUpdateJsonData(requestData) {
    try {
      const jsonData = requestData?.data || requestData;
      await this.saveJsonData(jsonData);
      
      this.serverStats.lastUpdate = new Date().toISOString();
      this.serverStats.dataSize = JSON.stringify(jsonData).length;

      return {
        status: 'success',
        message: 'JSON数据已更新到IndexedDB',
        data_size: this.serverStats.dataSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`数据更新失败: ${error.message}`);
    }
  }

  /**
   * 验证JSON数据
   */
  async handleValidateJsonData(requestData) {
    try {
      const data = requestData?.data || requestData;
      const jsonStr = JSON.stringify(data);
      const parsedData = JSON.parse(jsonStr);

      return {
        valid: true,
        size: jsonStr.length,
        keys_count: typeof parsedData === 'object' && parsedData !== null ? 
          Object.keys(parsedData).length : 0,
        type: Array.isArray(parsedData) ? 'array' : typeof parsedData,
        storage_ready: true
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 格式化JSON数据
   */
  async handleFormatJsonData(requestData, params) {
    try {
      const data = requestData?.data || requestData;
      const indent = params?.indent || 2;
      
      const original = JSON.stringify(data);
      const formatted = JSON.stringify(data, null, indent);

      return {
        formatted: formatted,
        original_size: original.length,
        formatted_size: formatted.length,
        indent_used: indent
      };
    } catch (error) {
      throw new Error(`格式化失败: ${error.message}`);
    }
  }

  /**
   * 压缩JSON数据
   */
  async handleMinifyJsonData(requestData) {
    try {
      const data = requestData?.data || requestData;
      
      const original = JSON.stringify(data, null, 2);
      const minified = JSON.stringify(data);
      const compressionRatio = ((original.length - minified.length) / original.length * 100);

      return {
        minified: minified,
        original_size: original.length,
        minified_size: minified.length,
        compression_ratio: Math.round(compressionRatio * 100) / 100
      };
    } catch (error) {
      throw new Error(`压缩失败: ${error.message}`);
    }
  }

  /**
   * 重置数据
   */
  async handleReset() {
    await this.clearAllData();
    this.serverStats.lastUpdate = null;
    this.serverStats.dataSize = 0;

    return {
      status: 'success',
      message: 'IndexedDB数据已重置',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 关闭服务器
   */
  async handleShutdown() {
    await this.stop();
    return {
      status: 'success',
      message: 'IndexedDB API服务已关闭',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 保存JSON数据到IndexedDB
   */
  async saveJsonData(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['jsonData'], 'readwrite');
      const store = transaction.objectStore('jsonData');
      
      const record = {
        id: 'current',
        data: data,
        timestamp: new Date().toISOString()
      };

      const request = store.put(record);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`保存数据失败: ${request.error}`));
    });
  }

  /**
   * 从IndexedDB加载JSON数据
   */
  async loadJsonData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['jsonData'], 'readonly');
      const store = transaction.objectStore('jsonData');
      const request = store.get('current');
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(new Error(`加载数据失败: ${request.error}`));
    });
  }

  /**
   * 保存服务器统计信息
   */
  async saveServerStats() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['serverStats'], 'readwrite');
      const store = transaction.objectStore('serverStats');
      
      const record = {
        key: 'stats',
        ...this.serverStats
      };

      const request = store.put(record);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`保存统计失败: ${request.error}`));
    });
  }

  /**
   * 记录请求日志
   */
  async logRequest(method, path, responseTime, success, error = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['requestLogs'], 'readwrite');
      const store = transaction.objectStore('requestLogs');
      
      const record = {
        method,
        endpoint: path,
        response_time: responseTime,
        success,
        error,
        timestamp: new Date().toISOString()
      };

      const request = store.add(record);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        // 日志记录失败不应该影响主要功能
        console.warn('记录请求日志失败:', request.error);
        resolve(null);
      };
    });
  }

  /**
   * 获取数据库大小估算
   */
  async getDatabaseSize() {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: Math.round((estimate.usage || 0) / 1024 / 1024 * 100) / 100,
        quota: Math.round((estimate.quota || 0) / 1024 / 1024 * 100) / 100,
        unit: 'MB'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData() {
    const stores = ['jsonData', 'requestLogs'];
    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`清除${storeName}失败: ${request.error}`));
      });
    });

    await Promise.all(promises);
  }

  /**
   * 检查服务状态
   */
  checkStatus() {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? new Date() - new Date(this.serverStats.startTime) : 0,
      requests_count: this.serverStats.requestsCount,
      data_size: this.serverStats.dataSize,
      database: this.dbName
    };
  }

  /**
   * 格式化持续时间
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟 ${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndexedDBApiService;
}

if (typeof window !== 'undefined') {
  window.IndexedDBApiService = IndexedDBApiService;
}