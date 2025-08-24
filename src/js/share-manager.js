/**
 * JSON格式化大师 - 分享管理模块
 * 用于处理JSON数据的分享功能
 * 支持数据压缩和自动解析功能
 */

class ShareManager {
  constructor() {
    // 分享服务的基础URL（模拟）
    this.shareBaseUrl = 'https://jsonmaster.share/view';
    
    // URL最大长度限制（考虑浏览器兼容性）
    this.maxUrlLength = 2000;
    
    // 压缩阈值：当JSON字符串超过此长度时进行压缩
    this.compressionThreshold = 300;
    
    // 大数据阈值：超过此阈值的数据使用高级压缩
    this.largeDataThreshold = 1500;
    
    // 极大数据阈值：超过此阈值的数据使用最大压缩比例
    this.extremeDataThreshold = 5000;
    
    // 超大数据阈值：超过此阈值建议使用文件下载
    this.maxProcessableSize = 20000;
    
    // 缓存压缩结果，提高性能
    this.compressionCache = new Map();
  }
  
  /**
   * 生成分享链接（增强版）
   * @param {Object|string} jsonData - JSON数据或JSON字符串
   * @returns {Object} 分享结果对象
   */
  generateShareLink(jsonData) {
    try {
      // 确保数据是对象
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const originalSize = JSON.stringify(data).length;
      
      // 检查数据大小是否超过极限阈值
      if (originalSize > this.maxProcessableSize) {
        return {
          success: false,
          error: 'DATA_TOO_LARGE',
          originalSize,
          maxSize: this.maxProcessableSize,
          recommendAction: 'DOWNLOAD_FILE',
          message: `JSON数据过大（${(originalSize / 1024).toFixed(1)}KB），超过最大支持的${(this.maxProcessableSize / 1024).toFixed(1)}KB限制。建议使用文件下载方式分享。`
        };
      }
      
      // 使用优化的编码方法
      const encodedData = this.encodeDataOptimized(data);
      
      // 生成分享链接
      const shareLink = `${this.shareBaseUrl}?data=${encodedData}`;
      
      // 检查URL长度
      if (shareLink.length > this.maxUrlLength) {
        return {
          success: false,
          error: 'URL_TOO_LONG',
          originalSize,
          urlLength: shareLink.length,
          maxUrlLength: this.maxUrlLength,
          recommendAction: 'DOWNLOAD_FILE',
          message: `分享链接过长（${shareLink.length}字符），超过浏览器限制。建议使用文件下载方式分享。`
        };
      }
      
      return {
        success: true,
        shareLink,
        stats: this.getShareLinkStats(data)
      };
    } catch (error) {
      console.error('生成分享链接错误:', error);
      return {
        success: false,
        error: 'GENERATION_ERROR',
        message: `生成分享链接失败: ${error.message}`
      };
    }
  }
  
  /**
   * 生成下载文件名
   * @param {Object} data - JSON数据
   * @returns {string} 文件名
   */
  generateDownloadFileName(data) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const size = JSON.stringify(data).length;
    const sizeLabel = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${(size / 1024).toFixed(1)}KB`;
    return `json-data-${timestamp}-${sizeLabel}.json`;
  }
  
  /**
   * 编码JSON数据（向后兼容）
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
   * 优化的编码方法（支持分级压缩和高效编码）
   * @param {Object} data - JSON数据
   * @returns {string} 编码后的数据
   */
  encodeDataOptimized(data) {
    try {
      // 生成缓存键
      const cacheKey = this.generateCacheKey(data);
      if (this.compressionCache.has(cacheKey)) {
        return this.compressionCache.get(cacheKey);
      }
      
      // 将对象转换为JSON字符串
      let jsonString = JSON.stringify(data);
      const originalLength = jsonString.length;
      
      // 基础优化：移除不必要的空格
      jsonString = jsonString.replace(/\s+/g, ' ').trim();
      
      let compressed = false;
      let compressionLevel = 0;
      
      // 分级压缩处理
      if (originalLength > this.compressionThreshold) {
        if (originalLength > this.extremeDataThreshold) {
          // 极大数据：使用最大压缩
          jsonString = this.advancedCompress(jsonString, 3);
          compressionLevel = 3;
          compressed = true;
        } else if (originalLength > this.largeDataThreshold) {
          // 大数据：使用高级压缩
          jsonString = this.advancedCompress(jsonString, 2);
          compressionLevel = 2;
          compressed = true;
        } else {
          // 中等数据：使用基础压缩
          const compressedString = this.simpleCompress(jsonString);
          if (compressedString.length < jsonString.length * 0.85) {
            jsonString = compressedString;
            compressionLevel = 1;
            compressed = true;
          }
        }
      }
      
      // 使用高效编码方案
      const encodingResult = this.selectBestEncoding(jsonString);
      
      // 添加压缩标记和编码类型
      let result;
      if (compressed) {
        result = `c${compressionLevel}${encodingResult.type}:${encodingResult.encoded}`;
      } else {
        result = `${encodingResult.type}:${encodingResult.encoded}`;
      }
      
      // 缓存结果（限制缓存大小）
      if (this.compressionCache.size < 50) {
        this.compressionCache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error('优化编码数据错误:', error);
      throw error;
    }
  }
  
  /**
   * 选择最佳编码方案
   * @param {string} data - 待编码的数据
   * @returns {Object} 编码结果 {type, encoded, efficiency}
   */
  selectBestEncoding(data) {
    const results = [];
    
    // 方案1: Base62编码 (URL安全，比Base64更紧凑)
    const base62Result = this.encodeBase62(data);
    results.push({ type: 'b62', encoded: base62Result, efficiency: this.calculateEncodingEfficiency(data, base62Result) });
    
    // 方案2: 十六进制编码 (对于某些数据更高效)
    const hexResult = this.encodeHex(data);
    results.push({ type: 'hex', encoded: hexResult, efficiency: this.calculateEncodingEfficiency(data, hexResult) });
    
    // 方案3: 混合编码 (ASCII + 压缩数字)
    const hybridResult = this.encodeHybrid(data);
    results.push({ type: 'hyb', encoded: hybridResult, efficiency: this.calculateEncodingEfficiency(data, hybridResult) });
    
    // 方案4: URL安全的Base64变体 (作为保底方案)
    const base64UrlResult = this.encodeBase64Url(data);
    results.push({ type: 'b64', encoded: base64UrlResult, efficiency: this.calculateEncodingEfficiency(data, base64UrlResult) });
    
    // 选择最高效的编码方案
    const bestResult = results.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );
    
    return bestResult;
  }
  
  /**
   * Base62编码 (使用62个URL安全字符)
   * @param {string} data - 待编码数据
   * @returns {string} Base62编码结果
   */
  encodeBase62(data) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new TextEncoder().encode(data);
    
    let result = '';
    let value = 0;
    let bits = 0;
    
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      
      while (bits >= 6) {
        bits -= 6;
        result += chars[(value >> bits) & 63];
      }
    }
    
    if (bits > 0) {
      result += chars[(value << (6 - bits)) & 63];
    }
    
    return result;
  }
  
  /**
   * 十六进制编码（针对二进制数据优化）
   * @param {string} data - 待编码数据
   * @returns {string} 十六进制编码结果
   */
  encodeHex(data) {
    const bytes = new TextEncoder().encode(data);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * 混合编码（ASCII字符直接存储，其他字符使用转义）
   * @param {string} data - 待编码数据
   * @returns {string} 混合编码结果
   */
  encodeHybrid(data) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const code = char.charCodeAt(0);
      
      // ASCII可打印字符且URL安全的直接使用
      if ((code >= 48 && code <= 57) ||   // 0-9
          (code >= 65 && code <= 90) ||   // A-Z
          (code >= 97 && code <= 122) ||  // a-z
          '-.~_'.includes(char)) {
        result += char;
      } else {
        // 其他字符使用紧凑的转义格式
        if (code < 256) {
          result += '~' + code.toString(36).toUpperCase();
        } else {
          result += '~~' + code.toString(36).toUpperCase();
        }
      }
    }
    return result;
  }
  
  /**
   * URL安全的Base64编码
   * @param {string} data - 待编码数据
   * @returns {string} URL安全的Base64编码结果
   */
  encodeBase64Url(data) {
    const base64 = btoa(unescape(encodeURIComponent(data)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  /**
   * 计算编码效率
   * @param {string} original - 原始数据
   * @param {string} encoded - 编码后数据
   * @returns {number} 效率分数 (越高越好)
   */
  calculateEncodingEfficiency(original, encoded) {
    // 基础效率：编码长度的倒数
    const lengthEfficiency = original.length / encoded.length;
    
    // URL兼容性加分（避免需要进一步转义）
    const urlSafeBonus = /[^A-Za-z0-9._~-]/.test(encoded) ? 0.9 : 1.0;
    
    return lengthEfficiency * urlSafeBonus;
  }
  
  /**
   * 简单的字符串压缩算法
   * @param {string} str - 待压缩的字符串
   * @returns {string} 压缩后的字符串
   */
  simpleCompress(str) {
    const tokens = {
      '"': '§1',
      '{': '§2',
      '}': '§3',
      '[': '§4',
      ']': '§5',
      ',': '§6',
      ':': '§7',
      'null': '§8',
      'true': '§9',
      'false': '§A'
    };
    
    let compressed = str;
    for (const [original, token] of Object.entries(tokens)) {
      compressed = compressed.split(original).join(token);
    }
    
    return compressed;
  }
  
  /**
   * 高级压缩算法（针对大数据量优化）
   * @param {string} str - 待压缩的字符串
   * @param {number} level - 压缩级别 (1-3)
   * @returns {string} 压缩后的字符串
   */
  advancedCompress(str, level = 2) {
    // 先进行基础压缩
    let compressed = this.simpleCompress(str);
    
    if (level >= 2) {
      // 级别2: 添加常见字符串模式压缩
      const patterns = {
        '§1id§7': '§B',    // "id":
        '§1name§7': '§C',  // "name":
        '§1type§7': '§D',  // "type":
        '§1value§7': '§E', // "value":
        '§1data§7': '§F',  // "data":
        '§1status§7': '§G',// "status":
        '§1url§7': '§H',   // "url":
        '§1email§7': '§I', // "email":
        '§1phone§7': '§J', // "phone":
        '§1address§7': '§K'// "address":
      };
      
      for (const [pattern, token] of Object.entries(patterns)) {
        compressed = compressed.split(pattern).join(token);
      }
    }
    
    if (level >= 3) {
      // 级别3: 最大压缩 - 重复子字符串压缩
      compressed = this.compressRepeatedPatterns(compressed);
    }
    
    return compressed;
  }
  
  /**
   * 压缩重复模式（针对极大数据）
   * @param {string} str - 待压缩的字符串
   * @returns {string} 压缩后的字符串
   */
  compressRepeatedPatterns(str) {
    // 查找并压缩长度大于5的重复子字符串
    const minPatternLength = 5;
    const patterns = new Map();
    
    // 扫描字符串找到重复模式
    for (let i = 0; i <= str.length - minPatternLength; i++) {
      for (let len = minPatternLength; len <= Math.min(20, str.length - i); len++) {
        const pattern = str.substring(i, i + len);
        const count = (str.match(new RegExp(this.escapeRegExp(pattern), 'g')) || []).length;
        
        if (count > 1 && pattern.length * count > pattern.length + 3) {
          patterns.set(pattern, count);
        }
      }
    }
    
    // 按节省效果排序
    const sortedPatterns = Array.from(patterns.entries())
      .sort(([a, countA], [b, countB]) => (b.length * countB) - (a.length * countA))
      .slice(0, 10); // 只处理前10个最有效的模式
    
    let compressed = str;
    let tokenIndex = 0x80; // 使用高位字符
    
    for (const [pattern] of sortedPatterns) {
      if (tokenIndex > 0x9F) break; // 限制token数量
      
      const token = String.fromCharCode(tokenIndex++);
      compressed = compressed.split(pattern).join(token);
      
      // 在开头添加映射信息
      compressed = `${token}=${pattern};${compressed}`;
    }
    
    return compressed;
  }
  
  /**
   * 转义正则表达式特殊字符
   * @param {string} string - 待转义的字符串
   * @returns {string} 转义后的字符串
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 生成缓存键
   * @param {Object} data - JSON数据
   * @returns {string} 缓存键
   */
  generateCacheKey(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }
  
  /**
   * 简单的字符串解压算法
   * @param {string} str - 待解压的字符串
   * @returns {string} 解压后的字符串
   */
  simpleDecompress(str) {
    const tokens = {
      '§1': '"',
      '§2': '{',
      '§3': '}',
      '§4': '[',
      '§5': ']',
      '§6': ',',
      '§7': ':',
      '§8': 'null',
      '§9': 'true',
      '§A': 'false'
    };
    
    let decompressed = str;
    for (const [token, original] of Object.entries(tokens)) {
      decompressed = decompressed.split(token).join(original);
    }
    
    return decompressed;
  }
  
  /**
   * 高级解压算法
   * @param {string} str - 待解压的字符串
   * @param {number} level - 压缩级别
   * @returns {string} 解压后的字符串
   */
  advancedDecompress(str, level = 2) {
    let decompressed = str;
    
    if (level >= 3) {
      // 级别3: 先解压重复模式
      decompressed = this.decompressRepeatedPatterns(decompressed);
    }
    
    if (level >= 2) {
      // 级别2: 解压常见模式
      const patterns = {
        '§B': '§1id§7',
        '§C': '§1name§7',
        '§D': '§1type§7',
        '§E': '§1value§7',
        '§F': '§1data§7',
        '§G': '§1status§7',
        '§H': '§1url§7',
        '§I': '§1email§7',
        '§J': '§1phone§7',
        '§K': '§1address§7'
      };
      
      for (const [token, pattern] of Object.entries(patterns)) {
        decompressed = decompressed.split(token).join(pattern);
      }
    }
    
    // 最后进行基础解压
    return this.simpleDecompress(decompressed);
  }
  
  /**
   * 解压重复模式
   * @param {string} str - 待解压的字符串
   * @returns {string} 解压后的字符串
   */
  decompressRepeatedPatterns(str) {
    let decompressed = str;
    
    // 解析映射信息
    const mappings = [];
    let currentStr = decompressed;
    
    while (currentStr.indexOf('=') > 0 && currentStr.indexOf(';') > currentStr.indexOf('=')) {
      const tokenChar = currentStr.charAt(0);
      const equalPos = currentStr.indexOf('=');
      const semicolonPos = currentStr.indexOf(';');
      
      if (equalPos === 1 && semicolonPos > equalPos) {
        const pattern = currentStr.substring(equalPos + 1, semicolonPos);
        mappings.push({ token: tokenChar, pattern });
        currentStr = currentStr.substring(semicolonPos + 1);
      } else {
        break;
      }
    }
    
    // 应用映射
    decompressed = currentStr;
    for (const { token, pattern } of mappings.reverse()) {
      decompressed = decompressed.split(token).join(pattern);
    }
    
    return decompressed;
  }
  
  /**
   * 解码分享数据（支持多级压缩格式和多种编码）
   * @param {string} encodedData - 编码后的数据
   * @returns {Object} 解码后的JSON数据
   */
  decodeData(encodedData) {
    try {
      // 检查压缩格式和编码类型
      let dataToDecrypt = encodedData;
      let compressionLevel = 0;
      let encodingType = 'b64'; // 默认Base64编码兼容
      
      // 支持新格式: c1b62:, c2hex:, c3hyb: 等和旧格式: c:
      if (encodedData.includes(':')) {
        const parts = encodedData.split(':');
        const prefix = parts[0];
        dataToDecrypt = parts.slice(1).join(':'); // 处理数据中包含':'的情况
        
        if (prefix === 'c') {
          // 旧格式兼容
          compressionLevel = 1;
          encodingType = 'b64';
        } else if (/^c[1-3][a-z]+$/.test(prefix)) {
          // 新格式: c + 压缩级别 + 编码类型
          compressionLevel = parseInt(prefix.charAt(1));
          encodingType = prefix.substring(2);
        } else if (/^[a-z]+$/.test(prefix)) {
          // 无压缩格式: 仅编码类型
          compressionLevel = 0;
          encodingType = prefix;
        }
      }
      
      // 根据编码类型进行解码
      let jsonString;
      switch (encodingType) {
        case 'b62':
          jsonString = this.decodeBase62(dataToDecrypt);
          break;
        case 'hex':
          jsonString = this.decodeHex(dataToDecrypt);
          break;
        case 'hyb':
          jsonString = this.decodeHybrid(dataToDecrypt);
          break;
        case 'b64':
        default:
          jsonString = this.decodeBase64Url(dataToDecrypt);
          break;
      }
      
      // 根据压缩级别进行解压
      if (compressionLevel > 0) {
        if (compressionLevel === 1) {
          jsonString = this.simpleDecompress(jsonString);
        } else {
          jsonString = this.advancedDecompress(jsonString, compressionLevel);
        }
      }
      
      // 解析JSON字符串
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('解码数据错误:', error);
      throw error;
    }
  }
  
  /**
   * Base62解码
   * @param {string} encoded - Base62编码数据
   * @returns {string} 解码后的数据
   */
  decodeBase62(encoded) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charToIndex = Object.fromEntries(chars.split('').map((char, index) => [char, index]));
    
    const bytes = [];
    let value = 0;
    let bits = 0;
    
    for (const char of encoded) {
      const index = charToIndex[char];
      if (index === undefined) continue;
      
      value = (value << 6) | index;
      bits += 6;
      
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 255);
      }
    }
    
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  
  /**
   * 十六进制解码
   * @param {string} encoded - 十六进制编码数据
   * @returns {string} 解码后的数据
   */
  decodeHex(encoded) {
    const bytes = [];
    for (let i = 0; i < encoded.length; i += 2) {
      bytes.push(parseInt(encoded.substr(i, 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  
  /**
   * 混合编码解码
   * @param {string} encoded - 混合编码数据
   * @returns {string} 解码后的数据
   */
  decodeHybrid(encoded) {
    let result = '';
    let i = 0;
    
    while (i < encoded.length) {
      const char = encoded[i];
      
      if (char === '~') {
        if (i + 1 < encoded.length && encoded[i + 1] === '~') {
          // 双波浪线: Unicode字符
          let j = i + 2;
          while (j < encoded.length && /[0-9A-Z]/.test(encoded[j])) {
            j++;
          }
          const code = parseInt(encoded.substring(i + 2, j), 36);
          result += String.fromCharCode(code);
          i = j;
        } else {
          // 单波浪线: 扩展ASCII字符
          let j = i + 1;
          while (j < encoded.length && /[0-9A-Z]/.test(encoded[j])) {
            j++;
          }
          const code = parseInt(encoded.substring(i + 1, j), 36);
          result += String.fromCharCode(code);
          i = j;
        }
      } else {
        // 直接字符
        result += char;
        i++;
      }
    }
    
    return result;
  }
  
  /**
   * URL安全Base64解码
   * @param {string} encoded - URL安全Base64编码数据
   * @returns {string} 解码后的数据
   */
  decodeBase64Url(encoded) {
    // 恢复标准Base64格式
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    
    // 添加填充字符
    while (base64.length % 4) {
      base64 += '=';
    }
    
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch (error) {
      // 兼容旧的Base64格式
      return decodeURIComponent(escape(atob(encoded)));
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
   * 检测字符串是否为有效的分享链接
   * @param {string} text - 待检测的文本
   * @returns {boolean} 是否为分享链接
   */
  isShareLink(text) {
    try {
      console.log('检查是否为分享链接:', text);
      
      if (!text || typeof text !== 'string') {
        console.log('文本为空或类型不正确');
        return false;
      }
      
      // 检查是否包含分享域名
      const baseDomain = this.shareBaseUrl.replace('https://', '').replace('http://', '');
      console.log('基础域名:', baseDomain);
      console.log('是否包含域名:', text.includes(baseDomain));
      
      if (!text.includes(baseDomain)) {
        console.log('不包含分享域名');
        return false;
      }
      
      // 尝试解析URL
      const urlObj = new URL(text);
      console.log('解析的URL对象:', urlObj);
      console.log('是否有data参数:', urlObj.searchParams.has('data'));
      
      // 检查是否有data参数
      return urlObj.searchParams.has('data');
    } catch (error) {
      console.error('检查分享链接错误:', error);
      return false;
    }
  }
  
  /**
   * 复制分享链接到剪贴板
   * @param {string} link - 分享链接
   * @returns {Promise<boolean>} 是否成功复制
   */
  async copyShareLink(link) {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        return true;
      }
      
      // 回退到传统方法
      const input = document.createElement('input');
      input.value = link;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
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
  
  /**
   * 获取分享链接的统计信息（针对大数据优化）
   * @param {string} jsonData - JSON数据
   * @returns {Object} 统计信息
   */
  getShareLinkStats(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const originalSize = JSON.stringify(data).length;
      const encodedData = this.encodeDataOptimized(data);
      const finalUrl = `${this.shareBaseUrl}?data=${encodedData}`;
      
      // 检测压缩级别和编码类型
      let compressionLevel = 0;
      let compressionType = '无压缩';
      let encodingType = 'Base64';
      
      if (encodedData.includes(':')) {
        const prefix = encodedData.split(':')[0];
        
        if (prefix === 'c') {
          // 旧格式兼容
          compressionLevel = 1;
          compressionType = '基础压缩';
          encodingType = 'Base64';
        } else if (/^c[1-3][a-z]+$/.test(prefix)) {
          // 新格式: c + 压缩级别 + 编码类型
          compressionLevel = parseInt(prefix.charAt(1));
          compressionType = ['基础压缩', '高级压缩', '最大压缩'][compressionLevel - 1];
          
          const encType = prefix.substring(2);
          encodingType = {
            'b62': 'Base62(高效)',
            'hex': '十六进制',
            'hyb': '混合编码(最佳)',
            'b64': 'Base64'
          }[encType] || 'Base64';
        } else if (/^[a-z]+$/.test(prefix)) {
          // 无压缩格式
          compressionLevel = 0;
          compressionType = '无压缩';
          
          encodingType = {
            'b62': 'Base62(高效)',
            'hex': '十六进制',
            'hyb': '混合编码(最佳)',
            'b64': 'Base64'
          }[prefix] || 'Base64';
        }
      }
      
      // 计算编码后大小（去除标记）
      const encodedSize = encodedData.includes(':') ? 
        encodedData.split(':').slice(1).join(':').length :
        encodedData.length;
      
      const compressionRatio = compressionLevel > 0 ? 
        ((originalSize - encodedSize) / originalSize * 100).toFixed(1) : '0.0';
      
      return {
        originalSize,
        encodedSize,
        finalUrlLength: finalUrl.length,
        compressionRatio,
        compressionLevel,
        compressionType,
        encodingType,
        isCompressed: compressionLevel > 0,
        withinUrlLimit: finalUrl.length <= this.maxUrlLength,
        dataCategory: this.categorizeDataSize(originalSize),
        efficiency: this.calculateEfficiency(originalSize, encodedSize)
      };
    } catch (error) {
      console.error('获取分享链接统计错误:', error);
      return null;
    }
  }
  
  /**
   * 分类数据大小
   * @param {number} size - 数据大小
   * @returns {string} 数据类别
   */
  categorizeDataSize(size) {
    if (size < this.compressionThreshold) return '小型数据';
    if (size < this.largeDataThreshold) return '中型数据';
    if (size < this.extremeDataThreshold) return '大型数据';
    return '极大数据';
  }
  
  /**
   * 计算压缩效率
   * @param {number} originalSize - 原始大小
   * @param {number} compressedSize - 压缩后大小
   * @returns {string} 效率等级
   */
  calculateEfficiency(originalSize, compressedSize) {
    const ratio = compressedSize / originalSize;
    if (ratio > 0.9) return '低效';
    if (ratio > 0.7) return '中等';
    if (ratio > 0.5) return '高效';
    return '极高';
  }
}

// 导出分享管理器实例
const shareManager = new ShareManager();

// 如果在浏览器环境中，添加全局可访问性
if (typeof window !== 'undefined') {
  window.shareManager = shareManager;
}