/**
 * JSON格式化大师 - API处理模块 v2.0
 * 用于与Python FastAPI服务器通信
 * 提供本地API服务启动、停止和调试功能
 * 新增：性能监控、连接测试、详细错误处理
 */

class ApiHandler {
  constructor() {
    this.baseUrl = 'http://localhost:8000';
    this.isRunning = false;
    this.checkInterval = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.healthCheckTimeout = 5000; // 5秒超时
    this.performanceCache = new Map(); // 性能数据缓存
    this.lastPerformanceTest = null;
    this.connectionDebugMode = false;
  }

  /**
   * 启动健康检查
   * @param {number} interval - 检查间隔（毫秒）
   */
  startHealthCheck(interval = 30000) {
    this.stopHealthCheck();
    this.checkInterval = setInterval(() => {
      this.checkServerStatus();
    }, interval);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查API服务器是否运行（带重试机制和性能监控）
   * @returns {Promise<boolean>} 服务器是否运行
   */
  async checkServerStatus() {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;
      
      this.isRunning = response.ok;
      this.retryCount = 0; // 重置重试计数
      
      // 记录性能数据
      if (this.isRunning) {
        this.performanceCache.set('lastHealthCheck', {
          responseTime,
          timestamp: Date.now(),
          status: 'success'
        });
      }
      
      if (this.connectionDebugMode) {
        console.log(`🔧 健康检查完成: ${this.isRunning ? '✅' : '❌'}, 响应时间: ${responseTime.toFixed(2)}ms`);
      }
      
      return this.isRunning;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.isRunning = false;
      
      // 记录错误性能数据
      this.performanceCache.set('lastHealthCheck', {
        responseTime,
        timestamp: Date.now(),
        status: 'error',
        error: error.message
      });
      
      if (this.connectionDebugMode) {
        console.log(`🔧 健康检查失败 (${this.retryCount + 1}/${this.maxRetries}): ${error.message}, 耗时: ${responseTime.toFixed(2)}ms`);
      }
      
      return false;
    }
  }

  /**
   * 获取API服务器信息（增强版）
   * @returns {Promise<Object>} 服务器信息
   */
  async getServerInfo() {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`获取服务器信息失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 记录性能数据
      this.performanceCache.set('serverInfo', {
        responseTime,
        timestamp: Date.now(),
        data
      });
      
      return data;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.performanceCache.set('serverInfo', {
        responseTime,
        timestamp: Date.now(),
        error: error.message
      });
      
      console.error('获取API服务器信息错误:', error);
      throw error;
    }
  }

  /**
   * 获取当前JSON数据
   * @returns {Promise<Object>} JSON数据
   */
  async getJsonData() {
    try {
      const response = await fetch(`${this.baseUrl}/json-data`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取JSON数据错误:', error);
      throw error;
    }
  }

  /**
   * 更新JSON数据（支持批量更新）
   * @param {Object} jsonData - 要更新的JSON数据
   * @param {Object} options - 更新选项
   * @returns {Promise<Object>} 响应结果
   */
  async updateJsonData(jsonData, options = {}) {
    try {
      const requestBody = {
        data: jsonData,
        timestamp: Date.now(),
        ...options
      };
      
      const response = await fetch(`${this.baseUrl}/json-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`更新数据失败: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('更新JSON数据错误:', error);
      throw error;
    }
  }

  /**
   * 获取API文档URL
   * @returns {string} 文档URL
   */
  getDocsUrl() {
    return `${this.baseUrl}/docs`;
  }

  /**
   * 获取Redoc文档URL
   * @returns {string} Redoc文档URL
   */
  getRedocUrl() {
    return `${this.baseUrl}/redoc`;
  }

  /**
   * 获取OpenAPI JSON URL
   * @returns {string} OpenAPI JSON URL
   */
  getOpenApiUrl() {
    return `${this.baseUrl}/openapi.json`;
  }

  /**
   * 优雅关闭API服务器
   * @param {number} timeout - 关闭超时时间
   * @returns {Promise<Object>} 响应结果
   */
  async shutdownServer(timeout = 5000) {
    try {
      this.stopHealthCheck(); // 停止健康检查
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${this.baseUrl}/shutdown`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`关闭服务器失败: ${response.status}`);
      }
      
      this.isRunning = false;
      return await response.json();
    } catch (error) {
      console.error('关闭API服务器错误:', error);
      this.isRunning = false; // 强制设置为未运行
      throw error;
    }
  }

  /**
   * 获取API统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getServerStats() {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`获取统计信息失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 记录性能数据
      this.performanceCache.set('serverStats', {
        responseTime,
        timestamp: Date.now(),
        data
      });
      
      return data;
    } catch (error) {
      console.error('获取API统计信息错误:', error);
      throw error;
    }
  }

  /**
   * 性能测试 - 测试API响应速度和稳定性
   * @param {number} testCount - 测试次数
   * @returns {Promise<Object>} 性能测试结果
   */
  async performanceTest(testCount = 5) {
    const results = [];
    const testStartTime = Date.now();
    
    try {
      console.log(`🔍 开始性能测试（${testCount}次）...`);
      
      for (let i = 0; i < testCount; i++) {
        const startTime = performance.now();
        
        try {
          const response = await fetch(`${this.baseUrl}/health`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          results.push({
            test: i + 1,
            responseTime,
            status: response.ok ? 'success' : 'failed',
            statusCode: response.status
          });
          
          // 间隔一小段时间再次测试
          if (i < testCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          results.push({
            test: i + 1,
            responseTime,
            status: 'error',
            error: error.message
          });
        }
      }
      
      // 计算统计数据
      const successTests = results.filter(r => r.status === 'success');
      const responseTimes = successTests.map(r => r.responseTime);
      
      const stats = {
        totalTests: testCount,
        successCount: successTests.length,
        failureCount: testCount - successTests.length,
        successRate: (successTests.length / testCount * 100).toFixed(1),
        averageResponseTime: responseTimes.length > 0 ? 
          (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0,
        totalTestTime: Date.now() - testStartTime
      };
      
      // 性能等级评估
      const avgTime = parseFloat(stats.averageResponseTime);
      let performanceGrade = '较慢';
      let gradeColor = '#ff4444';
      
      if (avgTime < 50) {
        performanceGrade = '优秀';
        gradeColor = '#00cc44';
      } else if (avgTime < 200) {
        performanceGrade = '良好';
        gradeColor = '#ff8800';
      } else if (avgTime < 500) {
        performanceGrade = '一般';
        gradeColor = '#ffaa00';
      }
      
      const testResult = {
        ...stats,
        performanceGrade,
        gradeColor,
        details: results,
        timestamp: new Date().toISOString()
      };
      
      // 缓存测试结果
      this.lastPerformanceTest = testResult;
      this.performanceCache.set('performanceTest', testResult);
      
      console.log('📈 性能测试完成:', testResult);
      
      return testResult;
      
    } catch (error) {
      console.error('🚨 性能测试失败:', error);
      throw new Error(`性能测试失败: ${error.message}`);
    }
  }

  /**
   * 连接调试 - 详细检查API连接状态
   * @returns {Promise<Object>} 调试信息
   */
  async debugConnection() {
    this.connectionDebugMode = true;
    const debugInfo = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      tests: []
    };
    
    console.group('🔧 API连接调试开始');
    
    try {
      // 1. 基本连接测试
      console.log('🔍 1. 测试基本连接...');
      const healthResult = await this.checkServerStatus();
      debugInfo.tests.push({
        name: '健康检查',
        result: healthResult,
        performance: this.performanceCache.get('lastHealthCheck')
      });
      
      if (!healthResult) {
        console.warn('⚠️ 健康检查失败，服务器可能未启动');
        debugInfo.serverStatus = '未启动';
        return debugInfo;
      }
      
      // 2. 服务器信息测试
      console.log('🔍 2. 获取服务器信息...');
      try {
        const serverInfo = await this.getServerInfo();
        debugInfo.tests.push({
          name: '服务器信息',
          result: 'success',
          data: serverInfo,
          performance: this.performanceCache.get('serverInfo')
        });
        debugInfo.serverInfo = serverInfo;
      } catch (error) {
        debugInfo.tests.push({
          name: '服务器信息',
          result: 'failed',
          error: error.message
        });
      }
      
      // 3. 统计信息测试
      console.log('🔍 3. 获取统计信息...');
      try {
        const stats = await this.getServerStats();
        debugInfo.tests.push({
          name: '统计信息',
          result: 'success',
          data: stats,
          performance: this.performanceCache.get('serverStats')
        });
        debugInfo.serverStats = stats;
      } catch (error) {
        debugInfo.tests.push({
          name: '统计信息',
          result: 'failed',
          error: error.message
        });
      }
      
      // 4. JSON数据端点测试
      console.log('🔍 4. 测试JSON数据端点...');
      try {
        const jsonData = await this.getJsonData();
        debugInfo.tests.push({
          name: 'JSON数据端点',
          result: 'success',
          dataSize: JSON.stringify(jsonData.data).length
        });
      } catch (error) {
        debugInfo.tests.push({
          name: 'JSON数据端点',
          result: 'failed',
          error: error.message
        });
      }
      
      debugInfo.serverStatus = '正常运行';
      debugInfo.summary = {
        totalTests: debugInfo.tests.length,
        successCount: debugInfo.tests.filter(t => t.result === 'success').length,
        failedCount: debugInfo.tests.filter(t => t.result === 'failed').length
      };
      
      console.log('✅ 调试完成，结果:', debugInfo);
      
    } catch (error) {
      console.error('❌ 调试过程错误:', error);
      debugInfo.globalError = error.message;
    } finally {
      console.groupEnd();
      this.connectionDebugMode = false;
    }
    
    return debugInfo;
  }
}

// 创建全局API处理器实例
const apiHandler = new ApiHandler();

// 全局函数供HTML调用
window.testApiPerformance = async function() {
  if (!apiHandler.isRunning) {
    showModalMessage('api-modal', '❌ API服务器未启动，无法进行性能测试', 'error', 3000);
    return;
  }
  
  try {
    showModalMessage('api-modal', '🔍 正在进行性能测试...', 'info', 0);
    
    const result = await apiHandler.performanceTest();
    
    const message = `✅ 性能测试完成！\n` +
      `成功率: ${result.successRate}% | ` +
      `平均响应: ${result.averageResponseTime}ms | ` +
      `性能等级: ${result.performanceGrade}`;
    
    showModalMessage('api-modal', message, 'success', 5000);
    
  } catch (error) {
    showModalMessage('api-modal', `❌ 性能测试失败: ${error.message}`, 'error', 3000);
  }
};

window.debugApiConnection = async function() {
  try {
    showModalMessage('api-modal', '🔧 正在进行连接调试...', 'info', 0);
    
    const debugInfo = await apiHandler.debugConnection();
    
    const message = `✅ 连接调试完成！\n` +
      `总测试: ${debugInfo.summary?.totalTests || 0} | ` +
      `成功: ${debugInfo.summary?.successCount || 0} | ` +
      `失败: ${debugInfo.summary?.failedCount || 0}\n` +
      `详细信息请查看控制台`;
    
    showModalMessage('api-modal', message, 'success', 5000);
    
  } catch (error) {
    showModalMessage('api-modal', `❌ 连接调试失败: ${error.message}`, 'error', 3000);
  }
};

// 如果在浏览器环境中，添加全局可访问性
if (typeof window !== 'undefined') {
  window.apiHandler = apiHandler;
}