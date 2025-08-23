/**
 * JSON格式化大师 - 格式转换工具
 * 用于在JSON和其他格式之间进行转换
 */

class FormatConverter {
  /**
   * 将JSON转换为XML
   * @param {Object} jsonData - JSON数据对象
   * @returns {string} XML字符串
   */
  static jsonToXml(jsonData) {
    // 创建XML文档
    const createXml = (obj, nodeName = 'root') => {
      // 处理数组
      if (Array.isArray(obj)) {
        return obj.map((item, index) => {
          // 对于数组中的每个项，使用item作为节点名称，或者使用item+index
          const itemNodeName = typeof item === 'object' && item !== null ? 'item' : 'item';
          return createXml(item, itemNodeName);
        }).join('');
      }
      
      // 处理基本类型
      if (typeof obj !== 'object' || obj === null) {
        const value = String(obj).replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        return `<${nodeName}>${value}</${nodeName}>`;
      }
      
      // 处理对象
      const xmlParts = [];
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_'); // 确保XML标签名有效
          xmlParts.push(createXml(value, safeKey));
        }
      }
      
      return `<${nodeName}>${xmlParts.join('')}</${nodeName}>`;
    };
    
    const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + createXml(jsonData);
    return xmlString;
  }
  
  /**
   * 将JSON转换为CSV
   * @param {Object} jsonData - JSON数据对象
   * @returns {string} CSV字符串
   */
  static jsonToCsv(jsonData) {
    // 如果不是数组，尝试转换为数组
    let dataArray = jsonData;
    if (!Array.isArray(jsonData)) {
      // 如果是对象，尝试将其转换为单项数组
      if (typeof jsonData === 'object' && jsonData !== null) {
        dataArray = [jsonData];
      } else {
        // 如果既不是数组也不是对象，则无法转换为CSV
        throw new Error('无法将此JSON转换为CSV，需要数组或对象结构');
      }
    }
    
    // 如果数组为空，返回空字符串
    if (dataArray.length === 0) {
      return '';
    }
    
    // 提取所有可能的列名
    const allColumns = new Set();
    dataArray.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allColumns.add(key));
      }
    });
    
    const columns = Array.from(allColumns);
    
    // 创建CSV头
    let csv = columns.map(column => `"${column}"`).join(',') + '\n';
    
    // 添加数据行
    dataArray.forEach(item => {
      const row = columns.map(column => {
        let value = '';
        if (typeof item === 'object' && item !== null && column in item) {
          value = item[column];
          // 处理嵌套对象和数组
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
        }
        // 转义双引号并用双引号包围
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  /**
   * 下载文本内容为文件
   * @param {string} content - 要下载的内容
   * @param {string} fileName - 文件名
   * @param {string} contentType - 内容类型
   */
  static downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

// 导出格式转换工具类
window.FormatConverter = FormatConverter;