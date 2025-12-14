const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'frontend-dist', 'index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Remove any existing base tags first
  html = html.replace(/<base[^>]*>/gi, '');
  
  // Convert absolute paths to relative paths for Electron
  // /assets/... becomes assets/... (relative to HTML file)
  html = html.replace(/href="\/([^"]+)"/g, 'href="$1"');
  html = html.replace(/src="\/([^"]+)"/g, 'src="$1"');
  
  // Inject base tag right after <head> - use empty string so relative paths work
  html = html.replace(/<head>/, '<head>\n    <base href="./">');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ Base tag injected and paths converted to relative in index.html');
} else {
  console.error('✗ index.html not found at:', htmlPath);
  process.exit(1);
}

