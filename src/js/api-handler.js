/**
 * JSON格式化大师 - API处理模块
 * 用于与Python FastAPI服务器通信
 */

class ApiHandler {
  constructor() {
    this.baseUrl = 'http://localhost:8000';
    this.isRunning = false;
  }

  /**
   * 检查API服务器是否运行
   * @returns {Promise<boolean>} 服务器是否运行
   */
  async checkServerStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/json-data`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      this.isRunning = response.ok;
      return this.isRunning;
    } catch (error) {
      this.isRunning = false;
      return false;
    }
  }

  /**
   * 获取当前JSON数据
   * @returns {Promise<Object>} JSON数据
   */
  async getJsonData() {
    try {
      const response = await fetch(`${this.baseUrl}/json-data`);
      if (!response.ok) {
        throw new Error('获取数据失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取JSON数据错误:', error);
      throw error;
    }
  }

  /**
   * 更新JSON数据
   * @param {Object} jsonData - 要更新的JSON数据
   * @returns {Promise<Object>} 响应结果
   */
  async updateJsonData(jsonData) {
    try {
      const response = await fetch(`${this.baseUrl}/json-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: jsonData })
      });
      
      if (!response.ok) {
        throw new Error('更新数据失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('更新JSON数据错误:', error);
      throw error;
    }
  }

  /**
   * 关闭API服务器
   * @returns {Promise<Object>} 响应结果
   */
  async shutdownServer() {
    try {
      const response = await fetch(`${this.baseUrl}/shutdown`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('关闭服务器失败');
      }
      
      this.isRunning = false;
      return await response.json();
    } catch (error) {
      console.error('关闭API服务器错误:', error);
      throw error;
    }
  }
}

// 导出API处理器实例
const apiHandler = new ApiHandler();