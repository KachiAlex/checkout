const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const inputPng = path.join(__dirname, '../build/icon.png');
const outputIco = path.join(__dirname, '../build/icon.ico');

if (!fs.existsSync(inputPng)) {
  console.error('Icon PNG not found:', inputPng);
  process.exit(1);
}

pngToIco([inputPng])
  .then(buf => {
    fs.writeFileSync(outputIco, buf);
    console.log('Icon converted successfully:', outputIco);
  })
  .catch(err => {
    console.error('Failed to convert icon:', err);
    // electron-builder can use PNG directly, so this is not critical
    console.log('Note: electron-builder will use PNG icon if ICO conversion fails');
    process.exit(0);
  });

