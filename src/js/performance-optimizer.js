/**
 * JSON格式化大师 - 性能优化模块
 * 用于提高插件的性能
 */

class PerformanceOptimizer {
  constructor() {
    // 防抖延迟（毫秒）
    this.debounceDelay = 300;
    
    // 节流延迟（毫秒）
    this.throttleDelay = 100;
    
    // 大型JSON的阈值（字符数）
    this.largeJsonThreshold = 100000;
    
    // 缓存
    this.cache = new Map();
    
    // 缓存大小限制
    this.cacheLimit = 10;
  }
  
  /**
   * 防抖函数
   * @param {Function} func - 要执行的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖处理后的函数
   */
  debounce(func, delay = this.debounceDelay) {
    let timeout;
    
    return function(...args) {
      const context = this;
      
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  }
  
  /**
   * 节流函数
   * @param {Function} func - 要执行的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 节流处理后的函数
   */
  throttle(func, delay = this.throttleDelay) {
    let lastCall = 0;
    
    return function(...args) {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }
  
  /**
   * 缓存函数结果
   * @param {Function} func - 要缓存的函数
   * @returns {Function} 缓存处理后的函数
   */
  memoize(func) {
    const cache = new Map();
    
    return function(...args) {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func.apply(this, args);
      
      // 限制缓存大小
      if (cache.size >= this.cacheLimit) {
        // 删除最早添加的缓存项
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(key, result);
      return result;
    };
  }
  
  /**
   * 检查是否为大型JSON
   * @param {string} jsonString - JSON字符串
   * @returns {boolean} 是否为大型JSON
   */
  isLargeJson(jsonString) {
    return jsonString.length > this.largeJsonThreshold;
  }
  
  /**
   * 优化大型JSON的处理
   * @param {string} jsonString - JSON字符串
   * @param {Function} processor - 处理函数
   * @returns {Promise} 处理结果的Promise
   */
  processLargeJson(jsonString, processor) {
    return new Promise((resolve) => {
      // 使用setTimeout将处理放入下一个事件循环，避免阻塞UI
      setTimeout(() => {
        const result = processor(jsonString);
        resolve(result);
      }, 0);
    });
  }
  
  /**
   * 分块处理大型JSON
   * @param {string} jsonString - JSON字符串
   * @param {Function} chunkProcessor - 分块处理函数
   * @param {number} chunkSize - 分块大小
   * @returns {Promise} 处理结果的Promise
   */
  processJsonInChunks(jsonString, chunkProcessor, chunkSize = 50000) {
    return new Promise((resolve) => {
      // 如果JSON不够大，直接处理
      if (jsonString.length <= chunkSize) {
        resolve(chunkProcessor(jsonString));
        return;
      }
      
      // 分块处理
      const chunks = [];
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        chunks.push(jsonString.substring(i, i + chunkSize));
      }
      
      let result = '';
      let chunkIndex = 0;
      
      // 使用requestAnimationFrame处理每个分块
      const processNextChunk = () => {
        if (chunkIndex < chunks.length) {
          const chunkResult = chunkProcessor(chunks[chunkIndex]);
          result += chunkResult;
          chunkIndex++;
          
          // 使用requestAnimationFrame安排下一个分块的处理
          requestAnimationFrame(processNextChunk);
        } else {
          // 所有分块处理完成
          resolve(result);
        }
      };
      
      // 开始处理第一个分块
      requestAnimationFrame(processNextChunk);
    });
  }
  
  /**
   * 优化DOM操作
   * @param {Function} domOperation - DOM操作函数
   */
  optimizeDomOperation(domOperation) {
    // 创建文档片段
    const fragment = document.createDocumentFragment();
    
    // 执行DOM操作，将结果添加到文档片段
    domOperation(fragment);
    
    // 一次性将文档片段添加到DOM
    return fragment;
  }
  
  /**
   * 延迟加载资源
   * @param {string} url - 资源URL
   * @param {string} type - 资源类型（'script'或'style'）
   * @returns {Promise} 加载完成的Promise
   */
  lazyLoad(url, type = 'script') {
    return new Promise((resolve, reject) => {
      let element;
      
      if (type === 'script') {
        element = document.createElement('script');
        element.src = url;
        element.async = true;
      } else if (type === 'style') {
        element = document.createElement('link');
        element.rel = 'stylesheet';
        element.href = url;
      } else {
        reject(new Error(`不支持的资源类型: ${type}`));
        return;
      }
      
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`加载资源失败: ${url}`));
      
      document.head.appendChild(element);
    });
  }
  
  /**
   * 使用Web Worker处理大型JSON
   * @param {string} jsonString - JSON字符串
   * @param {Function} processor - 处理函数
   * @returns {Promise} 处理结果的Promise
   */
  processWithWebWorker(jsonString, processor) {
    return new Promise((resolve, reject) => {
      // 创建内联Web Worker
      const workerCode = `
        self.onmessage = function(e) {
          try {
            const result = (${processor.toString()})(e.data);
            self.postMessage({ success: true, result });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `;
      
      // 创建Blob URL
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      // 创建Worker
      const worker = new Worker(workerUrl);
      
      // 设置消息处理
      worker.onmessage = function(e) {
        // 清理资源
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        
        // 处理结果
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };
      
      // 设置错误处理
      worker.onerror = function(error) {
        // 清理资源
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        
        reject(error);
      };
      
      // 发送数据给Worker
      worker.postMessage(jsonString);
    });
  }
}

// 导出性能优化器实例
const performanceOptimizer = new PerformanceOptimizer();