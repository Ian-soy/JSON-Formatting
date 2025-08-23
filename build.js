// 简单的构建脚本
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建项目...');

// 检查项目结构
const checkFiles = [
  'manifest.json',
  'popup.html',
  'src/css/popup.css',
  'src/js/popup.js'
];

let totalSize = 0;

checkFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    totalSize += stats.size;
    console.log(`✅ ${file}: ${(stats.size / 1024).toFixed(2)}KB`);
  } else {
    console.log(`❌ 缺少文件: ${file}`);
  }
});

console.log(`📊 项目总大小: ${(totalSize / 1024).toFixed(2)}KB`);
console.log('🎉 构建完成！');