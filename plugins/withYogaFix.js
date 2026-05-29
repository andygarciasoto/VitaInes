/**
 * Config plugin: patches the generated Podfile to suppress the
 * Xcode 15 "incompatible function pointer types" error in React Native's
 * Yoga layout engine (Expo SDK 51 + Xcode 15 compatibility fix).
 *
 * Two strategies:
 *   1. If a post_install block exists → insert the fix right after the opening line
 *   2. If no post_install block exists → append a new one at the end of the file
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

const YOGA_FIX = `
  # Xcode 15 fix: suppress incompatible-function-pointer-types in Yoga pod
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      cfg.build_settings['CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES'] = 'NO'
    end
  end
`;

module.exports = function withYogaFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withYogaFix] Podfile not found at', podfilePath);
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Already patched — nothing to do
      if (podfile.includes('CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES')) {
        return config;
      }

      // Strategy 1: find an existing post_install block (any spacing/var name)
      const match = podfile.match(/post_install\s+do\s+\|\w+\|/);
      if (match) {
        podfile = podfile.replace(match[0], match[0] + '\n' + YOGA_FIX);
        console.log('[withYogaFix] Inserted fix into existing post_install block');
      } else {
        // Strategy 2: no post_install block — append a brand new one
        podfile += `\npost_install do |installer|\n${YOGA_FIX}\nend\n`;
        console.log('[withYogaFix] Appended new post_install block with fix');
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
