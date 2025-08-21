// 检测页面是否包含JSON内容
(function() {
  // 检查页面内容是否为JSON
  function checkForJson() {
    const bodyText = document.body.textContent || '';
    
    // 尝试解析页面内容为JSON
    try {
      const trimmedText = bodyText.trim();
      // 检查是否以{ 或 [ 开头，以} 或 ]结尾
      if ((trimmedText.startsWith('{') && trimmedText.endsWith('}')) || 
          (trimmedText.startsWith('[') && trimmedText.endsWith(']'))) {
        
        // 尝试解析JSON
        const jsonData = JSON.parse(trimmedText);
        
        // 如果成功解析，添加格式化按钮
        addFormatButton(jsonData);
        return true;
      }
    } catch (e) {
      // 不是有效的JSON，忽略错误
    }
    
    return false;
  }
  
  // 添加格式化按钮
  function addFormatButton(jsonData) {
    // 创建按钮容器
    const container = document.createElement('div');
    container.className = 'json-master-container';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    // 创建格式化按钮
    const formatBtn = createButton('格式化', '#0078d7');
    formatBtn.addEventListener('click', () => formatPageJson(jsonData));
    
    // 创建压缩按钮
    const minifyBtn = createButton('压缩', '#444');
    minifyBtn.addEventListener('click', () => minifyPageJson(jsonData));
    
    // 创建在插件中打开按钮
    const openBtn = createButton('在插件中打开', '#28a745');
    openBtn.addEventListener('click', () => openInExtension(jsonData));
    
    // 添加按钮到容器
    container.appendChild(formatBtn);
    container.appendChild(minifyBtn);
    container.appendChild(openBtn);
    
    // 添加容器到页面
    document.body.appendChild(container);
  }
  
  // 创建按钮
  function createButton(text, bgColor) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 8px 12px;
      background-color: ${bgColor};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      transition: all 0.2s;
    `;
    
    button.addEventListener('mouseover', () => {
      button.style.opacity = '0.9';
      button.style.transform = 'translateY(-1px)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.opacity = '1';
      button.style.transform = 'translateY(0)';
    });
    
    return button;
  }
  
  // 格式化页面JSON
  function formatPageJson(jsonData) {
    const formatted = JSON.stringify(jsonData, null, 2);
    document.body.innerHTML = `<pre style="margin:0;padding:16px;white-space:pre-wrap;word-wrap:break-word;font-family:monospace;font-size:14px;">${escapeHtml(formatted)}</pre>`;
    // 重新添加按钮
    addFormatButton(jsonData);
  }
  
  // 压缩页面JSON
  function minifyPageJson(jsonData) {
    const minified = JSON.stringify(jsonData);
    document.body.innerHTML = `<pre style="margin:0;padding:16px;white-space:pre-wrap;word-wrap:break-word;font-family:monospace;font-size:14px;">${escapeHtml(minified)}</pre>`;
    // 重新添加按钮
    addFormatButton(jsonData);
  }
  
  // 在扩展中打开
  function openInExtension(jsonData) {
    chrome.runtime.sendMessage({
      action: 'openInPopup',
      data: jsonData
    });
  }
  
  // 转义HTML
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // 页面加载完成后检查JSON
  window.addEventListener('DOMContentLoaded', () => {
    // 延迟一点执行，确保页面内容已完全加载
    setTimeout(checkForJson, 300);
  });
})();