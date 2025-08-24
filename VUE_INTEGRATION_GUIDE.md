# Vue项目集成JSON格式化大师API指南

## 📋 概述

本指南将详细说明如何在Vue项目中集成和使用JSON格式化大师浏览器原生API服务。

## 🚀 快速开始

### 1. 安装扩展

首先确保已安装JSON格式化大师Chrome扩展：

1. 下载扩展源码或从Chrome商店安装
2. 记录扩展ID（在`chrome://extensions/`页面可以找到）
3. 确保扩展已启用并具有必要权限

### 2. 获取扩展ID

在Chrome浏览器中：
1. 访问 `chrome://extensions/`
2. 找到"JSON格式化大师"扩展
3. 复制扩展ID（类似：`abcdefghijklmnopqrstuvwxyz123456`）

### 3. 在Vue项目中集成

#### 方式一：作为Vue插件使用

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import { JsonFormatterApiPlugin } from './path/to/json-formatter-api-client.js'

const app = createApp(App)

// 注册插件，传入扩展ID
app.use(JsonFormatterApiPlugin, {
  extensionId: 'your-extension-id-here'
})

app.mount('#app')
```

#### 方式二：在组件中直接使用

```javascript
// 在Vue组件中
import { JsonFormatterApiClient } from './path/to/json-formatter-api-client.js'

export default {
  data() {
    return {
      apiClient: null
    }
  },
  
  async mounted() {
    this.apiClient = new JsonFormatterApiClient('your-extension-id-here')
    await this.apiClient.init()
  }
}
```

## 📖 API使用示例

### 基础操作

```javascript
// 在Vue组件中使用
export default {
  methods: {
    // 健康检查
    async checkHealth() {
      try {
        const result = await this.$jsonApi.healthCheck()
        console.log('API健康状态:', result)
      } catch (error) {
        console.error('健康检查失败:', error)
      }
    },

    // 格式化JSON
    async formatJson() {
      const data = { name: 'Vue项目', version: '3.0' }
      try {
        const formatted = await this.$jsonApi.formatJson(data, { indent: 4 })
        console.log('格式化结果:', formatted)
      } catch (error) {
        console.error('格式化失败:', error)
      }
    },

    // 验证JSON
    async validateJson() {
      const data = { name: 'test', age: 25 }
      try {
        const result = await this.$jsonApi.validateJson(data)
        console.log('验证结果:', result)
      } catch (error) {
        console.error('验证失败:', error)
      }
    },

    // 保存数据
    async saveData() {
      const data = { timestamp: Date.now(), message: 'Hello World' }
      try {
        await this.$jsonApi.setJsonData(data)
        console.log('数据已保存')
      } catch (error) {
        console.error('保存失败:', error)
      }
    },

    // 加载数据
    async loadData() {
      try {
        const data = await this.$jsonApi.getJsonData()
        console.log('加载的数据:', data)
      } catch (error) {
        console.error('加载失败:', error)
      }
    }
  }
}
```

### 高级功能

```javascript
export default {
  methods: {
    // 批量处理
    async batchProcess() {
      const operations = [
        { type: 'validate', data: { name: 'test1' } },
        { type: 'format', data: { name: 'test2' }, options: { indent: 2 } },
        { type: 'minify', data: { name: 'test3', desc: 'example' } }
      ]

      try {
        const results = await this.$jsonApi.batchProcess(operations)
        results.forEach((result, index) => {
          console.log(`操作 ${index + 1}:`, result)
        })
      } catch (error) {
        console.error('批量处理失败:', error)
      }
    },

    // 切换API提供者
    async switchToIndexedDB() {
      try {
        const result = await this.$jsonApi.switchProvider('indexeddb')
        console.log('切换结果:', result)
      } catch (error) {
        console.error('切换失败:', error)
      }
    },

    // 性能测试
    async runPerformanceTest() {
      try {
        const result = await this.$jsonApi.performanceTest(20)
        console.log('性能测试结果:', result)
      } catch (error) {
        console.error('性能测试失败:', error)
      }
    },

    // 获取服务器信息
    async getServerInfo() {
      try {
        const info = await this.$jsonApi.getServerInfo()
        console.log('服务器信息:', info)
      } catch (error) {
        console.error('获取服务器信息失败:', error)
      }
    }
  }
}
```

## 🔧 Composition API使用

```javascript
// composables/useJsonApi.js
import { ref, onMounted, onUnmounted } from 'vue'
import { JsonFormatterApiClient } from './json-formatter-api-client.js'

export function useJsonApi(extensionId) {
  const apiClient = ref(null)
  const isConnected = ref(false)
  const currentProvider = ref('unknown')
  const error = ref(null)

  const connect = async () => {
    try {
      apiClient.value = new JsonFormatterApiClient(extensionId)
      await apiClient.value.init()
      isConnected.value = true
      
      const status = apiClient.value.getConnectionStatus()
      currentProvider.value = status.provider
      error.value = null
    } catch (err) {
      error.value = err.message
      isConnected.value = false
    }
  }

  const formatJson = async (data, options = {}) => {
    if (!apiClient.value) throw new Error('API客户端未初始化')
    return await apiClient.value.formatJson(data, options)
  }

  const validateJson = async (data) => {
    if (!apiClient.value) throw new Error('API客户端未初始化')
    return await apiClient.value.validateJson(data)
  }

  const minifyJson = async (data) => {
    if (!apiClient.value) throw new Error('API客户端未初始化')
    return await apiClient.value.minifyJson(data)
  }

  const saveData = async (data) => {
    if (!apiClient.value) throw new Error('API客户端未初始化')
    return await apiClient.value.setJsonData(data)
  }

  const loadData = async () => {
    if (!apiClient.value) throw new Error('API客户端未初始化')
    return await apiClient.value.getJsonData()
  }

  const switchProvider = async (provider) => {
    if (!apiClient.value) throw new Error('API客户端未初始化')
    const result = await apiClient.value.switchProvider(provider)
    if (result.success) {
      currentProvider.value = result.provider
    }
    return result
  }

  onMounted(() => {
    if (extensionId) {
      connect()
    }
  })

  onUnmounted(async () => {
    if (apiClient.value) {
      await apiClient.value.destroy()
    }
  })

  return {
    isConnected,
    currentProvider,
    error,
    connect,
    formatJson,
    validateJson,
    minifyJson,
    saveData,
    loadData,
    switchProvider
  }
}
```

在组件中使用：

```javascript
// 在Vue 3组件中
import { useJsonApi } from './composables/useJsonApi.js'

export default {
  setup() {
    const {
      isConnected,
      currentProvider,
      error,
      formatJson,
      validateJson,
      saveData,
      loadData
    } = useJsonApi('your-extension-id-here')

    const handleFormat = async () => {
      try {
        const data = { message: 'Hello World', timestamp: Date.now() }
        const result = await formatJson(data, { indent: 4 })
        console.log('格式化结果:', result)
      } catch (err) {
        console.error('格式化失败:', err)
      }
    }

    return {
      isConnected,
      currentProvider,
      error,
      handleFormat
    }
  }
}
```

## 🛠️ 错误处理

### 常见错误及解决方案

```javascript
export default {
  methods: {
    async handleApiCall() {
      try {
        const result = await this.$jsonApi.formatJson(data)
        return result
      } catch (error) {
        switch (error.message) {
          case 'Chrome扩展API不可用':
            console.error('请确保在Chrome浏览器中运行')
            break
          case '需要配置JSON格式化大师扩展ID':
            console.error('请配置正确的扩展ID')
            break
          case '请求超时':
            console.error('API请求超时，请检查扩展是否正常运行')
            break
          default:
            console.error('API调用失败:', error.message)
        }
        throw error
      }
    }
  }
}
```

### 连接状态监控

```javascript
export default {
  data() {
    return {
      connectionStatus: '未知'
    }
  },
  
  mounted() {
    this.startConnectionMonitoring()
  },
  
  methods: {
    startConnectionMonitoring() {
      setInterval(async () => {
        try {
          if (this.$jsonApi) {
            await this.$jsonApi.healthCheck()
            this.connectionStatus = '已连接'
          }
        } catch (error) {
          this.connectionStatus = '连接失败'
          console.warn('连接监控检测到问题:', error.message)
        }
      }, 5000) // 每5秒检查一次
    }
  }
}
```

## 📊 性能优化建议

### 1. 连接复用
```javascript
// 避免频繁创建新的API客户端实例
// 推荐在应用启动时创建一次，全局复用

// main.js
import { JsonFormatterApiClient } from './json-formatter-api-client.js'

const apiClient = new JsonFormatterApiClient('your-extension-id')
app.config.globalProperties.$jsonApi = apiClient
```

### 2. 批量操作
```javascript
// 避免逐个处理，使用批量操作提高效率
const operations = items.map(item => ({
  type: 'validate',
  data: item
}))

const results = await this.$jsonApi.batchProcess(operations)
```

### 3. 错误边界
```javascript
// 使用Vue的错误边界处理API调用失败
app.config.errorHandler = (err, instance, info) => {
  if (err.message.includes('API')) {
    console.error('API相关错误:', err)
    // 显示用户友好的错误提示
  }
}
```

## 🔒 安全注意事项

1. **扩展ID保护**: 不要在客户端代码中硬编码扩展ID，建议使用环境变量
2. **数据验证**: 在发送到API之前验证数据格式
3. **错误处理**: 妥善处理API调用失败的情况
4. **超时设置**: 为API调用设置合理的超时时间

## 📚 完整示例项目

查看完整的Vue项目集成示例，请参考：
- `vue-integration-example.vue` - 基础集成示例
- `json-formatter-api-client.js` - API客户端类

## 🆘 常见问题

### Q: 如何获取扩展ID？
A: 在Chrome浏览器中访问 `chrome://extensions/`，找到JSON格式化大师扩展并复制其ID。

### Q: API调用时提示"扩展API不可用"？
A: 确保在Chrome浏览器中运行，且扩展已正确安装并启用。

### Q: 如何切换API提供者？
A: 使用 `switchProvider()` 方法，支持 'browser-native'、'indexeddb'、'memory' 三种提供者。

### Q: 数据会持久化吗？
A: 取决于使用的提供者：
- Service Worker: 临时存储
- IndexedDB: 持久化存储  
- Memory: 临时存储

### Q: 支持哪些浏览器？
A: 主要支持Chrome 88+和Edge 88+，其他浏览器可能不兼容。

---

更多详细信息请参考项目文档或联系开发团队。