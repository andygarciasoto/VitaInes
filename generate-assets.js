/**
 * Generates VitaInes app icons matching the Vi logo:
 *   - Cream background
 *   - Green "V" (two thick diagonal arms)
 *   - Blue "i" stem (rounded rectangle, no dot)
 *   - Pink heart above the i
 *   - Green smile arc below the letters
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS);

// Brand colors  [R, G, B, A]
const CREAM = [245, 242, 230, 255];  // #F5F2E6 — icon background
const MINT  = [240, 248, 244, 255];  // #F0F8F4 — splash background
const GREEN = [139, 184, 122, 255];  // #8BB87A — V letter + smile
const BLUE  = [107, 159, 192, 255];  // #6B9FC0 — i letter
const PINK  = [244, 160, 176, 255];  // #F4A0B0 — heart
const WHITE = [255, 255, 255, 255];

// ─── pixel helpers ──────────────────────────────────────────────────────────

function createPNG(w, h, fill) {
  const png = new PNG({ width: w, height: h, filterType: -1 });
  png.data = Buffer.alloc(w * h * 4, 0);
  if (fill) {
    for (let i = 0; i < w * h * 4; i += 4) {
      png.data[i]     = fill[0];
      png.data[i + 1] = fill[1];
      png.data[i + 2] = fill[2];
      png.data[i + 3] = fill[3];
    }
  }
  return png;
}

function px(png, x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) * 4;
  png.data[i] = c[0]; png.data[i+1] = c[1];
  png.data[i+2] = c[2]; png.data[i+3] = c[3];
}

// Filled circle
function circle(png, cx, cy, r, c) {
  const r2 = r * r;
  for (let y = Math.ceil(cy - r); y <= cy + r; y++)
    for (let x = Math.ceil(cx - r); x <= cx + r; x++)
      if ((x-cx)**2 + (y-cy)**2 <= r2) px(png, x, y, c);
}

// Thick line by placing circles along its path
function line(png, x1, y1, x2, y2, thick, c) {
  const dx = x2-x1, dy = y2-y1;
  const steps = Math.ceil(Math.hypot(dx, dy));
  const r = thick / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    circle(png, x1 + dx*t, y1 + dy*t, r, c);
  }
}

// Filled rounded rectangle
function roundRect(png, x0, y0, x1, y1, r, c) {
  for (let y = y0+r; y <= y1-r; y++) for (let x = x0;   x <= x1;   x++) px(png,x,y,c);
  for (let y = y0;   y <= y1;   y++) for (let x = x0+r; x <= x1-r; x++) px(png,x,y,c);
  circle(png, x0+r, y0+r, r, c);
  circle(png, x1-r, y0+r, r, c);
  circle(png, x0+r, y1-r, r, c);
  circle(png, x1-r, y1-r, r, c);
}

// Filled heart: two circles + downward triangle
function heart(png, cx, cy, size, c) {
  const r   = Math.round(size * 0.27);
  const bump = Math.round(size * 0.06);
  circle(png, cx - r, cy - bump, r, c);
  circle(png, cx + r, cy - bump, r, c);
  const top = cy - bump + r - 2;
  const bot = cy + Math.round(size * 0.52);
  const hw  = Math.round(size * 0.54);
  for (let y = top; y <= bot; y++) {
    const p = (y - top) / (bot - top);
    const w = Math.round(hw * (1 - p));
    for (let x = cx - w; x <= cx + w; x++) px(png, x, y, c);
  }
}

// Arc segment (thick) — angles in radians, screen coords (y down)
function arc(png, cx, cy, r, a0, a1, thick, c) {
  const steps = Math.ceil(r * Math.abs(a1 - a0));
  const hr = thick / 2;
  for (let s = 0; s <= steps; s++) {
    const a = a0 + (a1 - a0) * s / steps;
    circle(png, cx + r * Math.cos(a), cy + r * Math.sin(a), hr, c);
  }
}

// ─── Vi logo renderer ────────────────────────────────────────────────────────
// All reference coordinates are for 1024×1024; pass scale factor for other sizes.
// originX/originY offset the whole logo (for splash centering).

function drawViLogo(png, scale = 1, originX = 0, originY = 0) {
  const s  = (v) => v * scale;
  const tx = (v) => originX + s(v);
  const ty = (v) => originY + s(v);

  const thick = s(66);   // stroke thickness for V arms

  // ── Green V ──────────────────────────────────────────────────────────────
  const vTipX = tx(383);  // bottom-center meeting point of V
  const vTipY = ty(718);
  line(png, tx(168), ty(185), vTipX, vTipY, thick, GREEN); // left arm
  line(png, vTipX, vTipY, tx(564), ty(185), thick, GREEN); // right arm

  // ── Blue i stem (no dot — heart takes its place) ──────────────────────────
  roundRect(png, tx(598), ty(228), tx(660), ty(714), s(30), BLUE);

  // ── Pink heart above i ─────────────────────────────────────────────────────
  heart(png, tx(629), ty(148), s(95), PINK);

  // ── Green smile arc ────────────────────────────────────────────────────────
  // Arc center is above/inside the letters; bottom point of arc sits at ~y780.
  // Screen angles: 0=right, π/2=down (y-axis flipped)
  // We draw from ~38° to ~142° (bottom half of circle = smile shape).
  arc(png, tx(376), ty(562), s(218), 0.66, 2.48, s(38), GREEN);
}

// ─── Asset generation ────────────────────────────────────────────────────────

function save(png, name) {
  fs.writeFileSync(path.join(ASSETS, name), PNG.sync.write(png));
  console.log(`✅  ${name}  (${png.width}×${png.height})`);
}

// icon.png — 1024×1024, cream background with rounded corner shape
{
  const W = 1024, H = 1024;
  const png = createPNG(W, H, CREAM);
  // Clip to rounded square (iOS adds mask automatically, but good for previews)
  drawViLogo(png, 1, 0, 0);
  save(png, 'icon.png');
}

// adaptive-icon.png — 1024×1024, white background (Android adaptive icon foreground)
{
  const W = 1024, H = 1024;
  const png = createPNG(W, H, WHITE);
  drawViLogo(png, 1, 0, 0);
  save(png, 'adaptive-icon.png');
}

// splash.png — 1284×2778 (iPhone 14 Pro Max), logo centered on mint background
{
  const W = 1284, H = 2778;
  const png = createPNG(W, H, MINT);
  // Draw logo at 65% size, centered horizontally, slightly above vertical center
  const logoScale = 0.65;
  const logoW = 1024 * logoScale;
  const logoH = 800 * logoScale; // approx visual height of logo
  const ox = (W - logoW) / 2 - 20; // slight left adjust for visual balance
  const oy = H * 0.35;              // upper half of screen
  drawViLogo(png, logoScale, ox, oy);
  save(png, 'splash.png');
}

// notification-icon.png — 96×96, white heart on transparent (Android notifications)
{
  const W = 96, H = 96;
  const png = createPNG(W, H, null); // transparent
  heart(png, W/2, H*0.5, H*0.75, WHITE);
  save(png, 'notification-icon.png');
}

console.log('\nVitaInes assets generated successfully!');
