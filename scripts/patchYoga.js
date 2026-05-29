/**
 * Patches React Native's Yoga Node.cpp to fix the Xcode 15 build error:
 *   "incompatible function pointer types passing YGNodeRef to YGMeasureFunc"
 *
 * Root cause: Node::measure() passes `this` (non-const Node*) to measureFunc_
 * which expects YGNodeConstRef (const Node*). Xcode 15 treats this as an error.
 * Fix: cast `this` to YGNodeConstRef at the call site.
 */

const fs   = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  '../node_modules/react-native/ReactCommon/yoga/yoga/node/Node.cpp'
);

if (!fs.existsSync(FILE)) {
  console.log('[patchYoga] File not found — skipping patch:', FILE);
  process.exit(0);
}

let src = fs.readFileSync(FILE, 'utf8');

// Already patched
if (src.includes('static_cast<YGNodeConstRef>(this)')) {
  console.log('[patchYoga] Already patched — nothing to do.');
  process.exit(0);
}

// Patch: cast `this` to const so it matches YGMeasureFunc's expected type
const ORIGINAL = '      this, width, unscopedEnum(widthMode), height, unscopedEnum(heightMode));';
const PATCHED  = '      static_cast<YGNodeConstRef>(this), width, unscopedEnum(widthMode), height, unscopedEnum(heightMode));';

if (!src.includes(ORIGINAL)) {
  console.warn('[patchYoga] Expected string not found — patch may already be applied or source changed.');
  console.warn('[patchYoga] Skipping to avoid breaking the build.');
  process.exit(0);
}

src = src.replace(ORIGINAL, PATCHED);
fs.writeFileSync(FILE, src, 'utf8');
console.log('[patchYoga] Successfully patched Node.cpp — Xcode 15 YGMeasureFunc fix applied.');
