const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SIZES = [192, 512];
const COLORS = ["#2D1FE8", "#1a0f7a"];
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function generateIcon(size) {
  // Gradient background
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS[0]};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS[1]};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.16}" fill="url(#bg)"/>
    <text x="${size / 2}" y="${size * 0.68}" font-family="Arial,Helvetica,sans-serif" font-size="${size * 0.6}" font-weight="900" fill="white" text-anchor="middle">E</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(OUT_DIR, `icon-${size}.png`));

  console.log(`Generated icon-${size}.png`);
}

async function main() {
  for (const size of SIZES) {
    await generateIcon(size);
  }
  // Also generate apple touch icon (180x180)
  const appleSvg = `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS[0]};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS[1]};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="180" height="180" rx="28" fill="url(#bg)"/>
    <text x="90" y="122" font-family="Arial,Helvetica,sans-serif" font-size="108" font-weight="900" fill="white" text-anchor="middle">E</text>
  </svg>`;

  await sharp(Buffer.from(appleSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(OUT_DIR, "apple-touch-icon.png"));

  console.log("Generated apple-touch-icon.png");
}

main().catch(console.error);
