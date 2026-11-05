# npm audit triage — 2026-11-05

الأمر المستخدم: `npm audit --omit=dev`. النتيجة الحالية: **49 vulnerability** (1 low، 28 moderate، 18 high، 2 critical). لم يُستخدم `npm audit fix --force`.

## High/Critical inventory

| الحزمة | الشدة | الوضع | القرار |
|---|---:|---|---|
| `shell-quote` | critical | إصلاح متاح | تحديث غير قسري في دفعة مستقلة، ثم TypeScript/Jest/Expo build |
| `tar` | critical | الإصلاح المقترح يقفز Expo إلى 58 | ADR قبول مؤقت؛ لا force على SDK52 |
| `@expo/cli` | high | الإصلاح يقفز Expo إلى 58 | ADR قبول مؤقت؛ أداة build وليست runtime production |
| `@xmldom/xmldom` | high | الإصلاح يقفز expo-constants إلى 58 | ADR مؤقت حتى خطة SDK منضبطة |
| `cacache` | high | الإصلاح يقفز Expo إلى 58 | ADR مؤقت؛ build-time |
| `postcss` | high | الإصلاح يقفز Expo إلى 58 | ADR مؤقت؛ build-time |
| `linkify-it` | high | لا يوجد fix | تخفيف: لا تمرر HTML غير موثوق إلى markdown renderer؛ ترقية renderer لاحقاً |
| `markdown-it` | high | لا يوجد fix | تخفيف ومراجعة `react-native-markdown-display` قبل أي محتوى غير موثوق |
| `@react-navigation/core` | high | إصلاح متاح عبر dependency tree | تحديث آمن فقط مع اختبار Expo 52 |
| `brace-expansion` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `compression` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `decode-uri-component` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `fast-uri` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `image-size` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `js-yaml` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `nanoid` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `node-forge` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `query-string` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `source-map-js` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |
| `undici` | high | إصلاح متاح | تحديث lockfile غير قسري مع اختبار كامل |

## قرار البوابة

لا تُخفض عتبة CI ولا تُخفي التقرير. لا تُنفذ `npm audit fix --force`؛ أي تحديث يغير Expo/React Native major يحتاج ADR منفصل، جهاز preview، وقرار SDK موثق. تبقى الحالة `NO-GO` حتى يتم triage كل high/critical وتسجيل دليل الاختبار.
