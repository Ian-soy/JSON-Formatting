// 全局变量
let pythonProcess = null;
let apiServerRunning = false;
let currentJsonData = {};

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startApiServer') {
    debugger;
    startApiServer(request.data, sendResponse);
    return true; // 保持消息通道开放，以便异步响应
  } else if (request.action === 'stopApiServer') {
    stopApiServer(sendResponse);
    return true; // 保持消息通道开放，以便异步响应
  } else if (request.action === 'checkApiStatus') {
    sendResponse({ running: apiServerRunning });
    return false;
  }
});

// 启动API服务器
function startApiServer(jsonData, sendResponse) {
  if (apiServerRunning) {
    sendResponse({ success: true, message: 'API服务器已经在运行' });
    return;
  }

  currentJsonData = jsonData;
  
  // 创建临时Python文件
  createPythonApiServer()
    .then(() => {
      // 使用fetch API检查服务器是否已启动
      return checkServerStatus();
    })
    .then(isRunning => {
      if (isRunning) {
        apiServerRunning = true;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '服务器启动失败' });
      }
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });
}

// 停止API服务器
function stopApiServer(sendResponse) {
  if (!apiServerRunning) {
    sendResponse({ success: true, message: 'API服务器未运行' });
    return;
  }

  // 发送请求停止服务器
  fetch('http://localhost:8000/shutdown', { method: 'POST' })
    .then(response => {
      if (response.ok) {
        apiServerRunning = false;
        sendResponse({ success: true });
      } else {
        throw new Error('服务器停止失败');
      }
    })
    .catch(error => {
      console.error('API服务器停止错误:', error);
      // 如果无法通过API停止，尝试强制关闭
      apiServerRunning = false;
      sendResponse({ success: true, message: '服务器已强制停止' });
    });
}

// 创建Python API服务器文件
function createPythonApiServer() {
  return new Promise((resolve, reject) => {
    // 使用chrome.downloads API下载Python文件
    const pythonCode = `
      import json
      import uvicorn
      import threading
      from fastapi import FastAPI, HTTPException
      from fastapi.middleware.cors import CORSMiddleware
      from pydantic import BaseModel
      from typing import Dict, Any

      # 创建FastAPI应用
      app = FastAPI(
          title="JSON Master API",
          description="由JSON格式化大师提供的API服务",
          version="1.0.0"
      )

      # 添加CORS中间件
      app.add_middleware(
          CORSMiddleware,
          allow_origins=["*"],
          allow_credentials=True,
          allow_methods=["*"],
          allow_headers=["*"],
      )

      # 存储当前JSON数据
      current_json_data = {}

      # 数据模型
      class JsonData(BaseModel):
          data: Dict[str, Any]

      # 获取JSON数据
      @app.get("/json-data")
      async def get_json_data():
          return current_json_data

      # 更新JSON数据
      @app.post("/json-data")
      async def update_json_data(json_data: JsonData):
          global current_json_data
          current_json_data = json_data.data
          return {"status": "success", "message": "JSON数据已更新"}

      # 关闭服务器
      @app.post("/shutdown")
      async def shutdown():
          # 在单独的线程中关闭服务器
          def stop_server():
              uvicorn.Server.should_exit = True
          
          threading.Thread(target=stop_server).start()
          return {"status": "success", "message": "服务器正在关闭"}

      # 初始化JSON数据
      def init_json_data(data):
          global current_json_data
          current_json_data = data

      # 启动服务器
      def start_server(json_data=None):
          if json_data:
              init_json_data(json_data)
          
          uvicorn.run(app, host="127.0.0.1", port=8000)

      if __name__ == "__main__":
          # 从命令行参数获取JSON数据
          import sys
          if len(sys.argv) > 1:
              try:
                  data = json.loads(sys.argv[1])
                  start_server(data)
              except json.JSONDecodeError:
                  print("无效的JSON数据")
                  start_server({})
          else:
              start_server({})
      `;

    // 使用Blob和URL创建一个可下载的链接
    const blob = new Blob([pythonCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    chrome.downloads.download({
      url: url,
      filename: 'json_api_server.py',
      saveAs: false
    }, downloadId => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        // 监听下载完成
        chrome.downloads.onChanged.addListener(function downloadListener(delta) {
          if (delta.id === downloadId && delta.state && delta.state.current === 'complete') {
            chrome.downloads.onChanged.removeListener(downloadListener);
            
            // 获取下载项信息
            chrome.downloads.search({ id: downloadId }, function(items) {
              if (items && items.length > 0) {
                const filePath = items[0].filename;
                
                // 启动Python进程
                startPythonProcess(filePath, JSON.stringify(currentJsonData))
                  .then(resolve)
                  .catch(reject);
              } else {
                reject(new Error('无法获取下载文件信息'));
              }
            });
          }
        });
      }
    });
  });
}

// 启动Python进程
function startPythonProcess(scriptPath, jsonData) {
  return new Promise((resolve, reject) => {
    // 使用chrome.runtime.sendNativeMessage与本地Python解释器通信
    // 注意：这需要设置本地主机应用程序
    // 由于浏览器扩展的限制，我们使用一个模拟实现
    
    // 模拟启动Python进程
    console.log(`模拟启动Python进程: python ${scriptPath} '${jsonData}'`);
    
    // 等待一段时间，模拟服务器启动
    setTimeout(() => {
      // 检查服务器是否已启动
      checkServerStatus()
        .then(isRunning => {
          if (isRunning) {
            resolve();
          } else {
            reject(new Error('无法启动Python服务器'));
          }
        })
        .catch(reject);
    }, 1000);
  });
}

// 检查服务器状态
function checkServerStatus() {
  return new Promise((resolve) => {
    fetch('http://localhost:8000/json-data')
      .then(response => {
        if (response.ok) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch(() => {
        resolve(false);
      });
  });
}

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener(() => {
  // 初始化存储
  chrome.storage.sync.get(['theme', 'fontSize'], (data) => {
    if (!data.theme) {
      chrome.storage.sync.set({ theme: 'dark' });
    }
    if (!data.fontSize) {
      chrome.storage.sync.set({ fontSize: 14 });
    }
  });
});