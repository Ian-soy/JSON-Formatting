/**
 * JSON格式化大师 - Background Service Worker
 */

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 后台服务收到消息:', request.action);
  // 这里可以处理其他非-API相关的消息
});

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 JSON格式化大师扩展已安装/更新');
  console.log('📋 详情:', details);
  
  // 初始化存储
  try {
    const data = await chrome.storage.sync.get(['theme', 'fontSize']);
    
    const updates = {};
    if (!data.theme) {
      updates.theme = 'dark';
    }
    if (!data.fontSize) {
      updates.fontSize = 14;
    }
    
    if (Object.keys(updates).length > 0) {
      await chrome.storage.sync.set(updates);
      console.log('✅ 默认设置已初始化:', updates);
    }
  } catch (error) {
    console.error('❌ 初始化存储失败:', error);
  }
});

// 扩展启动时
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 JSON格式化大师扩展已启动');
});

// 监听扩展挂起（如果支持）
chrome.runtime.onSuspend?.addListener(() => {
  console.log('😴 JSON格式化大师扩展即将挂起');
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('🚨 Background Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 未处理的Promise拒绝:', event.reason);
});

console.log('✅ JSON格式化大师 Background Service Worker 已加载');
console.log('🔧 核心功能: JSON格式化、压缩、分享、下载');