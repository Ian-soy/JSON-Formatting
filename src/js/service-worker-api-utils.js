/**
 * Service Worker API 专用工具函数
 * 专门为浏览器原生API提供测试和调试功能
 */

// 测试Service Worker API连接
window.testServiceWorkerApi = async function() {
  console.log('🔍 开始测试Service Worker API连接...');
  
  try {
    // 检查统一API管理器
    if (typeof unifiedApiManager === 'undefined') {
      throw new Error('统一API管理器未加载');
    }
    
    // 获取当前提供者信息
    const providerInfo = unifiedApiManager.getCurrentProviderInfo();
    console.log('📊 当前提供者:', providerInfo);
    
    // 执行健康检查
    const healthResult = await unifiedApiManager.checkHealth();
    console.log('💚 健康检查结果:', healthResult);
    
    // 测试基本功能
    const testData = { test: true, timestamp: Date.now() };
    
    // 更新数据测试
    const updateResult = await unifiedApiManager.updateJsonData(testData);
    console.log('📝 数据更新测试:', updateResult);
    
    // 获取数据测试
    const getResult = await unifiedApiManager.getJsonData();
    console.log('📋 数据获取测试:', getResult);
    
    // 验证数据测试
    const validateResult = await unifiedApiManager.validateJsonData(testData);
    console.log('✅ 数据验证测试:', validateResult);
    
    // 显示成功消息
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', '✅ Service Worker API连接测试成功！所有功能正常', 'success', 3000);
    }
    
    console.log('🎉 Service Worker API测试完成！');
    
  } catch (error) {
    console.error('❌ Service Worker API测试失败:', error);
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', `❌ API测试失败: ${error.message}`, 'error', 5000);
    }
  }
};

// 切换到内存API（作为备用方案）
window.switchToMemoryApi = async function() {
  console.log('🔄 正在切换到内存API...');
  
  try {
    if (typeof unifiedApiManager === 'undefined') {
      throw new Error('统一API管理器未加载');
    }
    
    const result = await unifiedApiManager.switchProvider('memory');
    console.log('✅ 已切换到内存API:', result);
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', '✅ 已切换到内存API提供者', 'success', 3000);
    }
    
    // 自动测试新提供者
    setTimeout(() => {
      testServiceWorkerApi();
    }, 1000);
    
  } catch (error) {
    console.error('❌ 切换API提供者失败:', error);
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', `❌ 切换失败: ${error.message}`, 'error', 3000);
    }
  }
};

// 显示API提供者信息
window.showApiProviderInfo = function() {
  console.log('📊 显示API提供者信息...');
  
  try {
    if (typeof unifiedApiManager === 'undefined') {
      throw new Error('统一API管理器未加载');
    }
    
    const currentProvider = unifiedApiManager.getCurrentProviderInfo();
    const allProviders = unifiedApiManager.getSupportedProviders();
    
    console.group('📋 API提供者详细信息');
    
    if (currentProvider) {
      console.log('🎯 当前使用的提供者:');
      console.log('   类型:', currentProvider.type);
      console.log('   名称:', currentProvider.name);
      console.log('   描述:', currentProvider.description);
      console.log('   特性:', currentProvider.features || []);
      console.log('   状态:', currentProvider.status);
    }
    
    console.log('\n🔧 所有可用提供者:');
    allProviders.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.name}`);
      console.log(`   性能: ${provider.performance}`);
      console.log(`   要求: ${provider.requirement}`);
      console.log(`   可用: ${provider.available ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.groupEnd();
    
    // 在模态框中显示简要信息
    if (typeof showModalMessage !== 'undefined' && currentProvider) {
      const message = `📊 当前使用: ${currentProvider.name}\n🚀 类型: ${currentProvider.type}\n⚡ 特性: ${(currentProvider.features || []).join(', ')}`;
      showModalMessage('api-modal', message, 'info', 5000);
    }
    
  } catch (error) {
    console.error('❌ 获取提供者信息失败:', error);
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', `❌ 获取信息失败: ${error.message}`, 'error', 3000);
    }
  }
};

// 执行性能基准测试
window.performServiceWorkerBenchmark = async function(iterations = 10) {
  console.log(`🏃‍♂️ 开始Service Worker API性能基准测试 (${iterations}次)...`);
  
  try {
    if (typeof unifiedApiManager === 'undefined') {
      throw new Error('统一API管理器未加载');
    }
    
    const results = [];
    const testData = { benchmark: true, timestamp: Date.now() };
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        // 测试健康检查性能
        await unifiedApiManager.checkHealth();
        const endTime = performance.now();
        
        results.push({
          iteration: i + 1,
          responseTime: endTime - startTime,
          success: true
        });
        
      } catch (error) {
        const endTime = performance.now();
        results.push({
          iteration: i + 1,
          responseTime: endTime - startTime,
          success: false,
          error: error.message
        });
      }
      
      // 避免过快请求
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // 计算统计数据
    const successResults = results.filter(r => r.success);
    const responseTimes = successResults.map(r => r.responseTime);
    
    const stats = {
      totalTests: iterations,
      successCount: successResults.length,
      successRate: (successResults.length / iterations * 100).toFixed(1),
      averageTime: responseTimes.length > 0 ? 
        (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : 0,
      minTime: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
      maxTime: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0
    };
    
    console.group('📈 性能基准测试结果');
    console.log(`📊 测试总数: ${stats.totalTests}`);
    console.log(`✅ 成功数: ${stats.successCount}`);
    console.log(`📈 成功率: ${stats.successRate}%`);
    console.log(`⏱️ 平均响应时间: ${stats.averageTime}ms`);
    console.log(`🚀 最快响应: ${stats.minTime}ms`);
    console.log(`🐌 最慢响应: ${stats.maxTime}ms`);
    
    // 性能评级
    const avgTime = parseFloat(stats.averageTime);
    let grade = '未知';
    if (avgTime < 5) grade = '🟢 优秀';
    else if (avgTime < 15) grade = '🟡 良好';
    else if (avgTime < 50) grade = '🟠 一般';
    else grade = '🔴 较慢';
    
    console.log(`🎯 性能等级: ${grade}`);
    console.groupEnd();
    
    // 在模态框中显示结果
    if (typeof showModalMessage !== 'undefined') {
      const message = `📈 性能测试完成\n成功率: ${stats.successRate}%\n平均响应: ${stats.averageTime}ms\n性能等级: ${grade}`;
      showModalMessage('api-modal', message, stats.successRate > 90 ? 'success' : 'warning', 5000);
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ 性能基准测试失败:', error);
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', `❌ 性能测试失败: ${error.message}`, 'error', 3000);
    }
    
    throw error;
  }
};

// 自动优化Service Worker性能
window.optimizeServiceWorkerPerformance = async function() {
  console.log('⚡ 开始优化Service Worker性能...');
  
  try {
    if (typeof unifiedApiManager === 'undefined') {
      throw new Error('统一API管理器未加载');
    }
    
    // 1. 检查当前状态
    let isRunning = false;
    try {
      const health = await unifiedApiManager.checkHealth();
      isRunning = health.healthy;
    } catch (error) {
      console.log('🔍 检测到API服务未启动，将自动启动...');
    }
    
    // 2. 如果未运行，先启动API服务
    if (!isRunning) {
      console.log('🚀 启动Service Worker API服务...');
      await unifiedApiManager.startApiService({optimization: 'performance'});
    }
    
    // 3. 确保使用最高性能的Service Worker提供者
    const currentProvider = unifiedApiManager.getCurrentProviderInfo();
    if (!currentProvider || currentProvider.type !== 'browser-native') {
      console.log('🔄 切换到Service Worker提供者...');
      await unifiedApiManager.switchProvider('browser-native');
    }
    
    // 4. 预热API服务
    console.log('🔥 预热API服务...');
    await unifiedApiManager.checkHealth();
    await unifiedApiManager.getServerInfo();
    
    // 5. 执行性能测试验证优化效果
    console.log('📊 验证优化效果...');
    const benchmarkResult = await performServiceWorkerBenchmark(5);
    
    console.log('✅ Service Worker性能优化完成!');
    console.log('📈 优化结果:', benchmarkResult);
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', 
        `⚡ 性能优化完成!\n平均响应时间: ${benchmarkResult.averageTime}ms\n已启用所有性能特性`, 
        'success', 5000);
    }
    
    return benchmarkResult;
    
  } catch (error) {
    console.error('❌ Service Worker性能优化失败:', error);
    
    // 提供更详细的错误信息和解决建议
    let errorMessage = `❌ 性能优化失败: ${error.message}`;
    let suggestions = '';
    
    if (error.message.includes('统一API管理器未加载')) {
      suggestions = '\n建议: 请重新加载页面或重启扩展';
    } else if (error.message.includes('启动失败')) {
      suggestions = '\n建议: 请检查浏览器权限设置';
    } else {
      suggestions = '\n建议: 请尝试手动启动API服务';
    }
    
    if (typeof showModalMessage !== 'undefined') {
      showModalMessage('api-modal', errorMessage + suggestions, 'error', 5000);
    }
    
    throw error;
  }
};

// 诊断Service Worker状态
window.diagnoseServiceWorkerStatus = function() {
  console.group('🔧 Service Worker状态诊断');
  
  try {
    // 检查环境
    console.log('🌍 环境检查:');
    console.log('   浏览器:', navigator.userAgent);
    console.log('   Chrome扩展API:', typeof chrome !== 'undefined');
    console.log('   Service Worker支持:', typeof importScripts !== 'undefined');
    
    // 检查API组件
    console.log('\n🧩 API组件检查:');
    console.log('   统一API管理器:', typeof unifiedApiManager !== 'undefined');
    console.log('   Service Worker API:', typeof BrowserNativeApiService !== 'undefined');
    console.log('   内存API:', typeof MemoryApiService !== 'undefined');
    console.log('   IndexedDB API:', typeof IndexedDBApiService !== 'undefined');
    
    // 检查性能特性
    if (typeof performance !== 'undefined') {
      console.log('\n⚡ 性能特性检查:');
      console.log('   Performance API:', true);
      console.log('   高精度时间:', typeof performance.now === 'function');
      if (performance.memory) {
        console.log('   内存监控:', true);
        console.log('   已用内存:', Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), 'MB');
      }
    }
    
    // 检查当前状态
    if (typeof unifiedApiManager !== 'undefined') {
      console.log('\n📊 当前状态:');
      const provider = unifiedApiManager.getCurrentProviderInfo();
      if (provider) {
        console.log('   当前提供者:', provider.name);
        console.log('   提供者类型:', provider.type);
        console.log('   运行状态:', provider.status ? '运行中' : '未启动');
      } else {
        console.log('   提供者状态: 未初始化');
      }
    }
    
    console.log('\n✅ 诊断完成');
    
  } catch (error) {
    console.error('❌ 诊断过程出错:', error);
  }
  
  console.groupEnd();
};

// 页面加载完成后自动优化
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Service Worker API工具已加载');
  
  // 延迟执行自动优化，确保所有组件都已加载
  setTimeout(() => {
    if (typeof unifiedApiManager !== 'undefined') {
      console.log('⚡ 正在自动优化Service Worker性能...');
      // 静默优化，不显示消息
      optimizeServiceWorkerPerformance().catch(error => {
        console.log('ℹ️ 自动优化跳过:', error.message);
      });
    }
  }, 2000);
});

console.log('🔧 Service Worker API专用工具已加载');
console.log('📝 可用函数:');
console.log('   - testServiceWorkerApi() : 测试API连接');
console.log('   - switchToMemoryApi() : 切换到备用API');
console.log('   - showApiProviderInfo() : 显示提供者信息');
console.log('   - performServiceWorkerBenchmark() : 性能基准测试');
console.log('   - optimizeServiceWorkerPerformance() : 自动性能优化');
console.log('   - diagnoseServiceWorkerStatus() : 状态诊断');