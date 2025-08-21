/**
 * JSON格式化大师 - JSON工具函数
 * 用于处理JSON格式化、压缩和修复
 */

class JsonUtils {
  /**
   * 格式化JSON字符串
   * @param {string} jsonString - 要格式化的JSON字符串
   * @param {number} indentation - 缩进空格数
   * @returns {Object} 包含格式化结果的对象
   */
  static format(jsonString, indentation = 2) {
    try {
      // 如果输入为空，返回空对象
      if (!jsonString.trim()) {
        return {
          success: true,
          result: '{}',
          data: {}
        };
      }
      
      // 解析JSON
      const parsed = JSON.parse(jsonString);
      
      // 格式化
      const formatted = JSON.stringify(parsed, null, indentation);
      
      return {
        success: true,
        result: formatted,
        data: parsed
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 压缩JSON字符串
   * @param {string} jsonString - 要压缩的JSON字符串
   * @returns {Object} 包含压缩结果的对象
   */
  static minify(jsonString) {
    try {
      // 如果输入为空，返回空对象
      if (!jsonString.trim()) {
        return {
          success: true,
          result: '{}',
          data: {}
        };
      }
      
      // 解析JSON
      const parsed = JSON.parse(jsonString);
      
      // 压缩
      const minified = JSON.stringify(parsed);
      
      return {
        success: true,
        result: minified,
        data: parsed
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 修复JSON字符串中的常见错误
   * @param {string} jsonString - 要修复的JSON字符串
   * @returns {Object} 包含修复结果的对象
   */
  static fix(jsonString) {
    try {
      // 如果输入为空，返回空对象
      if (!jsonString.trim()) {
        return {
          success: true,
          result: '{}',
          data: {}
        };
      }
      
      // 尝试修复常见错误
      let fixedJson = jsonString
        // 修复缺少引号的键
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        // 修复单引号
        .replace(/'/g, '"')
        // 修复尾随逗号
        .replace(/,\s*([\]}])/g, '$1')
        // 修复缺少逗号
        .replace(/([}\]])\s*([{[])/g, '$1,$2')
        // 修复布尔值和null
        .replace(/:\s*undefined/g, ':null')
        .replace(/:\s*True/g, ':true')
        .replace(/:\s*False/g, ':false');
      
      // 尝试解析修复后的JSON
      const parsed = JSON.parse(fixedJson);
      
      // 格式化
      const formatted = JSON.stringify(parsed, null, 2);
      
      return {
        success: true,
        result: formatted,
        data: parsed,
        fixed: fixedJson !== jsonString // 是否进行了修复
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 语法高亮JSON字符串
   * @param {string} jsonString - 要高亮的JSON字符串
   * @returns {string} 高亮后的HTML
   */
  static highlight(jsonString) {
    // 如果输入为空，返回空字符串
    if (!jsonString.trim()) {
      return '';
    }
    
    // 替换特殊字符
    const escaped = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 高亮语法
    return escaped
      // 高亮键
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      // 高亮字符串
      .replace(/:(\s*)"([^"]*)"/g, ':$1<span class="json-string">"$2"</span>')
      // 高亮数字
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      // 高亮布尔值
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      // 高亮null
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
  }
  
  /**
   * 验证JSON字符串是否有效
   * @param {string} jsonString - 要验证的JSON字符串
   * @returns {boolean} 是否有效
   */
  static isValid(jsonString) {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 获取JSON字符串的错误信息
   * @param {string} jsonString - 要检查的JSON字符串
   * @returns {string|null} 错误信息，如果没有错误则返回null
   */
  static getErrorMessage(jsonString) {
    try {
      JSON.parse(jsonString);
      return null;
    } catch (error) {
      return error.message;
    }
  }
}

// 导出JSON工具类
window.JsonUtils = JsonUtils;