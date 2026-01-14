const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
const buildDir = path.join(__dirname, '..', 'build');

async function generateIcons() {
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate PNG at 512x512
    await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile(path.join(buildDir, 'icon.png'));
    console.log('Created icon.png (512x512)');
    
    // Generate different sizes for ICO
    const sizes = [16, 32, 48, 64, 128, 256];
    
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(buildDir, `icon-${size}.png`));
        console.log(`Created icon-${size}.png`);
    }
    
    console.log('\nPNG files created successfully!');
    console.log('\nTo create icon.ico, you can use one of these methods:');
    console.log('1. Use png-to-ico package: npx png-to-ico build/icon-256.png > build/icon.ico');
    console.log('2. Use online converter: https://convertio.co/png-ico/');
}

generateIcons().catch(console.error);
