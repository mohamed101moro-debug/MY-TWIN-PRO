/** محاذاة أداة Expo SDK 52 (compileSdk 35 / AGP 8.6):
 *  سقف androidx.core عند 1.15.0 — آخر خط متوافق أصلًا مع الأداة الحالية.
 *  يُحذف هذا الـ plugin تلقائيًا بعد الترقية إلى Expo SDK 54 (الذي يجلب compileSdk 36 + AGP 8.9). */
const { withAppBuildGradle } = require('@expo/config-plugins');
module.exports = function withAndroidCoreCap(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes("androidx.core:core:1.15.0")) {
      cfg.modResults.contents =
        "configurations.all {\n" +
        "    resolutionStrategy {\n" +
        "        force 'androidx.core:core:1.15.0'\n" +
        "        force 'androidx.core:core-ktx:1.15.0'\n" +
        "    }\n" +
        "}\n" + cfg.modResults.contents;
    }
    return cfg;
  });
};
