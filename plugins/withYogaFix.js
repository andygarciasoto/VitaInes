/**
 * Config plugin that adds a Podfile post_install hook to suppress the
 * Xcode 15 "incompatible function pointer types" error in React Native's
 * Yoga layout engine (Expo SDK 51 + Xcode 15 compatibility fix).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

const PATCH = `
  # Fix: Xcode 15 treats YGMeasureFunc pointer mismatch as a hard error.
  # This suppresses it at the pod level until React Native ships a patch.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES'] = 'NO'
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

      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Only patch once
      if (podfile.includes('CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES')) {
        return config;
      }

      // Insert right after the opening of the post_install block
      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${PATCH}`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
