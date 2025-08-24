// 全局变量
let apiRunning = false;
let jsonData = {};
let currentActiveHistoryItem = null;
let historyManager = null;

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
    // 初始化主题（只使用监控主题）
    await themeManager.initialize();
    
    // 显示监控主题特殊元素
    const monitorAddBtnContainer = document.getElementById('monitor-add-btn-container');
    if (monitorAddBtnContainer) {
      monitorAddBtnContainer.style.display = 'block';
    }
    
    // 初始化字体大小
    await fontManager.initialize();
    
    // 初始化图标
    initializeIcons();
    
    // 初始化数据管理器
    await dataManager.initialize();
    
    // 初始化设置管理器
    settingsManager.initialize(dataManager);
    
    // 初始化历史数据管理器
    historyManager = new HistoryManager(dataManager);
    await historyManager.initialize();
    
    // 检查API服务器状态
    checkApiServerStatus();
  } catch (error) {
    console.error('初始化模块错误:', error);
    updateStatus('初始化失败，请重新加载', 'error');
  }
}

// 初始化图标
function initializeIcons() {
  // 设置按钮图标
  document.querySelector('#format-btn .icon-container').innerHTML = IconManager.getIcon('format');
  document.querySelector('#minify-btn .icon-container').innerHTML = IconManager.getIcon('minify');

  document.querySelector('#copy-btn .icon-container').innerHTML = IconManager.getIcon('copy');
  document.querySelector('#download-btn .icon-container').innerHTML = IconManager.getIcon('download');
  document.querySelector('#convert-btn .icon-container').innerHTML = IconManager.getIcon('convert');
  document.querySelector('#share-btn .icon-container').innerHTML = IconManager.getIcon('share');
  document.querySelector('#to-api-btn .icon-container').innerHTML = IconManager.getIcon('api');
  
  // 新增按钮图标
  const saveBtn = document.querySelector('#save-btn .icon-container');
  if (saveBtn) saveBtn.innerHTML = IconManager.getIcon('save');
  
  const settingsBtn = document.querySelector('#settings-btn .icon-container');
  if (settingsBtn) settingsBtn.innerHTML = IconManager.getIcon('settings');
  
  const refreshBtn = document.querySelector('#refresh-history-btn .icon-container');
  if (refreshBtn) refreshBtn.innerHTML = IconManager.getIcon('refresh');
}

// 设置事件监听器（使用性能优化）
function setupEventListeners() {
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
  document.getElementById('copy-btn').addEventListener('click', copyJSON);
  document.getElementById('download-btn').addEventListener('click', downloadJSON);
  document.getElementById('convert-btn').addEventListener('click', showConvertModal);
  document.getElementById('share-btn').addEventListener('click', showShareModal);
  document.getElementById('to-api-btn').addEventListener('click', showApiModal);

  // 新增功能按钮
  document.getElementById('save-btn').addEventListener('click', showSaveModal);
  document.getElementById('settings-btn').addEventListener('click', () => settingsManager.toggleSettings());

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

  // 格式转换模态框按钮
  document.getElementById('to-xml-btn').addEventListener('click', convertToXml);
  document.getElementById('to-csv-btn').addEventListener('click', convertToCsv);

  // API模态框按钮
  document.getElementById('start-api-btn').addEventListener('click', startApiServer);
  document.getElementById('stop-api-btn').addEventListener('click', stopApiServer);
  document.getElementById('copy-api-url').addEventListener('click', copyApiUrl);
  document.getElementById('open-api-docs').addEventListener('click', openApiDocs);

  // 分享模态框按钮
  document.getElementById('copy-share-link').addEventListener('click', copyShareLink);

  // 保存模态框按钮
  const confirmSaveBtn = document.getElementById('confirm-save-btn');
  if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener('click', saveCurrentData);
  }

  const cancelSaveBtn = document.getElementById('cancel-save-btn');
  if (cancelSaveBtn) {
    cancelSaveBtn.addEventListener('click', closeSaveModal);
  }

  // 保存模态框输入验证
  const saveTitleInput = document.getElementById('save-title-input');
  if (saveTitleInput) {
    saveTitleInput.addEventListener('input', validateSaveTitle);
    saveTitleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveCurrentData();
      }
    });
  }

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

// 下载JSON文件
function downloadJSON() {
  const input = document.getElementById('json-input');
  try {
    const jsonString = input.value.trim();
    
    // 验证JSON是否有效
    if (!JsonUtils.isValid(jsonString)) {
      updateStatus('无效的JSON数据，无法下载', 'error');
      return;
    }
    
    // 下载格式化后的JSON
    const formatted = JSON.stringify(JSON.parse(jsonString), null, 2);
    FormatConverter.downloadFile(formatted, 'data.json', 'application/json');
    updateStatus('JSON文件已下载', 'success');
  } catch (error) {
    updateStatus(`下载错误: ${error.message}`, 'error');
  }
}

// 显示格式转换模态框
function showConvertModal() {
  document.getElementById('convert-modal').style.display = 'block';
}

// 转换为XML
function convertToXml() {
  const input = document.getElementById('json-input');
  try {
    const jsonString = input.value.trim();
    
    // 验证JSON是否有效
    if (!JsonUtils.isValid(jsonString)) {
      updateStatus('无效的JSON数据，无法转换', 'error');
      return;
    }
    
    const jsonData = JSON.parse(jsonString);
    const xmlString = FormatConverter.jsonToXml(jsonData);
    FormatConverter.downloadFile(xmlString, 'data.xml', 'application/xml');
    
    // 关闭模态框
    document.getElementById('convert-modal').style.display = 'none';
    updateStatus('已转换为XML并下载', 'success');
  } catch (error) {
    updateStatus(`转换错误: ${error.message}`, 'error');
  }
}

// 转换为CSV
function convertToCsv() {
  const input = document.getElementById('json-input');
  try {
    const jsonString = input.value.trim();
    
    // 验证JSON是否有效
    if (!JsonUtils.isValid(jsonString)) {
      updateStatus('无效的JSON数据，无法转换', 'error');
      return;
    }
    
    const jsonData = JSON.parse(jsonString);
    const csvString = FormatConverter.jsonToCsv(jsonData);
    FormatConverter.downloadFile(csvString, 'data.csv', 'text/csv');
    
    // 关闭模态框
    document.getElementById('convert-modal').style.display = 'none';
    updateStatus('已转换为CSV并下载', 'success');
  } catch (error) {
    updateStatus(`转换错误: ${error.message}`, 'error');
  }
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

// ==== 新增功能函数 ====

// 显示保存模态框
function showSaveModal() {
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim();
  
  if (!jsonString) {
    updateStatus('没有JSON数据可保存', 'error');
    return;
  }
  
  // 验证JSON格式
  const validation = dataManager.validateJson(jsonString);
  if (!validation.valid) {
    updateStatus('无效的JSON格式，无法保存', 'error');
    return;
  }
  
  // 清空输入框和错误信息
  const saveTitleInput = document.getElementById('save-title-input');
  const saveErrorElement = document.getElementById('save-title-error');
  
  if (saveTitleInput) {
    saveTitleInput.value = '';
    saveTitleInput.classList.remove('error');
    saveTitleInput.focus();
  }
  
  if (saveErrorElement) {
    saveErrorElement.style.display = 'none';
  }
  
  // 显示模态框
  document.getElementById('save-modal').style.display = 'block';
}

// 关闭保存模态框
function closeSaveModal() {
  document.getElementById('save-modal').style.display = 'none';
}

// 验证保存标题
function validateSaveTitle() {
  const input = document.getElementById('save-title-input');
  const errorElement = document.getElementById('save-title-error');
  const title = input.value.trim();
  
  if (!title) {
    showSaveError(input, errorElement, '请输入保存标题');
    return false;
  }
  
  if (title.length > 50) {
    showSaveError(input, errorElement, '标题长度不能超过50个字符');
    return false;
  }
  
  hideSaveError(input, errorElement);
  return true;
}

// 显示保存错误
function showSaveError(input, errorElement, message) {
  input.classList.add('error');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  
  // 确保错误提示在模态框内可见
  setTimeout(() => {
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// 隐藏保存错误
function hideSaveError(input, errorElement) {
  input.classList.remove('error');
  errorElement.style.display = 'none';
}

// 保存当前数据
async function saveCurrentData() {
  const titleInput = document.getElementById('save-title-input');
  const jsonInput = document.getElementById('json-input');
  const errorElement = document.getElementById('save-title-error');
  
  if (!validateSaveTitle()) {
    return;
  }
  
  const title = titleInput.value.trim();
  const jsonData = jsonInput.value.trim();
  
  try {
    // 显示保存中状态
    updateStatus('正在保存...', '');
    
    const result = await dataManager.saveJsonData(title, jsonData);
    
    if (result.success) {
      updateStatus(`保存成功：${title}`, 'success');
      closeSaveModal();
      
      // 触发历史数据刷新
      const event = new CustomEvent('historyDataChanged');
      document.dispatchEvent(event);
    } else {
      // 使用新的错误提示样式
      showSaveError(titleInput, errorElement, result.error);
      updateStatus(result.error, 'error');
    }
  } catch (error) {
    console.error('保存数据失败:', error);
    showSaveError(titleInput, errorElement, '保存失败，请重试');
    updateStatus('保存失败，请重试', 'error');
  }
}
