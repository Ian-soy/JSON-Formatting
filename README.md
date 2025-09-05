# JSON格式化大师 ⚡

一款轻量级、高性能的Chrome浏览器JSON格式化扩展。

## ✨ 核心特性

- 🎯 **轻量级设计** - 体积小巧，启动快速
- ⚡ **高性能优化** - 支持大型JSON文件处理
- 🎨 **现代化UI** - 简洁美观的深色主题
- 🔧 **多功能工具** - 格式化、压缩、分享
- 💾 **数据持久化** - 本地缓存历史记录
- 🌐 **跨平台兼容** - 支持主流浏览器

## 🚀 主要功能

### 🛠️ 基础功能
- JSON格式化美化
- JSON压缩
- 一键复制到剪贴板
- 下载JSON文件

### 🎆 零依赖API功能
- **Service Worker API** - 最高性能，零依赖
- **Memory API** - 轻量级，数据临时
- **IndexedDB API** - 支持数据持久化
- **智能切换** - 自动选择最优提供者

### 🎨 高级功能
- 数据保存与历史记录
- 格式转换（XML、CSV）
- 在线分享
- 可配置设置

### 🚀 **NEW** JSON转API服务
- **一键转换** - 将JSON数据快速转换为API端点
- **多种实现** - 提供Express.js、Node.js、JSON Server等实现方案
- **代码生成** - 自动生成前端调用代码和后端实现代码
- **智能路径** - 根据数据结构自动推荐API路径
- **CORS支持** - 自动处理跨域请求配置
- **即时可用** - 生成的代码可直接在Vue、React项目中使用

## 📦 安装方法

1. 下载项目到本地
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 🎯 JSON转API服务使用示例

### 快速开始
1. **输入JSON数据**
   ```json
   {
     "users": [
       {"id": 1, "name": "张三", "email": "zhangsan@example.com"},
       {"id": 2, "name": "李四", "email": "lisi@example.com"}
     ]
   }
   ```

2. **点击API按钮** 🚀 - 打开API服务面板

3. **创建API端点** - 系统自动推荐路径 `/api/users`

4. **获取实现代码** - 选择适合的后端实现方案

### 前端使用示例

#### Vue.js
```vue
<template>
  <div v-for="user in users" :key="user.id">
    {{ user.name }} - {{ user.email }}
  </div>
</template>

<script>
export default {
  data() {
    return { users: [] };
  },
  async mounted() {
    const response = await fetch('http://localhost:3000/api/users');
    this.users = await response.json();
  }
};
</script>
```

#### React
```jsx
function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3000/api/users')
      .then(res => res.json())
      .then(setUsers);
  }, []);
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name} - {user.email}</div>
      ))}
    </div>
  );
}
```

### 后端实现方案

#### Express.js (推荐)
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.get('/api/users', (req, res) => {
  res.json(yourJsonData);
});

app.listen(3000);
```

#### JSON Server (最简单)
```bash
# 安装
npm install -g json-server

# 创建 db.json 文件，粘贴生成的JSON数据

# 启动服务
json-server --watch db.json --port 3000 --cors
```

> 📖 **详细文档**: 查看 [API_SERVICE_GUIDE.md](./API_SERVICE_GUIDE.md) 获取完整使用指南

## 🛠️ 技术架构

### 性能优化
- 防抖和节流处理
- 大文件分块处理
- DOM操作优化
- 内存缓存管理

### 兼容性
- Manifest V3 支持
- 现代浏览器适配
- 渐进式降级
- 错误边界处理

### 代码优化
- 模块化架构
- 精简代码体积
- 懒加载机制
- 压缩优化

## 📊 性能指标

- 📏 **体积**: < 200KB
- ⚡ **启动时间**: < 100ms
- 🚀 **处理能力**: 支持10MB+大文件
- 💻 **内存占用**: < 50MB

## 🔧 开发指南

### 项目结构
```
JSON-Formatting/
├── manifest.json          # 扩展配置
├── popup.html            # 主界面
├── src/
│   ├── css/
│   │   ├── popup.css     # 样式文件
│   │   └── content.css   # 内容脚本样式
│   └── js/
│       ├── popup.js      # 主逻辑
│       ├── background.js # 后台脚本
│       └── *.js         # 功能模块
└── README.md
```

### 构建命令
```bash
# 检查项目
node build.js

# 安装依赖（可选）
npm install
```

## 📋 版本历史

### v1.0.0 🎉
- 首次发布
- 完整功能实现
- 性能优化
- 兼容性改进

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 开源协议

MIT License