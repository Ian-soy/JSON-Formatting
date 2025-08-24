/**
 * JSON格式化大师 - Background Service Worker
 * 使用浏览器原生API服务，无需外部依赖
 */

// 导入浏览器原生API服务
importScripts(
  'browser-native-api.js',
  'indexeddb-api-service.js', 
  'memory-api-service.js',
  'unified-api-manager.js'
);

// 全局变量
let apiServerRunning = false;
let currentJsonData = {};

// 初始化统一API管理器
const apiManager = new UnifiedApiManager();

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 后台服务收到消息:', request.action);
  
  if (request.action === 'startApiServer') {
    startBrowserNativeApiServer(request.data, sendResponse);
    return true; // 保持消息通道开放，以便异步响应
  } else if (request.action === 'stopApiServer') {
    stopBrowserNativeApiServer(sendResponse);
    return true; // 保持消息通道开放，以便异步响应
  } else if (request.action === 'checkApiStatus') {
    checkBrowserNativeApiStatus(sendResponse);
    return true;
  } else if (request.action === 'switchApiProvider') {
    switchApiProvider(request.provider, sendResponse);
    return true;
  } else if (request.action === 'getApiProviders') {
    getAvailableApiProviders(sendResponse);
    return false;
  } else if (request.action === 'performanceTest') {
    performApiPerformanceTest(request.iterations || 10, sendResponse);
    return true;
  }
});

/**
 * 启动浏览器原生API服务器
 */
async function startBrowserNativeApiServer(jsonData, sendResponse) {
  console.log('🚀 启动浏览器原生API服务器...');
  console.log('📊 JSON数据大小:', JSON.stringify(jsonData || {}).length, '字符');
  
  if (apiServerRunning) {
    console.log('⚠️ API服务器已在运行');
    sendResponse({ 
      success: true, 
      message: 'API服务器已经在运行',
      provider: apiManager.getCurrentProviderInfo()?.type || 'unknown'
    });
    return;
  }

  try {
    // 验证JSON数据
    if (jsonData && typeof jsonData !== 'object') {
      throw new Error('无效的JSON数据格式');
    }
    
    currentJsonData = jsonData || {};
    console.log('✅ JSON数据验证通过');

    // 启动API服务
    const result = await apiManager.startApiService(currentJsonData);
    
    if (result.success) {
      apiServerRunning = true;
      console.log('🎉 浏览器原生API服务器启动成功！');
      console.log('🔧 使用提供者:', result.provider_name);
      
      sendResponse({ 
        success: true, 
        message: `${result.provider_name}启动成功`,
        provider: result.provider,
        provider_name: result.provider_name,
        server_type: 'Browser Native'
      });
    } else {
      throw new Error(result.message || '启动失败');
    }
    
  } catch (error) {
    console.error('❌ API服务器启动失败:', error);
    sendResponse({ 
      success: false, 
      error: `浏览器原生API服务启动失败: ${error.message}`,
      suggestion: '请检查浏览器环境和扩展权限'
    });
  }
}

/**
 * 停止浏览器原生API服务器
 */
async function stopBrowserNativeApiServer(sendResponse) {
  console.log('🛑 停止浏览器原生API服务器...');
  
  if (!apiServerRunning) {
    sendResponse({ success: true, message: 'API服务器未运行' });
    return;
  }

  try {
    const result = await apiManager.stopApiService();
    apiServerRunning = false;
    
    console.log('✅ API服务器已停止');
    sendResponse({ 
      success: true, 
      message: 'API服务器已停止',
      result: result
    });
  } catch (error) {
    console.error('❌ API服务器停止失败:', error);
    // 强制停止
    apiServerRunning = false;
    sendResponse({ 
      success: true, 
      message: '服务器已强制停止',
      warning: error.message
    });
  }
}

/**
 * 检查浏览器原生API状态
 */
async function checkBrowserNativeApiStatus(sendResponse) {
  try {
    if (!apiServerRunning) {
      sendResponse({ 
        running: false,
        provider: null
      });
      return;
    }

    const health = await apiManager.checkHealth();
    const providerInfo = apiManager.getCurrentProviderInfo();
    
    sendResponse({ 
      running: health.healthy,
      provider: providerInfo?.type,
      provider_name: providerInfo?.name,
      response_time: health.response_time,
      uptime: providerInfo?.status?.uptime || 0,
      requests_count: providerInfo?.status?.requests_count || 0
    });
  } catch (error) {
    console.error('❌ 检查API状态失败:', error);
    sendResponse({ 
      running: false,
      error: error.message
    });
  }
}

/**
 * 切换API提供者
 */
async function switchApiProvider(providerType, sendResponse) {
  console.log('🔄 切换API提供者到:', providerType);
  
  try {
    const result = await apiManager.switchProvider(providerType);
    
    console.log('✅ API提供者切换成功:', result.provider);
    sendResponse({
      success: true,
      provider: result.provider,
      data_restored: result.data_restored,
      message: `已切换到${result.provider}提供者`
    });
  } catch (error) {
    console.error('❌ 切换API提供者失败:', error);
    sendResponse({
      success: false,
      error: `切换失败: ${error.message}`
    });
  }
}

/**
 * 获取可用的API提供者
 */
function getAvailableApiProviders(sendResponse) {
  const providers = apiManager.getSupportedProviders();
  const currentProvider = apiManager.getCurrentProviderInfo();
  
  sendResponse({
    providers: providers,
    current: currentProvider,
    recommendation: providers.find(p => p.available && p.type === 'browser-native') || 
                   providers.find(p => p.available)
  });
}

/**
 * 性能测试
 */
async function performApiPerformanceTest(iterations, sendResponse) {
  console.log(`🏃‍♂️ 开始API性能测试 - ${iterations}次迭代`);
  
  try {
    if (!apiServerRunning) {
      throw new Error('API服务器未运行，无法进行性能测试');
    }

    const result = await apiManager.performanceTest(iterations);
    
    console.log('📊 性能测试完成:', result);
    sendResponse({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 JSON格式化大师扩展已安装/更新');
  console.log('📋 详情:', details);
  
  // 初始化存储
  try {
    const data = await chrome.storage.sync.get(['theme', 'fontSize', 'apiProvider']);
    
    const updates = {};
    if (!data.theme) {
      updates.theme = 'dark';
    }
    if (!data.fontSize) {
      updates.fontSize = 14;
    }
    if (!data.apiProvider) {
      updates.apiProvider = 'browser-native'; // 默认使用浏览器原生API
    }
    
    if (Object.keys(updates).length > 0) {
      await chrome.storage.sync.set(updates);
      console.log('✅ 默认设置已初始化:', updates);
    }
  } catch (error) {
    console.error('❌ 初始化存储失败:', error);
  }

  // 预加载API管理器（不启动服务）
  try {
    console.log('🔄 预初始化API管理器...');
    
    // 检查各个API提供者的可用性
    const providers = apiManager.getSupportedProviders();
    const availableProviders = providers.filter(p => p.available);
    
    console.log('📋 可用的API提供者:', availableProviders.map(p => p.name));
    
    if (availableProviders.length === 0) {
      console.warn('⚠️ 没有可用的API提供者');
    } else {
      console.log('✅ API管理器预初始化完成');
    }
  } catch (error) {
    console.error('❌ API管理器预初始化失败:', error);
  }
});

// 扩展启动时
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 JSON格式化大师扩展已启动');
  apiServerRunning = false;
  currentJsonData = {};
});

// 监听扩展挂起（如果支持）
chrome.runtime.onSuspend?.addListener(() => {
  console.log('😴 JSON格式化大师扩展即将挂起');
  if (apiServerRunning) {
    console.log('🛑 自动停止API服务器...');
    stopBrowserNativeApiServer(() => {
      console.log('✅ API服务器已在挂起前停止');
    });
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('🚨 Background Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 未处理的Promise拒绝:', event.reason);
});

console.log('✅ JSON格式化大师 Background Service Worker 已加载');
console.log('🔧 支持的API提供者: 浏览器原生、IndexedDB、内存');
console.log('📡 等待用户启动API服务...');