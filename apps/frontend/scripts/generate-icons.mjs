import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const projectRoot = path.resolve(process.cwd());
const source = path.resolve(projectRoot, 'src/assets/checkout-logo.png');
const publicDir = path.resolve(projectRoot, 'public');

const pngSizes = [16, 32, 48, 64, 128, 192, 256, 512];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generatePngs() {
  await ensureDir(publicDir);
  await Promise.all(
    pngSizes.map((size) =>
      sharp(source)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `checkout-icon-${size}.png`)),
    ),
  );

  await sharp(source).resize(512, 512).png().toFile(path.join(publicDir, 'checkout-icon.png'));
}

async function generateIco() {
  const icoBuffer = await pngToIco(
    pngSizes
      .filter((size) => size <= 256)
      .map((size) => path.join(publicDir, `checkout-icon-${size}.png`)),
  );
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
}

async function run() {
  console.log('Generating application icons from', source);
  await generatePngs();
  await generateIco();
  console.log('Icons updated in', publicDir);
}

run().catch((error) => {
  console.error('Failed to generate icons:', error);
  process.exit(1);
});

