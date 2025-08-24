/**
 * JSON格式化大师浏览器原生API服务客户端
 * 用于Vue项目中调用Chrome扩展的API服务
 */

class JsonFormatterApiClient {
  constructor(extensionId = null) {
    this.extensionId = extensionId;
    this.isConnected = false;
    this.currentProvider = 'unknown';
    this.connectionPromise = null;
    
    // API端点映射
    this.endpoints = {
      health: '/health',
      info: '/info',
      stats: '/stats',
      getData: '/json-data',
      setData: '/json-data',
      validate: '/validate',
      format: '/format',
      minify: '/minify',
      reset: '/reset',
      shutdown: '/shutdown'
    };
    
    this.init();
  }

  /**
   * 初始化API客户端
   */
  async init() {
    try {
      // 检查Chrome扩展API是否可用
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        throw new Error('Chrome扩展API不可用，请确保在Chrome浏览器中运行');
      }

      // 自动检测扩展ID（如果未提供）
      if (!this.extensionId) {
        await this.detectExtensionId();
      }

      // 建立连接
      await this.connect();
      
      console.log('✅ JSON格式化大师API客户端初始化成功');
    } catch (error) {
      console.error('❌ API客户端初始化失败:', error);
      throw error;
    }
  }

  /**
   * 自动检测扩展ID
   */
  async detectExtensionId() {
    // 这里可以实现自动检测逻辑
    // 或者要求用户手动配置扩展ID
    console.warn('⚠️ 未配置扩展ID，请手动设置或联系开发者获取');
    throw new Error('需要配置JSON格式化大师扩展ID');
  }

  /**
   * 建立与扩展的连接
   */
  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        // 检查API服务状态
        const statusResponse = await this.sendMessage({
          action: 'checkApiStatus'
        });

        if (statusResponse && statusResponse.success) {
          this.isConnected = true;
          this.currentProvider = statusResponse.provider || 'browser-native';
          resolve(statusResponse);
        } else {
          // 尝试启动API服务
          const startResponse = await this.sendMessage({
            action: 'startApiServer',
            data: {}
          });

          if (startResponse && startResponse.success) {
            this.isConnected = true;
            this.currentProvider = startResponse.provider || 'browser-native';
            resolve(startResponse);
          } else {
            throw new Error('无法启动API服务');
          }
        }
      } catch (error) {
        this.isConnected = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * 发送消息到扩展
   */
  sendMessage(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!this.extensionId) {
        reject(new Error('未配置扩展ID'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('请求超时'));
      }, timeout);

      chrome.runtime.sendMessage(this.extensionId, message, (response) => {
        clearTimeout(timer);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 确保连接可用
   */
  async ensureConnected() {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'GET',
      endpoint: this.endpoints.health
    });

    return response;
  }

  /**
   * 获取服务器信息
   */
  async getServerInfo() {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'GET',
      endpoint: this.endpoints.info
    });

    return response;
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'GET',
      endpoint: this.endpoints.stats
    });

    return response;
  }

  /**
   * 获取JSON数据
   */
  async getJsonData() {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'GET',
      endpoint: this.endpoints.getData
    });

    return response?.data || null;
  }

  /**
   * 设置JSON数据
   */
  async setJsonData(data) {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'POST',
      endpoint: this.endpoints.setData,
      data: { data }
    });

    return response;
  }

  /**
   * 验证JSON数据
   */
  async validateJson(data) {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'POST',
      endpoint: this.endpoints.validate,
      data: { data }
    });

    return response;
  }

  /**
   * 格式化JSON数据
   */
  async formatJson(data, options = {}) {
    await this.ensureConnected();
    
    const { indent = 2, sort = false } = options;
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'POST',
      endpoint: this.endpoints.format,
      data: { data, indent, sort }
    });

    return response?.data || data;
  }

  /**
   * 压缩JSON数据
   */
  async minifyJson(data) {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'POST',
      endpoint: this.endpoints.minify,
      data: { data }
    });

    return response?.data || data;
  }

  /**
   * 批量处理JSON数据
   */
  async batchProcess(operations) {
    await this.ensureConnected();
    
    const results = [];
    
    for (const operation of operations) {
      try {
        let result;
        
        switch (operation.type) {
          case 'validate':
            result = await this.validateJson(operation.data);
            break;
          case 'format':
            result = await this.formatJson(operation.data, operation.options);
            break;
          case 'minify':
            result = await this.minifyJson(operation.data);
            break;
          default:
            throw new Error(`不支持的操作类型: ${operation.type}`);
        }
        
        results.push({
          success: true,
          type: operation.type,
          result: result
        });
      } catch (error) {
        results.push({
          success: false,
          type: operation.type,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 切换API提供者
   */
  async switchProvider(providerType) {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'switchApiProvider',
      provider: providerType
    });

    if (response && response.success) {
      this.currentProvider = response.provider;
    }

    return response;
  }

  /**
   * 获取可用的API提供者列表
   */
  async getAvailableProviders() {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'getApiProviders'
    });

    return response?.providers || [];
  }

  /**
   * 运行性能测试
   */
  async performanceTest(iterations = 10) {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'performanceTest',
      iterations: iterations
    });

    return response;
  }

  /**
   * 重置API数据
   */
  async reset() {
    await this.ensureConnected();
    
    const response = await this.sendMessage({
      action: 'apiRequest',
      method: 'POST',
      endpoint: this.endpoints.reset
    });

    return response;
  }

  /**
   * 停止API服务
   */
  async stop() {
    if (this.isConnected) {
      const response = await this.sendMessage({
        action: 'stopApiServer'
      });
      
      this.isConnected = false;
      this.connectionPromise = null;
      
      return response;
    }
    
    return { success: true, message: '服务已停止' };
  }

  /**
   * 获取当前连接状态
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      provider: this.currentProvider,
      extensionId: this.extensionId
    };
  }

  /**
   * 设置扩展ID
   */
  setExtensionId(extensionId) {
    this.extensionId = extensionId;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * 销毁客户端
   */
  async destroy() {
    try {
      await this.stop();
    } catch (error) {
      console.warn('停止API服务时出错:', error);
    }
    
    this.isConnected = false;
    this.connectionPromise = null;
    this.extensionId = null;
  }
}

// Vue插件形式导出
const JsonFormatterApiPlugin = {
  install(app, options = {}) {
    const apiClient = new JsonFormatterApiClient(options.extensionId);
    
    // 添加到全局属性
    app.config.globalProperties.$jsonApi = apiClient;
    
    // 提供依赖注入
    app.provide('jsonApi', apiClient);
  }
};

// 支持多种导出方式
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { JsonFormatterApiClient, JsonFormatterApiPlugin };
}

if (typeof window !== 'undefined') {
  window.JsonFormatterApiClient = JsonFormatterApiClient;
  window.JsonFormatterApiPlugin = JsonFormatterApiPlugin;
}

export { JsonFormatterApiClient, JsonFormatterApiPlugin };
export default JsonFormatterApiClient;