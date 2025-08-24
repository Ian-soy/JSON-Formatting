/**
 * 浏览器原生API适配补丁 for popup.js
 * 替换Python API服务为浏览器原生实现
 */

// 重写API相关函数以支持浏览器原生API
window.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 加载浏览器原生API适配补丁...');
  
  // 重写 startApiServer 函数
  window.startApiServer = function() {
    const input = document.getElementById('json-input');
    
    try {
      const jsonString = input.value.trim() || '{"example": "data"}';
      
      // 验证JSON是否有效
      if (!JsonUtils.isValid(jsonString)) {
        showModalMessage('api-modal', '❌ 无效的JSON数据，已使用示例数据', 'warning', 3000);
        input.value = JSON.stringify({"example": "data", "message": "这是示例数据"}, null, 2);
      }
      
      const data = JSON.parse(input.value.trim());
      
      // 显示启动中状态
      showModalMessage('api-modal', '🚀 正在启动浏览器原生API服务...', 'info', 0);
      updateStatus('正在启动API服务器...', '');
      
      // 禁用启动按钮，防止重复点击
      const startButton = document.getElementById('start-api-btn');
      startButton.disabled = true;
      
      console.group('🚀 浏览器原生API服务器启动流程');
      console.log('📊 JSON数据验证通过，大小:', JSON.stringify(data).length, '字符');
      console.log('📝 数据预览:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
      
      // 显示进度更新
      setTimeout(() => {
        showModalMessage('api-modal', '🔧 正在初始化浏览器环境...', 'info', 0);
      }, 200);
      
      // 发送消息给后台脚本启动API服务器
      chrome.runtime.sendMessage({
        action: 'startApiServer',
        data: data
      }, (response) => {
        startButton.disabled = false;
        console.groupEnd();
        
        console.log('📨 后台服务响应:', response);
        
        if (response && response.success) {
          apiRunning = true;
          updateApiStatus();
          
          // 显示成功提示
          const successMessage = `✅ ${response.provider_name || '浏览器原生API'}启动成功！\n\n🎉 无需安装任何外部环境\n📡 API服务已在浏览器内运行\n🔧 提供者: ${response.provider || 'browser-native'}\n\n📖 现在可以使用API调试功能了！`;
          showModalMessage('api-modal', successMessage, 'success', 8000);
          updateStatus(`${response.provider_name || 'API服务器'}已启动`, 'success');
          
          console.group('📢 启动成功');
          console.log('%c✅ 浏览器原生API服务启动成功！', 'color: green; font-weight: bold');
          console.log('%c🔧 提供者:', 'color: blue; font-weight: bold', response.provider_name);
          console.log('%c🚀 服务类型:', 'color: purple; font-weight: bold', response.server_type);
          console.log('%c📡 完全基于浏览器环境，无需外部依赖', 'color: green');
          console.log('%c🎯 可以立即开始API调试！', 'color: orange; font-weight: bold');
          console.groupEnd();
          
          // 进行健康检查
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'checkApiStatus' }, (statusResponse) => {
              if (statusResponse && statusResponse.running) {
                console.log('🔍 API健康检查通过');
                console.log('📊 提供者:', statusResponse.provider_name);
                console.log('⏱️ 响应时间:', statusResponse.response_time, 'ms');
              }
            });
          }, 1000);
          
        } else {
          const errorMsg = response?.error || '未知错误';
          console.error('❌ API服务器启动失败:', errorMsg);
          
          // 根据错误类型提供具体的解决建议
          let detailedMessage = `❌ 启动失败: ${errorMsg}`;
          let suggestions = [];
          
          if (errorMsg.includes('环境')) {
            suggestions.push('请确保浏览器支持现代JavaScript特性');
            suggestions.push('尝试重新加载扩展');
          } else if (errorMsg.includes('权限')) {
            suggestions.push('检查扩展权限设置');
            suggestions.push('确保扩展处于启用状态');
          } else if (errorMsg.includes('存储')) {
            suggestions.push('检查浏览器存储权限');
            suggestions.push('清理浏览器缓存后重试');
          }
          
          if (suggestions.length > 0) {
            detailedMessage += `\n\n💡 建议解决方案:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
          }
          
          detailedMessage += '\n\n🔄 正在尝试使用备用方案...';
          
          showModalMessage('api-modal', detailedMessage, 'error', 8000);
          updateStatus(`API启动失败: ${errorMsg}`, 'error');
          
          // 尝试切换到备用API提供者
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'getApiProviders' }, (providersResponse) => {
              if (providersResponse && providersResponse.providers) {
                const availableProviders = providersResponse.providers.filter(p => p.available);
                if (availableProviders.length > 1) {
                  showModalMessage('api-modal', '🔄 正在尝试备用API提供者...', 'info', 3000);
                  console.log('🔄 尝试备用提供者:', availableProviders);
                }
              }
            });
          }, 2000);
        }
      });
    } catch (error) {
      const startButton = document.getElementById('start-api-btn');
      startButton.disabled = false;
      
      console.error('❌ JSON解析或API启动错误:', error);
      showModalMessage('api-modal', `❌ 启动失败: ${error.message}`, 'error', 5000);
      updateStatus(`API错误: ${error.message}`, 'error');
    }
  };

  // 重写 stopApiServer 函数
  window.stopApiServer = function() {
    // 显示停止中状态
    showModalMessage('api-modal', '🛑 正在停止API服务器...', 'info', 0);
    updateStatus('正在停止API服务器...', '');
    
    // 禁用停止按钮
    const stopButton = document.getElementById('stop-api-btn');
    stopButton.disabled = true;
    
    chrome.runtime.sendMessage({
      action: 'stopApiServer'
    }, (response) => {
      stopButton.disabled = false;
      
      if (response && response.success) {
        apiRunning = false;
        updateApiStatus();
        
        // 显示成功提示
        showModalMessage('api-modal', '✅ API服务器已停止', 'success', 2000);
        updateStatus('API服务器已停止', 'success');
        console.log('✅ 浏览器原生API服务器已停止');
      } else {
        const errorMsg = response?.error || '未知错误';
        showModalMessage('api-modal', `❌ 停止失败: ${errorMsg}`, 'error', 3000);
        updateStatus(`API服务器停止失败: ${errorMsg}`, 'error');
        console.error('❌ API服务器停止失败:', errorMsg);
      }
    });
  };

  // 重写 checkApiServerStatus 函数
  window.checkApiServerStatus = function() {
    chrome.runtime.sendMessage({
      action: 'checkApiStatus'
    }, (response) => {
      if (response) {
        apiRunning = response.running;
        updateApiStatus();
        
        if (response.running) {
          console.log('🔍 API状态检查:', {
            运行中: response.running,
            提供者: response.provider_name,
            响应时间: response.response_time + 'ms',
            运行时长: response.uptime + 'ms',
            请求数量: response.requests_count
          });
        }
      }
    });
  };

  // 重写 updateApiStatus 函数（如果需要）
  const originalUpdateApiStatus = window.updateApiStatus;
  window.updateApiStatus = function() {
    if (originalUpdateApiStatus) {
      originalUpdateApiStatus();
    }
    
    // 更新API地址显示为浏览器原生
    const apiUrl = document.getElementById('api-url');
    if (apiUrl && apiRunning) {
      apiUrl.textContent = 'browser-native://api';
      apiUrl.title = '浏览器原生API服务 - 无需外部服务器';
    }
  };

  // 重绑定按钮事件
  const startButton = document.getElementById('start-api-btn');
  const stopButton = document.getElementById('stop-api-btn');
  
  if (startButton) {
    startButton.removeEventListener('click', startApiServer);
    startButton.addEventListener('click', window.startApiServer);
  }
  
  if (stopButton) {
    stopButton.removeEventListener('click', stopApiServer);
    stopButton.addEventListener('click', window.stopApiServer);
  }

  console.log('✅ 浏览器原生API适配补丁已加载');
  console.log('🔧 API服务类型: 浏览器原生 (无需Python环境)');
  console.log('📡 支持的提供者: Service Worker, IndexedDB, Memory');
});

// 添加新的API功能
window.switchApiProvider = function(providerType) {
  showModalMessage('api-modal', `🔄 正在切换到${providerType}提供者...`, 'info', 0);
  
  chrome.runtime.sendMessage({
    action: 'switchApiProvider',
    provider: providerType
  }, (response) => {
    if (response && response.success) {
      showModalMessage('api-modal', `✅ 已切换到${response.provider}提供者`, 'success', 3000);
      console.log('✅ API提供者切换成功:', response);
      
      // 更新状态
      updateApiStatus();
    } else {
      const errorMsg = response?.error || '切换失败';
      showModalMessage('api-modal', `❌ 切换失败: ${errorMsg}`, 'error', 3000);
      console.error('❌ API提供者切换失败:', errorMsg);
    }
  });
};

window.performApiPerformanceTest = function(iterations = 10) {
  showModalMessage('api-modal', `🏃‍♂️ 正在进行性能测试 (${iterations}次)...`, 'info', 0);
  
  chrome.runtime.sendMessage({
    action: 'performanceTest',
    iterations: iterations
  }, (response) => {
    if (response && response.success) {
      const result = response.result;
      const message = `📊 性能测试完成\n提供者: ${result.provider}\n成功率: ${result.success_rate}%\n平均响应时间: ${result.average_response_time}ms`;
      showModalMessage('api-modal', message, 'success', 5000);
      console.log('📊 API性能测试结果:', result);
    } else {
      const errorMsg = response?.error || '测试失败';
      showModalMessage('api-modal', `❌ 性能测试失败: ${errorMsg}`, 'error', 3000);
      console.error('❌ 性能测试失败:', errorMsg);
    }
  });
};