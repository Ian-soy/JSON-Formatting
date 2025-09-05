# JSON转API服务功能指南

## 🚀 功能概述

JSON格式化大师插件新增了**JSON数据一键转API服务**功能，让您能够快速将JSON数据转换为可用的API端点，极大提升前端开发效率。

## ✨ 主要特性

- **🔧 一键转换**：将任意JSON数据快速转换为API端点
- **🌐 多种实现**：提供Express.js、Node.js、JSON Server等多种后端实现方案
- **⚡ 即时可用**：生成的代码可直接在Vue、React项目中使用
- **📝 代码示例**：自动生成前端调用代码和后端实现代码
- **🔄 CORS支持**：自动处理跨域请求配置
- **📊 智能路径**：根据JSON数据结构智能推荐API路径

## 🎯 使用场景

### 前端开发阶段
- **快速原型开发**：无需等待后端API，直接使用JSON数据进行开发
- **接口设计验证**：快速验证API接口设计的合理性
- **数据结构测试**：测试前端组件对不同数据结构的处理能力

### 团队协作
- **前后端并行开发**：前端可以先用模拟数据进行开发
- **API文档生成**：自动生成API使用示例和实现代码
- **数据格式标准化**：统一团队的数据格式规范

## 📖 使用指南

### 1. 基本使用流程

1. **输入JSON数据**
   - 在插件中输入或粘贴您的JSON数据
   - 确保JSON格式正确（可使用格式化功能验证）

2. **点击API按钮**
   - 点击工具栏中的"🚀"按钮打开API服务面板

3. **配置API端点**
   - 自定义API路径（可选，系统会自动推荐）
   - 添加API描述信息

4. **创建API端点**
   - 点击"创建API端点"按钮
   - 系统会自动生成多种实现方案

5. **使用生成的代码**
   - 复制前端调用代码到您的项目中
   - 选择合适的后端实现方案

### 2. API路径智能推荐

系统会根据JSON数据结构自动推荐合适的API路径：

```javascript
// 用户数据 → /api/users
{
  "users": [...]
}

// 产品数据 → /api/products  
{
  "products": [...]
}

// 数组数据 → /api/list
[
  {...},
  {...}
]

// 通用数据 → /api/data
{
  "key": "value"
}
```

### 3. 支持的实现方案

#### Express.js 实现
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.get('/api/data', (req, res) => {
  res.json(yourData);
});

app.listen(3000);
```

#### JSON Server 实现
```json
{
  "data": yourJsonData
}
```
```bash
npm install json-server --save-dev
json-server --watch db.json --port 3000 --cors
```

#### Node.js 原生实现
```javascript
const http = require('http');
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(yourData));
});
```

#### Mock Service Worker (MSW)
```javascript
import { rest } from 'msw';
export const handlers = [
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json(yourData));
  }),
];
```

#### Vercel Serverless
```javascript
// api/data.js
export default function handler(req, res) {
  res.status(200).json(yourData);
}
```

## 💡 最佳实践

### 1. 数据结构设计
```javascript
// ✅ 推荐：结构化的数据
{
  "users": [
    {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1
  }
}

// ❌ 避免：过于复杂的嵌套结构
{
  "level1": {
    "level2": {
      "level3": {
        "data": "value"
      }
    }
  }
}
```

### 2. API路径命名
```javascript
// ✅ 推荐：RESTful风格
/api/users          // 用户列表
/api/users/1        // 单个用户
/api/products       // 产品列表

// ❌ 避免：动词形式
/api/getUsers       
/api/fetchProducts  
```

### 3. 响应格式标准化
```javascript
// ✅ 推荐：统一的响应格式
{
  "success": true,
  "data": [...],
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🔧 高级功能

### 1. 分页支持
生成的Express.js代码自动支持分页参数：
```javascript
// GET /api/data?page=1&limit=10
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 2. 查询过滤
支持基本的查询参数过滤：
```javascript
// GET /api/users?name=张三
// GET /api/products?category=电子产品
```

### 3. CORS配置
所有生成的实现都包含完整的CORS配置：
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

## 🚀 快速开始示例

### Vue.js 项目集成
```vue
<template>
  <div>
    <div v-if="loading">加载中...</div>
    <div v-else>
      <div v-for="item in data" :key="item.id">
        {{ item.name }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      data: [],
      loading: true
    };
  },
  async mounted() {
    try {
      const response = await fetch('http://localhost:3000/api/users');
      this.data = await response.json();
    } catch (error) {
      console.error('API请求失败:', error);
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

### React 项目集成
```jsx
import React, { useState, useEffect } from 'react';

function UserList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/users');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('API请求失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}

export default UserList;
```

## 🔍 故障排除

### 常见问题

1. **CORS错误**
   - 确保后端代码包含正确的CORS头设置
   - 检查端口号是否正确

2. **JSON格式错误**
   - 使用插件的格式化功能验证JSON格式
   - 检查是否有多余的逗号或引号

3. **端口占用**
   - 更改端口号（默认3000）
   - 检查是否有其他服务占用端口

4. **网络请求失败**
   - 确认API服务器已启动
   - 检查防火墙设置

### 调试技巧

1. **使用浏览器开发者工具**
   - 查看Network标签页的请求详情
   - 检查Console中的错误信息

2. **API测试**
   - 使用插件内置的"测试"功能
   - 或使用Postman等工具测试API

3. **日志输出**
   - 在生成的服务器代码中添加console.log
   - 监控请求和响应数据

## 📚 相关资源

- [Express.js 官方文档](https://expressjs.com/)
- [JSON Server 文档](https://github.com/typicode/json-server)
- [Mock Service Worker 文档](https://mswjs.io/)
- [Vercel 部署指南](https://vercel.com/docs)

## 🤝 贡献与反馈

如果您在使用过程中遇到问题或有改进建议，欢迎：
- 提交Issue报告问题
- 提供功能改进建议
- 分享使用经验和最佳实践

---

**注意**：此功能主要用于开发阶段的数据模拟，生产环境请使用专业的API服务器解决方案。