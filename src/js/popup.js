// 全局变量
let currentActiveHistoryItem = null;
let historyManager = null;
let apiServerManager = null; // API服务器管理器
let isEmptyStateDisplayed = false; // 标记是否显示空状态
let hasOpenedToday = false; // 标记今天是否已经打开过插件
let autoSaveEnabled = true; // 是否启用自动保存
let lastAutoSaveTime = 0; // 上次自动保存的时间

// 工具栏按钮状态管理
const TOOLBAR_BUTTONS = [
  { id: 'format-btn', title: '格式化JSON' },
  { id: 'minify-btn', title: '压缩JSON' },
  { id: 'copy-btn', title: '复制到剪贴板' },
  { id: 'download-btn', title: '下载JSON文件' },
  { id: 'convert-btn', title: '格式转换' },
  { id: 'share-btn', title: '分享JSON' },
  { id: 'api-btn', title: '转换为API' }
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
    // 检查今天是否已经打开过插件
    await checkTodayOpenedStatus();
    
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
    
    // 初始化API服务器管理器
    try {
      // 等待一下确保api-server.js已经加载完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (window.apiServerManager) {
        apiServerManager = window.apiServerManager;
        await apiServerManager.initialize();
        console.log('API服务器管理器初始化成功');
      } else {
        // 如果全局实例不存在，尝试手动创建
        if (typeof ApiServerManager !== 'undefined') {
          apiServerManager = new ApiServerManager();
          await apiServerManager.initialize();
          console.log('手动创建API服务器管理器成功');
        } else {
          console.warn('API服务器管理器类未找到，API功能将不可用');
        }
      }
    } catch (error) {
      console.error('API服务器管理器初始化失败:', error);
    }
    
    // 等待UI完全初始化后再加载数据
    setTimeout(async () => {
      await loadFirstSavedData();
      // 启动存储监控
      startStorageMonitoring();
    }, 200);
  } catch (error) {
    console.error('初始化模块错误:', error);
    updateStatus('初始化失败，请重新加载', 'error');
  }
}

/**
 * 检查今天是否已经打开过插件
 */
async function checkTodayOpenedStatus() {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get(['last_opened_date']);
    const lastOpenedDate = result.last_opened_date;
    
    console.log('检查今天打开状态:', { today, lastOpenedDate });
    
    if (lastOpenedDate === today) {
      hasOpenedToday = true;
      console.log('今天已经打开过插件');
    } else {
      // 更新为今天
      await chrome.storage.local.set({ last_opened_date: today });
      hasOpenedToday = false;
      console.log('今天第一次打开插件');
    }
  } catch (error) {
    console.error('检查今天打开状态失败:', error);
    hasOpenedToday = false;
  }
}

/**
 * 加载第一条保存的数据
 */
async function loadFirstSavedData() {
  try {
    console.log('开始加载第一条保存数据...');
    const savedData = await dataManager.getSavedData();
    console.log('获取到的保存数据:', savedData.length, '条');
    
    if (savedData.length > 0) {
      // 按时间倒序排序，取第一条（最新的）
      const firstItem = savedData[0];
      console.log('正在加载数据:', firstItem.title);
      
      const input = document.getElementById('json-input');
      if (!input) {
        console.error('json-input 元素未找到');
        return;
      }
      
      input.value = firstItem.data;
      
      // 更新UI
      if (typeof updateCharCount === 'function') {
        updateCharCount();
      }
      if (typeof LineNumberManager !== 'undefined') {
        LineNumberManager.updateLineNumbersStatic();
      }
      if (typeof updateToolbarButtonsState === 'function') {
        updateToolbarButtonsState();
      }
      if (typeof updateEmptyStateOverlay === 'function') {
        updateEmptyStateOverlay();
      }
      
      // 设置全局jsonData变量
      try {
        window.jsonData = JSON.parse(firstItem.data);
      } catch (e) {
        console.warn('无法解析JSON数据为对象:', e);
      }
      
      // 更新状态
      if (typeof updateStatus === 'function') {
        updateStatus(`已自动加载最新保存的数据：${firstItem.title}`, 'success');
      }
      
      // 设置当前活动项
      currentActiveHistoryItem = firstItem.id;
      
      console.log('数据加载成功');
    } else {
      console.log('没有保存的数据可加载');
    }
  } catch (error) {
    console.error('加载第一条保存数据失败:', error);
    if (typeof updateStatus === 'function') {
      updateStatus('数据加载异常，请手动选择历史数据', 'warning');
    }
  }
}

/**
 * Check if there is valid JSON data
 * @returns {Object} { hasData: boolean, isEmpty: boolean, isValid: boolean, message: string }
 */
function checkJsonDataStatus() {
  const input = document.getElementById('json-input');
  const value = input.value.trim();
  
  // Check if empty
  if (!value) {
    return {
      hasData: false,
      isEmpty: true,
      isValid: false,
      message: 'Please enter or paste JSON data first'
    };
  }
  
  // First try direct parsing
  try {
    JSON.parse(value);
    return {
      hasData: true,
      isEmpty: false,
      isValid: true,
      message: 'Data ready'
    };
  } catch (parseError) {
    // If direct parsing fails, try parsing escaped strings
    try {
      const escapeResult = JsonUtils.parseEscapedJson(value);
      if (escapeResult.success) {
        // Successfully parsed escaped string
        return {
          hasData: true,
          isEmpty: false,
          isValid: true,
          message: 'Data ready (escaped string detected)'
        };
      }
    } catch (escapeError) {
      // Escaped parsing also failed, continue to check if looks like JSON
    }
    
    // If both parsing attempts failed, check if it looks like JSON
    if (JsonUtils.looksLikeJson(value)) {
      return {
        hasData: true,
        isEmpty: false,
        isValid: false,
        message: 'Invalid JSON format, use format function to view detailed error information'
      };
    } else {
      return {
        hasData: true,
        isEmpty: false,
        isValid: false,
        message: 'Input content is not valid JSON format'
      };
    }
  }
}

/**
 * 更新工具栏按钮状态
 */
function updateToolbarButtonsState() {
  const status = checkJsonDataStatus();
  const input = document.getElementById('json-input');
  const inputValue = input.value.trim();
  
  TOOLBAR_BUTTONS.forEach(buttonConfig => {
    const button = document.getElementById(buttonConfig.id);
    if (button) {
      // 对于格式化按钮，只要有输入就启用（即使格式无效，也允许格式化以查看错误）
      if (buttonConfig.id === 'format-btn') {
        if (inputValue) {
          button.disabled = false;
          button.classList.remove('disabled');
          button.title = buttonConfig.title;
        } else {
          button.disabled = true;
          button.classList.add('disabled');
          button.title = `${buttonConfig.title}`;
        }
      }
      // 其他按钮需要数据有效才启用
      else {
        if (status.hasData && status.isValid) {
          // 启用按钮
          button.disabled = false;
          button.classList.remove('disabled');
          button.title = buttonConfig.title;
        } else {
          // 禁用按钮
          button.disabled = true;
          button.classList.add('disabled');
          if (status.hasData && !status.isValid) {
            button.title = `${buttonConfig.title}`;
          } else {
            button.title = `${buttonConfig.title}`;
          }
        }
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
      if (status.hasData && !status.isValid) {
        updateStatus('JSON格式无效，可使用格式化功能查看详细错误信息', 'warning');
      } else {
        updateStatus(status.message, status.isValid ? '' : 'warning');
      }
    }
  } else {
    // 如果数据有效且之前有错误状态，清除错误状态
    if (currentErrorMessage) {
      clearErrorStatus();
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
  
  // 如果输入框为空，且今天没有打开过插件，才显示覆盖层
  if (!value && !hasOpenedToday) {
    if (!isEmptyStateDisplayed) {
      overlay.classList.add('visible');
      isEmptyStateDisplayed = true;
    }
  } else {
    // 如果输入框有内容，或者今天已经打开过，隐藏覆盖层
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
  document.querySelector('#api-btn .icon-container').innerHTML = IconManager.getIcon('api') || '🚀';
  
  // 新增按钮图标
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
  document.getElementById('api-btn').addEventListener('click', showApiModal);

  // 新增功能按钮
  document.getElementById('settings-btn').addEventListener('click', () => settingsManager.toggleSettings());
  
  // 存储信息按钮
  const storageInfoBtn = document.getElementById('storage-info-btn');
  if (storageInfoBtn) {
    storageInfoBtn.addEventListener('click', showStorageQuickInfo);
    // 设置初始标题
    storageInfoBtn.title = '💾 存储情况\n点击查看详细的存储使用情况和管理选项';
  }

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
  jsonInput.addEventListener('paste', async (e) => {
    await handlePasteEvent(e);
  });

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

  // 点击模态框外部关闭
  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // 全局键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+I 打开存储信息
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      showStorageQuickInfo();
    }
    // F5 刷新存储信息
    else if (e.key === 'F5' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      updateStorageStatusBar();
      updateStatus('存储信息已刷新', 'success');
    }
  });
}

// 处理粘贴事件，识别分享链接
async function handlePasteEvent(e) {
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
async function processClipboardText(pastedText, originalEvent) {
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
    updateStatus('正在解析分享链接...', 'info');
    
    // 尝试解析分享链接（异步处理）
    try {
      console.log('🔧 尝试解析分享链接:', pastedText);
      
      // 显示进度信息
      updateStatus('🔍 正在解析数据格式...', 'info');
      
      const jsonData = await shareManager.getDataFromUrl(pastedText); // 添加 await
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
        
        // Record to global variable
        window.jsonData = jsonData;
        
        // Auto-save imported share link data with duplicate detection
        await autoSaveShareLinkData(jsonData, pastedText);
        
        // Automatically hide history panel (if expanded) for better viewing of imported data
        const historySection = document.getElementById('history-section');
        if (historySection && !historySection.classList.contains('collapsed')) {
          const toggleBtn = document.getElementById('history-toggle-btn');
          if (toggleBtn) {
            setTimeout(() => toggleBtn.click(), 500);
          }
        }
      } else {
        updateStatus('❌ 无法解析分享链接，请检查链接格式是否正确', 'error');
      }
    } catch (error) {
      console.error('❌ 解析分享链接错误:', error);
      console.error('错误堆栈:', error.stack);
      
      // 更友好的错误信息
      let errorMessage = '解析分享链接失败';
      let suggestions = [];
      
      if (error.message.includes('URL格式不正确')) {
        errorMessage = '链接格式不正确';
        suggestions.push('请检查链接是否完整并包含所有必要参数');
      } else if (error.message.includes('JSON数据格式错误')) {
        errorMessage = 'JSON数据格式错误';
        suggestions.push('链接可能已损坏，请重新生成分享链接');
      } else if (error.message.includes('数据解码失败') || error.message.includes('所有解码策略都失败')) {
        errorMessage = '数据解码失败';
        suggestions.push('请尝试使用新版本的分享链接');
        suggestions.push('或者联系发送方重新生成链接');
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorMessage = '网络连接超时';
        suggestions.push('请检查网络连接后重试');
      } else {
        // 保留原始错误信息，但更简洁
        errorMessage = `解析失败: ${error.message.substring(0, 100)}`;
        suggestions.push('请检查浏览器控制台获取详细错误信息');
      }
      
      // 如果有建议，添加到错误信息中
      if (suggestions.length > 0) {
        errorMessage += '\n建议: ' + suggestions.join('; ');
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
  updateStorageStatusBar();
}

// 实时存储监控
let storageMonitorInterval = null;

/**
 * 启动存储监控
 */
function startStorageMonitoring() {
  // 清除之前的定时器
  if (storageMonitorInterval) {
    clearInterval(storageMonitorInterval);
  }
  
  // 立即更新一次
  updateStorageStatusBar();
  
  // 每30秒更新一次存储信息
  storageMonitorInterval = setInterval(() => {
    updateStorageStatusBar();
  }, 30000);
}

/**
 * 停止存储监控
 */
function stopStorageMonitoring() {
  if (storageMonitorInterval) {
    clearInterval(storageMonitorInterval);
    storageMonitorInterval = null;
  }
}

/**
 * 更新状态栏的存储信息
 */
async function updateStorageStatusBar() {
  try {
    const usage = await dataManager.getStorageUsage();
    const charCountElement = document.getElementById('char-count');
    
    if (charCountElement) {
      const input = document.getElementById('json-input');
      const charCount = input ? input.value.length : 0;
      const storageText = `${charCount} 字符 | 存储: ${usage.formatted.percentage}`;
      
      charCountElement.textContent = storageText;
      
      // 添加详细信息到tooltip
      const remainingBytes = usage.quotaBytes - usage.usedBytes;
      const tooltipText = `存储使用情况:
已使用: ${usage.formatted.used}
可用: ${dataManager.formatSize(remainingBytes)}
总配额: ${usage.formatted.quota}
使用率: ${usage.formatted.percentage}`;
      charCountElement.title = tooltipText;
      
      // 根据使用率设置颜色
      charCountElement.className = 'char-count';
      if (usage.usageRatio > 0.9) {
        charCountElement.classList.add('storage-critical');
      } else if (usage.usageRatio > 0.8) {
        charCountElement.classList.add('storage-warning');
      } else {
        charCountElement.classList.add('storage-safe');
      }
      
      // 如果存储使用率超过90%，在状态栏显示警告
      if (usage.usageRatio > 0.9 && !document.querySelector('.storage-critical-warning')) {
        showStorageCriticalWarning();
      }
      
      // 更新头部存储按钮
      updateStorageButton(usage);
    }
  } catch (error) {
    console.error('更新存储状态栏失败:', error);
    // 回退到普通字符计数
    const input = document.getElementById('json-input');
    const charCountElement = document.getElementById('char-count');
    if (input && charCountElement) {
      charCountElement.textContent = `${input.value.length} 字符`;
      charCountElement.title = '';
    }
  }
}

/**
 * 显示存储严重警告
 */
function showStorageCriticalWarning() {
  // 避免重复显示
  if (document.querySelector('.storage-critical-warning')) return;
  
  const statusBar = document.querySelector('.status-bar');
  if (!statusBar) return;
  
  const warningElement = document.createElement('div');
  warningElement.className = 'storage-critical-warning';
  warningElement.innerHTML = `
    <span class="warning-icon">⚠️</span>
    <span class="warning-text">存储空间不足</span>
    <button class="warning-close">×</button>
  `;
  
  statusBar.appendChild(warningElement);
  
  // Add event listener for close button
  const closeBtn = warningElement.querySelector('.warning-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      warningElement.remove();
    });
  }
  
  // 10秒后自动隐藏
  setTimeout(() => {
    if (warningElement.parentElement) {
      warningElement.remove();
    }
  }, 10000);
}

/**
 * 更新头部存储按钮
 */
function updateStorageButton(usage) {
  const storageBtn = document.getElementById('storage-info-btn');
  const indicator = storageBtn?.querySelector('.storage-usage-indicator');
  
  if (!storageBtn || !indicator) return;
  
  // 更新百分比显示
  const percentage = Math.round(usage.usageRatio * 100);
  indicator.textContent = `${percentage}%`;
  
  // 设置按钮样式
  storageBtn.className = 'btn secondary storage-info-btn';
  if (usage.usageRatio > 0.9) {
    storageBtn.classList.add('storage-critical');
  } else if (usage.usageRatio > 0.8) {
    storageBtn.classList.add('storage-warning');
  } else {
    storageBtn.classList.add('storage-safe');
  }
  
  // 更新tooltip为更详细的信息
  const remainingBytes = usage.quotaBytes - usage.usedBytes;
  const tooltipText = `:
• 已使用: ${usage.formatted.used}
• 可用空间: ${dataManager.formatSize(remainingBytes)}
• 总配额: ${usage.formatted.quota}
• 使用率: ${usage.formatted.percentage}

💡 点击查看详细信息和管理选项`;
  storageBtn.title = '查看存储使用情况';
}

/**
 * 显示存储快速信息
 */
async function showStorageQuickInfo() {
  try {
    const storageInfo = await dataManager.getStorageInfo();
    const usage = storageInfo.storage;
    const compression = storageInfo.compression;
    
    const modal = document.createElement('div');
    modal.className = 'modal storage-quick-info-modal';
    modal.id = 'storage-quick-info-modal';
    
    const remainingBytes = usage.quotaBytes - usage.usedBytes;
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>📊 存储状态</h2>
        
        <div class="quick-storage-visual">
          <div class="quick-usage-bar">
            <div class="quick-usage-fill" style="width: ${Math.min(usage.usageRatio * 100, 100)}%; background: ${
              usage.usageRatio > 0.9 ? '#dc3545' : 
              usage.usageRatio > 0.8 ? '#ffc107' : '#28a745'
            }"></div>
          </div>
          <div class="quick-usage-text">${usage.formatted.percentage}</div>
        </div>
        
        <div class="quick-stats-grid">
          <div class="quick-stat">
            <div class="stat-value">${usage.formatted.used}</div>
            <div class="stat-label">已使用</div>
          </div>
          <div class="quick-stat">
            <div class="stat-value">${dataManager.formatSize(remainingBytes)}</div>
            <div class="stat-label">可用空间</div>
          </div>
          <div class="quick-stat">
            <div class="stat-value">${storageInfo.totalItems}</div>
            <div class="stat-label">已保存项</div>
          </div>
          <div class="quick-stat">
            <div class="stat-value">${compression.compressionRatio}%</div>
            <div class="stat-label">压缩率</div>
          </div>
        </div>
        
        <div class="quick-actions">
          <button class="btn secondary" data-action="manage">管理</button>
          <button class="btn primary" data-action="close">关闭</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 添加关闭事件
    modal.querySelector('.close-btn').addEventListener('click', closeStorageQuickInfo);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeStorageQuickInfo();
      }
    });
    
    // 添加按钮事件
    const manageBtn = modal.querySelector('[data-action="manage"]');
    const closeBtn = modal.querySelector('[data-action="close"]');
    
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        closeStorageQuickInfo();
        showStorageManagement();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeStorageQuickInfo);
    }
    
  } catch (error) {
    console.error('显示存储快速信息失败:', error);
    updateStatus('获取存储信息失败', 'error');
  }
}

/**
 * 关闭存储快速信息
 */
function closeStorageQuickInfo() {
  const modal = document.getElementById('storage-quick-info-modal');
  if (modal) {
    modal.remove();
  }
}

// 格式化JSON（使用Web Worker处理大型JSON）
async function formatJSON() {
  // 检查数据有效性
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim();
  
  // 如果为空，提示用户输入
  if (!jsonString) {
    updateStatus('请先输入或粘贴JSON数据', 'warning');
    return;
  }
  
  // 检查是否为大型JSON
  if (performanceOptimizer.isLargeJson(jsonString)) {
    // 显示加载状态
    updateStatus('正在处理大型JSON...', '');
    
    // 使用Web Worker处理
    performanceOptimizer.processWithWebWorker(jsonString, (data) => {
      try {
        // 使用智能格式化功能
        const result = JsonUtils.smartFormat(data);
        if (result.success) {
          return result.result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        throw new Error(`格式化错误: ${error.message}`);
      }
    })
    .then(result => {
      const smartResult = JsonUtils.smartFormat(result);
      if (smartResult.success) {
        input.value = smartResult.result;
        jsonData = smartResult.data;
        
        let statusMessage = 'JSON格式化成功';
        if (smartResult.wasEscaped) {
          statusMessage += ' (已自动解析转义字符串)';
        }
        updateStatus(statusMessage, 'success');
        
        // 自动保存格式化后的JSON
        autoSaveFormattedJson(smartResult.result);
      } else {
        updateStatus(`格式化错误: ${smartResult.error}`, 'error');
      }
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
    // 直接处理小型JSON，使用智能格式化
    try {
      const result = JsonUtils.smartFormat(jsonString);
      if (result.success) {
        input.value = result.result;
        jsonData = result.data;
        
        let statusMessage = 'JSON格式化成功';
        if (result.wasEscaped) {
          statusMessage += ' (已自动解析转义字符串)';
        }
        updateStatus(statusMessage, 'success');
        
        // 清除错误状态（因为JSON已成功格式化）
        clearErrorStatus();
        
        // 自动保存格式化后的JSON
        autoSaveFormattedJson(result.result);
        
        // 确保行号更新
        setTimeout(() => {
          LineNumberManager.updateLineNumbersStatic();
        }, 10);
      } else {
        // 格式化失败，进行详细的错误分析
        const errorAnalysis = JsonUtils.analyzeJsonErrors(jsonString);
        if (errorAnalysis.lineErrors && errorAnalysis.lineErrors.length > 0) {
          showFirstErrorInStatus(errorAnalysis.lineErrors);
        } else {
          updateStatus(`格式化错误: ${result.error}`, 'error');
        }
      }
      updateCharCount();
      // 更新工具栏按钮状态
      updateToolbarButtonsState();
      // 更新空状态覆盖层
      updateEmptyStateOverlay();
    } catch (error) {
      updateStatus(`格式化错误: ${error.message}`, 'error');
    }
  }
}

// 显示第一个错误在状态栏
function showFirstErrorInStatus(lineErrors) {
  if (!lineErrors || lineErrors.length === 0) {
    updateStatus('未知的JSON格式错误', 'error');
    return;
  }
  
  // 按行号排序错误
  lineErrors.sort((a, b) => a.line - b.line);
  
  // 取第一个错误
  const firstError = lineErrors[0];
  
  // 格式化错误消息 - 移除错误统计
  const errorIcon = firstError.type === 'error' ? '❌' : '⚠️';
  let statusMessage = `${errorIcon} 第${firstError.line}行第${firstError.column}列: ${firstError.message}`;
  
  // 添加建议
  if (firstError.suggestion) {
    statusMessage += ` - ${firstError.suggestion}`;
  }
  
  // 移除错误统计部分，只显示具体的错误信息
  updateStatus(statusMessage, 'error');
}


// 解析转义字符串
function parseEscapedString() {
  const input = document.getElementById('json-input');
  const jsonString = input.value.trim();
  
  // 如果为空，提示用户输入
  if (!jsonString) {
    updateStatus('请先输入要解析的转义字符串', 'warning');
    return;
  }
  
  try {
    // 使用智能解析功能
    const result = JsonUtils.parseEscapedJson(jsonString);
    
    if (result.success) {
      // 解析成功，确保格式化显示
      let parsedData;
      if (typeof result.result === 'string') {
        // 如果结果是字符串，尝试解析为对象
        try {
          parsedData = JSON.parse(result.result);
        } catch (e) {
          parsedData = result.result;
        }
      } else {
        parsedData = result.result;
      }
      
      // 始终格式化为缩进的JSON
      const formattedJson = JSON.stringify(parsedData, null, 2);
      
      input.value = formattedJson;
      
      // 更新全局数据
      jsonData = parsedData;
      
      // 显示成功消息
      let statusMessage = '✓ 转义字符串解析成功';
      if (result.wasEscaped) {
        statusMessage += ' (已自动转换为格式化JSON)';
      } else {
        statusMessage += ' (数据已经是有效JSON格式，已重新格式化)';
      }
      
      updateStatus(statusMessage, 'success');
      
      // 更新UI
      updateCharCount();
      updateToolbarButtonsState();
      updateEmptyStateOverlay();
      
      // 确保行号更新
      setTimeout(() => {
        LineNumberManager.updateLineNumbersStatic();
      }, 10);
      
    } else {
      // 新增：尝试处理包含转义引号的JSON字符串
      if (JsonUtils.containsEscapedQuotes(jsonString)) {
        try {
          // 直接尝试解析包含转义引号的字符串
          const parsed = JSON.parse(jsonString);
          const formatted = JSON.stringify(parsed, null, 2);
          input.value = formatted;
          jsonData = parsed;
          
          updateStatus('✓ 转义引号字符串解析成功', 'success');
          clearErrorStatus(); // 清除错误状态
          updateCharCount();
          updateToolbarButtonsState();
          updateEmptyStateOverlay();
          setTimeout(() => {
            LineNumberManager.updateLineNumbersStatic();
          }, 10);
          return;
        } catch (e) {
          // 转义引号解析失败，继续后续处理
        }
      }
      
      // 解析失败
      let errorMessage = '解析失败: ' + result.error;
      
      // 检查是否是已经格式化的JSON
      if (JsonUtils.isValid(jsonString)) {
        // 如果是有效JSON，直接格式化
        try {
          const parsed = JSON.parse(jsonString);
          const formatted = JSON.stringify(parsed, null, 2);
          input.value = formatted;
          jsonData = parsed;
          
          updateStatus('✓ JSON已重新格式化', 'success');
          clearErrorStatus(); // 清除错误状态
          updateCharCount();
          updateToolbarButtonsState();
          updateEmptyStateOverlay();
          setTimeout(() => {
            LineNumberManager.updateLineNumbersStatic();
          }, 10);
          return;
        } catch (e) {
          errorMessage = 'JSON解析错误: ' + e.message;
        }
      } else if (JsonUtils.looksLikeJson(jsonString)) {
        // 看起来像JSON但格式错误，进行详细的错误分析
        const errorAnalysis = JsonUtils.analyzeJsonErrors(jsonString);
        if (errorAnalysis.lineErrors && errorAnalysis.lineErrors.length > 0) {
          showFirstErrorInStatus(errorAnalysis.lineErrors);
          return;
        } else {
          errorMessage = 'JSON格式错误，请检查语法后再试';
        }
      }
      
      updateStatus(errorMessage, 'error');
    }
    
  } catch (error) {
    updateStatus(`解析错误: ${error.message}`, 'error');
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
      
      // 清除错误状态（因为JSON已成功压缩）
      clearErrorStatus();
      
      // 确保行号更新
      setTimeout(() => {
        LineNumberManager.updateLineNumbersStatic();
      }, 10);
    } else {
      // 压缩失败，进行详细的错误分析
      const errorAnalysis = JsonUtils.analyzeJsonErrors(jsonString);
      if (errorAnalysis.lineErrors && errorAnalysis.lineErrors.length > 0) {
        showFirstErrorInStatus(errorAnalysis.lineErrors);
      } else {
        updateStatus(`压缩错误: ${result.error}`, 'error');
      }
    }
    updateCharCount();
  } catch (error) {
    // 捕获到异常，进行详细的错误分析
    const errorAnalysis = JsonUtils.analyzeJsonErrors(jsonString);
    if (errorAnalysis.lineErrors && errorAnalysis.lineErrors.length > 0) {
      showFirstErrorInStatus(errorAnalysis.lineErrors);
    } else {
      updateStatus(`压缩错误: ${error.message}`, 'error');
    }
  }
}


// Copy JSON (using modern API with smart parsing)
function copyJSON() {
  // Check data validity
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData) {
    updateStatus(dataStatus.message, 'warning');
    return;
  }
  
  const input = document.getElementById('json-input');
  let contentToCopy = input.value;
  
  // If data is valid, try to get properly formatted JSON
  if (dataStatus.isValid) {
    try {
      // Use smart format to handle both regular and escaped JSON
      const formatResult = JsonUtils.smartFormat(input.value.trim());
      if (formatResult.success) {
        contentToCopy = formatResult.result;
      }
    } catch (error) {
      console.warn('Failed to format JSON for copying, using original content:', error);
      // Fall back to original content if formatting fails
    }
  }
  
  // Use modern Clipboard API (if available)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(contentToCopy)
      .then(() => {
        updateStatus('JSON copied to clipboard', 'success');
      })
      .catch(error => {
        console.error('Copy failed:', error);
        // Fall back to traditional method
        fallbackCopyText(contentToCopy);
      });
  } else {
    // Fall back to traditional method
    fallbackCopyText(contentToCopy);
  }
}

// Traditional copy method for elements
function fallbackCopy(element) {
  element.select();
  const success = document.execCommand('copy');
  if (success) {
    updateStatus('JSON copied to clipboard', 'success');
  } else {
    updateStatus('Copy failed, please copy manually', 'error');
  }
}

// Traditional copy method for text content
function fallbackCopyText(text) {
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  tempInput.style.position = 'fixed';
  tempInput.style.left = '-9999px';
  tempInput.style.top = '-9999px';
  document.body.appendChild(tempInput);
  
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // For mobile devices
  
  const success = document.execCommand('copy');
  document.body.removeChild(tempInput);
  
  if (success) {
    updateStatus('JSON copied to clipboard', 'success');
  } else {
    updateStatus('Copy failed, please copy manually', 'error');
  }
}

// 显示分享模态框
async function showShareModal() {
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
    
    // 显示加载状态
    updateStatus('正在生成分享链接...', 'info');
    
    // 使用增强的分享管理器生成链接（支持加密和云存储）
    const shareOptions = {
      encrypt: false,  // 默认不加密（可以根据需求修改）
      compress: true,  // 启用压缩
      expiry: null,    // 无过期时间
      password: null,  // 无密码保护
      description: '分享的JSON数据'
    };
    
    const shareResult = await shareManager.generateShareLink(data, shareOptions);
    
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
    
    // 显示分享类型信息
    if (shareResult.type) {
      let typeMessage = '';
      if (shareResult.type === 'CLOUD_STORAGE') {
        typeMessage = `☁️ 使用云端存储模式 ${shareResult.encrypted ? '(已加密)' : ''}`;
      } else {
        typeMessage = `🔗 使用直接URL模式 ${shareResult.encrypted ? '(已加密)' : ''}`;
      }
      updateStatus(typeMessage, 'success');
    } else {
      updateStatus('✅ 分享链接生成成功', 'success');
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
      <h4>${shareResult.error === 'URL_TOO_LONG' ? '分享链接过长，系统将自动转为云端存储' : '数据量过大，无法生成分享链接'}</h4>
      <p>${shareResult.message}</p>
    </div>
  `;
  
  // 显示详细统计 - 使用统一的大小计算方法
  const sizeInfo = shareResult.originalSize ? 
    `数据大小: ${dataManager.formatSize(shareResult.originalSize)}` : '';
  
  let limitInfo = '';
  let recommendationText = '';
  
  if (shareResult.error === 'URL_TOO_LONG') {
    limitInfo = `URL限制: ${shareResult.maxUrlLength}字符`;
    recommendationText = '建议方案: 系统将自动转为云端存储';
  } else if (shareResult.error === 'DATA_TOO_LARGE') {
    limitInfo = `最大限制: ${dataManager.formatSize(shareResult.maxSize)}`;
    recommendationText = '建议方案: 使用文件下载方式分享';
  } else if (shareResult.maxSize) {
    limitInfo = `最大限制: ${dataManager.formatSize(shareResult.maxSize)}`;
    recommendationText = '建议方案: 使用文件下载方式分享';
  }
  
  statsEl.innerHTML = `
    <div class="size-comparison">
      <div class="stat-row">${sizeInfo}</div>
      <div class="stat-row">${limitInfo}</div>
      <div class="stat-row recommendation">${recommendationText}</div>
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
  const statusMessage = shareResult.error === 'URL_TOO_LONG' ? 
    '分享链接过长，系统将自动转为云端存储模式' : 
    '数据量过大，建议使用文件下载方式分享';
  updateStatus(statusMessage, 'warning');
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
        <span class="stat-value">${dataManager.formatSize(stats.originalSize)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">编码后:</span>
        <span class="stat-value">${dataManager.formatSize(stats.encodedSize)}</span>
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

// Auto-save share link data with duplicate detection
async function autoSaveShareLinkData(jsonData, shareUrl) {
  try {
    // Check if auto-save is enabled
    if (!autoSaveEnabled) return;
    
    // Create formatted JSON string
    const formattedJson = JSON.stringify(jsonData, null, 2);
    
    // Check storage space
    const spaceCheck = await dataManager.checkStorageSpace(formattedJson);
    if (!spaceCheck.hasSpace) {
      console.warn('Storage space insufficient for auto-saving share link data');
      return;
    }
    
    // Generate a descriptive title for share link import
    const timestamp = new Date().toLocaleString('zh-CN');
    const domain = new URL(shareUrl).hostname;
    const title = `分享链接导入_${domain}_${timestamp}`;
    
    // Save data with duplicate detection enabled
    const result = await dataManager.saveJsonData(title, formattedJson, false);
    
    if (result.success) {
      console.log(`Share link data auto-saved: ${title}`);
      
      // Update status with save information
      let statusMessage = `✓ 已成功导入并保存分享的JSON数据：${title}`;
      
      // Add compression info if applicable
      if (result.compressionRatio > 0) {
        statusMessage += ` (压缩率: ${result.compressionRatio}%)`;
      }
      
      updateStatus(statusMessage, 'success');
      
      // Trigger history data refresh
      const event = new CustomEvent('historyDataChanged');
      document.dispatchEvent(event);
      
      // Update storage status bar
      updateStorageStatusBar();
    } else if (result.isDuplicate) {
      // Handle duplicate content case
      console.log(`Share link auto-save skipped: duplicate content detected - ${result.existingItem.title}`);
      
      // Show user-friendly message about existing data
      const existingTitle = result.existingItem.title;
      const existingDate = new Date(result.existingItem.timestamp).toLocaleString('zh-CN');
      
      updateStatus(`✓ 数据导入成功，检测到相同内容已存在：${existingTitle} (${existingDate})`, 'info');
    } else {
      // Other errors - log but don't show to user to avoid disrupting UX
      console.warn('Share link auto-save failed:', result.error);
    }
  } catch (error) {
    console.error('Share link auto-save failed:', error);
    // Silent failure for auto-save to not disrupt user experience
  }
}

// Auto-save formatted JSON (enhanced version)
async function autoSaveFormattedJson(formattedJson) {
  try {
    // 检查是否启用自动保存
    if (!autoSaveEnabled) return;
    
    // 检查距离上次自动保存的时间间隔（避免频繁保存）
    const now = Date.now();
    if (now - lastAutoSaveTime < 5000) { // 5秒内不重复保存
      return;
    }
    
    // 检查存储空间
    const spaceCheck = await dataManager.checkStorageSpace(formattedJson);
    if (!spaceCheck.hasSpace) {
      showStorageWarning(spaceCheck);
      return;
    }
    
    if (spaceCheck.warning) {
      showStorageWarning(spaceCheck);
    }
    
    // 生成自动保存标题
    const timestamp = new Date().toLocaleString('zh-CN');
    const title = `自动保存_${timestamp}`;
    
    // 保存数据（启用重复内容检测）
    const result = await dataManager.saveJsonData(title, formattedJson, false);
    
    if (result.success) {
      lastAutoSaveTime = now;
      
      let statusMessage = `已自动保存格式化后的JSON：${title}`;
      
      // 显示压缩信息
      if (result.compressionRatio > 0) {
        statusMessage += ` (压缩率: ${result.compressionRatio}%)`;
      }
      
      // 显示存储使用情况
      if (result.storageInfo && result.storageInfo.usageRatio > 0.7) {
        statusMessage += ` [存储: ${result.storageInfo.formatted.percentage}]`;
      }
      
      updateStatus(statusMessage, 'success');
      
      // 触发历史数据刷新
      const event = new CustomEvent('historyDataChanged');
      document.dispatchEvent(event);
      
      // 立即更新存储信息
      updateStorageStatusBar();
    } else if (result.isDuplicate) {
      // 处理重复内容情况
      console.log(`自动保存跳过：检测到重复内容 - ${result.existingItem.title}`);
      // 不显示错误信息，静默跳过重复内容的保存
      return;
    } else if (result.storageInfo) {
      showStorageWarning(result);
    } else {
      // 其他错误情况
      console.warn('自动保存失败:', result.error);
    }
  } catch (error) {
    console.error('自动保存失败:', error);
    // 自动保存失败不显示错误提示，避免影响用户体验
  }
}

/**
 * 显示存储警告
 */
function showStorageWarning(spaceCheck) {
  const modal = document.createElement('div');
  modal.className = 'modal storage-warning-modal';
  modal.id = 'storage-warning-modal';
  
  const isError = !spaceCheck.hasSpace;
  const title = isError ? '存储空间不足' : '存储空间警告';
  const icon = isError ? '🚨' : '⚠️';
  const message = spaceCheck.error || spaceCheck.warning;
  
  let suggestionsHtml = '';
  if (spaceCheck.suggestions && spaceCheck.suggestions.length > 0) {
    suggestionsHtml = `
      <div class="storage-suggestions">
        <h4>💡 建议解决方案：</h4>
        <ul>
          ${spaceCheck.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  let storageInfoHtml = '';
  if (spaceCheck.info && spaceCheck.info.formatted) {
    storageInfoHtml = `
      <div class="storage-info">
        <div class="storage-usage-bar">
          <div class="usage-bar">
            <div class="usage-fill" style="width: ${spaceCheck.info.formatted.percentage}"></div>
          </div>
          <div class="usage-text">
            已使用: ${spaceCheck.info.formatted.used} / ${spaceCheck.info.formatted.quota} (${spaceCheck.info.formatted.percentage})
          </div>
        </div>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn">&times;</span>
      <h2>${icon} ${title}</h2>
      <div class="storage-message">
        <p>${message}</p>
      </div>
      ${storageInfoHtml}
      ${suggestionsHtml}
      <div class="modal-actions">
        <button class="btn secondary" data-action="settings">🔧 打开设置</button>
        <button class="btn primary" data-action="close">确定</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
  
  // 添加关闭事件
  modal.querySelector('.close-btn').addEventListener('click', closeStorageWarning);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeStorageWarning();
    }
  });
  
  // 添加按钮事件
  const settingsBtn = modal.querySelector('[data-action="settings"]');
  const closeBtn = modal.querySelector('[data-action="close"]');
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openStorageSettings);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeStorageWarning);
  }
}

/**
 * 关闭存储警告
 */
function closeStorageWarning() {
  const modal = document.getElementById('storage-warning-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 打开存储设置
 */
function openStorageSettings() {
  closeStorageWarning();
  // 这里可以打开设置面板或者显示存储管理面板
  showStorageManagement();
}

/**
 * 显示存储管理面板
 */
async function showStorageManagement() {
  try {
    const storageInfo = await dataManager.getStorageInfo();
    
    const modal = document.createElement('div');
    modal.className = 'modal storage-management-modal';
    modal.id = 'storage-management-modal';
    
    const compressionInfo = storageInfo.compression;
    const storageUsage = storageInfo.storage;
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>📊 存储管理</h2>
        
        <div class="storage-stats">
          <div class="stat-group">
            <h3>📁 数据统计</h3>
            <div class="stat-item">
              <span>已保存数据:</span>
              <span>${storageInfo.totalItems} / ${storageInfo.maxItems} 条</span>
            </div>
            <div class="stat-item">
              <span>存储使用:</span>
              <span>${storageUsage.formatted.used} / ${storageUsage.formatted.quota} (${storageUsage.formatted.percentage})</span>
            </div>
          </div>
          
          <div class="stat-group">
            <h3>🗃️ 压缩统计</h3>
            <div class="stat-item">
              <span>压缩状态:</span>
              <span>${compressionInfo.enabled ? '✅ 已启用' : '❌ 未启用'}</span>
            </div>
            <div class="stat-item">
              <span>压缩项目:</span>
              <span>${compressionInfo.compressedItems} / ${compressionInfo.totalItems} 条</span>
            </div>
            <div class="stat-item">
              <span>压缩效果:</span>
              <span>${compressionInfo.compressionRatio}% (节省 ${dataManager.formatSize(compressionInfo.savedBytes)})</span>
            </div>
          </div>
        </div>
        
        <div class="storage-actions">
          <h3>🔧 管理操作</h3>
          <div class="action-buttons">
            <button class="btn secondary" data-action="clean-expired">🧹 清理过期数据</button>
            <button class="btn secondary" data-action="enable-compression">🗃️ 启用压缩</button>
            <button class="btn danger" data-action="clear-all">🗑️ 清空所有数据</button>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn primary" data-action="close">关闭</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 添加关闭事件
    modal.querySelector('.close-btn').addEventListener('click', closeStorageManagement);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeStorageManagement();
      }
    });
    
    // 添加按钮事件
    const cleanBtn = modal.querySelector('[data-action="clean-expired"]');
    const compressBtn = modal.querySelector('[data-action="enable-compression"]');
    const clearBtn = modal.querySelector('[data-action="clear-all"]');
    const closeBtn = modal.querySelector('[data-action="close"]');
    
    if (cleanBtn) {
      cleanBtn.addEventListener('click', cleanExpiredData);
    }
    
    if (compressBtn) {
      compressBtn.addEventListener('click', enableCompression);
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllStorageData);
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeStorageManagement);
    }
    
  } catch (error) {
    console.error('显示存储管理面板失败:', error);
    updateStatus('获取存储信息失败', 'error');
  }
}

/**
 * 关闭存储管理面板
 */
function closeStorageManagement() {
  const modal = document.getElementById('storage-management-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 清理过期数据
 */
async function cleanExpiredData() {
  try {
    const count = await dataManager.cleanExpiredData();
    updateStatus(`已清理 ${count} 条过期数据`, 'success');
    
    // 刷新历史数据
    const event = new CustomEvent('historyDataChanged');
    document.dispatchEvent(event);
    
    // 刷新存储管理面板
    closeStorageManagement();
    setTimeout(() => showStorageManagement(), 100);
  } catch (error) {
    console.error('清理过期数据失败:', error);
    updateStatus('清理过期数据失败', 'error');
  }
}

/**
 * 启用压缩
 */
async function enableCompression() {
  try {
    const result = await dataManager.saveSettings({ enableCompression: true });
    if (result.success) {
      updateStatus('已启用数据压缩功能', 'success');
      
      // 刷新存储管理面板
      closeStorageManagement();
      setTimeout(() => showStorageManagement(), 100);
    } else {
      updateStatus('启用压缩失败: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('启用压缩失败:', error);
    updateStatus('启用压缩失败', 'error');
  }
}

/**
 * 清空所有存储数据
 */
async function clearAllStorageData() {
  const confirmed = confirm('确定要清空所有存储数据吗？此操作不可恢复！');
  if (!confirmed) return;
  
  try {
    const result = await dataManager.clearAllData();
    if (result.success) {
      updateStatus('已清空所有数据', 'success');
      
      // 刷新历史数据
      const event = new CustomEvent('historyDataChanged');
      document.dispatchEvent(event);
      
      // 关闭面板
      closeStorageManagement();
    } else {
      updateStatus('清空数据失败: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('清空数据失败:', error);
    updateStatus('清空数据失败', 'error');
  }
}

// 更新状态消息（使用防抖）- 增强版本支持持久错误消息
let currentErrorMessage = null; // 保存当前错误消息
let statusTimer = null; // 状态计时器

const updateStatus = performanceOptimizer.debounce((message, type = '') => {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = type;
  
  // 清除之前的计时器
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  
  // 如果是错误类型，保存错误消息，不自动清除
  if (type === 'error') {
    currentErrorMessage = message;
    return;
  }
  
  // 如果是成功消息且之前有错误，清除错误状态
  if (type === 'success' && currentErrorMessage) {
    currentErrorMessage = null;
  }
  
  // 对于非错误消息，3秒后清除状态（但不覆盖错误消息）
  if (type !== 'error') {
    statusTimer = setTimeout(() => {
      // 如果没有活跃的错误消息，重置为准备就绪
      if (!currentErrorMessage) {
        statusElement.textContent = '准备就绪';
        statusElement.className = '';
      } else {
        // 如果有错误消息，恢复显示错误
        statusElement.textContent = currentErrorMessage;
        statusElement.className = 'error';
      }
      statusTimer = null;
    }, 3000);
  }
}, 100);

// 添加清除错误状态的函数
function clearErrorStatus() {
  currentErrorMessage = null;
  const statusElement = document.getElementById('status-message');
  if (statusElement.className === 'error') {
    updateStatus('准备就绪', '');
  }
}

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
    
    const result = await dataManager.saveJsonData(title, jsonData, true); // 手动保存允许重复内容
    
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

// ==== API服务功能函数 ====

// 显示API模态框
function showApiModal() {
  // 检查数据有效性
  const dataStatus = checkJsonDataStatus();
  if (!dataStatus.hasData || !dataStatus.isValid) {
    updateStatus(dataStatus.message, dataStatus.isEmpty ? 'warning' : 'error');
    return;
  }
  
  // 更新服务器状态显示
  updateApiServerStatus();
  
  // 显示模态框
  document.getElementById('api-modal').style.display = 'block';
  
  // 自动填充API路径建议
  const input = document.getElementById('json-input');
  try {
    if (apiServerManager) {
      const jsonData = JSON.parse(input.value.trim());
      const suggestedPath = apiServerManager.generateApiPath(jsonData);
      document.getElementById('api-path-input').value = suggestedPath;
    } else {
      document.getElementById('api-path-input').value = '/api/data';
    }
  } catch (error) {
    console.warn('无法解析JSON数据生成路径建议:', error);
    document.getElementById('api-path-input').value = '/api/data';
  }
}

// 更新API服务器状态显示
function updateApiServerStatus() {
  if (!apiServerManager) {
    console.warn('API服务器管理器未初始化');
    return;
  }
  
  const status = apiServerManager.getServerStatus();
  const statusDot = document.getElementById('api-status-dot');
  const statusText = document.getElementById('api-status-text');
  const toggleBtn = document.getElementById('api-server-toggle');
  
  if (statusDot && statusText && toggleBtn) {
    if (status.isRunning) {
      statusDot.className = 'status-dot running';
      statusText.textContent = `服务器运行中 (${status.url})`;
      toggleBtn.textContent = '停止服务';
      toggleBtn.className = 'btn danger';
    } else {
      statusDot.className = 'status-dot stopped';
      statusText.textContent = '服务器未启动';
      toggleBtn.textContent = '启动API服务';
      toggleBtn.className = 'btn primary';
    }
  }
  
  // 更新端点列表显示
  updateApiEndpointsList();
}

// 更新API端点列表
function updateApiEndpointsList() {
  if (!apiServerManager) {
    console.warn('API服务器管理器未初始化');
    return;
  }
  
  const endpoints = apiServerManager.getEndpointList();
  const endpointsSection = document.getElementById('api-endpoints-section');
  const endpointsList = document.getElementById('endpoints-list');
  
  if (endpoints.length === 0) {
    endpointsSection.style.display = 'none';
    return;
  }
  
  endpointsSection.style.display = 'block';
  
  const endpointsHtml = endpoints.map(endpoint => `
    <div class="endpoint-item">
      <div class="endpoint-info">
        <div class="endpoint-path">
          <span class="method-badge ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
          <code class="endpoint-url">${endpoint.url}</code>
        </div>
        <div class="endpoint-description">${endpoint.description}</div>
        <div class="endpoint-actions">
          <button class="btn secondary small copy-url-btn" data-url="${endpoint.url}">📋 复制URL</button>
          <button class="btn secondary small test-api-btn" data-url="${endpoint.url}">🧪 测试</button>
          <button class="btn secondary small show-examples-btn" data-url="${endpoint.url}">💡 示例</button>
        </div>
      </div>
    </div>
  `).join('');
  
  endpointsList.innerHTML = endpointsHtml;
  
  // 添加按钮事件监听器
  endpointsList.querySelectorAll('.copy-url-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.dataset.url;
      copyApiUrl(url);
    });
  });
  
  endpointsList.querySelectorAll('.test-api-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.dataset.url;
      testApiEndpoint(url);
    });
  });
  
  endpointsList.querySelectorAll('.show-examples-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.dataset.url;
      showApiExamples(url);
    });
  });
}

// 复制API URL
async function copyApiUrl(url) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showApiModalMessage('✅ API地址已复制到剪贴板', 'success', 2000);
    } else {
      // 降级方案
      const tempInput = document.createElement('input');
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showApiModalMessage('✅ API地址已复制到剪贴板', 'success', 2000);
    }
  } catch (error) {
    console.error('复制API地址失败:', error);
    showApiModalMessage('❌ 复制失败，请手动复制', 'error', 3000);
  }
}

// 测试API端点
async function testApiEndpoint(url) {
  try {
    showApiModalMessage('🧪 正在测试API端点...', 'info');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      showApiModalMessage(`✅ API测试成功 (状态码: ${response.status})`, 'success', 3000);
      console.log('API测试响应:', data);
    } else {
      showApiModalMessage(`❌ API测试失败 (状态码: ${response.status})`, 'error', 3000);
    }
  } catch (error) {
    console.error('API测试失败:', error);
    showApiModalMessage('❌ API测试失败: ' + error.message, 'error', 3000);
  }
}

// 显示API使用示例
function showApiExamples(url, implementations = null) {
  const examplesSection = document.getElementById('api-examples-section');
  
  examplesSection.style.display = 'block';
  
  // 更新标签页以显示实现方案
  const tabsContainer = document.querySelector('.example-tabs');
  if (implementations) {
    tabsContainer.innerHTML = `
      <button class="tab-btn active" data-tab="usage">前端使用</button>
      <button class="tab-btn" data-tab="express">Express.js</button>
      <button class="tab-btn" data-tab="nodejs">Node.js</button>
      <button class="tab-btn" data-tab="jsonserver">JSON Server</button>
      <button class="tab-btn" data-tab="msw">MSW</button>
      <button class="tab-btn" data-tab="vercel">Vercel</button>
    `;
  } else {
    tabsContainer.innerHTML = `
      <button class="tab-btn active" data-tab="javascript">JavaScript</button>
      <button class="tab-btn" data-tab="vue">Vue.js</button>
      <button class="tab-btn" data-tab="react">React</button>
    `;
  }
  
  // 准备示例内容
  let examples;
  if (implementations) {
    examples = {
      usage: apiServerManager ? apiServerManager.generateApiExamples(url).javascript : '// API服务器管理器未初始化',
      express: implementations.express,
      nodejs: implementations.nodejs,
      jsonserver: implementations.jsonServer,
      msw: implementations.msw,
      vercel: implementations.vercel
    };
  } else {
    examples = apiServerManager ? apiServerManager.generateApiExamples(url) : {
      javascript: '// API服务器管理器未初始化',
      vue: '// API服务器管理器未初始化',
      react: '// API服务器管理器未初始化'
    };
  }
  
  // 默认显示第一个标签
  const firstTab = implementations ? 'usage' : 'javascript';
  showExampleCode(firstTab, examples);
  
  // 添加标签页切换事件
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      
      // 更新标签页状态
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // 显示对应示例
      showExampleCode(tab, examples);
    });
  });
  
  // 添加复制示例代码事件
  const copyBtn = document.querySelector('.copy-example-btn');
  if (copyBtn) {
    copyBtn.replaceWith(copyBtn.cloneNode(true)); // 移除旧的事件监听器
    document.querySelector('.copy-example-btn').addEventListener('click', () => {
      copyExampleCode();
    });
  }
}

// 显示示例代码
function showExampleCode(type, examples) {
  const exampleCode = document.getElementById('example-code');
  const code = examples[type] || examples.javascript;
  exampleCode.textContent = code;
}

// 复制示例代码
async function copyExampleCode() {
  const exampleCode = document.getElementById('example-code');
  const code = exampleCode.textContent;
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
      showApiModalMessage('✅ 示例代码已复制到剪贴板', 'success', 2000);
    } else {
      // 降级方案
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = code;
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextarea);
      showApiModalMessage('✅ 示例代码已复制到剪贴板', 'success', 2000);
    }
  } catch (error) {
    console.error('复制示例代码失败:', error);
    showApiModalMessage('❌ 复制失败，请手动复制', 'error', 3000);
  }
}

// 显示API模态框消息
function showApiModalMessage(message, type = 'info', duration = 3000) {
  showModalMessage('api-modal', message, type, duration);
}

// 初始化API相关事件监听器
document.addEventListener('DOMContentLoaded', () => {
  // API服务器切换按钮
  document.getElementById('api-server-toggle').addEventListener('click', toggleApiServer);
  
  // 创建API端点按钮
  document.getElementById('create-api-btn').addEventListener('click', createApiEndpoint);
});

// 切换API服务器状态
async function toggleApiServer() {
  if (!apiServerManager) {
    showApiModalMessage('❌ API服务器管理器未初始化', 'error', 3000);
    return;
  }
  
  const status = apiServerManager.getServerStatus();
  
  try {
    if (status.isRunning) {
      // 停止服务器
      showApiModalMessage('正在停止API服务器...', 'info');
      const result = await apiServerManager.stopServer();
      
      if (result.success) {
        showApiModalMessage('✅ API服务器已停止', 'success', 2000);
        updateApiServerStatus();
      } else {
        showApiModalMessage('❌ 停止服务器失败: ' + result.error, 'error', 3000);
      }
    } else {
      // 启动服务器
      showApiModalMessage('正在启动API服务器...', 'info');
      const result = await apiServerManager.startServer();
      
      if (result.success) {
        showApiModalMessage('✅ API服务器启动成功', 'success', 2000);
        updateApiServerStatus();
      } else {
        showApiModalMessage('❌ 启动服务器失败: ' + result.error, 'error', 3000);
      }
    }
  } catch (error) {
    console.error('切换API服务器状态失败:', error);
    showApiModalMessage('❌ 操作失败: ' + error.message, 'error', 3000);
  }
}

// 创建API端点
async function createApiEndpoint() {
  if (!apiServerManager) {
    showApiModalMessage('❌ API服务器管理器未初始化', 'error', 3000);
    return;
  }
  
  const input = document.getElementById('json-input');
  const pathInput = document.getElementById('api-path-input');
  const descriptionInput = document.getElementById('api-description-input');
  
  try {
    const jsonData = input.value.trim();
    const customPath = pathInput.value.trim();
    const description = descriptionInput.value.trim();
    
    // 验证JSON数据
    if (!JsonUtils.isValid(jsonData)) {
      showApiModalMessage('❌ 无效的JSON数据，无法创建API', 'error', 3000);
      return;
    }
    
    showApiModalMessage('🔧 正在生成API实现方案...', 'info');
    
    // 创建API端点
    const result = await apiServerManager.createApiFromCurrentJson(jsonData, customPath);
    
    if (result.success) {
      showApiModalMessage(`✅ ${result.message}`, 'success', 3000);
      
      // 更新UI
      updateApiServerStatus();
      
      // 显示API实现方案和使用示例
      setTimeout(() => {
        showApiExamples(result.apiUrl, result.implementations);
      }, 1000);
      
      // 清空输入框
      pathInput.value = '';
      descriptionInput.value = '';
      
    } else {
      showApiModalMessage('❌ 创建API失败: ' + result.error, 'error', 3000);
    }
  } catch (error) {
    console.error('创建API端点失败:', error);
    showApiModalMessage('❌ 创建API失败: ' + error.message, 'error', 3000);
  }
}