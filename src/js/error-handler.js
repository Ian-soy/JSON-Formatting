/**
 * JSON格式化大师 - 错误处理模块
 * 用于处理JSON错误并提供修复建议
 */

class ErrorHandler {
  constructor() {
    // 常见JSON错误模式及其修复建议
    this.errorPatterns = [
      {
        pattern: /Unexpected token (.+) in JSON at position (\d+)/,
        handler: this.handleUnexpectedToken
      },
      {
        pattern: /Unexpected end of JSON input/,
        handler: this.handleUnexpectedEnd
      },
      {
        pattern: /Expected property name or '\}' in JSON at position (\d+)/,
        handler: this.handleExpectedProperty
      },
      {
        pattern: /Expected ',' or '\]' in JSON at position (\d+)/,
        handler: this.handleExpectedCommaOrBracket
      },
      {
        pattern: /Expected ',' or '\}' in JSON at position (\d+)/,
        handler: this.handleExpectedCommaOrBrace
      },
      {
        pattern: /Duplicate key (.+) in JSON at position (\d+)/,
        handler: this.handleDuplicateKey
      }
    ];
  }
  
  /**
   * 分析JSON错误并提供修复建议
   * @param {string} jsonString - JSON字符串
   * @param {Error} error - 解析错误
   * @returns {Object} 错误分析结果
   */
  analyzeError(jsonString, error) {
    const errorMessage = error.message;
    
    // 查找匹配的错误模式
    for (const { pattern, handler } of this.errorPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        return handler.call(this, jsonString, match);
      }
    }
    
    // 默认错误处理
    return {
      message: errorMessage,
      position: this.findErrorPosition(errorMessage),
      suggestion: '请检查JSON语法是否正确',
      fixable: false
    };
  }
  
  /**
   * 从错误消息中提取错误位置
   * @param {string} errorMessage - 错误消息
   * @returns {number} 错误位置，如果无法确定则返回-1
   */
  findErrorPosition(errorMessage) {
    const posMatch = errorMessage.match(/position (\d+)/);
    return posMatch ? parseInt(posMatch[1]) : -1;
  }
  
  /**
   * 获取错误位置的上下文
   * @param {string} jsonString - JSON字符串
   * @param {number} position - 错误位置
   * @param {number} context - 上下文字符数
   * @returns {Object} 上下文信息
   */
  getErrorContext(jsonString, position, context = 20) {
    if (position < 0 || position >= jsonString.length) {
      return { before: '', after: '' };
    }
    
    const start = Math.max(0, position - context);
    const end = Math.min(jsonString.length, position + context);
    
    return {
      before: jsonString.substring(start, position),
      after: jsonString.substring(position, end)
    };
  }
  
  /**
   * 处理意外标记错误
   * @param {string} jsonString - JSON字符串
   * @param {Array} match - 正则匹配结果
   * @returns {Object} 错误分析结果
   */
  handleUnexpectedToken(jsonString, match) {
    const token = match[1];
    const position = parseInt(match[2]);
    const context = this.getErrorContext(jsonString, position);
    
    let suggestion = '';
    let fixable = false;
    
    // 根据不同的意外标记提供建议
    if (token === "'") {
      suggestion = '使用双引号(")代替单引号(\')作为字符串分隔符';
      fixable = true;
    } else if (token === "n" && jsonString.substr(position, 4) === "null") {
      suggestion = '确保null值前有正确的语法，如逗号或冒号';
    } else if (token === "t" && jsonString.substr(position, 4) === "true") {
      suggestion = '确保true值前有正确的语法，如逗号或冒号';
    } else if (token === "f" && jsonString.substr(position, 5) === "false") {
      suggestion = '确保false值前有正确的语法，如逗号或冒号';
    } else {
      suggestion = `检查位置${position}附近的语法错误`;
    }
    
    return {
      message: `意外标记 ${token} 在位置 ${position}`,
      position,
      context,
      suggestion,
      fixable
    };
  }
  
  /**
   * 处理意外结束错误
   * @param {string} jsonString - JSON字符串
   * @returns {Object} 错误分析结果
   */
  handleUnexpectedEnd(jsonString) {
    const position = jsonString.length - 1;
    const context = this.getErrorContext(jsonString, position);
    
    // 检查是否缺少闭合括号或大括号
    const openBraces = (jsonString.match(/\{/g) || []).length;
    const closeBraces = (jsonString.match(/\}/g) || []).length;
    const openBrackets = (jsonString.match(/\[/g) || []).length;
    const closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    let suggestion = '';
    
    if (openBraces > closeBraces) {
      suggestion = `缺少 ${openBraces - closeBraces} 个闭合大括号 }`;
    } else if (openBrackets > closeBrackets) {
      suggestion = `缺少 ${openBrackets - closeBrackets} 个闭合方括号 ]`;
    } else {
      suggestion = '检查JSON是否完整，可能缺少闭合标记';
    }
    
    return {
      message: '意外的JSON输入结束',
      position,
      context,
      suggestion,
      fixable: true
    };
  }
  
  /**
   * 处理期望属性名错误
   * @param {string} jsonString - JSON字符串
   * @param {Array} match - 正则匹配结果
   * @returns {Object} 错误分析结果
   */
  handleExpectedProperty(jsonString, match) {
    const position = parseInt(match[1]);
    const context = this.getErrorContext(jsonString, position);
    
    return {
      message: `在位置 ${position} 处期望属性名或 '}'`,
      position,
      context,
      suggestion: '检查是否有多余的逗号，或者确保所有属性都有名称',
      fixable: true
    };
  }
  
  /**
   * 处理期望逗号或方括号错误
   * @param {string} jsonString - JSON字符串
   * @param {Array} match - 正则匹配结果
   * @returns {Object} 错误分析结果
   */
  handleExpectedCommaOrBracket(jsonString, match) {
    const position = parseInt(match[1]);
    const context = this.getErrorContext(jsonString, position);
    
    return {
      message: `在位置 ${position} 处期望 ',' 或 ']'`,
      position,
      context,
      suggestion: '检查数组元素之间是否缺少逗号，或者是否有多余的逗号',
      fixable: true
    };
  }
  
  /**
   * 处理期望逗号或大括号错误
   * @param {string} jsonString - JSON字符串
   * @param {Array} match - 正则匹配结果
   * @returns {Object} 错误分析结果
   */
  handleExpectedCommaOrBrace(jsonString, match) {
    const position = parseInt(match[1]);
    const context = this.getErrorContext(jsonString, position);
    
    return {
      message: `在位置 ${position} 处期望 ',' 或 '}'`,
      position,
      context,
      suggestion: '检查对象属性之间是否缺少逗号，或者是否有多余的逗号',
      fixable: true
    };
  }
  
  /**
   * 处理重复键错误
   * @param {string} jsonString - JSON字符串
   * @param {Array} match - 正则匹配结果
   * @returns {Object} 错误分析结果
   */
  handleDuplicateKey(jsonString, match) {
    const key = match[1];
    const position = parseInt(match[2]);
    const context = this.getErrorContext(jsonString, position);
    
    return {
      message: `在位置 ${position} 处有重复的键 ${key}`,
      position,
      context,
      suggestion: `移除或重命名重复的键 ${key}`,
      fixable: true
    };
  }
  
  /**
   * 尝试修复JSON错误
   * @param {string} jsonString - JSON字符串
   * @returns {Object} 修复结果
   */
  tryToFix(jsonString) {
    try {
      // 尝试解析原始JSON
      JSON.parse(jsonString);
      
      // 如果没有错误，直接返回
      return {
        success: true,
        fixed: false,
        result: jsonString
      };
    } catch (error) {
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
      
      try {
        // 尝试解析修复后的JSON
        const parsed = JSON.parse(fixedJson);
        
        return {
          success: true,
          fixed: true,
          result: JSON.stringify(parsed, null, 2),
          data: parsed
        };
      } catch (fixError) {
        // 修复失败，返回错误分析
        return {
          success: false,
          fixed: false,
          error: this.analyzeError(jsonString, error)
        };
      }
    }
  }
}

// 导出错误处理器实例
const errorHandler = new ErrorHandler();