const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIco() {
  const inputPath = path.join(__dirname, '../build/icon.png');
  const outputPath = path.join(__dirname, '../build/icon.ico');
  
  // ICO 文件需要多个尺寸的图像
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = [];
  
  for (const size of sizes) {
    const buffer = await sharp(inputPath)
      .resize(size, size)
      .png()
      .toBuffer();
    images.push({ size, buffer });
  }
  
  // 创建 ICO 文件头
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0); // Reserved
  iconDir.writeUInt16LE(1, 2); // Type: 1 = ICO
  iconDir.writeUInt16LE(images.length, 4); // Number of images
  
  // 计算每个图像的偏移量
  let offset = 6 + (images.length * 16); // Header + entries
  const entries = [];
  
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // Width (0 = 256)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // Height (0 = 256)
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size
    entry.writeUInt32LE(offset, 12); // Image offset
    entries.push(entry);
    offset += img.buffer.length;
  }
  
  // 组合所有部分
  const ico = Buffer.concat([
    iconDir,
    ...entries,
    ...images.map(img => img.buffer)
  ]);
  
  fs.writeFileSync(outputPath, ico);
  console.log(`ICO file created: ${outputPath} (${ico.length} bytes)`);
}

createIco().catch(console.error);
