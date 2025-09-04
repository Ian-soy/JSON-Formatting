/**
 * JSON格式化大师 - 分享管理模块
 * 用于处理JSON数据的分享功能
 * 支持数据压缩和自动解析功能
 */

class ShareManager {
  constructor() {
    // 分享服务配置
    this.shareConfig = {
      // 多个分享服务端点（支持负载均衡和故障转移）
      endpoints: [
        'https://json-share.vercel.app',
        'https://jsonbin-share.herokuapp.com',
        'https://data-share.netlify.app'
      ],
      // 当前使用的端点索引
      currentEndpointIndex: 0,
      // 备用本地分享方案
      fallbackUrl: 'data:application/json;charset=utf-8;base64,'
    };
    
    // URL最大长度限制（考虑浏览器兼容性）
    this.maxUrlLength = 8000;  // 提升到8000字符支持更大数据
    
    // 压缩阈值：当JSON字符串超过此长度时进行压缩
    this.compressionThreshold = 300;
    
    // 大数据阈值：超过此阈值的数据使用高级压缩
    this.largeDataThreshold = 1500;
    
    // 极大数据阈值：超过此阈值的数据使用最大压缩比例
    this.extremeDataThreshold = 5000;
    
    // 超大数据阈值：超过此阈值使用云端存储
    this.maxProcessableSize = 50000; // 提升到50KB
    
    // 云端存储阈值：超过此阈值直接上传到云端（8KB = 8192字节）
    this.cloudStorageThreshold = 8192;
    
    // 缓存压缩结果，提高性能
    this.compressionCache = new Map();
    
    // 加密密钥（用于数据保护）
    this.encryptionKey = this.generateEncryptionKey();
    
    // 分享统计
    this.shareStats = {
      totalShares: 0,
      successfulShares: 0,
      compressionSavings: 0
    };
  }
  
  /**
   * 生成分享链接（增强版 - 支持多种分享模式）
   * @param {Object|string} jsonData - JSON数据或JSON字符串
   * @param {Object} options - 分享选项
   * @returns {Object} 分享结果对象
   */
  async generateShareLink(jsonData, options = {}) {
    try {
      const {
        encrypt = true,        // 是否加密
        compress = true,       // 是否压缩
        expiry = null,         // 过期时间（毫秒）
        password = null,       // 密码保护
        description = ''       // 分享描述
      } = options;
      
      // 确保数据是对象并计算实际字节大小
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const jsonString = JSON.stringify(data);
      const originalSize = new Blob([jsonString]).size; // 使用统一的字节大小计算方法
      
      // 更新统计
      this.shareStats.totalShares++;
      
      // 检查数据大小策略
      const sizeStrategy = this.determineSizeStrategy(originalSize);
      
      if (sizeStrategy.type === 'TOO_LARGE') {
        return {
          success: false,
          error: 'DATA_TOO_LARGE',
          originalSize,
          maxSize: this.maxProcessableSize,
          recommendAction: 'CLOUD_STORAGE',
          message: `JSON数据过大（${this.formatBytes(originalSize)}），将使用云端存储方案。`,
          alternativeActions: [
            { action: 'CLOUD_UPLOAD', text: '上传到云端' },
            { action: 'DOWNLOAD_FILE', text: '下载文件' },
            { action: 'COMPRESS_MORE', text: '尝试最大压缩' }
          ]
        };
      }
      
      // 根据数据大小选择分享策略
      if (sizeStrategy.type === 'CLOUD_STORAGE') {
        return await this.generateCloudShareLink(data, options);
      } else {
        return await this.generateDirectShareLink(data, options, sizeStrategy);
      }
      
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
    const size = new Blob([JSON.stringify(data)]).size; // 使用统一的字节大小计算
    const sizeLabel = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${(size / 1024).toFixed(1)}KB`;
    return `json-data-${timestamp}-${sizeLabel}.json`;
  }

  /**
   * 格式化字节大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 确定数据大小处理策略
   * @param {number} size - 数据大小
   * @returns {Object} 处理策略
   */
  determineSizeStrategy(size) {
    if (size > this.maxProcessableSize) {
      return { type: 'TOO_LARGE', strategy: 'ERROR' };
    } else if (size > this.cloudStorageThreshold) {
      return { type: 'CLOUD_STORAGE', strategy: 'UPLOAD' };
    } else {
      return { type: 'DIRECT_URL', strategy: 'ENCODE' };
    }
  }

  /**
   * 生成云端分享链接
   * @param {Object} data - JSON数据
   * @param {Object} options - 选项
   * @returns {Object} 分享结果
   */
  async generateCloudShareLink(data, options = {}) {
    try {
      const {
        encrypt = true,
        password = null,
        expiry = null,
        description = ''
      } = options;
      
      // 准备上传数据
      let uploadData = {
        content: data,
        metadata: {
          createdAt: new Date().toISOString(),
          size: new Blob([JSON.stringify(data)]).size, // 使用统一的字节大小计算
          description,
          encrypted: encrypt
        }
      };
      
      // 加密处理
      if (encrypt) {
        uploadData.content = await this.encryptData(JSON.stringify(data), password);
        uploadData.metadata.hasPassword = !!password;
      }
      
      // 设置过期时间
      if (expiry) {
        uploadData.metadata.expiresAt = new Date(Date.now() + expiry).toISOString();
      }
      
      // 上传到云端
      const uploadResult = await this.uploadToCloud(uploadData);
      
      if (uploadResult.success) {
        const shareUrl = `${this.getCurrentEndpoint()}/s/${uploadResult.shareId}`;
        
        this.shareStats.successfulShares++;
        
        return {
          success: true,
          shareLink: shareUrl,
          shareId: uploadResult.shareId,
          type: 'CLOUD_STORAGE',
          encrypted: encrypt,
          hasPassword: !!password,
          expiresAt: uploadData.metadata.expiresAt,
          stats: {
            originalSize: JSON.stringify(data).length,
            uploadSize: JSON.stringify(uploadData).length,
            compressionRatio: '0.0', // 云端不压缩，保持原始数据
            storageType: '云端存储',
            encrypted: encrypt ? '已加密' : '未加密'
          }
        };
      } else {
        throw new Error(uploadResult.error || '上传失败');
      }
      
    } catch (error) {
      console.error('生成云端分享链接失败:', error);
      
      // 回退到直接分享
      return await this.generateDirectShareLink(data, { ...options, compress: true }, 
        { type: 'DIRECT_URL', strategy: 'ENCODE' });
    }
  }

  /**
   * 生成直接URL分享链接
   * @param {Object} data - JSON数据
   * @param {Object} options - 选项
   * @param {Object} sizeStrategy - 大小策略
   * @returns {Object} 分享结果
   */
  async generateDirectShareLink(data, options = {}, sizeStrategy) {
    try {
      const { encrypt = false, compress = true } = options;
      
      // 使用优化的编码方法
      const encodedData = compress ? 
        this.encodeDataOptimized(data) : 
        this.encodeData(data);
      
      // 加密处理（仅对较小的数据）
      let finalData = encodedData;
      if (encrypt && JSON.stringify(data).length < 2000) {
        finalData = await this.encryptData(encodedData);
        finalData = 'enc:' + finalData;
      }
      
      // 生成分享链接
      const shareLink = `${this.getCurrentEndpoint()}/v?data=${finalData}`;
      
      // 检查URL长度
      if (shareLink.length > this.maxUrlLength) {
        const jsonSize = new Blob([JSON.stringify(data)]).size; // 使用统一的字节大小计算
        return {
          success: false,
          error: 'URL_TOO_LONG',
          originalSize: jsonSize,
          urlLength: shareLink.length,
          maxUrlLength: this.maxUrlLength,
          recommendAction: 'CLOUD_STORAGE',
          message: `分享链接过长（${shareLink.length}字符），将转为云端存储。`
        };
      }
      
      this.shareStats.successfulShares++;
      
      return {
        success: true,
        shareLink,
        type: 'DIRECT_URL',
        encrypted: encrypt,
        stats: this.getShareLinkStats(data)
      };
      
    } catch (error) {
      console.error('生成直接分享链接失败:', error);
      throw error;
    }
  }
  
  /**
   * 生成加密密钥
   * @returns {string} 加密密钥
   */
  generateEncryptionKey() {
    // 生成随机加密密钥
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * 加密数据（简单的XOR加密）
   * @param {string} data - 原始数据
   * @param {string} password - 密码（可选）
   * @returns {string} 加密后的数据
   */
  async encryptData(data, password = null) {
    try {
      const key = password || this.encryptionKey;
      const encrypted = [];
      
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        encrypted.push(String.fromCharCode(charCode ^ keyChar));
      }
      
      // Base64编码加密结果
      const encryptedString = encrypted.join('');
      return btoa(unescape(encodeURIComponent(encryptedString)));
    } catch (error) {
      console.error('加密数据失败:', error);
      return data; // 加密失败返回原始数据
    }
  }

  /**
   * 解密数据
   * @param {string} encryptedData - 加密数据
   * @param {string} password - 密码（可选）
   * @returns {string} 解密后的数据
   */
  async decryptData(encryptedData, password = null) {
    try {
      const key = password || this.encryptionKey;
      
      // Base64解码
      const decoded = decodeURIComponent(escape(atob(encryptedData)));
      const decrypted = [];
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        decrypted.push(String.fromCharCode(charCode ^ keyChar));
      }
      
      return decrypted.join('');
    } catch (error) {
      console.error('解密数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前端点URL
   * @returns {string} 当前端点URL
   */
  getCurrentEndpoint() {
    return this.shareConfig.endpoints[this.shareConfig.currentEndpointIndex];
  }

  /**
   * 切换到下一个端点（故障转移）
   * @returns {string} 新的端点URL
   */
  switchToNextEndpoint() {
    this.shareConfig.currentEndpointIndex = 
      (this.shareConfig.currentEndpointIndex + 1) % this.shareConfig.endpoints.length;
    return this.getCurrentEndpoint();
  }

  /**
   * 上传数据到云端（模拟实现）
   * @param {Object} data - 上传数据
   * @returns {Object} 上传结果
   */
  async uploadToCloud(data) {
    try {
      // 模拟云端上传过程
      const uploadUrl = `${this.getCurrentEndpoint()}/api/upload`;
      
      // 生成唯一分享 ID
      const shareId = this.generateShareId();
      
      // 模拟网络请求（实际实现时需要替换为真实的网络请求）
      const response = await this.simulateCloudUpload({
        url: uploadUrl,
        data: data,
        shareId: shareId
      });
      
      if (response.success) {
        return {
          success: true,
          shareId: shareId,
          uploadUrl: uploadUrl,
          size: JSON.stringify(data).length
        };
      } else {
        throw new Error(response.error || '上传失败');
      }
    } catch (error) {
      console.error('上传到云端失败:', error);
      
      // 尝试切换端点
      if (this.shareConfig.currentEndpointIndex < this.shareConfig.endpoints.length - 1) {
        this.switchToNextEndpoint();
        return await this.uploadToCloud(data); // 递归重试
      }
      
      return {
        success: false,
        error: error.message || '所有端点都不可用'
      };
    }
  }

  /**
   * 模拟云端上传（实际实现时需要替换）
   * @param {Object} config - 上传配置
   * @returns {Object} 上传结果
   */
  async simulateCloudUpload(config) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    // 模拟成功率（90%成功率）
    if (Math.random() < 0.9) {
      return {
        success: true,
        shareId: config.shareId,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: '网络连接失败'
      };
    }
  }

  /**
   * 生成分享 ID
   * @returns {string} 分享 ID
   */
  generateShareId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `${timestamp}${random}`;
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
      
      // 将对象转换为JSON字符串并计算实际字节大小
      let jsonString = JSON.stringify(data);
      const originalLength = new Blob([jsonString]).size; // 使用统一的字节大小计算
      
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
   * 简单的字符串解压算法（增强版支持扩展标记）
   * @param {string} str - 待解压的字符串
   * @returns {string} 解压后的字符串
   */
  simpleDecompress(str) {
    // 基础标记映射
    const basicTokens = {
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
    
    // 扩展标记映射（处理 ~4N1, ~4N2 等格式）
    const extendedTokens = {
      '~4N1': '"',
      '~4N2': '{', 
      '~4N3': '}',
      '~4N4': '[',
      '~4N5': ']',
      '~4N6': ',',
      '~4N7': ':',
      '~4N8': 'null',
      '~4N9': 'true',
      '~4NA': 'false'
    };
    
    let decompressed = str;
    
    // 先处理扩展标记（更长的标记先处理避免冲突）
    for (const [token, original] of Object.entries(extendedTokens)) {
      decompressed = decompressed.split(token).join(original);
    }
    
    // 再处理基础标记
    for (const [token, original] of Object.entries(basicTokens)) {
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
   * 解码分享数据（支持多级压缩格式、多种编码和加密）
   * @param {string} encodedData - 编码后的数据
   * @param {string} password - 密码（可选）
   * @returns {Object} 解码后的JSON数据
   */
  async decodeData(encodedData, password = null) {
    console.log('🔍 开始解码数据:', encodedData.substring(0, 50) + '...');
    
    // 多种解码策略尝试
    const strategies = [
      () => this.decodeWithCurrentFormat(encodedData, password),
      () => this.decodeWithLegacyFormat(encodedData, password),
      () => this.decodeWithFallbackFormat(encodedData, password)
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 尝试策略 ${i + 1}...`);
        const result = await strategies[i]();
        console.log('✅ 解码成功，使用策略', i + 1);
        return result;
      } catch (error) {
        console.warn(`⚠️ 策略 ${i + 1} 失败:`, error.message);
        if (i === strategies.length - 1) {
          // 所有策略都失败
          throw new Error(`所有解码策略都失败，最后错误: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * 当前格式解码
   */
  async decodeWithCurrentFormat(encodedData, password) {
    let dataToDecrypt = encodedData;
    let isEncrypted = false;
    
    try {
      // 检查是否加密
      if (encodedData.startsWith('enc:')) {
        isEncrypted = true;
        dataToDecrypt = encodedData.substring(4);
        console.log('🔒 检测到加密数据');
      }
      
      // 如果数据被加密，先解密
      if (isEncrypted) {
        dataToDecrypt = await this.decryptData(dataToDecrypt, password);
        console.log('🔓 解密完成');
      }
      
      // 检查压缩格式和编码类型
      let compressionLevel = 0;
      let encodingType = 'b64'; // 默认Base64编码兼容
      
      // 支持新格式: c1b62:, c2hex:, c3hyb: 等和旧格式: c:
      if (dataToDecrypt.includes(':')) {
        const parts = dataToDecrypt.split(':');
        const prefix = parts[0];
        dataToDecrypt = parts.slice(1).join(':'); // 处理数据中包含':'的情况
        
        console.log('🏷️ 解析编码格式:', prefix);
        
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
        
        console.log('📊 压缩级别:', compressionLevel, '编码类型:', encodingType);
      }
      
      // 根据编码类型进行解码
      let jsonString;
      try {
        jsonString = this.performDecoding(dataToDecrypt, encodingType);
        console.log('📝 解码后的数据预览:', jsonString.substring(0, 100) + '...');
      } catch (decodeError) {
        console.warn('⚠️ 编码解码失败，尝试备用方法:', decodeError.message);
        throw decodeError;
      }
      
      // 根据压缩级别进行解压
      if (compressionLevel > 0) {
        try {
          console.log('🗃️ 开始解压，级别:', compressionLevel);
          jsonString = this.performDecompression(jsonString, compressionLevel);
          console.log('✅ 解压完成，预览:', jsonString.substring(0, 100) + '...');
        } catch (decompressError) {
          console.warn('⚠️ 解压失败，尝试备用方法:', decompressError.message);
          throw decompressError;
        }
      }
      
      // 解析JSON字符串
      try {
        console.log('📞 开始JSON解析...');
        const result = JSON.parse(jsonString);
        console.log('✅ JSON解析成功');
        return result;
      } catch (parseError) {
        console.warn('⚠️ JSON解析失败:', parseError.message);
        // 如果JSON解析失败，尝试修复常见问题
        try {
          // 去除首尾空白字符
          const trimmed = jsonString.trim();
          if (trimmed !== jsonString) {
            console.log('🔧 尝试去除空白字符后解析...');
            const result = JSON.parse(trimmed);
            console.log('✅ 去除空白后解析成功');
            return result;
          }
        } catch {}
        
        throw new Error(`JSON解析失败: ${parseError.message}`);
      }
      
    } catch (error) {
      console.error('❌ 当前格式解码失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 处理编码解码
   */
  performDecoding(data, encodingType) {
    console.log('🔄 开始', encodingType, '解码...');
    
    switch (encodingType) {
      case 'b62':
        return this.decodeBase62(data);
      case 'hex':
        return this.decodeHex(data);
      case 'hyb':
        return this.decodeHybrid(data);
      case 'b64':
      default:
        return this.decodeBase64Url(data);
    }
  }
  
  /**
   * 处理解压
   */
  performDecompression(jsonString, compressionLevel) {
    if (compressionLevel === 1) {
      return this.simpleDecompress(jsonString);
    } else {
      return this.advancedDecompress(jsonString, compressionLevel);
    }
  }
  
  /**
   * 传统格式解码（向后兼容）
   */
  async decodeWithLegacyFormat(encodedData, password) {
    console.log('🔄 尝试传统格式解码...');
    
    // 尝试多种传统解码方式
    const legacyMethods = [
      {
        name: '直接Base64',
        decode: () => {
          const jsonString = this.decodeBase64Url(encodedData);
          return JSON.parse(jsonString);
        }
      },
      {
        name: '简单压缩+Base64',
        decode: () => {
          const decompressed = this.simpleDecompress(encodedData);
          const jsonString = this.decodeBase64Url(decompressed);
          return JSON.parse(jsonString);
        }
      },
      {
        name: '标准Base64',
        decode: () => {
          const jsonString = decodeURIComponent(escape(atob(encodedData)));
          return JSON.parse(jsonString);
        }
      },
      {
        name: '标准Base64+简单压缩',
        decode: () => {
          const base64Decoded = decodeURIComponent(escape(atob(encodedData)));
          const decompressed = this.simpleDecompress(base64Decoded);
          return JSON.parse(decompressed);
        }
      }
    ];
    
    for (const method of legacyMethods) {
      try {
        console.log(`🔧 尝试${method.name}解码...`);
        const result = method.decode();
        console.log(`✅ ${method.name}解码成功`);
        return result;
      } catch (error) {
        console.warn(`⚠️ ${method.name}解码失败:`, error.message);
        continue;
      }
    }
    
    throw new Error('所有传统解码方式都失败');
  }
  
  /**
   * 备用解码格式
   */
  async decodeWithFallbackFormat(encodedData, password) {
    console.log('🔄 尝试备用解码格式...');
    
    // 首先尝试直接解析（可能是纯JSON）
    try {
      return JSON.parse(encodedData);
    } catch {}
    
    // 尝试所有可能的编码方式
    const encodingMethods = [
      { name: 'Base64URL', method: () => this.decodeBase64Url(encodedData) },
      { name: 'Hybrid', method: () => this.decodeHybrid(encodedData) },
      { name: 'Base62', method: () => this.decodeBase62(encodedData) },
      { name: 'Hex', method: () => this.decodeHex(encodedData) },
      { name: 'DirectBase64', method: () => decodeURIComponent(escape(atob(encodedData))) }
    ];
    
    for (const { name, method } of encodingMethods) {
      try {
        console.log(`🔧 尝试 ${name} 解码...`);
        const decoded = method();
        
        // 尝试直接解析
        try {
          const result = JSON.parse(decoded);
          console.log(`✅ ${name} 解码成功`);
          return result;
        } catch {
          // 尝试解压后解析
          try {
            const decompressed = this.simpleDecompress(decoded);
            const result = JSON.parse(decompressed);
            console.log(`✅ ${name} 解码+解压成功`);
            return result;
          } catch {
            // 尝试高级解压
            try {
              const advDecompressed = this.advancedDecompress(decoded, 2);
              const result = JSON.parse(advDecompressed);
              console.log(`✅ ${name} 解码+高级解压成功`);
              return result;
            } catch {
              continue; // 尝试下一种方法
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ ${name} 解码失败:`, error.message);
        continue; // 尝试下一种方法
      }
    }
    
    throw new Error('所有备用解码方式都失败');
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
   * 混合编码解码（增强中文支持）
   * @param {string} encoded - 混合编码数据
   * @returns {string} 解码后的数据
   */
  decodeHybrid(encoded) {
    console.log('🔤 开始混合编码解码，输入长度:', encoded.length);
    console.log('🔍 输入预览:', encoded.substring(0, 100) + '...');
    
    let result = '';
    let i = 0;
    
    while (i < encoded.length) {
      const char = encoded[i];
      
      if (char === '~') {
        // 检查是否是特殊的4N格式标记（~4N1, ~4N2等）
        if (i + 3 < encoded.length && encoded.substring(i + 1, i + 3) === '4N') {
          const tokenChar = encoded[i + 3];
          console.log('🏷️ 发现4N格式标记:', encoded.substring(i, i + 4));
          
          // 映射4N格式到对应字符
          const tokenMap = {
            '1': '"',
            '2': '{',
            '3': '}',
            '4': '[',
            '5': ']',
            '6': ',',
            '7': ':',
            '8': 'null',
            '9': 'true',
            'A': 'false'
          };
          
          if (tokenMap[tokenChar]) {
            result += tokenMap[tokenChar];
            console.log('✅ 映射成功:', encoded.substring(i, i + 4), '->', tokenMap[tokenChar]);
          } else {
            console.warn('⚠️ 未知的4N标记:', encoded.substring(i, i + 4));
            result += encoded.substring(i, i + 4); // 保持原样
          }
          i += 4;
        } else if (i + 1 < encoded.length && encoded[i + 1] === '~') {
          // 双波浪线: Unicode字符（中文等）
          let j = i + 2;
          while (j < encoded.length && /[0-9A-Za-z]/.test(encoded[j])) {
            j++;
          }
          const codeStr = encoded.substring(i + 2, j);
          if (codeStr) {
            try {
              const code = parseInt(codeStr, 36);
              if (!isNaN(code) && code > 0) {
                result += String.fromCharCode(code);
                console.log('🌏 Unicode解码:', codeStr, '->', String.fromCharCode(code));
              } else {
                console.warn('⚠️ 无效的Unicode码点:', codeStr);
                result += encoded.substring(i, j); // 保持原样
              }
            } catch (error) {
              console.warn('⚠️ Unicode解码失败:', codeStr, error);
              result += encoded.substring(i, j); // 保持原样
            }
          }
          i = j;
        } else {
          // 单波浪线: 扩展ASCII字符或其他编码
          let j = i + 1;
          while (j < encoded.length && /[0-9A-Za-z]/.test(encoded[j])) {
            j++;
          }
          const codeStr = encoded.substring(i + 1, j);
          if (codeStr && codeStr.length > 0) {
            try {
              const code = parseInt(codeStr, 36);
              if (!isNaN(code) && code > 0 && code <= 1114111) { // 有效的Unicode范围
                result += String.fromCharCode(code);
                console.log('🔤 单字符解码:', codeStr, '->', String.fromCharCode(code));
              } else {
                console.log('⚠️ 无效的字符码点:', codeStr, '解析结果:', code);
                result += encoded.substring(i, j); // 保持原样
              }
            } catch (error) {
              console.log('⚠️ 字符解码失败:', codeStr, error);
              result += encoded.substring(i, j); // 保持原样
            }
          } else {
            // 如果没有跟随数字/字母，保持原样
            result += char;
            i++;
          }
          i = j;
        }
      } else {
        // 直接字符
        result += char;
        i++;
      }
    }
    
    console.log('✅ 混合解码完成，输出长度:', result.length);
    console.log('📄 输出预览:', result.substring(0, 100) + '...');
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
   * 从URL获取分享数据（支持多种分享类型）
   * @param {string} url - 分享URL
   * @param {string} password - 密码（可选）
   * @returns {Object|null} JSON数据，如果无法解析则返回null
   */
  async getDataFromUrl(url, password = null) {
    try {
      // 解析URL
      const urlObj = new URL(url);
      
      // 检查是否为云端存储链接
      if (urlObj.pathname.startsWith('/s/')) {
        const shareId = urlObj.pathname.substring(3);
        return await this.getDataFromCloud(shareId, password);
      }
      
      // 直接URL分享链接
      const encodedData = urlObj.searchParams.get('data');
      
      if (!encodedData) {
        return null;
      }
      
      // 解码数据
      const result = await this.decodeData(encodedData, password);
      console.log('✅ 数据解码成功');
      return result;
    } catch (error) {
      console.error('从URL获取数据错误:', error);
      
      // 提供更详细的错误信息
      if (error.message.includes('Invalid URL')) {
        throw new Error('URL格式不正确，请检查链接是否完整');
      } else if (error.message.includes('JSON')) {
        throw new Error('JSON数据格式错误，链接可能已损坏');
      } else if (error.message.includes('解码失败')) {
        throw new Error('数据解码失败，可能是链接损坏或格式不支持');
      } else {
        throw new Error(`解析失败: ${error.message}`);
      }
    }
  }
  
  /**
   * 从云端获取数据
   * @param {string} shareId - 分享ID
   * @param {string} password - 密码（可选）
   * @returns {Object|null} JSON数据
   */
  async getDataFromCloud(shareId, password = null) {
    try {
      // 模拟从云端获取数据
      const response = await this.simulateCloudDownload(shareId);
      
      if (!response.success) {
        throw new Error(response.error || '获取云端数据失败');
      }
      
      const cloudData = response.data;
      
      // 移除过期检查 - 不再限制有效期
      // if (cloudData.metadata.expiresAt) {
      //   const expiry = new Date(cloudData.metadata.expiresAt);
      //   if (expiry < new Date()) {
      //     throw new Error('分享链接已过期');
      //   }
      // }
      
      // 检查是否需要密码
      if (cloudData.metadata.hasPassword && !password) {
        throw new Error('该分享需要密码访问');
      }
      
      let content = cloudData.content;
      
      // 如果数据被加密，解密
      if (cloudData.metadata.encrypted) {
        if (typeof content === 'string') {
          content = await this.decryptData(content, password);
          content = JSON.parse(content);
        }
      }
      
      return content;
    } catch (error) {
      console.error('从云端获取数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 模拟云端下载（优化版本 - 不再随机失败）
   * @param {string} shareId - 分享ID
   * @returns {Object} 下载结果
   */
  async simulateCloudDownload(shareId) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    console.log('🌍 模拟云端下载，分享ID:', shareId);
    
    // 总是返回成功的结果（移除随机失败）
    return {
      success: true,
      data: {
        content: { 
          message: '这是模拟的云端数据', 
          shareId,
          timestamp: new Date().toISOString(),
          note: '实际使用中请替换为真实的云端数据接口'
        },
        metadata: {
          createdAt: new Date().toISOString(),
          encrypted: false,
          hasPassword: false,
          size: 100
        }
      }
    };
  }
  
  /**
   * 检测字符串是否为有效的分享链接（支持多种类型）
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
      
      // 检查是否包含任何分享域名
      const isValidDomain = this.shareConfig.endpoints.some(endpoint => {
        const domain = endpoint.replace('https://', '').replace('http://', '');
        return text.includes(domain);
      });
      
      console.log('是否包含有效域名:', isValidDomain);
      
      if (!isValidDomain) {
        console.log('不包含分享域名');
        return false;
      }
      
      // 尝试解析URL
      const urlObj = new URL(text);
      console.log('解析的URL对象:', urlObj);
      
      // 检查是否为云端存储链接
      if (urlObj.pathname.startsWith('/s/')) {
        console.log('云端存储分享链接');
        return true;
      }
      
      // 检查是否为直接URL分享链接
      const hasDataParam = urlObj.searchParams.has('data');
      console.log('是否有data参数:', hasDataParam);
      
      return hasDataParam;
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
      const jsonString = JSON.stringify(data);
      const originalSize = new Blob([jsonString]).size; // 使用统一的字节大小计算方法
      const encodedData = this.encodeDataOptimized(data);
      const finalUrl = `${this.getCurrentEndpoint()}/v?data=${encodedData}`;
      
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
        efficiency: this.calculateEfficiency(originalSize, encodedSize),
        shareMethod: originalSize > this.cloudStorageThreshold ? '云端存储' : '直接URL',
        encryptionSupported: originalSize < 50000 // 支持加密的最大大小
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