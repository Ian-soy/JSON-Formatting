/**
 * JSON格式化大师 - JSON工具函数
 * 用于处理JSON格式化和压缩
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
  
  /**
   * 检测输入是否为转义的JSON字符串
   * @param {string} input - 要检测的输入字符串
   * @returns {boolean} 是否为转义的JSON字符串
   */
  static isEscapedJsonString(input) {
    if (!input || typeof input !== 'string') {
      console.log('🔍 isEscapedJsonString: 输入为空或不是字符串');
      return false;
    }
    
    const trimmed = input.trim();
    console.log('🔍 isEscapedJsonString: 检测输入:', trimmed.substring(0, 50) + '...');
    
    // 检查是否包含转义字符，特别是JSON相关的转义
    const hasJsonEscapes = /\\["'\/{\[\]},:]/.test(trimmed);
    console.log('🔍 hasJsonEscapes:', hasJsonEscapes);
    
    if (hasJsonEscapes) {
      // 尝试多种解析方式
      
      // 方式1：如果以引号包裹，尝试直接解析
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        console.log('🔍 尝试方式1: 引号包裹的字符串');
        try {
          const unescaped = JSON.parse(trimmed);
          const result = this.looksLikeJson(unescaped);
          console.log('🔍 方式1结果:', result);
          return result;
        } catch (e) {
          console.log('🔍 方式1失败:', e.message);
          return false;
        }
      }
      
      // 方式2：如果不以引号包裹，但包含转义字符，尝试添加引号后解析
      if (!trimmed.startsWith('"') && !trimmed.startsWith("'")) {
        console.log('🔍 尝试方式2: 添加引号后解析');
        try {
          const quoted = '"' + trimmed + '"';
          const unescaped = JSON.parse(quoted);
          const result = this.looksLikeJson(unescaped);
          console.log('🔍 方式2结果:', result);
          return result;
        } catch (e) {
          console.log('🔍 方式2失败:', e.message);
          return false;
        }
      }
    }
    
    console.log('🔍 isEscapedJsonString: 最终返回 false');
    return false;
  }
  
  /**
   * 检查字符串是否看起来像JSON
   * @param {string} str - 要检查的字符串
   * @returns {boolean} 是否看起来像JSON
   */
  static looksLikeJson(str) {
    if (!str || typeof str !== 'string') return false;
    
    const trimmed = str.trim();
    
    // 检查是否以JSON对象或数组的标识符开始和结束
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
           (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }
  
  /**
   * 尝试解析转义的JSON字符串
   * @param {string} input - 输入的转义JSON字符串
   * @returns {Object} 解析结果
   */
  static parseEscapedJson(input) {
    try {
      if (!input || typeof input !== 'string') {
        return {
          success: false,
          error: '输入不是有效的字符串'
        };
      }
      
      const trimmed = input.trim();
      
      // 如果已经是有效的JSON，直接返回
      if (this.isValid(trimmed)) {
        return {
          success: true,
          result: trimmed,
          wasEscaped: false
        };
      }
      
      // 尝试解析转义的JSON字符串
      if (this.isEscapedJsonString(trimmed)) {
        let unescaped;
        
        // 如果以引号开始和结束，直接解析
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          unescaped = JSON.parse(trimmed);
        } else {
          // 如果不以引号开始，添加引号后解析
          const quoted = '"' + trimmed + '"';
          unescaped = JSON.parse(quoted);
        }
        
        // 验证解析后的内容是否为有效JSON
        if (this.isValid(unescaped)) {
          return {
            success: true,
            result: unescaped,
            wasEscaped: true
          };
        }
      }
      
      // 新增：尝试处理包含转义引号的JSON字符串
      if (this.containsEscapedQuotes(trimmed)) {
        try {
          // 直接解析包含转义引号的JSON字符串
          const parsed = JSON.parse(trimmed);
          return {
            success: true,
            result: parsed,
            wasEscaped: true
          };
        } catch (e) {
          // 如果直接解析失败，尝试清理转义字符
          const cleaned = this.cleanEscapedString(trimmed);
          if (cleaned && this.isValid(cleaned)) {
            const parsed = JSON.parse(cleaned);
            return {
              success: true,
              result: parsed,
              wasEscaped: true
            };
          }
        }
      }
      
      // 如果不是转义字符串，但可能是直接的JSON字符串
      return {
        success: false,
        error: '输入不是有效的JSON或转义JSON字符串'
      };
      
    } catch (error) {
      return {
        success: false,
        error: `解析错误: ${error.message}`
      };
    }
  }
  
  /**
   * 智能格式化JSON（自动处理转义字符串）
   * @param {string} jsonString - 要格式化的JSON字符串（可能包含转义）
   * @param {number} indentation - 缩进空格数
   * @returns {Object} 包含格式化结果的对象
   */
  static smartFormat(jsonString, indentation = 2) {
    try {
      // 如果输入为空，返回空对象
      if (!jsonString.trim()) {
        return {
          success: true,
          result: '{}',
          data: {},
          wasEscaped: false
        };
      }
      
      // 首先尝试直接解析
      if (this.isValid(jsonString)) {
        const parsed = JSON.parse(jsonString);
        const formatted = JSON.stringify(parsed, null, indentation);
        
        return {
          success: true,
          result: formatted,
          data: parsed,
          wasEscaped: false
        };
      }
      
      // 如果直接解析失败，尝试解析转义字符串
      const escapeResult = this.parseEscapedJson(jsonString);
      if (escapeResult.success) {
        const parsed = typeof escapeResult.result === 'string' ? 
                      JSON.parse(escapeResult.result) : escapeResult.result;
        const formatted = JSON.stringify(parsed, null, indentation);
        
        return {
          success: true,
          result: formatted,
          data: parsed,
          wasEscaped: escapeResult.wasEscaped
        };
      }
      
      return {
        success: false,
        error: escapeResult.error || '无法解析JSON'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查字符串是否包含转义引号
   * @param {string} str - 要检查的字符串
   * @returns {boolean} 是否包含转义引号
   */
  static containsEscapedQuotes(str) {
    if (!str || typeof str !== 'string') return false;
    
    // 检查是否包含转义引号
    return /\\"/.test(str);
  }
  
  /**
   * 清理转义字符串，尝试转换为标准JSON格式
   * @param {string} str - 包含转义的字符串
   * @returns {string|null} 清理后的字符串，如果失败返回null
   */
  static cleanEscapedString(str) {
    if (!str || typeof str !== 'string') return null;
    
    try {
      // 如果字符串看起来像JSON（以[或{开始，以]或}结束）
      if ((str.startsWith('[') && str.endsWith(']')) ||
          (str.startsWith('{') && str.endsWith('}'))) {
        
        // 尝试直接解析
        JSON.parse(str);
        return str;
      }
      
      // 如果字符串被引号包裹，尝试解析
      if ((str.startsWith('"') && str.endsWith('"')) ||
          (str.startsWith("'") && str.endsWith("'"))) {
        const unescaped = JSON.parse(str);
        // 如果解析成功，返回JSON字符串
        return JSON.stringify(unescaped);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 详细分析JSON格式错误，定位到具体行号和问题
   * @param {string} jsonString - 要分析的JSON字符串
   * @returns {Object} 包含详细错误分析的对象
   */
  static analyzeJsonErrors(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return {
        success: false,
        error: '输入不是有效的字符串',
        lineErrors: []
      };
    }

    const lines = jsonString.split('\n');
    const lineErrors = [];
    let currentLine = 0;
    let currentColumn = 0;
    let bracketStack = [];
    let braceStack = [];
    let quoteStack = [];
    let inString = false;
    let escapeNext = false;

    // 逐行分析
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;
      currentColumn = 0;

      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        const prevChar = charIndex > 0 ? line[charIndex - 1] : '';
        const nextChar = charIndex < line.length - 1 ? line[charIndex + 1] : '';

        // 处理转义字符
        if (escapeNext) {
          escapeNext = false;
          currentColumn++;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          currentColumn++;
          continue;
        }

        // 处理字符串
        if (char === '"' && !escapeNext) {
          if (inString) {
            quoteStack.pop();
            inString = false;
          } else {
            quoteStack.push({ line: lineNumber, column: currentColumn + 1 });
            inString = true;
          }
        }

        // 处理括号和方括号
        if (!inString) {
          if (char === '{') {
            braceStack.push({ line: lineNumber, column: currentColumn + 1 });
          } else if (char === '}') {
            if (braceStack.length === 0) {
              lineErrors.push({
                line: lineNumber,
                column: currentColumn + 1,
                type: 'error',
                message: '意外的闭合大括号，没有对应的开始大括号',
                char: char,
                suggestion: '检查是否有多余的 } 或缺少 {'
              });
            } else {
              braceStack.pop();
            }
          } else if (char === '[') {
            bracketStack.push({ line: lineNumber, column: currentColumn + 1 });
          } else if (char === ']') {
            if (bracketStack.length === 0) {
              lineErrors.push({
                line: lineNumber,
                column: currentColumn + 1,
                type: 'error',
                message: '意外的闭合方括号，没有对应的开始方括号',
                char: char,
                suggestion: '检查是否有多余的 ] 或缺少 ['
              });
            } else {
              bracketStack.pop();
            }
          }
        }

        currentColumn++;
      }

      // 检查行级别的语法问题
      const syntaxErrors = this.checkLineSyntax(line, lineNumber);
      if (syntaxErrors.length > 0) {
        lineErrors.push(...syntaxErrors);
      }
    }

    // 检查未闭合的括号和引号
    if (braceStack.length > 0) {
      braceStack.forEach(brace => {
        lineErrors.push({
          line: brace.line,
          column: brace.column,
          type: 'error',
          message: '未闭合的大括号',
          char: '{',
          suggestion: '在适当位置添加 } 来闭合对象'
        });
      });
    }

    if (bracketStack.length > 0) {
      bracketStack.forEach(bracket => {
        lineErrors.push({
          line: bracket.line,
          column: bracket.column,
          type: 'error',
          message: '未闭合的方括号',
          char: '[',
          suggestion: '在适当位置添加 ] 来闭合数组'
        });
      });
    }

    if (quoteStack.length > 0) {
      quoteStack.forEach(quote => {
        lineErrors.push({
          line: quote.line,
          column: quote.column,
          type: 'error',
          message: '未闭合的引号',
          char: '"',
          suggestion: '在适当位置添加 " 来闭合字符串'
        });
      });
    }

    // 尝试解析以获取更具体的错误信息
    try {
      JSON.parse(jsonString);
      return {
        success: true,
        lineErrors: lineErrors
      };
    } catch (parseError) {
      // 分析解析错误，定位到具体位置
      const parseErrorInfo = this.analyzeParseError(parseError, jsonString, lines);
      if (parseErrorInfo) {
        lineErrors.push(parseErrorInfo);
      }

      return {
        success: false,
        error: parseError.message,
        lineErrors: lineErrors
      };
    }
  }

  /**
   * 检查单行语法问题
   * @param {string} line - 单行内容
   * @param {number} lineNumber - 行号
   * @returns {Array} 行级错误数组
   */
  static checkLineSyntax(line, lineNumber) {
    const errors = [];
    const trimmedLine = line.trim();

    // 检查尾随逗号
    if (trimmedLine.endsWith(',') && !trimmedLine.endsWith('},') && !trimmedLine.endsWith('],')) {
      errors.push({
        line: lineNumber,
        column: line.length,
        type: 'warning',
        message: '尾随逗号',
        char: ',',
        suggestion: '移除多余的逗号'
      });
    }

    // 检查缺少逗号
    if (trimmedLine.endsWith('}') || trimmedLine.endsWith(']')) {
      // 这里需要更复杂的上下文分析
    }

    // 检查单引号
    if (trimmedLine.includes("'") && !trimmedLine.includes('"')) {
      const singleQuoteIndex = trimmedLine.indexOf("'");
      errors.push({
        line: lineNumber,
        column: singleQuoteIndex + 1,
        type: 'error',
        message: '使用了单引号，JSON标准要求使用双引号',
        char: "'",
        suggestion: '将单引号替换为双引号'
      });
    }

    // 检查缺少引号的键
    const keyPattern = /([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/;
    const keyMatch = trimmedLine.match(keyPattern);
    if (keyMatch) {
      const keyStart = trimmedLine.indexOf(keyMatch[2]);
      errors.push({
        line: lineNumber,
        column: keyStart + 1,
        type: 'error',
        message: '对象键缺少引号',
        char: keyMatch[2],
        suggestion: '为对象键添加双引号，如 "' + keyMatch[2] + '":'
      });
    }

    return errors;
  }

  /**
   * 分析JSON.parse的错误信息，定位到具体位置
   * @param {Error} parseError - JSON.parse抛出的错误
   * @param {string} jsonString - 原始JSON字符串
   * @param {Array} lines - 按行分割的数组
   * @returns {Object|null} 错误信息对象
   */
  static analyzeParseError(parseError, jsonString, lines) {
    const errorMessage = parseError.message;
    
    // 提取位置信息
    const positionMatch = errorMessage.match(/position (\d+)/);
    if (!positionMatch) return null;

    const position = parseInt(positionMatch[1]);
    
    // 计算行号和列号
    let currentPos = 0;
    let lineNumber = 1;
    let columnNumber = 1;

    for (let i = 0; i < jsonString.length; i++) {
      if (i === position) break;
      
      if (jsonString[i] === '\n') {
        lineNumber++;
        columnNumber = 1;
      } else {
        columnNumber++;
      }
      currentPos++;
    }

    // 分析错误类型
    let errorType = 'error';
    let suggestion = '';

    if (errorMessage.includes('Unexpected token')) {
      const tokenMatch = errorMessage.match(/Unexpected token (.+)/);
      const token = tokenMatch ? tokenMatch[1] : '未知字符';
      
      if (token.includes("'")) {
        suggestion = '检查是否使用了单引号，JSON标准要求使用双引号';
      } else if (token.includes('}') || token.includes(']')) {
        suggestion = '检查是否有多余的闭合括号或缺少开始括号';
      } else if (token.includes('{') || token.includes('[')) {
        suggestion = '检查是否缺少逗号分隔符';
      } else {
        suggestion = '检查语法是否正确，确保符合JSON格式规范';
      }
    } else if (errorMessage.includes('Unexpected end')) {
      suggestion = '检查是否缺少闭合的括号、方括号或大括号';
    } else if (errorMessage.includes('Unexpected number')) {
      suggestion = '检查数字格式是否正确，确保数字不在字符串中';
    }

    return {
      line: lineNumber,
      column: columnNumber,
      type: errorType,
      message: errorMessage,
      char: jsonString[position] || '未知',
      suggestion: suggestion,
      position: position
    };
  }
}

// 导出JSON工具类
window.JsonUtils = JsonUtils;