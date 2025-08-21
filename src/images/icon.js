/**
 * JSON格式化大师 - 图标生成脚本
 * 生成插件所需的各种尺寸的图标
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// 创建图标
async function createIcon(size) {
  // 创建新图像
  const image = new Jimp(size, size, 0x1e1e1eff); // 背景色 #1e1e1e
  
  // 创建边框
  const borderWidth = Math.max(1, Math.round(size * 0.08));
  const borderColor = 0x0078d7ff; // #0078d7
  const innerSize = Math.round(size * 0.7);
  const startPos = Math.round(size * 0.15);
  
  // 绘制边框 (上边)
  for (let x = startPos; x < startPos + innerSize; x++) {
    for (let y = startPos; y < startPos + borderWidth; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 绘制边框 (右边)
  for (let x = startPos + innerSize - borderWidth; x < startPos + innerSize; x++) {
    for (let y = startPos; y < startPos + innerSize; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 绘制边框 (下边)
  for (let x = startPos; x < startPos + innerSize; x++) {
    for (let y = startPos + innerSize - borderWidth; y < startPos + innerSize; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 绘制边框 (左边)
  for (let x = startPos; x < startPos + borderWidth; x++) {
    for (let y = startPos; y < startPos + innerSize; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 由于Jimp不支持直接绘制文本，我们使用简化的方式绘制大括号
  // 这里我们使用像素点来模拟大括号的形状
  
  // 绘制左大括号 {
  const leftBraceX = Math.round(size * 0.35);
  const braceY = Math.round(size * 0.5);
  const braceHeight = Math.round(size * 0.3);
  const braceWidth = Math.max(1, Math.round(size * 0.05));
  
  // 垂直线
  for (let y = braceY - braceHeight/2; y <= braceY + braceHeight/2; y++) {
    for (let x = leftBraceX - braceWidth; x < leftBraceX; x++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 水平线 (上)
  for (let x = leftBraceX - braceWidth; x < leftBraceX + braceWidth; x++) {
    for (let y = braceY - braceHeight/2; y < braceY - braceHeight/2 + braceWidth; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 水平线 (下)
  for (let x = leftBraceX - braceWidth; x < leftBraceX + braceWidth; x++) {
    for (let y = braceY + braceHeight/2 - braceWidth; y <= braceY + braceHeight/2; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 绘制右大括号 }
  const rightBraceX = Math.round(size * 0.65);
  
  // 垂直线
  for (let y = braceY - braceHeight/2; y <= braceY + braceHeight/2; y++) {
    for (let x = rightBraceX; x < rightBraceX + braceWidth; x++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 水平线 (上)
  for (let x = rightBraceX - braceWidth; x < rightBraceX + braceWidth; x++) {
    for (let y = braceY - braceHeight/2; y < braceY - braceHeight/2 + braceWidth; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  // 水平线 (下)
  for (let x = rightBraceX - braceWidth; x < rightBraceX + braceWidth; x++) {
    for (let y = braceY + braceHeight/2 - braceWidth; y <= braceY + braceHeight/2; y++) {
      image.setPixelColor(borderColor, x, y);
    }
  }
  
  return image;
}

// 生成并保存图标
async function generateIcons() {
  const sizes = [16, 48, 128];
  const outputDir = path.join(__dirname);
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    for (const size of sizes) {
      const image = await createIcon(size);
      const outputPath = path.join(outputDir, `icon${size}.png`);
      
      await image.writeAsync(outputPath);
      console.log(`已生成图标: ${outputPath}`);
    }
    console.log('所有图标生成完成！');
  } catch (error) {
    console.error('生成图标时出错:', error);
  }
}

// 执行图标生成
generateIcons();

// 导出图标生成函数（如果需要在其他模块中使用）
module.exports = {
  createIcon,
  generateIcons
};