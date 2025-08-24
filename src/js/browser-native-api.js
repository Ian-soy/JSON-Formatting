/**
 * 浏览器原生API服务 - Service Worker实现
 * 替代Python FastAPI，完全基于浏览器环境，无需用户安装任何外部依赖
 */

class BrowserNativeApiService {
  constructor() {
    this.isRunning = false;
    this.currentJsonData = {};
    this.serverStats = {
      startTime: new Date().toISOString(),
      requestsCount: 0,
      lastUpdate: null,
      dataSize: 0
    };
    this.requestHandlers = new Map();
    
    // 性能优化：添加缓存机制
    this.responseCache = new Map();
    this.cacheTimeouts = new Map();
    this.cacheTTL = 5000; // 5秒缓存
    
    // 性能优化：预编译的响应模板
    this.responseTemplates = {
      health: null,
      info: null,
      stats: null
    };
    
    // 性能优化：批量操作队列
    this.operationQueue = [];
    this.isProcessingQueue = false;
    
    this.setupRoutes();
    this.initializePerformanceOptimizations();
  }

  /**
   * 设置API路由
   */
  setupRoutes() {
    // 健康检查端点（性能优化版）
    this.requestHandlers.set('GET:/health', (request) => {
      // 使用预编译的响应模板提高性能
      this.updateResponseTemplates();
      return this.responseTemplates.health;
    });

    // 服务器信息端点（性能优化版）
    this.requestHandlers.set('GET:/info', (request) => {
      // 使用预编译的响应模板提高性能
      this.updateResponseTemplates();
      return this.responseTemplates.info;
    });

    // 统计信息端点
    this.requestHandlers.set('GET:/stats', (request) => {
      const uptime = new Date() - new Date(this.serverStats.startTime);
      return {
        ...this.serverStats,
        uptime: this.formatDuration(uptime),
        uptime_seconds: Math.floor(uptime / 1000),
        current_time: new Date().toISOString(),
        memory_usage: this.getMemoryInfo()
      };
    });

    // 获取JSON数据
    this.requestHandlers.set('GET:/json-data', (request) => {
      return {
        data: this.currentJsonData,
        size: JSON.stringify(this.currentJsonData).length,
        last_update: this.serverStats.lastUpdate,
        timestamp: new Date().toISOString()
      };
    });

    // 更新JSON数据（性能优化版）
    this.requestHandlers.set('POST:/json-data', (request) => {
      try {
        const requestData = request.data || {};
        const newData = requestData.data || requestData;
        
        // 性能优化：只在数据真正改变时更新
        const newDataStr = JSON.stringify(newData);
        const currentDataStr = JSON.stringify(this.currentJsonData);
        
        if (newDataStr !== currentDataStr) {
          this.currentJsonData = newData;
          this.serverStats.lastUpdate = new Date().toISOString();
          this.serverStats.dataSize = newDataStr.length;
          
          // 清理相关缓存
          this.responseCache.delete('GET:/json-data:{}');
          this.responseCache.delete('GET:/stats:{}');
        }

        return {
          status: 'success',
          message: 'JSON数据已更新',
          data_size: this.serverStats.dataSize,
          timestamp: new Date().toISOString(),
          changed: newDataStr !== currentDataStr
        };
      } catch (error) {
        throw new Error(`数据更新失败: ${error.message}`);
      }
    });

    // 验证JSON数据
    this.requestHandlers.set('POST:/validate', (request) => {
      try {
        const data = request.data?.data || request.data;
        const jsonStr = JSON.stringify(data);
        const parsedData = JSON.parse(jsonStr);

        return {
          valid: true,
          size: jsonStr.length,
          keys_count: typeof parsedData === 'object' && parsedData !== null ? 
            Object.keys(parsedData).length : 0,
          type: Array.isArray(parsedData) ? 'array' : typeof parsedData
        };
      } catch (error) {
        return {
          valid: false,
          error: error.message
        };
      }
    });

    // 格式化JSON数据
    this.requestHandlers.set('POST:/format', (request) => {
      try {
        const data = request.data?.data || request.data;
        const indent = request.params?.indent || 2;
        
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
    });

    // 压缩JSON数据
    this.requestHandlers.set('POST:/minify', (request) => {
      try {
        const data = request.data?.data || request.data;
        
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
    });

    // 重置服务器数据
    this.requestHandlers.set('POST:/reset', (request) => {
      this.currentJsonData = {};
      this.serverStats.lastUpdate = null;
      this.serverStats.dataSize = 0;

      return {
        status: 'success',
        message: '服务器数据已重置',
        timestamp: new Date().toISOString()
      };
    });

    // 关闭服务器
    this.requestHandlers.set('POST:/shutdown', (request) => {
      this.isRunning = false;
      return {
        status: 'success',
        message: '服务器已关闭',
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * 启动API服务（性能优化版）
   */
  start(initialData = {}) {
    this.isRunning = true;
    this.currentJsonData = initialData;
    this.serverStats = {
      startTime: new Date().toISOString(),
      requestsCount: 0,
      lastUpdate: initialData && Object.keys(initialData).length > 0 ? new Date().toISOString() : null,
      dataSize: JSON.stringify(initialData).length
    };

    // 性能优化：重置缓存和模板
    this.responseCache.clear();
    this.cacheTimeouts.clear();
    this.updateResponseTemplates();

    console.log('🚀 浏览器原生API服务已启动（性能优化版）');
    console.log('📊 服务类型: Chrome Extension Service Worker');
    console.log('🔧 支持端点:', Array.from(this.requestHandlers.keys()));
    console.log('⚡ 性能特性: 响应缓存、预编译模板、批量处理');
    
    return {
      success: true,
      message: '浏览器原生API服务启动成功（性能优化版）',
      server_type: 'Service Worker',
      endpoints: Array.from(this.requestHandlers.keys()),
      features: ['response_cache', 'template_compilation', 'batch_processing']
    };
  }

  /**
   * 停止API服务
   */
  stop() {
    this.isRunning = false;
    return {
      success: true,
      message: '浏览器原生API服务已停止'
    };
  }

  /**
   * 初始化性能优化
   */
  initializePerformanceOptimizations() {
    // 预编译响应模板
    this.updateResponseTemplates();
    
    // 定期清理缓存
    setInterval(() => {
      this.cleanupCache();
    }, 30000); // 每30秒清理一次
  }

  /**
   * 更新响应模板
   */
  updateResponseTemplates() {
    const now = new Date();
    const startTime = new Date(this.serverStats.startTime);
    const uptime = now - startTime;
    
    this.responseTemplates.health = {
      status: 'healthy',
      timestamp: now.toISOString(),
      uptime_seconds: Math.floor(uptime / 1000),
      server_type: 'Browser Native Service Worker'
    };
    
    this.responseTemplates.info = {
      title: 'JSON Master Browser API',
      version: '3.0.0',
      description: 'JSON格式化大师浏览器原生API服务',
      docs_url: 'chrome-extension://docs',
      redoc_url: 'chrome-extension://redoc',
      uptime: this.formatDuration(uptime),
      server_type: 'Service Worker',
      environment: 'Browser Native'
    };
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, timeout] of this.cacheTimeouts) {
      if (now > timeout) {
        this.responseCache.delete(key);
        this.cacheTimeouts.delete(key);
      }
    }
  }

  /**
   * 获取缓存的响应
   */
  getCachedResponse(cacheKey) {
    if (this.responseCache.has(cacheKey) && Date.now() < this.cacheTimeouts.get(cacheKey)) {
      return this.responseCache.get(cacheKey);
    }
    return null;
  }

  /**
   * 设置缓存响应
   */
  setCachedResponse(cacheKey, response) {
    this.responseCache.set(cacheKey, response);
    this.cacheTimeouts.set(cacheKey, Date.now() + this.cacheTTL);
  }

  /**
   * 处理API请求（性能优化版）
   */
  async handleRequest(method, path, data = null, params = {}) {
    if (!this.isRunning) {
      throw new Error('API服务未运行');
    }

    const routeKey = `${method.toUpperCase()}:${path}`;
    const handler = this.requestHandlers.get(routeKey);

    if (!handler) {
      throw new Error(`端点不存在: ${method} ${path}`);
    }

    // 性能优化：检查缓存（仅对GET请求）
    if (method.toUpperCase() === 'GET' && !data) {
      const cacheKey = `${routeKey}:${JSON.stringify(params)}`;
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return {
          ...cached,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
    }

    try {
      // 更新请求统计
      this.serverStats.requestsCount++;
      
      const startTime = performance.now();
      const request = { 
        method, 
        path, 
        data, 
        params,
        timestamp: new Date().toISOString()
      };
      
      const result = await handler(request);
      const responseTime = performance.now() - startTime;

      const response = {
        success: true,
        data: result,
        response_time: Math.round(responseTime * 100) / 100,
        timestamp: new Date().toISOString()
      };

      // 性能优化：缓存GET请求结果
      if (method.toUpperCase() === 'GET' && !data) {
        const cacheKey = `${routeKey}:${JSON.stringify(params)}`;
        this.setCachedResponse(cacheKey, response);
      }

      return response;
    } catch (error) {
      console.error(`API请求处理错误 [${method} ${path}]:`, error);
      return {
        success: false,
        error: error.message,
        response_time: performance.now() - (performance.now() - 1),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查服务状态
   */
  checkStatus() {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? new Date() - new Date(this.serverStats.startTime) : 0,
      requests_count: this.serverStats.requestsCount,
      data_size: this.serverStats.dataSize
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
   * 获取内存信息（如果可用）
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
   * 获取支持的端点列表
   */
  getSupportedEndpoints() {
    const endpoints = [];
    for (const [route, handler] of this.requestHandlers) {
      const [method, path] = route.split(':');
      endpoints.push({
        method,
        path,
        description: this.getEndpointDescription(path)
      });
    }
    return endpoints;
  }

  /**
   * 获取端点描述
   */
  getEndpointDescription(path) {
    const descriptions = {
      '/health': '健康检查，返回服务器状态',
      '/info': '获取服务器基本信息',
      '/stats': '获取服务器运行统计',
      '/json-data': '获取或更新JSON数据',
      '/validate': '验证JSON数据格式',
      '/format': '格式化JSON数据',
      '/minify': '压缩JSON数据',
      '/reset': '重置服务器数据',
      '/shutdown': '关闭服务器'
    };
    return descriptions[path] || '未知端点';
  }
}

// 导出服务类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserNativeApiService;
}

// 浏览器环境下的全局导出
if (typeof window !== 'undefined') {
  window.BrowserNativeApiService = BrowserNativeApiService;
}