/**
 * Generates App Store PNG screenshots from screenshots.html using Playwright.
 * Outputs two size variants:
 *   • 1284 × 2778 px  (iPhone 6.5"  — iPhone 12/13/14 Pro Max)  [required]
 *   • 1242 × 2688 px  (iPhone 5.8"  — iPhone XS Max)             [optional]
 *
 * Run: node marketing/generate-screenshots.js
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { PNG } = require('pngjs');
const path = require('path');
const fs = require('fs');

const SIZES = [
  { w: 1284, h: 2778, suffix: '1284x2778' },
  { w: 1242, h: 2688, suffix: '1242x2688' },
];

const BG = [15, 25, 35, 255];
const NAMES = ['1-dashboard', '2-charts', '3-medications'];

function cropPad(raw, OUT_W, OUT_H) {
  const { width: rW, height: rH } = raw;
  const out = new PNG({ width: OUT_W, height: OUT_H });
  for (let p = 0; p < out.data.length; p += 4) {
    out.data[p]     = BG[0];
    out.data[p + 1] = BG[1];
    out.data[p + 2] = BG[2];
    out.data[p + 3] = BG[3];
  }
  const copyW = Math.min(rW, OUT_W);
  const copyH = Math.min(rH, OUT_H);
  const srcX  = rW > OUT_W ? Math.floor((rW - OUT_W) / 2) : 0;
  const srcY  = rH > OUT_H ? Math.floor((rH - OUT_H) / 2) : 0;
  const dstX  = OUT_W > rW ? Math.floor((OUT_W - rW) / 2) : 0;
  const dstY  = OUT_H > rH ? Math.floor((OUT_H - rH) / 2) : 0;
  PNG.bitblt(raw, out, srcX, srcY, copyW, copyH, dstX, dstY);
  return out;
}

async function main() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // DPR 4.338: 296 * 4.338 ≈ 1284 px wide (close to 1284×2778 target)
  const context = await browser.newContext({
    deviceScaleFactor: 4.338,
    viewport: { width: 1600, height: 1400 },
  });

  const page = await context.newPage();
  const htmlFile = path.resolve(__dirname, 'screenshots.html');
  await page.goto(`file://${htmlFile}`);
  await page.waitForTimeout(1200);

  const phones = page.locator('.phone');
  const total = await phones.count();
  console.log(`Found ${total} phone mockups\n`);

  // Capture raw screenshots once, then resize to each target
  const raws = [];
  for (let i = 0; i < Math.min(total, 3); i++) {
    const tmpPath = path.resolve(__dirname, `_tmp_${i}.png`);
    await phones.nth(i).screenshot({ path: tmpPath });
    const raw = PNG.sync.read(fs.readFileSync(tmpPath));
    fs.unlinkSync(tmpPath);
    console.log(`  Phone ${i + 1} raw: ${raw.width} × ${raw.height}`);
    raws.push(raw);
  }

  console.log('');

  for (const { w, h, suffix } of SIZES) {
    const dir = path.resolve(__dirname, suffix);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    for (let i = 0; i < raws.length; i++) {
      const out = cropPad(raws[i], w, h);
      const outPath = path.join(dir, `screenshot-${NAMES[i]}.png`);
      fs.writeFileSync(outPath, PNG.sync.write(out));
      console.log(`  ✅  ${suffix}/screenshot-${NAMES[i]}.png  (${w} × ${h})`);
    }
    console.log('');
  }

  await browser.close();
  console.log('All screenshots saved to marketing/');
}

main().catch(err => { console.error(err); process.exit(1); });
