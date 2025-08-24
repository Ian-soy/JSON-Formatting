/**
 * Vue项目JSON格式化工具函数
 * 基于JSON格式化大师浏览器原生API的实用工具集
 */

import { JsonFormatterApiClient } from './json-formatter-api-client.js'

/**
 * 全局API客户端实例
 */
let globalApiClient = null

/**
 * 初始化全局API客户端
 */
export function initJsonApi(extensionId) {
  if (!globalApiClient) {
    globalApiClient = new JsonFormatterApiClient(extensionId)
  }
  return globalApiClient
}

/**
 * 获取全局API客户端
 */
export function getJsonApi() {
  if (!globalApiClient) {
    throw new Error('请先调用 initJsonApi() 初始化API客户端')
  }
  return globalApiClient
}

/**
 * JSON格式化工具类
 */
export class JsonUtils {
  /**
   * 安全的JSON解析
   */
  static safeParse(jsonString) {
    try {
      return {
        success: true,
        data: JSON.parse(jsonString),
        error: null
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  }

  /**
   * 安全的JSON字符串化
   */
  static safeStringify(data, space = 2) {
    try {
      return {
        success: true,
        data: JSON.stringify(data, null, space),
        error: null
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  }

  /**
   * 格式化JSON字符串
   */
  static async format(jsonString, options = {}) {
    const parseResult = this.safeParse(jsonString)
    if (!parseResult.success) {
      throw new Error(`JSON解析失败: ${parseResult.error}`)
    }

    const api = getJsonApi()
    return await api.formatJson(parseResult.data, options)
  }

  /**
   * 压缩JSON字符串
   */
  static async minify(jsonString) {
    const parseResult = this.safeParse(jsonString)
    if (!parseResult.success) {
      throw new Error(`JSON解析失败: ${parseResult.error}`)
    }

    const api = getJsonApi()
    const result = await api.minifyJson(parseResult.data)
    return JSON.stringify(result)
  }

  /**
   * 验证JSON字符串
   */
  static async validate(jsonString) {
    const parseResult = this.safeParse(jsonString)
    if (!parseResult.success) {
      return {
        valid: false,
        error: parseResult.error,
        details: null
      }
    }

    try {
      const api = getJsonApi()
      const result = await api.validateJson(parseResult.data)
      return {
        valid: true,
        error: null,
        details: result
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        details: null
      }
    }
  }

  /**
   * 检查JSON字符串大小
   */
  static getSize(jsonString) {
    const bytes = new Blob([jsonString]).size
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return {
      bytes: bytes,
      formatted: `${size.toFixed(2)} ${units[unitIndex]}`
    }
  }

  /**
   * 比较两个JSON对象
   */
  static compare(json1, json2) {
    try {
      const obj1 = typeof json1 === 'string' ? JSON.parse(json1) : json1
      const obj2 = typeof json2 === 'string' ? JSON.parse(json2) : json2
      
      return {
        equal: JSON.stringify(obj1) === JSON.stringify(obj2),
        obj1: obj1,
        obj2: obj2
      }
    } catch (error) {
      throw new Error(`JSON比较失败: ${error.message}`)
    }
  }

  /**
   * 提取JSON路径
   */
  static extractPaths(obj, prefix = '') {
    const paths = []
    
    function traverse(current, path) {
      if (Array.isArray(current)) {
        current.forEach((item, index) => {
          const newPath = path ? `${path}[${index}]` : `[${index}]`
          if (typeof item === 'object' && item !== null) {
            traverse(item, newPath)
          } else {
            paths.push({
              path: newPath,
              value: item,
              type: typeof item
            })
          }
        })
      } else if (typeof current === 'object' && current !== null) {
        Object.keys(current).forEach(key => {
          const newPath = path ? `${path}.${key}` : key
          if (typeof current[key] === 'object' && current[key] !== null) {
            traverse(current[key], newPath)
          } else {
            paths.push({
              path: newPath,
              value: current[key],
              type: typeof current[key]
            })
          }
        })
      }
    }
    
    traverse(obj, prefix)
    return paths
  }
}

/**
 * Vue 响应式JSON编辑器
 */
export function useJsonEditor(initialValue = '') {
  const jsonText = ref(initialValue)
  const isValid = ref(true)
  const errorMessage = ref('')
  const parsedData = ref(null)
  const stats = ref({
    size: { bytes: 0, formatted: '0 B' },
    lines: 0,
    chars: 0
  })

  // 监听JSON文本变化
  watch(jsonText, (newValue) => {
    updateStats(newValue)
    validateJson(newValue)
  }, { immediate: true })

  // 更新统计信息
  function updateStats(text) {
    stats.value = {
      size: JsonUtils.getSize(text),
      lines: text.split('\n').length,
      chars: text.length
    }
  }

  // 验证JSON
  async function validateJson(text) {
    if (!text.trim()) {
      isValid.value = true
      errorMessage.value = ''
      parsedData.value = null
      return
    }

    try {
      const result = await JsonUtils.validate(text)
      isValid.value = result.valid
      errorMessage.value = result.error || ''
      
      if (result.valid) {
        const parseResult = JsonUtils.safeParse(text)
        parsedData.value = parseResult.data
      } else {
        parsedData.value = null
      }
    } catch (error) {
      isValid.value = false
      errorMessage.value = error.message
      parsedData.value = null
    }
  }

  // 格式化JSON
  async function format(options = {}) {
    try {
      const formatted = await JsonUtils.format(jsonText.value, options)
      jsonText.value = JSON.stringify(formatted, null, options.indent || 2)
      return true
    } catch (error) {
      errorMessage.value = error.message
      return false
    }
  }

  // 压缩JSON
  async function minify() {
    try {
      const minified = await JsonUtils.minify(jsonText.value)
      jsonText.value = minified
      return true
    } catch (error) {
      errorMessage.value = error.message
      return false
    }
  }

  // 清空内容
  function clear() {
    jsonText.value = ''
    isValid.value = true
    errorMessage.value = ''
    parsedData.value = null
  }

  // 设置内容
  function setValue(value) {
    if (typeof value === 'object') {
      jsonText.value = JSON.stringify(value, null, 2)
    } else {
      jsonText.value = value
    }
  }

  return {
    jsonText,
    isValid,
    errorMessage,
    parsedData,
    stats,
    format,
    minify,
    clear,
    setValue,
    validateJson: () => validateJson(jsonText.value)
  }
}

/**
 * JSON数据管理器
 */
export function useJsonDataManager() {
  const savedData = ref([])
  const currentData = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // 保存数据到API
  async function saveData(data, title = '') {
    isLoading.value = true
    error.value = null

    try {
      const api = getJsonApi()
      await api.setJsonData({
        title: title || `数据_${Date.now()}`,
        data: data,
        timestamp: new Date().toISOString()
      })

      currentData.value = data
      await loadSavedData()
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 从API加载数据
  async function loadData() {
    isLoading.value = true
    error.value = null

    try {
      const api = getJsonApi()
      const data = await api.getJsonData()
      currentData.value = data
      return data
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 获取保存的数据列表（模拟实现）
  async function loadSavedData() {
    // 这里可以实现从localStorage或其他存储获取历史数据
    // 目前简化处理
    if (currentData.value) {
      savedData.value = [
        {
          id: Date.now(),
          title: '当前数据',
          data: currentData.value,
          timestamp: new Date().toISOString()
        }
      ]
    }
  }

  // 删除数据
  async function deleteData(id) {
    savedData.value = savedData.value.filter(item => item.id !== id)
  }

  // 清空所有数据
  async function clearAllData() {
    try {
      const api = getJsonApi()
      await api.reset()
      savedData.value = []
      currentData.value = null
      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  return {
    savedData,
    currentData,
    isLoading,
    error,
    saveData,
    loadData,
    loadSavedData,
    deleteData,
    clearAllData
  }
}

/**
 * API连接管理器
 */
export function useApiConnection(extensionId) {
  const isConnected = ref(false)
  const currentProvider = ref('unknown')
  const connectionError = ref(null)
  const apiInfo = ref(null)

  // 建立连接
  async function connect() {
    try {
      const api = initJsonApi(extensionId)
      await api.init()
      
      isConnected.value = true
      connectionError.value = null
      
      const status = api.getConnectionStatus()
      currentProvider.value = status.provider
      
      // 获取API信息
      apiInfo.value = await api.getServerInfo()
      
      return true
    } catch (error) {
      isConnected.value = false
      connectionError.value = error.message
      return false
    }
  }

  // 断开连接
  async function disconnect() {
    try {
      if (globalApiClient) {
        await globalApiClient.destroy()
        globalApiClient = null
      }
      
      isConnected.value = false
      currentProvider.value = 'unknown'
      apiInfo.value = null
      
      return true
    } catch (error) {
      connectionError.value = error.message
      return false
    }
  }

  // 切换提供者
  async function switchProvider(provider) {
    try {
      const api = getJsonApi()
      const result = await api.switchProvider(provider)
      
      if (result.success) {
        currentProvider.value = result.provider
      }
      
      return result
    } catch (error) {
      connectionError.value = error.message
      throw error
    }
  }

  // 运行健康检查
  async function healthCheck() {
    try {
      const api = getJsonApi()
      const result = await api.healthCheck()
      
      isConnected.value = result.success
      if (!result.success) {
        connectionError.value = result.error
      }
      
      return result
    } catch (error) {
      isConnected.value = false
      connectionError.value = error.message
      throw error
    }
  }

  // 获取可用提供者
  async function getAvailableProviders() {
    try {
      const api = getJsonApi()
      return await api.getAvailableProviders()
    } catch (error) {
      connectionError.value = error.message
      return []
    }
  }

  return {
    isConnected,
    currentProvider,
    connectionError,
    apiInfo,
    connect,
    disconnect,
    switchProvider,
    healthCheck,
    getAvailableProviders
  }
}

/**
 * 导出所有工具
 */
export default {
  JsonUtils,
  initJsonApi,
  getJsonApi,
  useJsonEditor,
  useJsonDataManager,
  useApiConnection
}