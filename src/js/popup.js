// 全局变量
let apiRunning = false;
let jsonData = {};

// DOM元素
document.addEventListener('DOMContentLoaded', () => {
  // 初始化各个模块
  initializeModules();
  setupEventListeners();
  updateCharCount();
});

// 初始化所有模块
async function initializeModules() {
  try {
    // 初始化主题
    await themeManager.initialize();
    const currentTheme = themeManager.getCurrentTheme();
    document.getElementById('theme-selector').value = currentTheme;
    
    // 处理监控主题特殊元素
    const monitorAddBtnContainer = document.getElementById('monitor-add-btn-container');
    if (monitorAddBtnContainer) {
      monitorAddBtnContainer.style.display = currentTheme === 'monitor' ? 'block' : 'none';
    }
    
    // 初始化字体大小
    await fontManager.initialize();
    
    // 检查API服务器状态
    checkApiServerStatus();
  } catch (error) {
    console.error('初始化模块错误:', error);
    updateStatus('初始化失败，请重新加载', 'error');
  }
}

// 设置事件监听器（使用性能优化）
function setupEventListeners() {
  // 主题切换
  document.getElementById('theme-selector').addEventListener('change', (e) => {
    themeManager.applyTheme(e.target.value);
  });
  
  // 监控主题添加按钮
  const addBtn = document.querySelector('.add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      updateStatus('添加监控项目功能即将上线', 'info');
    });
  }

  // 字体大小调整
  // document.getElementById('font-decrease').addEventListener('click', () => {
  //   fontManager.decrease();
  // });

  // document.getElementById('font-increase').addEventListener('click', () => {
  //   fontManager.increase();
  // });

  // JSON操作按钮
  document.getElementById('format-btn').addEventListener('click', formatJSON);
  document.getElementById('minify-btn').addEventListener('click', minifyJSON);
  document.getElementById('fix-btn').addEventListener('click', fixJSON);
  document.getElementById('copy-btn').addEventListener('click', copyJSON);
  document.getElementById('share-btn').addEventListener('click', showShareModal);
  document.getElementById('to-api-btn').addEventListener('click', showApiModal);

  // 输入框事件（使用防抖优化）
  document.getElementById('json-input').addEventListener('input', 
    performanceOptimizer.debounce(() => {
      updateCharCount();
      LineNumberManager.updateLineNumbersStatic();
    }, 300)
  );

  // 模态框关闭按钮
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });

  // API模态框按钮
  document.getElementById('start-api-btn').addEventListener('click', startApiServer);
  document.getElementById('stop-api-btn').addEventListener('click', stopApiServer);
  document.getElementById('copy-api-url').addEventListener('click', copyApiUrl);
  document.getElementById('open-api-docs').addEventListener('click', openApiDocs);

  // 分享模态框按钮
  document.getElementById('copy-share-link').addEventListener('click', copyShareLink);

  // 点击模态框外部关闭
  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

// 更新字符计数（优化性能）
function updateCharCount() {
  const input = document.getElementById('json-input');
  const count = input.value.length;
  document.getElementById('char-count').textContent = `${count} 字符`;
}

// 格式化JSON（使用Web Worker处理大型JSON）
function formatJSON() {
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim() || '{}';
  
  // 检查是否为大型JSON
  if (performanceOptimizer.isLargeJson(jsonString)) {
    // 显示加载状态
    updateStatus('正在处理大型JSON...', '');
    
    // 使用Web Worker处理
    performanceOptimizer.processWithWebWorker(jsonString, (data) => {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch (error) {
        throw new Error(`格式化错误: ${error.message}`);
      }
    })
    .then(result => {
      input.value = result;
      jsonData = JSON.parse(result);
      updateStatus('JSON格式化成功', 'success');
      updateCharCount();
      
      // 确保行号更新
      setTimeout(() => {
        LineNumberManager.updateLineNumbersStatic();
      }, 10);
    })
    .catch(error => {
      updateStatus(error.message, 'error');
    });
  } else {
    // 直接处理小型JSON
    try {
      const result = JsonUtils.format(jsonString);
      if (result.success) {
        input.value = result.result;
        jsonData = result.data;
        updateStatus('JSON格式化成功', 'success');
        
        // 确保行号更新
        setTimeout(() => {
          LineNumberManager.updateLineNumbersStatic();
        }, 10);
      } else {
        updateStatus(`格式化错误: ${result.error}`, 'error');
      }
      updateCharCount();
    } catch (error) {
      updateStatus(`格式化错误: ${error.message}`, 'error');
    }
  }
}

// 压缩JSON
function minifyJSON() {
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim() || '{}';
  
  try {
    const result = JsonUtils.minify(jsonString);
    if (result.success) {
      input.value = result.result;
      jsonData = result.data;
      updateStatus('JSON压缩成功', 'success');
      
      // 确保行号更新
      setTimeout(() => {
        LineNumberManager.updateLineNumbersStatic();
      }, 10);
    } else {
      updateStatus(`压缩错误: ${result.error}`, 'error');
    }
    updateCharCount();
  } catch (error) {
    updateStatus(`压缩错误: ${error.message}`, 'error');
  }
}

// 修复JSON
function fixJSON() {
  const input = document.getElementById('json-input');
  const value = input.value.trim();
  
  if (!value) {
    updateStatus('没有JSON数据需要修复', 'error');
    return;
  }
  
  try {
    // 使用错误处理器修复JSON
    const result = errorHandler.tryToFix(value);
    
    if (result.success) {
      input.value = result.result;
      if (result.fixed) {
        updateStatus('JSON修复并格式化成功', 'success');
        jsonData = result.data;
        
        // 确保行号更新
        setTimeout(() => {
          LineNumberManager.updateLineNumbersStatic();
        }, 10);
      } else {
        updateStatus('JSON已经是有效格式，无需修复', 'success');
      }
    } else {
      // 显示错误分析结果
      const errorInfo = result.error;
      updateStatus(`修复失败: ${errorInfo.message}，${errorInfo.suggestion}`, 'error');
    }
    
    updateCharCount();
  } catch (error) {
    updateStatus(`修复失败: ${error.message}`, 'error');
  }
}

// 复制JSON（使用现代API）
function copyJSON() {
  const input = document.getElementById('json-input');
  
  // 使用现代Clipboard API（如果可用）
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value)
      .then(() => {
        updateStatus('JSON已复制到剪贴板', 'success');
      })
      .catch(error => {
        console.error('复制失败:', error);
        // 回退到传统方法
        fallbackCopy(input);
      });
  } else {
    // 回退到传统方法
    fallbackCopy(input);
  }
}

// 传统复制方法
function fallbackCopy(element) {
  element.select();
  const success = document.execCommand('copy');
  if (success) {
    updateStatus('JSON已复制到剪贴板', 'success');
  } else {
    updateStatus('复制失败，请手动复制', 'error');
  }
}

// 显示分享模态框
function showShareModal() {
  const input = document.getElementById('json-input');
  try {
    const jsonString = input.value.trim() || '{}';
    
    // 验证JSON是否有效
    if (!JsonUtils.isValid(jsonString)) {
      updateStatus('无效的JSON数据，无法分享', 'error');
      return;
    }
    
    const data = JSON.parse(jsonString);
    
    // 使用分享管理器生成链接
    const shareLink = shareManager.generateShareLink(data);
    document.getElementById('share-link').value = shareLink;
    document.getElementById('share-modal').style.display = 'block';
  } catch (error) {
    updateStatus(`分享错误: ${error.message}`, 'error');
  }
}

// 复制分享链接
function copyShareLink() {
  const shareLink = document.getElementById('share-link').value;
  
  // 使用分享管理器复制链接
  const success = shareManager.copyShareLink(shareLink);
  
  if (success) {
    updateStatus('分享链接已复制', 'success');
  } else {
    updateStatus('复制失败，请手动复制', 'error');
  }
}

// 显示API模态框
function showApiModal() {
  document.getElementById('api-modal').style.display = 'block';
  checkApiServerStatus();
}

// 检查API服务器状态
function checkApiServerStatus() {
  chrome.runtime.sendMessage({
    action: 'checkApiStatus'
  }, (response) => {
    if (response) {
      apiRunning = response.running;
      updateApiStatus();
    }
  });
}

// 启动API服务器
function startApiServer() {
  const input = document.getElementById('json-input');
  debugger;
  try {
    const jsonString = input.value.trim() || '{}';
    
    // 验证JSON是否有效
    if (!JsonUtils.isValid(jsonString)) {
      updateStatus('无效的JSON数据，无法启动API', 'error');
      return;
    }
    
    const data = JSON.parse(jsonString);
    jsonData = data;
    
    // 显示加载状态
    updateStatus('正在启动API服务器...', '');
    
    // 发送消息给后台脚本启动API服务器
    chrome.runtime.sendMessage({
      action: 'startApiServer',
      data: jsonData
    }, (response) => {
      if (response && response.success) {
        apiRunning = true;
        updateApiStatus();
        updateStatus('API服务器已启动', 'success');
      } else {
        updateStatus(`API服务器启动失败: ${response.error || '未知错误'}`, 'error');
      }
    });
  } catch (error) {
    updateStatus(`API错误: ${error.message}`, 'error');
  }
}

// 停止API服务器
function stopApiServer() {
  // 显示加载状态
  updateStatus('正在停止API服务器...', '');
  
  chrome.runtime.sendMessage({
    action: 'stopApiServer'
  }, (response) => {
    if (response && response.success) {
      apiRunning = false;
      updateApiStatus();
      updateStatus('API服务器已停止', 'success');
    } else {
      updateStatus(`API服务器停止失败: ${response.error || '未知错误'}`, 'error');
    }
  });
}

// 更新API状态
function updateApiStatus() {
  const statusElement = document.getElementById('api-status');
  const startButton = document.getElementById('start-api-btn');
  const stopButton = document.getElementById('stop-api-btn');
  
  if (apiRunning) {
    statusElement.textContent = '运行中';
    statusElement.className = 'success';
    startButton.disabled = true;
    stopButton.disabled = false;
  } else {
    statusElement.textContent = '未启动';
    statusElement.className = '';
    startButton.disabled = false;
    stopButton.disabled = true;
  }
}


// 显示API模态框
function showApiModal() {
  document.getElementById('api-modal').style.display = 'block';
  updateApiStatus();
}

// 启动API服务器
function startApiServer() {
  const input = document.getElementById('json-input');
  try {
    const data = JSON.parse(input.value.trim() || '{}');
    jsonData = data;
    
    // 发送消息给后台脚本启动API服务器
    chrome.runtime.sendMessage({
      action: 'startApiServer',
      data: jsonData
    }, (response) => {
      if (response && response.success) {
        apiRunning = true;
        updateApiStatus();
        updateStatus('API服务器已启动', 'success');
      } else {
        updateStatus(`API服务器启动失败: ${response.error || '未知错误'}`, 'error');
      }
    });
  } catch (error) {
    updateStatus(`API错误: ${error.message}`, 'error');
  }
}

// 停止API服务器
function stopApiServer() {
  chrome.runtime.sendMessage({
    action: 'stopApiServer'
  }, (response) => {
    if (response && response.success) {
      apiRunning = false;
      updateApiStatus();
      updateStatus('API服务器已停止', 'success');
    } else {
      updateStatus(`API服务器停止失败: ${response.error || '未知错误'}`, 'error');
    }
  });
}

// 更新API状态
function updateApiStatus() {
  const statusElement = document.getElementById('api-status');
  const startButton = document.getElementById('start-api-btn');
  const stopButton = document.getElementById('stop-api-btn');
  
  if (apiRunning) {
    statusElement.textContent = '运行中';
    statusElement.className = 'success';
    startButton.disabled = true;
    stopButton.disabled = false;
  } else {
    statusElement.textContent = '未启动';
    statusElement.className = '';
    startButton.disabled = false;
    stopButton.disabled = true;
  }
}

// 复制API URL
function copyApiUrl() {
  const apiUrl = document.getElementById('api-url');
  
  // 使用现代Clipboard API（如果可用）
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(apiUrl.textContent)
      .then(() => {
        updateStatus('API地址已复制', 'success');
      })
      .catch(error => {
        console.error('复制失败:', error);
        // 回退到传统方法
        const range = document.createRange();
        range.selectNode(apiUrl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        updateStatus('API地址已复制', 'success');
      });
  } else {
    // 回退到传统方法
    const range = document.createRange();
    range.selectNode(apiUrl);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    updateStatus('API地址已复制', 'success');
  }
}

// 打开API文档
function openApiDocs() {
  chrome.tabs.create({ url: 'http://localhost:8000/docs' });
}

// 更新状态消息（使用防抖）
const updateStatus = performanceOptimizer.debounce((message, type = '') => {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = type;
  
  // 3秒后清除状态
  setTimeout(() => {
    statusElement.textContent = '准备就绪';
    statusElement.className = '';
  }, 3000);
}, 100);
