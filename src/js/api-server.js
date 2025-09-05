/**
 * JSON数据一键转API服务模块
 * 利用浏览器原生能力提供本地API服务
 */

class ApiServerManager {
  constructor() {
    this.isServerRunning = false;
    this.serverPort = 9527;
    this.apiEndpoints = new Map();
    this.corsEnabled = true;
    this.serverUrl = `http://localhost:${this.serverPort}`;
    this.mockServerUrl = 'https://jsonplaceholder.typicode.com'; // 备用演示服务器
  }

  /**
   * 初始化API服务器
   */
  async initialize() {
    try {
      // 检查是否支持本地服务器功能
      this.checkLocalServerSupport();
      console.log('API服务器管理器初始化成功');
      return { success: true };
    } catch (error) {
      console.error('API服务器初始化失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查本地服务器支持
   */
  checkLocalServerSupport() {
    // 检查是否在开发环境或支持本地服务器的环境中
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    if (!hasServiceWorker) {
      console.warn('当前环境不支持Service Worker，将使用模拟模式');
    }
    
    return { isLocalhost, hasServiceWorker };
  }

  /**
   * 启动API服务器（模拟模式）
   */
  async startServer() {
    try {
      if (this.isServerRunning) {
        return { success: true, message: 'API服务器已在运行中' };
      }

      // 在浏览器插件环境中，我们使用模拟的方式
      this.isServerRunning = true;
      
      return {
        success: true,
        message: `API服务已启动，可生成模拟端点`,
        serverUrl: this.serverUrl,
        endpoints: this.getEndpointList(),
        note: '注意：这是模拟模式，实际项目中请使用真实的API服务器'
      };
    } catch (error) {
      console.error('启动API服务器失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 停止API服务器
   */
  async stopServer() {
    try {
      this.isServerRunning = false;
      this.apiEndpoints.clear();
      
      return {
        success: true,
        message: 'API服务器已停止'
      };
    } catch (error) {
      console.error('停止API服务器失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 从当前JSON数据快速创建API
   */
  async createApiFromCurrentJson(jsonData, customPath = null) {
    try {
      // 解析JSON数据
      let parsedData;
      if (typeof jsonData === 'string') {
        parsedData = JSON.parse(jsonData);
      } else {
        parsedData = jsonData;
      }

      // 生成API路径
      const path = customPath || this.generateApiPath(parsedData);

      // 添加API端点
      const result = this.addApiEndpoint(path, parsedData, {
        description: `从JSON数据生成的API: ${path}`,
        method: 'GET'
      });

      if (!result.success) {
        return result;
      }

      // 如果服务器未运行，自动启动
      if (!this.isServerRunning) {
        const startResult = await this.startServer();
        if (!startResult.success) {
          return startResult;
        }
      }

      // 生成多种实现方案
      const implementations = this.generateApiImplementations(path, parsedData);

      return {
        success: true,
        endpoint: result.endpoint,
        apiUrl: `${this.serverUrl}${path}`,
        message: `API端点创建成功！`,
        implementations,
        mockUrl: this.generateMockUrl(parsedData)
      };
    } catch (error) {
      console.error('从JSON创建API失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成API实现方案
   */
  generateApiImplementations(path, data) {
    return {
      // Express.js 实现
      express: this.generateExpressImplementation(path, data),
      
      // Node.js 原生实现
      nodejs: this.generateNodejsImplementation(path, data),
      
      // JSON Server 配置
      jsonServer: this.generateJsonServerConfig(path, data),
      
      // Mock Service Worker 实现
      msw: this.generateMSWImplementation(path, data),
      
      // Vercel Serverless 实现
      vercel: this.generateVercelImplementation(path, data)
    };
  }

  /**
   * 生成Express.js实现
   */
  generateExpressImplementation(path, data) {
    return `// Express.js API 实现
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// 启用CORS
app.use(cors());
app.use(express.json());

// API数据
const apiData = ${JSON.stringify(data, null, 2)};

// API端点
app.get('${path}', (req, res) => {
  // 支持查询参数过滤
  let result = apiData;
  
  // 如果是数组，支持分页
  if (Array.isArray(result)) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    if (req.query.page || req.query.limit) {
      result = {
        data: result.slice(startIndex, endIndex),
        pagination: {
          page,
          limit,
          total: apiData.length,
          totalPages: Math.ceil(apiData.length / limit)
        }
      };
    }
  }
  
  res.json(result);
});

app.listen(port, () => {
  console.log(\`API服务器运行在 http://localhost:\${port}\`);
  console.log(\`访问端点: http://localhost:\${port}${path}\`);
});

// 启动命令: node server.js`;
  }

  /**
   * 生成Node.js原生实现
   */
  generateNodejsImplementation(path, data) {
    return `// Node.js 原生 HTTP 服务器实现
const http = require('http');
const url = require('url');

// API数据
const apiData = ${JSON.stringify(data, null, 2)};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 处理API端点
  if (parsedUrl.pathname === '${path}' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(apiData, null, 2));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: '端点不存在' }));
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(\`API服务器运行在 http://localhost:\${port}\`);
  console.log(\`访问端点: http://localhost:\${port}${path}\`);
});

// 启动命令: node server.js`;
  }

  /**
   * 生成JSON Server配置
   */
  generateJsonServerConfig(path, data) {
    const resourceName = path.replace('/api/', '').replace('/', '') || 'data';
    
    return `// JSON Server 配置文件 (db.json)
{
  "${resourceName}": ${JSON.stringify(data, null, 2)}
}

// package.json scripts 配置
{
  "scripts": {
    "api": "json-server --watch db.json --port 3000 --cors"
  },
  "devDependencies": {
    "json-server": "^0.17.0"
  }
}

// 安装和启动命令:
// npm install json-server --save-dev
// npm run api

// 访问地址: http://localhost:3000/${resourceName}
// JSON Server 自动提供 RESTful API:
// GET    /${resourceName}     - 获取所有数据
// GET    /${resourceName}/:id - 获取单个数据
// POST   /${resourceName}     - 创建数据
// PUT    /${resourceName}/:id - 更新数据
// DELETE /${resourceName}/:id - 删除数据`;
  }

  /**
   * 生成MSW实现
   */
  generateMSWImplementation(path, data) {
    return `// Mock Service Worker 实现
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// API数据
const apiData = ${JSON.stringify(data, null, 2)};

// 定义API处理器
export const handlers = [
  rest.get('http://localhost:3000${path}', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(apiData)
    );
  }),
];

// 设置服务器（用于Node.js环境，如测试）
export const server = setupServer(...handlers);

// 浏览器环境设置 (src/mocks/browser.js)
import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// 在应用中启动 MSW
if (process.env.NODE_ENV === 'development') {
  worker.start();
}

// 安装命令: npm install msw --save-dev
// 初始化命令: npx msw init public/ --save`;
  }

  /**
   * 生成Vercel Serverless实现
   */
  generateVercelImplementation(path, data) {
    const functionName = path.replace('/api/', '').replace('/', '') || 'data';
    
    return `// Vercel Serverless Function
// 文件路径: api/${functionName}.js

// API数据
const apiData = ${JSON.stringify(data, null, 2)};

export default function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 处理GET请求
  if (req.method === 'GET') {
    res.status(200).json(apiData);
  } else {
    res.status(405).json({ error: '方法不允许' });
  }
}

// vercel.json 配置文件
{
  "functions": {
    "api/${functionName}.js": {
      "maxDuration": 10
    }
  }
}

// 部署命令: vercel --prod
// 访问地址: https://your-project.vercel.app/api/${functionName}`;
  }

  /**
   * 生成模拟URL（用于演示）
   */
  generateMockUrl(data) {
    // 这里可以集成一些在线的JSON存储服务
    // 比如 JSONBin, MockAPI 等
    return `https://jsonplaceholder.typicode.com/posts/1`;
  }

  /**
   * 添加API端点
   */
  addApiEndpoint(path, data, options = {}) {
    try {
      const endpoint = {
        path,
        data,
        method: options.method || 'GET',
        description: options.description || '',
        createdAt: new Date().toISOString()
      };

      this.apiEndpoints.set(path, endpoint);

      return {
        success: true,
        endpoint,
        message: `API端点 ${path} 添加成功`
      };
    } catch (error) {
      console.error('添加API端点失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取服务器状态
   */
  getServerStatus() {
    return {
      isRunning: this.isServerRunning,
      port: this.serverPort,
      url: this.serverUrl,
      endpointCount: this.apiEndpoints.size,
      endpoints: this.getEndpointList(),
      corsEnabled: this.corsEnabled
    };
  }

  /**
   * 获取端点列表
   */
  getEndpointList() {
    const endpoints = [];
    for (const [path, endpoint] of this.apiEndpoints) {
      endpoints.push({
        path,
        method: endpoint.method,
        description: endpoint.description,
        url: `${this.serverUrl}${path}`
      });
    }
    return endpoints;
  }

  /**
   * 生成API路径
   */
  generateApiPath(data) {
    try {
      // 如果数据是对象，尝试从键名推断路径
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const keys = Object.keys(data);
        
        // 查找可能的资源名称
        const resourceKeys = keys.filter(key => 
          Array.isArray(data[key]) || 
          (typeof data[key] === 'object' && data[key] !== null)
        );
        
        if (resourceKeys.length > 0) {
          return `/api/${resourceKeys[0]}`;
        }
        
        // 如果没有明显的资源键，使用第一个键
        if (keys.length > 0) {
          return `/api/${keys[0]}`;
        }
      }
      
      // 如果是数组，使用通用名称
      if (Array.isArray(data)) {
        return '/api/list';
      }
      
      // 默认路径
      return '/api/data';
    } catch (error) {
      console.error('生成API路径失败:', error);
      return '/api/data';
    }
  }

  /**
   * 生成API使用示例
   */
  generateApiExamples(apiUrl) {
    return {
      javascript: `// JavaScript 原生请求
fetch('${apiUrl}')
  .then(response => response.json())
  .then(data => {
    console.log('API数据:', data);
  })
  .catch(error => {
    console.error('请求失败:', error);
  });

// 使用 async/await
async function fetchApiData() {
  try {
    const response = await fetch('${apiUrl}');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}`,

      vue: `// Vue.js 组件中使用
<template>
  <div>
    <div v-if="loading">加载中...</div>
    <div v-else>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      data: null,
      loading: true
    };
  },
  async mounted() {
    try {
      const response = await fetch('${apiUrl}');
      this.data = await response.json();
    } catch (error) {
      console.error('API请求失败:', error);
    } finally {
      this.loading = false;
    }
  }
};
</script>`,

      react: `// React 组件中使用
import React, { useState, useEffect } from 'react';

function ApiDataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('${apiUrl}');
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
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default ApiDataComponent;`
    };
  }
}

// 创建全局实例
window.apiServerManager = new ApiServerManager();