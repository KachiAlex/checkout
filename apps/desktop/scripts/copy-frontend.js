const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const destDir = path.resolve(__dirname, '..', 'frontend-dist');

function ensureSourceExists() {
  if (!fs.existsSync(sourceDir)) {
    console.error(`[copy-frontend] Source directory missing: ${sourceDir}`);
    process.exit(1);
  }
}

function cleanDestination() {
  fs.rmSync(destDir, { recursive: true, force: true });
}

function copyRecursive() {
  fs.cpSync(sourceDir, destDir, { recursive: true });
  console.log(`[copy-frontend] Copied assets from ${sourceDir} to ${destDir}`);
}

try {
  ensureSourceExists();
  cleanDestination();
  copyRecursive();
} catch (error) {
  console.error('[copy-frontend] Failed:', error);
  process.exit(1);
}
