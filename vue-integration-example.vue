<!-- Vue项目中调用JSON格式化大师浏览器原生API服务示例 -->
<template>
  <div class="json-api-service">
    <h2>JSON格式化API调用示例</h2>
    
    <!-- API状态显示 -->
    <div class="api-status">
      <h3>API服务状态</h3>
      <p>状态: <span :class="apiStatus.class">{{ apiStatus.text }}</span></p>
      <p>提供者: {{ currentProvider }}</p>
      <button @click="checkApiHealth" class="btn-primary">检查健康状态</button>
    </div>

    <!-- JSON输入区域 -->
    <div class="json-input">
      <h3>JSON数据输入</h3>
      <textarea 
        v-model="jsonInput" 
        placeholder="请输入JSON数据..."
        rows="8"
        class="json-textarea"
      ></textarea>
    </div>

    <!-- 操作按钮组 -->
    <div class="action-buttons">
      <button @click="formatJson" class="btn-primary">格式化JSON</button>
      <button @click="minifyJson" class="btn-secondary">压缩JSON</button>
      <button @click="validateJson" class="btn-secondary">验证JSON</button>
      <button @click="saveToApi" class="btn-secondary">保存到API</button>
      <button @click="loadFromApi" class="btn-secondary">从API加载</button>
    </div>

    <!-- 提供者切换 -->
    <div class="provider-switch">
      <h3>API提供者切换</h3>
      <button @click="switchProvider('browser-native')" class="btn-provider">Service Worker</button>
      <button @click="switchProvider('indexeddb')" class="btn-provider">IndexedDB</button>
      <button @click="switchProvider('memory')" class="btn-provider">Memory</button>
    </div>

    <!-- 输出结果 -->
    <div class="json-output" v-if="jsonOutput">
      <h3>处理结果</h3>
      <pre class="result-pre">{{ jsonOutput }}</pre>
    </div>

    <!-- 错误信息 -->
    <div class="error-message" v-if="errorMessage">
      <h3>错误信息</h3>
      <p class="error-text">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonApiService',
  data() {
    return {
      jsonInput: '{"name": "Vue项目示例", "version": "1.0.0", "api": "浏览器原生"}',
      jsonOutput: '',
      errorMessage: '',
      currentProvider: '未知',
      apiStatus: {
        text: '未检测',
        class: 'status-unknown'
      }
    }
  },
  
  mounted() {
    this.initializeApiService();
  },
  
  methods: {
    /**
     * 初始化API服务
     */
    async initializeApiService() {
      try {
        // 检查Chrome扩展API是否可用
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          throw new Error('Chrome扩展API不可用，请确保JSON格式化大师扩展已安装');
        }

        // 检查API服务状态
        await this.checkApiHealth();
        
        console.log('✅ JSON格式化大师API服务初始化成功');
      } catch (error) {
        console.error('❌ API服务初始化失败:', error);
        this.errorMessage = `API初始化失败: ${error.message}`;
      }
    },

    /**
     * 检查API健康状态
     */
    async checkApiHealth() {
      try {
        const response = await this.sendMessageToExtension({
          action: 'checkApiStatus'
        });

        if (response && response.success) {
          this.apiStatus = {
            text: '运行中',
            class: 'status-running'
          };
          this.currentProvider = response.provider || '浏览器原生';
        } else {
          // 尝试启动API服务
          await this.startApiService();
        }
      } catch (error) {
        this.apiStatus = {
          text: '离线',
          class: 'status-offline'
        };
        this.errorMessage = `健康检查失败: ${error.message}`;
      }
    },

    /**
     * 启动API服务
     */
    async startApiService() {
      try {
        const response = await this.sendMessageToExtension({
          action: 'startApiServer',
          data: {}
        });

        if (response && response.success) {
          this.apiStatus = {
            text: '已启动',
            class: 'status-running'
          };
          console.log('✅ API服务启动成功');
        } else {
          throw new Error(response?.error || '启动失败');
        }
      } catch (error) {
        this.errorMessage = `API服务启动失败: ${error.message}`;
      }
    },

    /**
     * 格式化JSON
     */
    async formatJson() {
      try {
        const jsonData = JSON.parse(this.jsonInput);
        
        const response = await this.sendMessageToExtension({
          action: 'apiRequest',
          method: 'POST',
          endpoint: '/format',
          data: { data: jsonData, indent: 2 }
        });

        if (response && response.success) {
          this.jsonOutput = JSON.stringify(response.data, null, 2);
          this.errorMessage = '';
        } else {
          throw new Error(response?.error || '格式化失败');
        }
      } catch (error) {
        this.errorMessage = `格式化失败: ${error.message}`;
      }
    },

    /**
     * 压缩JSON
     */
    async minifyJson() {
      try {
        const jsonData = JSON.parse(this.jsonInput);
        
        const response = await this.sendMessageToExtension({
          action: 'apiRequest',
          method: 'POST',
          endpoint: '/minify',
          data: { data: jsonData }
        });

        if (response && response.success) {
          this.jsonOutput = JSON.stringify(response.data);
          this.errorMessage = '';
        } else {
          throw new Error(response?.error || '压缩失败');
        }
      } catch (error) {
        this.errorMessage = `压缩失败: ${error.message}`;
      }
    },

    /**
     * 验证JSON
     */
    async validateJson() {
      try {
        const jsonData = JSON.parse(this.jsonInput);
        
        const response = await this.sendMessageToExtension({
          action: 'apiRequest',
          method: 'POST',
          endpoint: '/validate',
          data: { data: jsonData }
        });

        if (response && response.success) {
          this.jsonOutput = `✅ JSON格式有效\n${JSON.stringify(response.data, null, 2)}`;
          this.errorMessage = '';
        } else {
          throw new Error(response?.error || '验证失败');
        }
      } catch (error) {
        this.errorMessage = `JSON验证失败: ${error.message}`;
      }
    },

    /**
     * 保存数据到API
     */
    async saveToApi() {
      try {
        const jsonData = JSON.parse(this.jsonInput);
        
        const response = await this.sendMessageToExtension({
          action: 'apiRequest',
          method: 'POST',
          endpoint: '/json-data',
          data: { data: jsonData }
        });

        if (response && response.success) {
          this.jsonOutput = '✅ 数据已保存到API服务';
          this.errorMessage = '';
        } else {
          throw new Error(response?.error || '保存失败');
        }
      } catch (error) {
        this.errorMessage = `保存失败: ${error.message}`;
      }
    },

    /**
     * 从API加载数据
     */
    async loadFromApi() {
      try {
        const response = await this.sendMessageToExtension({
          action: 'apiRequest',
          method: 'GET',
          endpoint: '/json-data'
        });

        if (response && response.success && response.data) {
          this.jsonInput = JSON.stringify(response.data, null, 2);
          this.jsonOutput = '✅ 数据已从API加载';
          this.errorMessage = '';
        } else {
          throw new Error('没有找到保存的数据');
        }
      } catch (error) {
        this.errorMessage = `加载失败: ${error.message}`;
      }
    },

    /**
     * 切换API提供者
     */
    async switchProvider(providerType) {
      try {
        const response = await this.sendMessageToExtension({
          action: 'switchApiProvider',
          provider: providerType
        });

        if (response && response.success) {
          this.currentProvider = response.provider;
          this.jsonOutput = `✅ 已切换到 ${response.provider} 提供者`;
          this.errorMessage = '';
        } else {
          throw new Error(response?.error || '切换失败');
        }
      } catch (error) {
        this.errorMessage = `提供者切换失败: ${error.message}`;
      }
    },

    /**
     * 发送消息到Chrome扩展
     */
    sendMessageToExtension(message) {
      return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          reject(new Error('Chrome扩展API不可用'));
          return;
        }

        // 这里需要JSON格式化大师扩展的ID
        // 实际使用时请替换为正确的扩展ID
        const extensionId = 'your-extension-id-here';
        
        chrome.runtime.sendMessage(extensionId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }
  }
}
</script>

<style scoped>
.json-api-service {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', system-ui, sans-serif;
}

.api-status {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-running {
  color: #28a745;
  font-weight: bold;
}

.status-offline {
  color: #dc3545;
  font-weight: bold;
}

.status-unknown {
  color: #ffc107;
  font-weight: bold;
}

.json-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.action-buttons {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-provider {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 10px;
}

.btn-provider:hover {
  background: #1e7e34;
}

.provider-switch {
  background: #e9ecef;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}

.result-pre {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
}

.error-text {
  color: #721c24;
  margin: 0;
}

h2, h3 {
  color: #333;
  margin-bottom: 15px;
}

h2 {
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}
</style>