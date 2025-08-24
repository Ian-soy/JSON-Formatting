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
  
  // 延迟重置按钮文本，确保所有脚本加载后文本正确
  setTimeout(() => {
    initializeApiDebugButtons();
    console.log('🔄 延迟重置完成，确保按钮文本正确显示');
  }, 1000);
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
    
    // 确保API调试按钮文本正确显示
    initializeApiDebugButtons();
    
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

// 初始化API调试按钮，确保文本正确显示
function initializeApiDebugButtons() {
  console.log('🔧 初始化API调试按钮...');
  
  // 确保按钮存在并设置正确的文本
  const testBtn = document.getElementById('test-api-connection');
  if (testBtn) {
    testBtn.textContent = '🔍 连接测试';
    testBtn.title = '测试Service Worker API连接';
    console.log('✅ 连接测试按钮文本已重置');
  }
  
  const switchBtn = document.getElementById('switch-api-provider');
  if (switchBtn) {
    switchBtn.textContent = '🔄 切换备用';
    switchBtn.title = '切换到备用API提供者';
    console.log('✅ 切换备用按钮文本已重置');
  }
  
  const infoBtn = document.getElementById('show-api-info');
  if (infoBtn) {
    infoBtn.textContent = '📊 提供者信息';
    infoBtn.title = '显示当前API提供者详细信息';
    console.log('✅ 提供者信息按钮文本已重置');
  }
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
  const jsonInput = document.getElementById('json-input');
  jsonInput.addEventListener('input', 
    performanceOptimizer.debounce(() => {
      updateCharCount();
      LineNumberManager.updateLineNumbersStatic();
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

// 显示API模态框
function showApiModal() {
  document.getElementById('api-modal').style.display = 'block';
  // 立即检查服务器状态
  checkApiServerStatus();
  // 开始健康检查
  if (apiHandler) {
    apiHandler.startHealthCheck(10000); // 每10秒检查一次
  }
}

// 检查API服务器状态（优化版）
function checkApiServerStatus() {
  chrome.runtime.sendMessage({
    action: 'checkApiStatus'
  }, (response) => {
    if (response) {
      apiRunning = response.running;
      updateApiStatus();
      
      // 如果服务器运行中，尝试获取更详细信息
      if (apiRunning && apiHandler) {
        apiHandler.getServerInfo()
          .then(info => {
            console.log('API服务器信息:', info);
          })
          .catch(error => {
            console.log('获取服务器信息失败:', error.message);
          });
      }
    }
  });
}

// 启动API服务器（智能引导版）
function startApiServer() {
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
    showModalMessage('api-modal', '🚀 正在初始化API服务器...', 'info', 0);
    updateStatus('正在启动API服务器...', '');
    
    // 禁用启动按钮，防止重复点击
    const startButton = document.getElementById('start-api-btn');
    startButton.disabled = true;
    
    console.group('🚀 API服务器启动流程');
    console.log('📊 JSON数据验证通过，大小:', JSON.stringify(data).length, '字符');
    console.log('📝 数据预览:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    
    // 显示进度更新
    setTimeout(() => {
      showModalMessage('api-modal', '💾 正在生成Python服务器文件...', 'info', 0);
    }, 500);
    
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
        
        // 显示成功提示和操作指导
        const successMessage = `✅ Python文件已生成！\n\n📢 接下来需要手动启动：\n1. 打开终端/命令提示符\n2. 进入Downloads目录\n3. 执行: python json_api_server.py\n\n📖 详细步骤请查看控制台`;
        showModalMessage('api-modal', successMessage, 'success', 10000);
        updateStatus('Python文件已准备，请手动启动', 'success');
        
        console.group('📢 手动启动指导');
        console.log('%c✅ Python文件已下载到Downloads目录', 'color: green; font-weight: bold');
        console.log('%c📝 请按以下步骤手动启动：', 'color: blue; font-weight: bold');
        console.log('1️⃣ 打开终端（Windows: Win+R 输入cmd，Mac: 按Cmd+Space 输入Terminal）');
        console.log('2️⃣ 进入下载目录：');
        console.log('   Windows: cd %USERPROFILE%\\Downloads');
        console.log('   Mac/Linux: cd ~/Downloads');
        console.log('3️⃣ 启动服务：');
        console.log('   python json_api_server.py');
        console.log('   或 python3 json_api_server.py');
        console.log('4️⃣ 看到启动信息后，回到扩展界面点击“打开API文档”');
        console.log('%c🔗 服务启动后可访问: http://localhost:8000/docs', 'color: purple; font-weight: bold');
        console.groupEnd();
        
        // 开始健康检查
        if (apiHandler) {
          apiHandler.startHealthCheck(5000); // 每5秒检查一次
        }
        
        // 启动后立即开始检查服务器状态
        const checkServerInterval = setInterval(() => {
          if (apiHandler) {
            apiHandler.checkServerStatus()
              .then(isRunning => {
                if (isRunning) {
                  clearInterval(checkServerInterval);
                  apiRunning = true;
                  updateApiStatus();
                  showModalMessage('api-modal', '🎉 API服务器连接成功！可以开始调试了', 'success', 5000);
                  updateStatus('API服务器已连接', 'success');
                  
                  // 获取服务器信息
                  apiHandler.getServerInfo()
                    .then(info => {
                      console.log('📋 API服务器信息:', info);
                    })
                    .catch(error => {
                      console.log('⚠️ 获取服务器信息失败:', error.message);
                    });
                }
              })
              .catch(error => {
                console.log('🔍 等待服务器启动...');
              });
          }
        }, 3000); // 每3秒检查一次
        
        // 30秒后停止自动检查
        setTimeout(() => {
          clearInterval(checkServerInterval);
        }, 30000);
        
      } else {
        const errorMsg = response?.error || '未知错误';
        console.error('❌ API服务器启动失败:', errorMsg);
        
        // 根据错误类型提供具体的解决建议
        let detailedMessage = `❌ 启动失败: ${errorMsg}`;
        let suggestions = [];
        
        if (errorMsg.includes('downloads') || errorMsg.includes('权限')) {
          suggestions.push('请重新加载扩展（chrome://extensions/）');
          suggestions.push('确保扩展处于启用状态');
        } else if (errorMsg.includes('下载')) {
          suggestions.push('检查浏览器下载设置');
          suggestions.push('确保Downloads文件夹可写');
        } else if (errorMsg.includes('超时')) {
          suggestions.push('检查网络连接');
          suggestions.push('关闭杀毒软件后重试');
        }
        
        if (suggestions.length > 0) {
          detailedMessage += `\n\n💡 建议解决方案:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        }
        
        detailedMessage += '\n\n📖 完整指南请查看 API_STARTUP_HELPER.md';
        
        // 在控制台输出详细的调试信息
        console.group('🔧 API启动失败调试信息');
        console.error('❌ 错误详情:', errorMsg);
        console.log('💡 建议操作:');
        console.log('1. 重新加载扩展: chrome://extensions/ -> 找到JSON格式化大师 -> 点击重新加载');
        console.log('2. 检查Python环境: python --version');
        console.log('3. 安装依赖: pip install fastapi uvicorn');
        console.log('4. 检查端口占用: netstat -ano | findstr :8000');
        console.log('5. 查看完整指南: 项目目录下的 API_STARTUP_HELPER.md');
        console.groupEnd();
        
        showModalMessage('api-modal', detailedMessage, 'error', 12000);
        updateStatus(`启动失败: ${errorMsg}`, 'error');
      }
    });
    
  } catch (error) {
    console.error('🚨 启动过程异常:', error);
    showModalMessage('api-modal', `❌ 初始化失败: ${error.message}`, 'error', 5000);
    updateStatus(`初始化错误: ${error.message}`, 'error');
  }
}

// 停止API服务器（增强版）
function stopApiServer() {
  // 显示停止中状态
  showModalMessage('api-modal', '🛑 正在停止API服务器...', 'info', 0);
  updateStatus('正在停止API服务器...', '');
  
  // 禁用停止按钮
  const stopButton = document.getElementById('stop-api-btn');
  stopButton.disabled = true;
  
  // 停止健康检查
  if (apiHandler) {
    apiHandler.stopHealthCheck();
  }
  
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
    } else {
      const errorMsg = response?.error || '未知错误';
      showModalMessage('api-modal', `❌ 停止失败: ${errorMsg}`, 'error', 3000);
      updateStatus(`API服务器停止失败: ${errorMsg}`, 'error');
    }
  });
}

// 更新API状态（增强版）
function updateApiStatus() {
  const statusElement = document.getElementById('api-status');
  const startButton = document.getElementById('start-api-btn');
  const stopButton = document.getElementById('stop-api-btn');
  
  if (apiRunning) {
    statusElement.textContent = '运行中';
    statusElement.className = 'success';
    startButton.disabled = true;
    stopButton.disabled = false;
    
    // 更新API地址显示
    const apiUrl = document.getElementById('api-url');
    if (apiUrl) {
      apiUrl.textContent = 'http://localhost:8000/json-data';
    }
  } else {
    statusElement.textContent = '未启动';
    statusElement.className = '';
    startButton.disabled = false;
    stopButton.disabled = true;
  }
}

// 复制API地址（新增）
async function copyApiUrl() {
  const apiUrl = 'http://localhost:8000/json-data';
  
  try {
    // 使用现代Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(apiUrl);
      showModalMessage('api-modal', '✅ API地址已复制到剪贴板', 'success', 2000);
    } else {
      // 回退到传统方法
      const textArea = document.createElement('textarea');
      textArea.value = apiUrl;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        showModalMessage('api-modal', '✅ API地址已复制到剪贴板', 'success', 2000);
      } else {
        throw new Error('复制操作失败');
      }
    }
  } catch (error) {
    console.error('复制API地址错误:', error);
    showModalMessage('api-modal', '❌ 复制失败，请手动选择地址复制', 'error', 3000);
  }
}

// 打开API文档（新增）
function openApiDocs() {
  try {
    // 显示浏览器原生API文档
    const docContent = `
【浏览器原生API文档】

🚀 当前服务: ${apiRunning ? '已启动' : '未启动'}

📋 可用端点:
• GET  /health      - 健康检查
• GET  /info        - 服务器信息 
• GET  /stats       - 统计信息
• GET  /json-data   - 获取JSON数据
• POST /json-data   - 更新JSON数据
• POST /validate    - 验证JSON
• POST /format      - 格式化JSON
• POST /minify      - 压缩JSON
• POST /reset       - 重置数据
• POST /shutdown    - 关闭服务

🔧 调试工具:
• testServiceWorkerApi() - 连接测试
• switchToMemoryApi() - 切换备用提供者
• showApiProviderInfo() - 提供者信息
• optimizeServiceWorkerPerformance() - 性能优化

💡 使用方式:
1. 在控制台输入函数名即可调用
2. 使用统一API管理器: unifiedApiManager.get('/health')
3. 支持多提供者自动切换`;
    
    // 在新窗口中显示文档
    const docWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes');
    if (docWindow) {
      docWindow.document.write(`
        <html>
          <head>
            <title>浏览器原生API文档</title>
            <style>
              body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #e0e0e0; }
              pre { white-space: pre-wrap; line-height: 1.5; }
            </style>
          </head>
          <body>
            <pre>${docContent}</pre>
          </body>
        </html>
      `);
      docWindow.document.close();
      showModalMessage('api-modal', '✅ 浏览器原生API文档已打开', 'success', 2000);
    } else {
      // 如果弹窗被阻止，将文档内容复制到剪贴板
      navigator.clipboard.writeText(docContent).then(() => {
        showModalMessage('api-modal', '📋 API文档已复制到剪贴板', 'success', 3000);
      }).catch(() => {
        console.log(docContent);
        showModalMessage('api-modal', '📖 API文档已输出到控制台', 'info', 3000);
      });
    }
  } catch (error) {
    console.error('显示API文档错误:', error);
    showModalMessage('api-modal', '❌ 无法显示文档，请查看控制台或使用调试工具', 'error', 3000);
  }
}
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
  // 生成浏览器原生API使用说明
  const apiUsageInfo = `
浏览器原生API使用说明:

1. 直接在控制台使用:
   - unifiedApiManager.get('/health')        // 健康检查
   - unifiedApiManager.get('/json-data')     // 获取数据
   - unifiedApiManager.post('/json-data', {data: yourData}) // 更新数据

2. 快速调试工具:
   - testServiceWorkerApi()                  // 连接测试
   - optimizeServiceWorkerPerformance()      // 性能优化
   - showApiProviderInfo()                   // 提供者信息

3. 提供者切换:
   - unifiedApiManager.switchProvider('memory')     // 内存提供者
   - unifiedApiManager.switchProvider('indexeddb')  // 持久化提供者
   - unifiedApiManager.switchProvider('browser-native') // Service Worker

📝 无需安装任何环境，完全基于浏览器原生能力！
`;
  
  // 使用现代Clipboard API（如果可用）
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(apiUsageInfo)
      .then(() => {
        // 在API模态框内显示成功提示
        showModalMessage('api-modal', '✅ 浏览器原生API使用说明已复制到剪贴板', 'success', 3000);
      })
      .catch(error => {
        console.error('复制失败:', error);
        // 输出到控制台作为备用
        console.log(apiUsageInfo);
        showModalMessage('api-modal', '📋 使用说明已输出到控制台，请查看Console', 'info', 3000);
      });
  } else {
    // 输出到控制台作为备用
    console.log(apiUsageInfo);
    showModalMessage('api-modal', '📋 使用说明已输出到控制台，请查看Console', 'info', 3000);
  }
}

// API性能测试和诊断功能
function testApiPerformance() {
  if (!apiRunning) {
    showModalMessage('api-modal', '⚠️ API服务器未启动', 'warning', 3000);
    return;
  }
  
  showModalMessage('api-modal', '🔍 正在测试API性能...', 'info', 0);
  
  if (apiHandler) {
    // 执行连接测试
    apiHandler.testConnection()
      .then(result => {
        if (result.success) {
          const latency = result.latency;
          let performanceLevel = 'success';
          let performanceText = '优秀';
          
          if (latency > 1000) {
            performanceLevel = 'error';
            performanceText = '较慢';
          } else if (latency > 500) {
            performanceLevel = 'warning';
            performanceText = '一般';
          }
          
          showModalMessage('api-modal', 
            `✅ API性能测试完成\n响应时间: ${latency}ms (${performanceText})`, 
            performanceLevel, 4000);
            
          // 获取统计信息
          return apiHandler.getStats();
        } else {
          throw new Error(result.error || '连接测试失败');
        }
      })
      .then(stats => {
        console.log('API服务器统计:', stats);
      })
      .catch(error => {
        showModalMessage('api-modal', `❌ 性能测试失败: ${error.message}`, 'error', 3000);
      });
  }
}

// 添加API调试工具函数
function debugApiConnection() {
  if (!apiHandler) {
    console.error('apiHandler 未初始化');
    return;
  }
  
  console.group('🔧 API调试信息');
  
  // 检查服务器状态
  apiHandler.checkServerStatus()
    .then(isRunning => {
      console.log('服务器运行状态:', isRunning ? '✅ 运行中' : '❌ 未运行');
      
      if (isRunning) {
        // 获取服务器信息
        return apiHandler.getServerInfo();
      }
      return null;
    })
    .then(info => {
      if (info) {
        console.log('服务器信息:', info);
        return apiHandler.getStats();
      }
      return null;
    })
    .then(stats => {
      if (stats) {
        console.log('统计信息:', stats);
      }
    })
    .catch(error => {
      console.error('调试信息获取失败:', error);
    })
    .finally(() => {
      console.groupEnd();
    });
}

// 在模态框关闭时清理资源
function onApiModalClose() {
  if (apiHandler) {
    apiHandler.stopHealthCheck();
  }
}

// 修改模态框关闭事件监听器
document.addEventListener('DOMContentLoaded', () => {
  // ... 其他初始化代码 ...
  
  // 添加模态框关闭事件
  const apiModal = document.getElementById('api-modal');
  if (apiModal) {
    apiModal.addEventListener('click', (e) => {
      if (e.target === apiModal || e.target.classList.contains('close-btn')) {
        onApiModalClose();
      }
    });
  }
});

// 将调试函数添加到全局作用域，便于在控制台中调用
if (typeof window !== 'undefined') {
  window.testApiPerformance = testApiPerformance;
  window.debugApiConnection = debugApiConnection;
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
