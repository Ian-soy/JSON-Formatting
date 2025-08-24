// 全局变量
let currentActiveHistoryItem = null;
let historyManager = null;
let isEmptyStateDisplayed = false; // 标记是否显示空状态

// 工具栏按钮状态管理
const TOOLBAR_BUTTONS = [
  { id: 'format-btn', title: '格式化JSON' },
  { id: 'minify-btn', title: '压缩JSON' },
  { id: 'copy-btn', title: '复制到剪贴板' },
  { id: 'download-btn', title: '下载JSON文件' },
  { id: 'save-btn', title: '保存JSON数据' },
  { id: 'convert-btn', title: '格式转换' },
  { id: 'share-btn', title: '分享JSON' }
];

// DOM元素
document.addEventListener('DOMContentLoaded', () => {
  // 初始化各个模块
  initializeModules();
  setupEventListeners();
  updateCharCount();
  
  // 初始化工具栏按钮状态和空状态覆盖层
  setTimeout(() => {
    // 使用setTimeout确保所有数据都已完全加载
    updateToolbarButtonsState();
    updateEmptyStateOverlay();
  }, 100);
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
  } catch (error) {
    console.error('初始化模块错误:', error);
    updateStatus('初始化失败，请重新加载', 'error');
  }
}

/**
 * 检查是否有有效的JSON数据
 * @returns {Object} { hasData: boolean, isEmpty: boolean, isValid: boolean, message: string }
 */
function checkJsonDataStatus() {
  const input = document.getElementById('json-input');
  const value = input.value.trim();
  
  // 检查是否为空
  if (!value) {
    return {
      hasData: false,
      isEmpty: true,
      isValid: false,
      message: '请先输入或粘贴JSON数据'
    };
  }
  
  // 检查JSON是否有效
  const isValid = JsonUtils.isValid(value);
  
  if (!isValid) {
    return {
      hasData: true,
      isEmpty: false,
      isValid: false,
      message: 'JSON数据格式无效，请检查后再试'
    };
  }
  
  return {
    hasData: true,
    isEmpty: false,
    isValid: true,
    message: '数据就绪'
  };
}

/**
 * 更新工具栏按钮状态
 */
function updateToolbarButtonsState() {
  const status = checkJsonDataStatus();
  const shouldEnable = status.hasData && status.isValid;
  
  TOOLBAR_BUTTONS.forEach(buttonConfig => {
    const button = document.getElementById(buttonConfig.id);
    if (button) {
      if (shouldEnable) {
        // 启用按钮
        button.disabled = false;
        button.classList.remove('disabled');
        button.title = buttonConfig.title;
      } else {
        // 禁用按钮
        button.disabled = true;
        button.classList.add('disabled');
        button.title = `${buttonConfig.title} - ${status.message}`;
      }
    }
  });
  
  // 更新状态栏显示
  if (!status.hasData || !status.isValid) {
    // 只在没有数据或数据无效时显示提示
    const statusElement = document.getElementById('status-message');
    const currentStatus = statusElement.textContent;
    // 只有当前状态是默认状态时才更新
    if (currentStatus === '准备就绪' || currentStatus.includes('请先输入') || currentStatus.includes('格式无效')) {
      updateStatus(status.message, status.isValid ? '' : 'warning');
    }
  }
}

/**
 * 更新空状态覆盖层显示
 */
function updateEmptyStateOverlay() {
  const input = document.getElementById('json-input');
  const overlay = document.getElementById('empty-editor-overlay');
  
  if (!input || !overlay) return;
  
  const value = input.value.trim();
  
  // 如果输入框为空，显示覆盖层
  if (!value) {
    if (!isEmptyStateDisplayed) {
      overlay.classList.add('visible');
      isEmptyStateDisplayed = true;
    }
  } else {
    // 如果输入框有内容，隐藏覆盖层
    if (isEmptyStateDisplayed) {
      overlay.classList.remove('visible');
      isEmptyStateDisplayed = false;
    }
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

  // 新增功能按钮
  document.getElementById('save-btn').addEventListener('click', showSaveModal);
  document.getElementById('settings-btn').addEventListener('click', () => settingsManager.toggleSettings());

  // 输入框事件（使用防抖优化）
  const jsonInput = document.getElementById('json-input');
  jsonInput.addEventListener('input', 
    performanceOptimizer.debounce(() => {
      updateCharCount();
      LineNumberManager.updateLineNumbersStatic();
      // 更新工具栏按钮状态
      updateToolbarButtonsState();
      // 更新空状态覆盖层
      updateEmptyStateOverlay();
    }, 300)
  );
  
  // 监听粘贴事件，自动识别分享链接（移除防抖以确保能正确获取剪贴板数据）
  jsonInput.addEventListener('paste', handlePasteEvent);

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

// 处理粘贴事件，识别分享链接
function handlePasteEvent(e) {
  console.log('🎯 粘贴事件触发:', e);
  console.log('📅 事件时间:', new Date().toLocaleTimeString());
  console.log('🏷️  事件类型:', e.type, '| 是否可信任:', e.isTrusted);
  
  // 获取粘贴的文本 - 多种兼容性方式
  const clipboardData = e.clipboardData || window.clipboardData;
  
  console.log('📋 剪贴板数据检查:');
  console.log('   - e.clipboardData存在:', !!e.clipboardData);
  console.log('   - window.clipboardData存在:', !!window.clipboardData);
  console.log('   - 最终使用对象:', !!clipboardData);
  
  if (!clipboardData) {
    console.warn('❌ 无法获取剪贴板数据对象');
    // 尝试使用现代Clipboard API作为后备
    if (navigator.clipboard && navigator.clipboard.readText) {
      console.log('🔄 尝试使用Clipboard API后备方案...');
      navigator.clipboard.readText().then(text => {
        console.log('📋 Clipboard API获取到的内容:', text);
        if (text && text.trim()) {
          processClipboardText(text, e);
        }
      }).catch(error => {
        console.error('❌ Clipboard API也失败:', error);
      });
    }
    return; // 让默认粘贴行为继续
  }
  
  // 尝试获取多种格式的数据
  let pastedText = null;
  const formats = ['text', 'text/plain', 'Text'];
  
  for (const format of formats) {
    try {
      const data = clipboardData.getData(format);
      if (data) {
        pastedText = data;
        console.log(`✅ 成功获取${format}格式数据:`, data.length, '字符');
        break;
      }
    } catch (error) {
      console.log(`⚠️  获取${format}格式失败:`, error.message);
    }
  }
  
  // 显示可用的数据类型
  if (clipboardData.types) {
    console.log('📝 可用数据类型:', Array.from(clipboardData.types));
  }
  
  console.log('📊 粘贴内容分析:');
  console.log('   - 内容长度:', pastedText ? pastedText.length : 0);
  console.log('   - 内容预览:', pastedText ? (pastedText.length > 100 ? pastedText.substring(0, 100) + '...' : pastedText) : '(无内容)');
  
  // 如果没有内容，直接返回
  if (!pastedText || pastedText.trim() === '') {
    console.log('❌ 粘贴内容为空，执行默认行为');
    return;
  }
  
  // 处理获取到的文本
  processClipboardText(pastedText, e);
}

// 处理剪贴板文本的辅助函数
function processClipboardText(pastedText, originalEvent) {
  console.log('🔄 开始处理剪贴板文本...');
  
  // 检查是否为分享链接
  const isShareLink = shareManager.isShareLink(pastedText);
  console.log('🔗 分享链接检测结果:', isShareLink);
  
  if (isShareLink) {
    // 阻止默认的粘贴行为（如果事件对象存在）
    if (originalEvent && originalEvent.preventDefault) {
      originalEvent.preventDefault();
      console.log('🚫 已阻止默认粘贴行为');
    }
    
    // 显示加载状态
    updateStatus('正在解析分享链接...', '');
    
    // 尝试解析分享链接
    try {
      console.log('🔧 尝试解析分享链接:', pastedText);
      const jsonData = shareManager.getDataFromUrl(pastedText);
      console.log('📊 解析结果:', jsonData);
      
      if (jsonData) {
        // 格式化并显示JSON数据
        const formattedJson = JSON.stringify(jsonData, null, 2);
        document.getElementById('json-input').value = formattedJson;
        
        // 更新相关UI
        updateCharCount();
        LineNumberManager.updateLineNumbersStatic();
        // 更新工具栏按钮状态
        updateToolbarButtonsState();
        // 更新空状态覆盖层
        updateEmptyStateOverlay();
        
        // 显示成功提示，包含统计信息
        const stats = shareManager.getShareLinkStats(jsonData);
        let statusMessage = '✓ 已成功导入分享的JSON数据';
        if (stats && stats.isCompressed) {
          statusMessage += ` (自动解压，压缩率: ${stats.compressionRatio}%)`;
        }
        updateStatus(statusMessage, 'success');
        
        // 记录到全局变量
        window.jsonData = jsonData;
        
        // 自动隐藏历史面板（如果展开），方便查看导入的数据
        const historySection = document.getElementById('history-section');
        if (historySection && !historySection.classList.contains('collapsed')) {
          const toggleBtn = document.getElementById('history-toggle-btn');
          if (toggleBtn) {
            setTimeout(() => toggleBtn.click(), 500);
          }
        }
      } else {
        updateStatus('⚠️ 无法解析分享链接，链接可能已损坏或过期', 'error');
      }
    } catch (error) {
      console.error('❌ 解析分享链接错误:', error);
      let errorMessage = '解析分享链接失败';
      if (error.message.includes('Invalid URL')) {
        errorMessage += ': 链接格式不正确';
      } else if (error.message.includes('JSON')) {
        errorMessage += ': JSON数据格式错误';
      } else {
        errorMessage += `: ${error.message}`;
      }
      updateStatus(errorMessage, 'error');
    }
  } else {
    console.log('ℹ️  不是分享链接，执行默认粘贴行为');
    // 不阻止默认行为，让正常粘贴继续
  }
}

// 模态框内部消息管理函数
function showModalMessage(modalId, message, type = 'info', duration = 3000) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const messageElement = modal.querySelector('.modal-message');
  if (!messageElement) return;
  
  // 清除之前的样式类
  messageElement.classList.remove('success', 'error', 'warning', 'info', 'fade-out');
  
  // 设置消息内容和类型
  messageElement.textContent = message;
  messageElement.classList.add(type);
  messageElement.style.display = 'block';
  
  // 如果有持续时间，自动隐藏
  if (duration > 0) {
    setTimeout(() => {
      hideModalMessage(modalId);
    }, duration);
  }
}

function hideModalMessage(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const messageElement = modal.querySelector('.modal-message');
  if (!messageElement) return;
  
  // 添加淡出动画
  messageElement.classList.add('fade-out');
  
  // 动画结束后隐藏元素
  setTimeout(() => {
    messageElement.style.display = 'none';
    messageElement.classList.remove('fade-out');
  }, 300);
}

// 更新字符计数（优化性能）
function updateCharCount() {
  const input = document.getElementById('json-input');
  const count = input.value.length;
  document.getElementById('char-count').textContent = `${count} 字符`;
}

// 格式化JSON（使用Web Worker处理大型JSON）
function formatJSON() {
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim();
  
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
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim();
  
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
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData) {
    updateStatus(dataStatus.message, 'warning');
    return;
  }
  
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
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
  const input = document.getElementById('json-input');
  try {
    const jsonString = input.value.trim();
    
    // 验证JSON是否有效
    if (!JsonUtils.isValid(jsonString)) {
      updateStatus('无效的JSON数据，无法分享', 'error');
      return;
    }
    
    const data = JSON.parse(jsonString);
    
    // 使用增强的分享管理器生成链接
    const shareResult = shareManager.generateShareLink(data);
    
    if (!shareResult.success) {
      // 处理分享失败的情况
      handleShareFailure(shareResult, data, jsonString);
      return;
    }
    
    // 成功生成分享链接
    document.getElementById('share-link').value = shareResult.shareLink;
    
    // 显示统计信息
    if (shareResult.stats) {
      displayShareStats(shareResult.stats);
    }
    
    // 隐藏下载建议区域
    const downloadSuggestion = document.getElementById('download-suggestion');
    if (downloadSuggestion) {
      downloadSuggestion.style.display = 'none';
    }
    
    document.getElementById('share-modal').style.display = 'block';
  } catch (error) {
    updateStatus(`分享错误: ${error.message}`, 'error');
  }
}

// 处理分享失败的情况
function handleShareFailure(shareResult, data, jsonString) {
  const modal = document.getElementById('share-modal');
  const shareOptions = modal.querySelector('.share-options');
  const downloadSuggestion = document.getElementById('download-suggestion') || createDownloadSuggestion();
  
  // 隐藏分享链接输入框
  shareOptions.style.display = 'none';
  
  // 显示下载建议
  downloadSuggestion.style.display = 'block';
  
  // 更新提示信息
  const messageEl = downloadSuggestion.querySelector('.download-message');
  const statsEl = downloadSuggestion.querySelector('.download-stats');
  
  messageEl.innerHTML = `
    <div class="error-icon">⚠️</div>
    <div class="error-text">
      <h4>数据量过大，无法生成分享链接</h4>
      <p>${shareResult.message}</p>
    </div>
  `;
  
  // 显示详细统计
  const sizeInfo = shareResult.originalSize ? 
    `数据大小: ${(shareResult.originalSize / 1024).toFixed(1)}KB` : '';
  const limitInfo = shareResult.maxSize ? 
    `最大限制: ${(shareResult.maxSize / 1024).toFixed(1)}KB` : 
    (shareResult.maxUrlLength ? `URL限制: ${shareResult.maxUrlLength}字符` : '');
  
  statsEl.innerHTML = `
    <div class="size-comparison">
      <div class="stat-row">${sizeInfo}</div>
      <div class="stat-row">${limitInfo}</div>
      <div class="stat-row recommendation">建议方案: 使用文件下载方式分享</div>
    </div>
  `;
  
  // 设置下载按钮事件
  const downloadBtn = downloadSuggestion.querySelector('#download-json-file');
  downloadBtn.onclick = () => downloadJsonFile(data, jsonString);
  
  // 设置取消按钮事件
  const cancelBtn = downloadSuggestion.querySelector('#cancel-download-btn');
  cancelBtn.addEventListener('click', closeDownloadSuggestion);
  
  // 显示模态框
  modal.style.display = 'block';
  
  // 更新状态提示
  updateStatus('数据量过大，建议使用文件下载方式分享', 'warning');
}

// 显示分享统计信息
function displayShareStats(stats) {
  const statsHtml = `
    <div class="share-stats">
      <div class="stat-item">
        <span class="stat-label">数据类型:</span>
        <span class="stat-value">${stats.dataCategory}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">原始大小:</span>
        <span class="stat-value">${stats.originalSize} 字符</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">编码后:</span>
        <span class="stat-value">${stats.encodedSize} 字符</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">编码方式:</span>
        <span class="stat-value success">${stats.encodingType || 'Base64'}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">链接长度:</span>
        <span class="stat-value ${stats.withinUrlLimit ? 'success' : 'error'}">
          ${stats.finalUrlLength} 字符 ${stats.withinUrlLimit ? '✓' : '⚠️'}
        </span>
      </div>
      ${stats.isCompressed ? `
        <div class="stat-item">
          <span class="stat-label">压缩类型:</span>
          <span class="stat-value success">${stats.compressionType}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">压缩率:</span>
          <span class="stat-value success">${stats.compressionRatio}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">压缩效率:</span>
          <span class="stat-value ${stats.efficiency === '极高' || stats.efficiency === '高效' ? 'success' : ''}">${stats.efficiency}</span>
        </div>
      ` : ''}
    </div>
  `;
  
  const statsContainer = document.getElementById('share-stats-container');
  if (statsContainer) {
    statsContainer.innerHTML = statsHtml;
  }
}

// 创建下载建议区域
function createDownloadSuggestion() {
  const modal = document.getElementById('share-modal');
  const modalContent = modal.querySelector('.modal-content');
  
  const downloadSuggestion = document.createElement('div');
  downloadSuggestion.id = 'download-suggestion';
  downloadSuggestion.className = 'download-suggestion';
  downloadSuggestion.innerHTML = `
    <div class="download-message"></div>
    <div class="download-stats"></div>
    <div class="download-actions">
      <button id="download-json-file" class="btn primary">
        <span class="download-icon">💾</span>
        下载 JSON 文件
      </button>
      <button class="btn secondary" id="cancel-download-btn">
        取消
      </button>
    </div>
    <div class="download-help">
      <h4>为什么需要下载文件？</h4>
      <ul>
        <li>您的JSON数据量超过了分享链接的最大支持限制</li>
        <li>文件下载方式更适合大数据量的传输和存储</li>
        <li>接收方可以直接在编辑器中打开文件</li>
        <li>文件方式更安全，不会暴露在URL中</li>
      </ul>
    </div>
  `;
  
  // 插入到分享选项之后
  const shareOptions = modalContent.querySelector('.share-options');
  shareOptions.insertAdjacentElement('afterend', downloadSuggestion);
  
  return downloadSuggestion;
}

// 关闭下载建议
function closeDownloadSuggestion() {
  const downloadSuggestion = document.getElementById('download-suggestion');
  const shareOptions = document.querySelector('.share-options');
  
  if (downloadSuggestion) {
    downloadSuggestion.style.display = 'none';
  }
  if (shareOptions) {
    shareOptions.style.display = 'flex';
  }
  
  // 关闭模态框
  document.getElementById('share-modal').style.display = 'none';
}

// 下载JSON文件
function downloadJsonFile(data, jsonString) {
  try {
    // 生成文件名
    const fileName = shareManager.generateDownloadFileName(data);
    
    // 创建下载链接
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // 创建临时下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    
    // 添加到文档并点击
    document.body.appendChild(link);
    link.click();
    
    // 清理临时元素和URL
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    // 在模态框内显示成功提示
    showModalMessage('share-modal', `✅ JSON文件已下载: ${fileName}`, 'success', 3000);
    
    // 延迟关闭模态框，让用户看到成功提示
    setTimeout(() => {
      document.getElementById('share-modal').style.display = 'none';
    }, 3500);
    
  } catch (error) {
    console.error('下载文件错误:', error);
    // 在模态框内显示错误提示
    showModalMessage('share-modal', `❌ 下载失败: ${error.message}`, 'error', 3000);
  }
}

// 复制分享链接
async function copyShareLink() {
  const shareLink = document.getElementById('share-link').value;
  
  try {
    // 使用分享管理器复制链接
    const success = await shareManager.copyShareLink(shareLink);
    
    if (success) {
      // 在模态框内显示成功提示
      showModalMessage('share-modal', '✅ 分享链接已复制到剪贴板', 'success', 2000);
    } else {
      // 在模态框内显示失败提示
      showModalMessage('share-modal', '❌ 复制失败，请手动选择链接复制', 'error', 3000);
    }
  } catch (error) {
    console.error('复制分享链接错误:', error);
    // 在模态框内显示错误提示
    showModalMessage('share-modal', '❌ 复制失败，请手动选择链接复制', 'error', 3000);
  }
}
// 下载JSON文件

// 下载JSON文件
function downloadJSON() {
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
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
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
  document.getElementById('convert-modal').style.display = 'block';
}

// 转换为XML
function convertToXml() {
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
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
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
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
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim();
  
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
