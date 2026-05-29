/**
 * Generates App Store PNG screenshots from screenshots.html using Playwright.
 * Output: 1290 × 2796 px (iPhone 6.7" / iPhone 14 Pro Max standard).
 *
 * Run: node marketing/generate-screenshots.js
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { PNG } = require('pngjs');
const path = require('path');
const fs = require('fs');

const OUT_W = 1290;
const OUT_H = 2796;

// Backgrounds to fill any gap after crop/pad (matches page dark bg)
const BG = [15, 25, 35, 255];

const NAMES = ['1-dashboard', '2-charts', '3-medications'];

async function main() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // DPR chosen so phone CSS (296 × 641 px) maps close to 1290 × 2796
  // 296 × 4.36 ≈ 1291,  641 × 4.36 ≈ 2795  → we trim/pad 1 px each
  const context = await browser.newContext({
    deviceScaleFactor: 4.36,
    viewport: { width: 1600, height: 1400 },
  });

  const page = await context.newPage();
  const htmlFile = path.resolve(__dirname, 'screenshots.html');
  await page.goto(`file://${htmlFile}`);
  await page.waitForTimeout(1200); // let SVG & fonts settle

  const phones = page.locator('.phone');
  const total = await phones.count();
  console.log(`Found ${total} phone mockups\n`);

  for (let i = 0; i < Math.min(total, 3); i++) {
    // 1. Screenshot the phone element at high DPR
    const tmpPath = path.resolve(__dirname, `_tmp_${i}.png`);
    await phones.nth(i).screenshot({ path: tmpPath });

    const raw = PNG.sync.read(fs.readFileSync(tmpPath));
    fs.unlinkSync(tmpPath);
    const { width: rW, height: rH } = raw;
    console.log(`  Phone ${i + 1} raw: ${rW} × ${rH}`);

    // 2. Create output canvas filled with dark background
    const out = new PNG({ width: OUT_W, height: OUT_H });
    for (let p = 0; p < out.data.length; p += 4) {
      out.data[p]     = BG[0];
      out.data[p + 1] = BG[1];
      out.data[p + 2] = BG[2];
      out.data[p + 3] = BG[3];
    }

    // 3. Center-crop / center-pad to exactly OUT_W × OUT_H
    const copyW = Math.min(rW, OUT_W);
    const copyH = Math.min(rH, OUT_H);
    const srcX  = rW > OUT_W ? Math.floor((rW - OUT_W) / 2) : 0;
    const srcY  = rH > OUT_H ? Math.floor((rH - OUT_H) / 2) : 0;
    const dstX  = OUT_W > rW ? Math.floor((OUT_W - rW) / 2) : 0;
    const dstY  = OUT_H > rH ? Math.floor((OUT_H - rH) / 2) : 0;

    PNG.bitblt(raw, out, srcX, srcY, copyW, copyH, dstX, dstY);

    // 4. Save
    const outPath = path.resolve(__dirname, `screenshot-${NAMES[i]}.png`);
    fs.writeFileSync(outPath, PNG.sync.write(out));
    console.log(`  ✅  screenshot-${NAMES[i]}.png  (${OUT_W} × ${OUT_H})\n`);
  }

  await browser.close();
  console.log('All screenshots saved to marketing/');
}

main().catch(err => { console.error(err); process.exit(1); });
