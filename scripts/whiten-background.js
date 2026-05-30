const fs = require('fs');
const path = require('path');
const PNG = require('../node_modules/pngjs').PNG;

const inputPath = path.join(__dirname, '../assets/logo.png');
const outputPath = path.join(__dirname, '../assets/logo-white.png');

const data = fs.readFileSync(inputPath);
const png = PNG.sync.read(data);

const { width, height } = png;
const pixels = png.data;

// BG color sampled from corners
const BG = { r: 245, g: 242, b: 230 };
const TOLERANCE = 22;

const idx = (x, y) => (y * width + x) * 4;

const isBg = (x, y) => {
  const i = idx(x, y);
  return (
    Math.abs(pixels[i]   - BG.r) <= TOLERANCE &&
    Math.abs(pixels[i+1] - BG.g) <= TOLERANCE &&
    Math.abs(pixels[i+2] - BG.b) <= TOLERANCE &&
    pixels[i+3] > 200  // skip fully transparent pixels
  );
};

// BFS flood-fill from all four corners
const visited = new Uint8Array(width * height);
const queue = [];

const seed = (x, y) => {
  if (isBg(x, y) && !visited[y * width + x]) {
    visited[y * width + x] = 1;
    queue.push(x, y);
  }
};

seed(0, 0);
seed(width - 1, 0);
seed(0, height - 1);
seed(width - 1, height - 1);

let head = 0;
while (head < queue.length) {
  const x = queue[head++];
  const y = queue[head++];

  // Paint white
  const i = idx(x, y);
  pixels[i]   = 255;
  pixels[i+1] = 255;
  pixels[i+2] = 255;

  const neighbors = [
    [x-1, y], [x+1, y], [x, y-1], [x, y+1],
  ];
  for (const [nx, ny] of neighbors) {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    const ni = ny * width + nx;
    if (!visited[ni] && isBg(nx, ny)) {
      visited[ni] = 1;
      queue.push(nx, ny);
    }
  }
}

console.log(`Flood-filled ${head / 2} background pixels`);

const out = PNG.sync.write(png);
fs.writeFileSync(outputPath, out);
console.log('Saved:', outputPath);
