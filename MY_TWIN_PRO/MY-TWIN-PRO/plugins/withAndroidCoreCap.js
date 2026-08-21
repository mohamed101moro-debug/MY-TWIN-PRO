/** محاذاة أداة Expo SDK 52: سقف androidx.core 1.15.0 — يُحذف بعد الترقية لـ SDK 54. */
const { withAppBuildGradle } = require('expo/config-plugins');
module.exports = function withAndroidCoreCap(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes("androidx.core:core:1.15.0")) {
      cfg.modResults.contents = "configurations.all {\n    resolutionStrategy {\n        force 'androidx.core:core:1.15.0'\n        force 'androidx.core:core-ktx:1.15.0'\n    }\n}\n" + cfg.modResults.contents;
    }
    return cfg;
  });
};
