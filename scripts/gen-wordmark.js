const sharp = require("sharp");

// Brand-orange EDYFRA wordmark (replaces the old blue/white one)
const logoSvg = (size) =>
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 1024 1024'>` +
      `<defs>` +
      `<linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>` +
      `<stop offset='0%' stop-color='#FF9500'/><stop offset='100%' stop-color='#E8521B'/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect width='1024' height='1024' fill='white'/>` +
      `<circle cx='300' cy='512' r='190' fill='url(#g)'/>` +
      // white grad cap glyph inside the circle
      `<path d='M300 400 L404 450 L300 500 L196 450 Z' fill='white'/>` +
      `<path d='M232 470 L232 522 Q232 552 300 552 Q368 552 368 522 L368 470 L300 500 Z' fill='none' stroke='white' stroke-width='20' stroke-linejoin='round'/>` +
      `<circle cx='300' cy='442' r='14' fill='white'/>` +
      `<path d='M300 456 C 288 476 262 484 250 504' stroke='white' stroke-width='16' fill='none' stroke-linecap='round'/>` +
      // wordmark
      `<text x='530' y='575' font-family='Arial, Helvetica, sans-serif' font-size='190' font-weight='bold' fill='#0F0527' letter-spacing='4'>EDYFRA</text>` +
      `</svg>`
  );

// 1200x630 social card
const ogSvg = () =>
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630' viewBox='0 0 1200 630'>` +
      `<defs>` +
      `<linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>` +
      `<stop offset='0%' stop-color='#0F0527'/><stop offset='55%' stop-color='#1a1033'/><stop offset='100%' stop-color='#3d1152'/>` +
      `</linearGradient>` +
      `<linearGradient id='accent' x1='0%' y1='0%' x2='100%' y2='0%'>` +
      `<stop offset='0%' stop-color='#FF9500'/><stop offset='100%' stop-color='#E8521B'/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect width='1200' height='630' fill='url(#bg)'/>` +
      // solid blob accents
      `<circle cx='1060' cy='90' r='150' fill='#FF9500' opacity='0.18'/>` +
      `<circle cx='90' cy='560' r='170' fill='#E8521B' opacity='0.15'/>` +
      `<circle cx='950' cy='540' r='90' fill='#7C3AED' opacity='0.25'/>` +
      `<circle cx='620' cy='70' r='46' fill='#06B6D4' opacity='0.3'/>` +
      `<rect x='480' y='500' width='40' height='40' rx='10' fill='#F5C842' opacity='0.35' transform='rotate(12 500 520)'/>` +
      // logo mark
      `<circle cx='240' cy='315' r='110' fill='url(#accent)'/>` +
      `<path d='M240 252 L312 287 L240 322 L168 287 Z' fill='#0F0527'/>` +
      `<path d='M186 296 L186 336 Q186 360 240 360 Q294 360 294 336 L294 296 L240 322 Z' fill='none' stroke='#0F0527' stroke-width='14' stroke-linejoin='round'/>` +
      `<circle cx='240' cy='280' r='10' fill='#0F0527'/>` +
      // wordmark + tagline
      `<text x='390' y='355' font-family='Arial, Helvetica, sans-serif' font-size='120' font-weight='bold' fill='#F0EEF8' letter-spacing='6'>EDYFRA</text>` +
      `<text x='394' y='420' font-family='Arial, Helvetica, sans-serif' font-size='34' font-weight='600' fill='#FF9500'>Study Smarter, Not Harder.</text>` +
      `<text x='394' y='470' font-family='Arial, Helvetica, sans-serif' font-size='26' fill='#A09CB8'>Kenya&apos;s institutional study platform</text>` +
      `</svg>`
  );

async function main() {
  await sharp(logoSvg(1024)).resize(1024, 1024).png().toFile("public/logo.png");
  console.log("public/logo.png ok");
  await sharp(ogSvg()).resize(1200, 630).png().toFile("public/og-image.png");
  console.log("public/og-image.png ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
