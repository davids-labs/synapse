const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const iconSourcePath = path.join(rootDir, 'build', 'app-icon.svg');
const outputDir = path.join(rootDir, 'build', 'icons');
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

async function generateIcons() {
  await fs.mkdir(outputDir, { recursive: true });
  const svgBuffer = await fs.readFile(iconSourcePath);

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
  }
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
