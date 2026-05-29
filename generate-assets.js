/**
 * Generates all required Expo assets:
 *   assets/icon.png             1024×1024  (App Store / Play Store icon)
 *   assets/adaptive-icon.png    1024×1024  (Android adaptive icon foreground)
 *   assets/splash.png           1284×2778  (iPhone 14 Pro Max splash)
 *   assets/notification-icon.png  96×96    (Android notification icon — white on transparent)
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS);

// Brand colors
const PRIMARY  = [76, 175, 147, 255];   // #4CAF93 teal-green
const BG_LIGHT = [240, 248, 244, 255];  // #F0F8F4 light mint
const WHITE    = [255, 255, 255, 255];

// ─── helpers ─────────────────────────────────────────────────────────────────

function createPNG(w, h) {
  const png = new PNG({ width: w, height: h, filterType: -1 });
  png.data = Buffer.alloc(w * h * 4, 0);
  return png;
}

function setPixel(png, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) * 4;
  png.data[i]     = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function fillRect(png, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      setPixel(png, x, y, color);
}

function fillCircle(png, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
        setPixel(png, x, y, color);
}

// Draw a ♥ heart using two circles + a triangle
function drawHeart(png, cx, cy, size, color) {
  const r = Math.round(size * 0.28);
  // two circles for the top bumps
  fillCircle(png, cx - r, cy - Math.round(size * 0.05), r, color);
  fillCircle(png, cx + r, cy - Math.round(size * 0.05), r, color);
  // triangle for the bottom point
  const top    = cy - Math.round(size * 0.05) + r;
  const bottom = cy + Math.round(size * 0.55);
  const left   = cx - Math.round(size * 0.56);
  const right  = cx + Math.round(size * 0.56);
  for (let y = top; y <= bottom; y++) {
    const progress = (y - top) / (bottom - top);
    const halfW    = Math.round((left < right ? right - cx : cx - left) * (1 - progress));
    fillRect(png, cx - halfW, y, cx + halfW, y, color);
  }
}

// Rounded-rectangle background
function fillRoundedRect(png, x0, y0, x1, y1, radius, color) {
  fillRect(png, x0 + radius, y0, x1 - radius, y1, color);
  fillRect(png, x0, y0 + radius, x1, y1 - radius, color);
  fillCircle(png, x0 + radius, y0 + radius, radius, color);
  fillCircle(png, x1 - radius, y0 + radius, radius, color);
  fillCircle(png, x0 + radius, y1 - radius, radius, color);
  fillCircle(png, x1 - radius, y1 - radius, radius, color);
}

function save(png, filename) {
  const dest = path.join(ASSETS, filename);
  const buf  = PNG.sync.write(png);
  fs.writeFileSync(dest, buf);
  console.log(`✅  ${filename}  (${png.width}×${png.height})`);
}

// ─── icon.png  1024×1024 ──────────────────────────────────────────────────────
function makeIcon(w, h, bgColor, heartColor) {
  const png = createPNG(w, h);
  // Background — rounded square with large radius
  const radius = Math.round(w * 0.18);
  fillRoundedRect(png, 0, 0, w - 1, h - 1, radius, bgColor);
  // Heart centered, ~52% of icon height
  drawHeart(png, Math.round(w / 2), Math.round(h * 0.47), Math.round(h * 0.52), heartColor);
  return png;
}

save(makeIcon(1024, 1024, BG_LIGHT, PRIMARY), 'icon.png');
save(makeIcon(1024, 1024, WHITE,    PRIMARY), 'adaptive-icon.png');

// ─── splash.png  1284×2778 ───────────────────────────────────────────────────
{
  const W = 1284, H = 2778;
  const png = createPNG(W, H);
  fillRect(png, 0, 0, W - 1, H - 1, BG_LIGHT);
  // Heart in the upper half
  drawHeart(png, Math.round(W / 2), Math.round(H * 0.38), Math.round(W * 0.42), PRIMARY);
  save(png, 'splash.png');
}

// ─── notification-icon.png  96×96 ────────────────────────────────────────────
// Android needs a white-on-transparent icon
{
  const W = 96, H = 96;
  const png = createPNG(W, H);
  // transparent background (already zero-filled)
  drawHeart(png, Math.round(W / 2), Math.round(H * 0.47), Math.round(H * 0.72), WHITE);
  save(png, 'notification-icon.png');
}

console.log('\nAll assets generated in ./assets/');
