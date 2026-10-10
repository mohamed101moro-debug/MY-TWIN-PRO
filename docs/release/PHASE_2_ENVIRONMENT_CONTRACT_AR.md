# عقد إعداد البيئات — My Twin

## API من تطبيق الهاتف

يُحل عنوان الخادم بالترتيب التالي:

1. `EXPO_PUBLIC_API_BASE_URL` في بيئة بناء Expo/EAS، ويجب أن يشير إلى API للبيئة نفسها (dev أو staging أو production).
2. `extra.API_URL` في Expo app config كقيمة fallback معتمدة.
3. عنوان الإنتاج الحالي كـ fallback نهائي فقط عندما لا توجد قيمة صريحة.

القيمة public وليست secret؛ يسمح بعنوان host بلا scheme لأجل التوافق، ويُحوّل إلى HTTPS. يجب ألا يُمرر أي service-role key أو مفتاح خاص إلى `EXPO_PUBLIC_*` أو `extra`.

WebSocket يشتق مخطط `ws/wss` من عنوان API نفسه، لذلك لا تضبط عنواناً مستقلاً ما لم يُعدّل العقد وتضاف له اختبارات.

## EAS identity

يجب أن يتطابق `extra.eas.projectId` مع UUID الموجود في `updates.url`، كما يجب أن تتطابق owner/slug مع المشروع المقصود. يفشل `scripts/validate_expo_config.cjs` عندما يختلف المعرّفان. لا تُحل هذه الحالة بتخمين أو بتغيير تلقائي؛ يُطلب التحقق من لوحة Expo، ثم يُعدّل الملفان في commit واضح وتُختبر قنوات preview/production.

## Railway وSupabase

`SUPABASE_URL` و`SUPABASE_SERVICE_KEY`/`SUPABASE_SERVICE_ROLE_KEY` إعدادات **خلفية خاصة** وتُضاف إلى Variables الخاصة بخدمة backend في Railway، لا إلى Expo أو مستودع Git. لا تُرسل قيم هذه المتغيرات في logs أو المحادثة. بعد تعديل Railway، يلزم deployment جديد وقراءة log بدء التشغيل وhealth/readiness endpoint للتحقق من أن العملية ترى المتغيرات المطلوبة.

## الفصل بين البيئات

- كل EAS profile يستخدم environment مسمى صراحةً، وكل بيئة تشير إلى API/DB منفصلين.
- لا يسمح لنسخة preview أو development أن ترجع بصمت إلى production عند فقد إعداد staging.
- لا تُستعمل migrations أو jobs أو مفاتيح Supabase production لاختبار build.
- EAS Update لا يُنشر بعد تغيير native dependencies إلا على runtime/channel متوافقين مع binary مبني على ذلك الـ runtime.

## بوابات التحقق

1. `npx expo config --type public --json` ينتج config قابلاً للقراءة.
2. EAS IDs متطابقة ويجري تأكيدها من المالك.
3. عنوان API في كل profile صحيح ولا يحتوي أسراراً.
4. TypeScript/Jest/Expo export يمر، ثم native preview build على Android وiOS وقبول الجهاز قبل أي نشر.
5. Railway variables موجودة في نطاق الخدمة الصحيحة، وخدمة backend تبدأ فعلاً على البيئة المستهدفة.
