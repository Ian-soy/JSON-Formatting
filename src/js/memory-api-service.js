/**
 * 内存API服务
 * 基于内存的轻量级API服务实现，作为最基础的后备方案
 */

class MemoryApiService {
  constructor() {
    this.isRunning = false;
    this.currentJsonData = {};
    this.serverStats = {
      startTime: new Date().toISOString(),
      requestsCount: 0,
      lastUpdate: null,
      dataSize: 0
    };
    this.requestLogs = [];
    this.maxLogEntries = 1000; // 限制日志条目数量，避免内存泄漏
  }

  /**
   * 启动API服务
   */
  async start(initialData = {}) {
    this.isRunning = true;
    this.currentJsonData = initialData;
    this.serverStats = {
      startTime: new Date().toISOString(),
      requestsCount: 0,
      lastUpdate: initialData && Object.keys(initialData).length > 0 ? new Date().toISOString() : null,
      dataSize: JSON.stringify(initialData).length
    };
    this.requestLogs = [];

    console.log('🚀 内存API服务已启动');
    return {
      success: true,
      message: '内存API服务启动成功',
      server_type: 'Memory',
      warning: '数据仅在内存中保存，刷新页面将丢失'
    };
  }

  /**
   * 停止API服务
   */
  async stop() {
    this.isRunning = false;
    return {
      success: true,
      message: '内存API服务已停止'
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
          result = this.handleHealthCheck();
          break;
        case 'GET:/info':
          result = this.handleServerInfo();
          break;
        case 'GET:/stats':
          result = this.handleGetStats();
          break;
        case 'GET:/json-data':
          result = this.handleGetJsonData();
          break;
        case 'POST:/json-data':
          result = this.handleUpdateJsonData(data);
          break;
        case 'POST:/validate':
          result = this.handleValidateJsonData(data);
          break;
        case 'POST:/format':
          result = this.handleFormatJsonData(data, params);
          break;
        case 'POST:/minify':
          result = this.handleMinifyJsonData(data);
          break;
        case 'POST:/reset':
          result = this.handleReset();
          break;
        case 'POST:/shutdown':
          result = this.handleShutdown();
          break;
        default:
          throw new Error(`不支持的端点: ${method} ${path}`);
      }

      const responseTime = performance.now() - startTime;

      // 记录请求日志（限制条目数量）
      this.logRequest(method, path, responseTime, true);

      return {
        success: true,
        data: result,
        response_time: Math.round(responseTime * 100) / 100,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logRequest(method, path, responseTime, false, error.message);
      
      console.error(`内存API请求处理错误 [${method} ${path}]:`, error);
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
  handleHealthCheck() {
    const uptime = new Date() - new Date(this.serverStats.startTime);
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(uptime / 1000),
      server_type: 'Memory API Service',
      storage_type: 'Volatile Memory'
    };
  }

  /**
   * 服务器信息处理
   */
  handleServerInfo() {
    const uptime = new Date() - new Date(this.serverStats.startTime);
    return {
      title: 'JSON Master Memory API',
      version: '3.0.0',
      description: 'JSON格式化大师内存API服务',
      docs_url: 'memory://docs',
      redoc_url: 'memory://redoc',
      uptime: this.formatDuration(uptime),
      server_type: 'Memory',
      storage_type: 'Volatile',
      environment: 'Browser Native',
      warning: '数据仅在内存中保存，刷新页面将丢失'
    };
  }

  /**
   * 获取统计信息
   */
  handleGetStats() {
    const uptime = new Date() - new Date(this.serverStats.startTime);
    const memoryInfo = this.getMemoryInfo();
    
    return {
      ...this.serverStats,
      uptime: this.formatDuration(uptime),
      uptime_seconds: Math.floor(uptime / 1000),
      current_time: new Date().toISOString(),
      request_logs_count: this.requestLogs.length,
      memory_info: memoryInfo
    };
  }

  /**
   * 获取JSON数据
   */
  handleGetJsonData() {
    return {
      data: this.currentJsonData,
      size: JSON.stringify(this.currentJsonData).length,
      last_update: this.serverStats.lastUpdate,
      timestamp: new Date().toISOString(),
      storage_type: 'Memory'
    };
  }

  /**
   * 更新JSON数据
   */
  handleUpdateJsonData(requestData) {
    try {
      const jsonData = requestData?.data || requestData;
      this.currentJsonData = jsonData;
      
      this.serverStats.lastUpdate = new Date().toISOString();
      this.serverStats.dataSize = JSON.stringify(jsonData).length;

      return {
        status: 'success',
        message: 'JSON数据已更新到内存',
        data_size: this.serverStats.dataSize,
        timestamp: new Date().toISOString(),
        warning: '数据仅在内存中保存，刷新页面将丢失'
      };
    } catch (error) {
      throw new Error(`数据更新失败: ${error.message}`);
    }
  }

  /**
   * 验证JSON数据
   */
  handleValidateJsonData(requestData) {
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
  handleFormatJsonData(requestData, params) {
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
  handleMinifyJsonData(requestData) {
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
  handleReset() {
    this.currentJsonData = {};
    this.serverStats.lastUpdate = null;
    this.serverStats.dataSize = 0;
    this.requestLogs = [];

    return {
      status: 'success',
      message: '内存数据已重置',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 关闭服务器
   */
  handleShutdown() {
    this.isRunning = false;
    return {
      status: 'success',
      message: '内存API服务已关闭',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 记录请求日志
   */
  logRequest(method, path, responseTime, success, error = null) {
    const logEntry = {
      method,
      endpoint: path,
      response_time: responseTime,
      success,
      error,
      timestamp: new Date().toISOString()
    };

    this.requestLogs.push(logEntry);

    // 限制日志条目数量，避免内存泄漏
    if (this.requestLogs.length > this.maxLogEntries) {
      this.requestLogs = this.requestLogs.slice(-this.maxLogEntries);
    }
  }

  /**
   * 获取内存信息
   */
  getMemoryInfo() {
    try {
      if (performance.memory) {
        return {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
          unit: 'MB'
        };
      }
    } catch (error) {
      console.log('内存信息不可用:', error.message);
    }
    return null;
  }

  /**
   * 获取请求日志
   */
  getRequestLogs(limit = 100) {
    return this.requestLogs.slice(-limit).reverse(); // 返回最新的日志
  }

  /**
   * 获取特定端点的统计
   */
  getEndpointStats() {
    const stats = {};
    
    this.requestLogs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          success_count: 0,
          total_response_time: 0,
          min_response_time: Infinity,
          max_response_time: 0
        };
      }
      
      const stat = stats[key];
      stat.count++;
      if (log.success) stat.success_count++;
      stat.total_response_time += log.response_time;
      stat.min_response_time = Math.min(stat.min_response_time, log.response_time);
      stat.max_response_time = Math.max(stat.max_response_time, log.response_time);
    });

    // 计算平均响应时间和成功率
    Object.keys(stats).forEach(key => {
      const stat = stats[key];
      stat.average_response_time = stat.total_response_time / stat.count;
      stat.success_rate = (stat.success_count / stat.count * 100).toFixed(1);
      
      // 清理不需要的累计值
      delete stat.total_response_time;
    });

    return stats;
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
      storage_type: 'Memory',
      logs_count: this.requestLogs.length
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

  /**
   * 导出数据（用于数据迁移）
   */
  exportData() {
    return {
      jsonData: this.currentJsonData,
      serverStats: this.serverStats,
      requestLogs: this.requestLogs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 导入数据（用于数据迁移）
   */
  importData(exportedData) {
    if (exportedData.jsonData) {
      this.currentJsonData = exportedData.jsonData;
    }
    if (exportedData.serverStats) {
      this.serverStats = { ...this.serverStats, ...exportedData.serverStats };
    }
    if (exportedData.requestLogs && Array.isArray(exportedData.requestLogs)) {
      this.requestLogs = exportedData.requestLogs.slice(-this.maxLogEntries);
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemoryApiService;
}

if (typeof window !== 'undefined') {
  window.MemoryApiService = MemoryApiService;
}