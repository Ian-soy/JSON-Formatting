# 浏览器原生API服务使用指南

## 📋 概述

JSON格式化大师现已全面升级为**浏览器原生API服务**！无需安装Python、Node.js或任何外部环境，完全基于现代浏览器技术实现API调试功能。

## 🎯 核心特性

### ✨ 零依赖安装
- ❌ 不需要安装Python环境
- ❌ 不需要安装Node.js环境  
- ❌ 不需要配置任何外部服务
- ✅ 完全基于浏览器原生能力

### 🔧 多种API提供者
| 提供者 | 描述 | 性能 | 数据持久化 | 推荐场景 |
|--------|------|------|------------|----------|
| **Service Worker** | 基于Chrome扩展Service Worker | 🟢 高性能 | 临时存储 | 轻量级调试 |
| **IndexedDB** | 基于浏览器数据库存储 | 🟡 中等性能 | ✅ 持久化 | 需要数据保存 |
| **Memory** | 基于内存存储 | 🟢 最高性能 | ❌ 临时存储 | 高频测试 |

### 🚀 智能切换
- 自动检测最佳可用提供者
- 支持手动切换API提供者
- 故障时自动回退到备用方案

## 📖 使用方法

### 1. 启动API服务

1. 在JSON输入框中输入或粘贴JSON数据
2. 点击**"转为API服务"**按钮
3. 在弹窗中点击**"启动API服务"**
4. 等待服务启动完成（通常1-3秒）

### 2. API端点使用

启动后可通过以下方式访问API：

#### 基本端点
```javascript
// 健康检查
chrome.runtime.sendMessage({action: 'checkApiStatus'})

// 获取JSON数据  
unifiedApiManager.get('/json-data')

// 更新JSON数据
unifiedApiManager.post('/json-data', {data: yourJsonData})

// 数据验证
unifiedApiManager.post('/validate', {data: yourJsonData})

// 格式化数据
unifiedApiManager.post('/format', {data: yourJsonData}, {indent: 2})

// 压缩数据
unifiedApiManager.post('/minify', {data: yourJsonData})
```

#### 服务管理
```javascript
// 获取服务器信息
unifiedApiManager.get('/info')

// 获取统计信息
unifiedApiManager.get('/stats')

// 重置数据
unifiedApiManager.post('/reset')

// 关闭服务
unifiedApiManager.post('/shutdown')
```

### 3. 高级功能

#### 切换API提供者
```javascript
// 切换到IndexedDB提供者
unifiedApiManager.switchProvider('indexeddb')

// 切换到内存提供者  
unifiedApiManager.switchProvider('memory')

// 切换到Service Worker提供者
unifiedApiManager.switchProvider('browser-native')
```

#### 性能测试
```javascript
// 运行性能测试
unifiedApiManager.performanceTest(10) // 10次迭代

// 在控制台运行完整测试
testBrowserNativeApi()

// 快速测试
quickTestBrowserApi()
```

## 🔍 调试指南

### 控制台调试
打开浏览器开发者工具，在Console中可以看到详细的调试信息：

```javascript
// 检查可用提供者
unifiedApiManager.getSupportedProviders()

// 获取当前提供者信息
unifiedApiManager.getCurrentProviderInfo()

// 运行健康检查
unifiedApiManager.checkHealth()
```

### 状态监控
```javascript
// 监控服务状态
setInterval(async () => {
  const health = await unifiedApiManager.checkHealth();
  console.log('API健康状态:', health);
}, 5000);
```

## 🆚 与Python API的对比

| 特性 | Python FastAPI | 浏览器原生API |
|------|---------------|---------------|
| **安装需求** | Python + pip + 依赖 | 无需安装 |
| **启动时间** | 5-15秒 | 1-3秒 |
| **端口占用** | localhost:8000 | 无端口 |
| **跨域问题** | 需要CORS配置 | 自动处理 |
| **文档页面** | Swagger UI | 内置调试 |
| **性能** | 中等 | 高性能 |
| **部署复杂度** | 高 | 极低 |

## 🛠️ 故障排除

### 常见问题

#### 1. API服务启动失败
**症状**: 点击启动后显示错误信息

**解决方法**:
1. 重新加载扩展: `chrome://extensions/` → 找到JSON格式化大师 → 重新加载
2. 检查浏览器版本（需要Chrome 88+）
3. 检查扩展权限是否正确授予

#### 2. API响应缓慢
**症状**: API调用响应时间过长

**解决方法**:
1. 切换到Memory提供者: `unifiedApiManager.switchProvider('memory')`
2. 减少数据量
3. 运行性能测试: `unifiedApiManager.performanceTest()`

#### 3. 数据丢失
**症状**: 重新启动后数据消失

**解决方法**:
1. 使用IndexedDB提供者: `unifiedApiManager.switchProvider('indexeddb')`
2. 定期保存重要数据到历史记录
3. 使用导出功能备份数据

#### 4. 兼容性问题
**症状**: 在某些浏览器中无法使用

**支持的浏览器**:
- ✅ Chrome 88+
- ✅ Edge 88+
- ❌ Firefox (不支持Manifest V3)
- ❌ Safari (不支持Chrome扩展)

### 调试命令

在控制台中运行这些命令进行诊断：

```javascript
// 1. 检查环境
console.log('浏览器:', navigator.userAgent);
console.log('扩展API:', typeof chrome);
console.log('Service Worker:', typeof importScripts);

// 2. 检查API服务
console.log('统一管理器:', typeof unifiedApiManager);
console.log('浏览器原生API:', typeof BrowserNativeApiService);
console.log('IndexedDB API:', typeof IndexedDBApiService);
console.log('内存API:', typeof MemoryApiService);

// 3. 运行诊断测试
quickTestBrowserApi();

// 4. 查看详细日志
unifiedApiManager.getCurrentProviderInfo();
```

## 📊 性能优化建议

### 1. 选择合适的提供者
- **轻量级使用**: Service Worker (browser-native)
- **数据持久化**: IndexedDB
- **高频调用**: Memory

### 2. 优化数据处理
```javascript
// 批量操作
const operations = [
  {method: 'POST', path: '/validate', data: data1},
  {method: 'POST', path: '/format', data: data2},
  {method: 'POST', path: '/minify', data: data3}
];

// 并发执行
Promise.all(operations.map(op => 
  unifiedApiManager.request(op.method, op.path, op.data)
));
```

### 3. 监控性能
```javascript
// 定期性能测试
setInterval(() => {
  unifiedApiManager.performanceTest(5).then(result => {
    if (result.average_response_time > 100) {
      console.warn('API性能下降，建议切换提供者');
    }
  });
}, 60000); // 每分钟检查一次
```

## 🚀 未来路线图

- [ ] 支持更多数据格式 (YAML, TOML)
- [ ] WebAssembly性能优化
- [ ] 分布式API服务
- [ ] 实时协作功能
- [ ] 云端同步

## 💡 最佳实践

1. **启动时选择**: 优先使用Service Worker提供者
2. **数据保存**: 重要数据使用IndexedDB提供者
3. **性能测试**: 定期运行性能测试检查服务状态
4. **错误处理**: 监听API错误并实现重试机制
5. **资源清理**: 不使用时及时停止API服务

---

**🎉 恭喜！您现在可以享受零依赖的API调试体验了！**

如有问题，请查看控制台日志或运行 `quickTestBrowserApi()` 进行诊断。