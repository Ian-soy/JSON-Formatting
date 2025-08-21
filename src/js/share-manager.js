/**
 * JSON格式化大师 - 分享管理模块
 * 用于处理JSON数据的分享功能
 */

class ShareManager {
  constructor() {
    // 分享服务的基础URL（模拟）
    this.shareBaseUrl = 'https://jsonmaster.share/view';
  }
  
  /**
   * 生成分享链接
   * @param {Object|string} jsonData - JSON数据或JSON字符串
   * @returns {string} 分享链接
   */
  generateShareLink(jsonData) {
    try {
      // 确保数据是对象
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      // 使用Base64编码JSON数据
      const encodedData = this.encodeData(data);
      
      // 生成分享链接
      return `${this.shareBaseUrl}?data=${encodedData}`;
    } catch (error) {
      console.error('生成分享链接错误:', error);
      throw error;
    }
  }
  
  /**
   * 编码JSON数据
   * @param {Object} data - JSON数据
   * @returns {string} 编码后的数据
   */
  encodeData(data) {
    try {
      // 将对象转换为JSON字符串
      const jsonString = JSON.stringify(data);
      
      // 使用Base64编码
      return btoa(unescape(encodeURIComponent(jsonString)));
    } catch (error) {
      console.error('编码数据错误:', error);
      throw error;
    }
  }
  
  /**
   * 解码分享数据
   * @param {string} encodedData - 编码后的数据
   * @returns {Object} 解码后的JSON数据
   */
  decodeData(encodedData) {
    try {
      // 使用Base64解码
      const jsonString = decodeURIComponent(escape(atob(encodedData)));
      
      // 解析JSON字符串
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('解码数据错误:', error);
      throw error;
    }
  }
  
  /**
   * 从URL获取分享数据
   * @param {string} url - 分享URL
   * @returns {Object|null} JSON数据，如果无法解析则返回null
   */
  getDataFromUrl(url) {
    try {
      // 解析URL
      const urlObj = new URL(url);
      
      // 获取data参数
      const encodedData = urlObj.searchParams.get('data');
      
      if (!encodedData) {
        return null;
      }
      
      // 解码数据
      return this.decodeData(encodedData);
    } catch (error) {
      console.error('从URL获取数据错误:', error);
      return null;
    }
  }
  
  /**
   * 复制分享链接到剪贴板
   * @param {string} link - 分享链接
   * @returns {boolean} 是否成功复制
   */
  copyShareLink(link) {
    try {
      // 创建临时输入元素
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      
      // 选择并复制
      input.select();
      const success = document.execCommand('copy');
      
      // 移除临时元素
      document.body.removeChild(input);
      
      return success;
    } catch (error) {
      console.error('复制分享链接错误:', error);
      return false;
    }
  }
}

// 导出分享管理器实例
const shareManager = new ShareManager();