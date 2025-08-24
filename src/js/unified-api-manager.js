/**
 * 统一API接口层
 * 支持多种API服务实现方案的切换和管理
 */

class UnifiedApiManager {
  constructor() {
    this.currentProvider = null;
    this.providerType = 'none';
    this.supportedProviders = new Map();
    // 性能优化：主要使用Service Worker，其他作为备用
    this.fallbackChain = ['browser-native', 'memory', 'indexeddb'];
    
    // 性能优化：请求池化
    this.requestPool = [];
    this.isProcessingPool = false;
    
    // 性能优化：连接缓存
    this.connectionCache = {
      lastHealthCheck: null,
      lastHealthTime: 0,
      healthCacheTTL: 3000 // 3秒缓存
    };
    
    this.setupProviders();
  }

  /**
   * 设置支持的API提供者（性能优化版）
   */
  setupProviders() {
    // 主要推荐：浏览器原生Service Worker API
    this.supportedProviders.set('browser-native', {
      name: '浏览器原生API（推荐）',
      description: '基于Chrome Extension Service Worker，高性能无依赖',
      requirement: '无需外部依赖',
      performance: '最高性能',
      features: ['响应缓存', '预编译模板', '零延迟启动'],
      initialize: () => {
        if (typeof BrowserNativeApiService !== 'undefined') {
          return new BrowserNativeApiService();
        }
        throw new Error('BrowserNativeApiService未加载');
      }
    });

    // 备用方案：内存API
    this.supportedProviders.set('memory', {
      name: '内存API（备用）',
      description: '基于内存的临时存储',
      requirement: '任何浏览器',
      performance: '高性能，数据临时',
      features: ['最快响应', '轻量级'],
      initialize: () => {
        if (typeof MemoryApiService !== 'undefined') {
          return new MemoryApiService();
        }
        throw new Error('MemoryApiService未加载');
      }
    });

    // 可选方案：IndexedDB API（仅在需要持久化时使用）
    this.supportedProviders.set('indexeddb', {
      name: 'IndexedDB API（持久化）',
      description: '基于IndexedDB的持久化存储',
      requirement: '现代浏览器支持',
      performance: '中等性能，数据持久化',
      features: ['数据持久化', '事务支持'],
      initialize: () => {
        if (typeof IndexedDBApiService !== 'undefined') {
          return new IndexedDBApiService();
        }
        throw new Error('IndexedDBApiService未加载');
      }
    });
  }

  /**
   * 自动选择最佳的API提供者（性能优化版）
   */
  async autoSelectProvider() {
    // 性能优化：优先尝试Service Worker
    console.log('🚀 正在选择最优API提供者...');
    
    for (const providerType of this.fallbackChain) {
      try {
        const provider = this.supportedProviders.get(providerType);
        if (provider) {
          console.log(`🔍 正在测试提供者: ${provider.name}`);
          
          const instance = provider.initialize();
          await this.setProvider(providerType, instance);
          
          console.log(`✅ 已自动选择API提供者: ${provider.name}`);
          
          // 性能优化：记录选择结果
          if (providerType === 'browser-native') {
            console.log('⚡ 正在使用最高性能的Service Worker API');
          }
          
          return {
            success: true,
            provider: providerType,
            name: provider.name,
            description: provider.description,
            features: provider.features || []
          };
        }
      } catch (error) {
        console.warn(`⚠️ 无法初始化提供者 ${providerType}:`, error.message);
        continue;
      }
    }
    
    throw new Error('无法初始化任何API提供者');
  }

  /**
   * 手动设置API提供者
   */
  async setProvider(type, instance = null) {
    if (!this.supportedProviders.has(type)) {
      throw new Error(`不支持的API提供者: ${type}`);
    }

    try {
      if (!instance) {
        const provider = this.supportedProviders.get(type);
        instance = provider.initialize();
      }

      this.currentProvider = instance;
      this.providerType = type;
      
      console.log(`🔄 已切换到API提供者: ${type}`);
      return {
        success: true,
        provider: type,
        instance: instance
      };
    } catch (error) {
      console.error(`❌ 设置API提供者失败 [${type}]:`, error);
      throw error;
    }
  }

  /**
   * 启动API服务
   */
  async startApiService(initialData = {}) {
    if (!this.currentProvider) {
      const result = await this.autoSelectProvider();
      if (!result.success) {
        throw new Error('无法启动API服务：没有可用的提供者');
      }
    }

    try {
      const result = await this.currentProvider.start(initialData);
      console.log(`🚀 API服务已启动 [${this.providerType}]`);
      return {
        ...result,
        provider: this.providerType,
        provider_name: this.supportedProviders.get(this.providerType).name
      };
    } catch (error) {
      console.error(`❌ API服务启动失败 [${this.providerType}]:`, error);
      throw error;
    }
  }

  /**
   * 停止API服务
   */
  async stopApiService() {
    if (!this.currentProvider) {
      return { success: true, message: 'API服务未运行' };
    }

    try {
      const result = await this.currentProvider.stop();
      console.log(`🛑 API服务已停止 [${this.providerType}]`);
      return result;
    } catch (error) {
      console.error(`❌ API服务停止失败 [${this.providerType}]:`, error);
      throw error;
    }
  }

  /**
   * 统一的API请求接口
   */
  async request(method, path, data = null, params = {}) {
    if (!this.currentProvider) {
      throw new Error('API服务未启动');
    }

    try {
      return await this.currentProvider.handleRequest(method, path, data, params);
    } catch (error) {
      console.error(`API请求失败 [${method} ${path}]:`, error);
      throw error;
    }
  }

  /**
   * 便捷方法：GET请求
   */
  async get(path, params = {}) {
    return await this.request('GET', path, null, params);
  }

  /**
   * 便捷方法：POST请求
   */
  async post(path, data, params = {}) {
    return await this.request('POST', path, data, params);
  }

  /**
   * 便捷方法：PUT请求
   */
  async put(path, data, params = {}) {
    return await this.request('PUT', path, data, params);
  }

  /**
   * 便捷方法：DELETE请求
   */
  async delete(path, params = {}) {
    return await this.request('DELETE', path, null, params);
  }

  /**
   * 健康检查（性能优化版）
   */
  async checkHealth() {
    const now = Date.now();
    
    // 性能优化：使用缓存减少频繁检查
    if (this.connectionCache.lastHealthCheck && 
        (now - this.connectionCache.lastHealthTime) < this.connectionCache.healthCacheTTL) {
      return {
        ...this.connectionCache.lastHealthCheck,
        cached: true
      };
    }
    
    try {
      const response = await this.get('/health');
      const result = {
        healthy: response.success,
        provider: this.providerType,
        response_time: response.response_time,
        data: response.data,
        cached: response.cached || false
      };
      
      // 更新缓存
      this.connectionCache.lastHealthCheck = result;
      this.connectionCache.lastHealthTime = now;
      
      return result;
    } catch (error) {
      const result = {
        healthy: false,
        provider: this.providerType,
        error: error.message
      };
      
      // 也缓存错误结果，避免频繁重试
      this.connectionCache.lastHealthCheck = result;
      this.connectionCache.lastHealthTime = now;
      
      return result;
    }
  }

  /**
   * 获取服务器信息
   */
  async getServerInfo() {
    return await this.get('/info');
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    return await this.get('/stats');
  }

  /**
   * 获取JSON数据
   */
  async getJsonData() {
    return await this.get('/json-data');
  }

  /**
   * 更新JSON数据
   */
  async updateJsonData(jsonData, source = 'user') {
    const requestData = {
      data: jsonData,
      timestamp: Date.now(),
      source: source
    };
    return await this.post('/json-data', requestData);
  }

  /**
   * 验证JSON数据
   */
  async validateJsonData(jsonData) {
    return await this.post('/validate', { data: jsonData });
  }

  /**
   * 格式化JSON数据
   */
  async formatJsonData(jsonData, indent = 2) {
    return await this.post('/format', { data: jsonData }, { indent });
  }

  /**
   * 压缩JSON数据
   */
  async minifyJsonData(jsonData) {
    return await this.post('/minify', { data: jsonData });
  }

  /**
   * 重置服务器数据
   */
  async resetServer() {
    return await this.post('/reset');
  }

  /**
   * 关闭服务器
   */
  async shutdownServer() {
    return await this.post('/shutdown');
  }

  /**
   * 获取当前提供者信息
   */
  getCurrentProviderInfo() {
    if (!this.currentProvider) {
      return null;
    }

    const provider = this.supportedProviders.get(this.providerType);
    return {
      type: this.providerType,
      name: provider.name,
      description: provider.description,
      requirement: provider.requirement,
      performance: provider.performance,
      status: this.currentProvider.checkStatus ? this.currentProvider.checkStatus() : null
    };
  }

  /**
   * 获取所有支持的提供者
   */
  getSupportedProviders() {
    const providers = [];
    for (const [type, provider] of this.supportedProviders) {
      providers.push({
        type,
        name: provider.name,
        description: provider.description,
        requirement: provider.requirement,
        performance: provider.performance,
        available: this.isProviderAvailable(type)
      });
    }
    return providers;
  }

  /**
   * 检查提供者是否可用
   */
  isProviderAvailable(type) {
    try {
      const provider = this.supportedProviders.get(type);
      if (!provider) return false;
      
      // 尝试初始化以检查可用性
      const instance = provider.initialize();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 切换到不同的提供者
   */
  async switchProvider(newType) {
    const wasRunning = this.currentProvider && this.currentProvider.checkStatus().running;
    let currentData = {};

    // 如果当前服务正在运行，先保存数据
    if (wasRunning) {
      try {
        const dataResponse = await this.getJsonData();
        if (dataResponse.success) {
          currentData = dataResponse.data.data || {};
        }
        await this.stopApiService();
      } catch (error) {
        console.warn('切换提供者时保存数据失败:', error);
      }
    }

    // 切换到新提供者
    await this.setProvider(newType);

    // 如果之前服务在运行，重新启动并恢复数据
    if (wasRunning) {
      await this.startApiService(currentData);
    }

    return {
      success: true,
      provider: newType,
      data_restored: Object.keys(currentData).length > 0
    };
  }

  /**
   * 性能测试
   */
  async performanceTest(iterations = 10) {
    if (!this.currentProvider) {
      throw new Error('API服务未启动');
    }

    const results = [];
    const testData = { test: 'performance', timestamp: Date.now() };

    console.log(`🏃‍♂️ 开始性能测试 [${this.providerType}] - ${iterations}次迭代`);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.get('/health');
        const endTime = performance.now();
        results.push({
          iteration: i + 1,
          response_time: endTime - startTime,
          success: true
        });
      } catch (error) {
        const endTime = performance.now();
        results.push({
          iteration: i + 1,
          response_time: endTime - startTime,
          success: false,
          error: error.message
        });
      }

      // 避免过快请求
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const successResults = results.filter(r => r.success);
    const responseTimes = successResults.map(r => r.response_time);

    return {
      provider: this.providerType,
      total_tests: iterations,
      successful_tests: successResults.length,
      success_rate: (successResults.length / iterations * 100).toFixed(1),
      average_response_time: responseTimes.length > 0 ? 
        (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : 0,
      min_response_time: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
      max_response_time: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0,
      results: results
    };
  }
}

// 创建全局实例
const unifiedApiManager = new UnifiedApiManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UnifiedApiManager, unifiedApiManager };
}

if (typeof window !== 'undefined') {
  window.UnifiedApiManager = UnifiedApiManager;
  window.unifiedApiManager = unifiedApiManager;
}