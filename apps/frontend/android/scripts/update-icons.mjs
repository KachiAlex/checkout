import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = __dirname;
const androidPath = path.resolve(scriptPath, '..');
const frontendPath = path.resolve(androidPath, '..');
const sourceIcon = path.resolve(frontendPath, 'public', 'checkout-icon.png');

const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const resDir = path.resolve(androidPath, 'app', 'src', 'main', 'res');

async function updateIcons() {
  console.log('Updating Android launcher icons from', sourceIcon);
  
  // Check if source icon exists
  try {
    await fs.access(sourceIcon);
  } catch (error) {
    console.error(`Source icon not found: ${sourceIcon}`);
    console.error('Please run "npm run icons:generate" first to generate icons from logo');
    process.exit(1);
  }

  for (const [density, size] of Object.entries(iconSizes)) {
    const targetDir = path.resolve(resDir, density);
    
    try {
      await fs.access(targetDir);
      
      // Resize and save ic_launcher.png
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.resolve(targetDir, 'ic_launcher.png'));
      
      // Resize and save ic_launcher_round.png
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.resolve(targetDir, 'ic_launcher_round.png'));
      
      // Resize and save ic_launcher_foreground.png
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.resolve(targetDir, 'ic_launcher_foreground.png'));
      
      console.log(`✓ Updated icons in ${density} (${size}x${size})`);
    } catch (error) {
      console.warn(`Warning: Could not update ${density}:`, error.message);
    }
  }

  console.log('Android icon update complete!');
}

updateIcons().catch((error) => {
  console.error('Failed to update Android icons:', error);
  process.exit(1);
});

