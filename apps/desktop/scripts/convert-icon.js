const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '../build');
const inputPng256 = path.join(buildDir, 'icon.png');
const outputIco = path.join(buildDir, 'icon.ico');

if (!fs.existsSync(inputPng256)) {
  console.error('Icon PNG not found:', inputPng256);
  process.exit(1);
}

// Create ICO with the 256x256 PNG - electron-builder requires at least 256x256
// png-to-ico will create a proper multi-size ICO with standard Windows sizes
pngToIco([inputPng256])
  .then(buf => {
    fs.writeFileSync(outputIco, buf);
    const stats = fs.statSync(outputIco);
    console.log('Icon converted successfully:', outputIco);
    console.log('ICO file size:', (stats.size / 1024).toFixed(2), 'KB');
    
    // NSIS typically works with ICO files under 1MB
    if (stats.size > 1024 * 1024) {
      console.warn('Warning: ICO file is large. NSIS may have issues.');
    }
  })
  .catch(err => {
    console.error('Failed to convert icon:', err);
    console.log('Note: electron-builder will use PNG icon if ICO conversion fails');
    process.exit(0);
  });

