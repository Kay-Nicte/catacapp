const sharp = require('sharp');
const path = require('path');

const WIDTH = 1284;
const HEIGHT = 2778;
const LOGO_SIZE = 300;

async function generate() {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1A0D06"/>
        <stop offset="40%" stop-color="#2A1208"/>
        <stop offset="70%" stop-color="#D4621A"/>
        <stop offset="100%" stop-color="#F0923A"/>
      </linearGradient>
      <radialGradient id="spotlight" cx="55%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#F0923A" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#F0923A" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#spotlight)"/>

    <text x="${WIDTH/2}" y="${HEIGHT * 0.54}"
          font-family="sans-serif" font-weight="900" font-size="108"
          fill="white" text-anchor="middle" letter-spacing="3">
      CatacApp
    </text>
    <text x="${WIDTH/2}" y="${HEIGHT * 0.54 + 70}"
          font-family="sans-serif" font-weight="500" font-size="42"
          fill="rgba(255,255,255,0.7)" text-anchor="middle" letter-spacing="1">
      Tu mascota, siempre contigo
    </text>
  </svg>`;

  const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const logoBuffer = await sharp(path.join(__dirname, '..', 'assets', 'icon.png'))
    .resize(LOGO_SIZE, LOGO_SIZE)
    .composite([{
      input: Buffer.from(`<svg><rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="60" ry="60"/></svg>`),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  await sharp(bgBuffer)
    .composite([{
      input: logoBuffer,
      left: Math.round((WIDTH - LOGO_SIZE) / 2),
      top: Math.round(HEIGHT * 0.54 - LOGO_SIZE - 80),
    }])
    .png()
    .toFile(path.join(__dirname, '..', 'assets', 'splash-icon.png'));

  console.log('Done!', WIDTH, 'x', HEIGHT);
}

generate().catch(console.error);
