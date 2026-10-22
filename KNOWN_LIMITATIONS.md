# القيود والموانع الحالية — My Twin

**آخر تحديث:** 22 أكتوبر 2026. هذا سجل للحالة الحالية، وليس اعتماداً للإطلاق. وثيقة `BASELINE.md` تبقى سجلاً تاريخياً ليوم 10 أكتوبر ولا تُعدّل رجوعياً.

## GitHub والمصدر

- رؤوس `main` وPR #1–#4 أُعيدت كتابتها في 22 أكتوبر لإزالة اعتماد ثابت وبيانات دخول افتراضية من التاريخ المعروف؛ لذلك تغيّرت معرّفات commits.
- أكّد المالك تدوير اعتماد الاختبار قبل إعادة الكتابة. لأن المستودع عام، قد تبقى نسخ في forks أو caches داخلية لدى GitHub؛ force-push لا يضمن محوها، ويلزم طلب GitHub Support لإزالة البيانات الحساسة إذا بقيت قابلة للوصول.
- PRs #1–#4 ما زالت مفتوحة كمسودات متراكمة؛ لم يُدمج أي منها إلى `main`. لذلك لا يصح القول إن `main` استُبدل بحزمة P0.05؛ الحزمة موجودة في فرع الدمج/المراجعة.
- PR #1 هو baseline P0.05، PR #2 إعدادات البناء، PR #3 الجلسات/الموافقات، وPR #4 hardening لمدقق الصلاحيات. كلها تحتاج مراجعة وCI أخضر قبل الدمج.
- يحتوي الفرع `BASELINE.md` و`SOURCE_MANIFEST.json` و`KNOWN_LIMITATIONS.md`، ويذكر baseline استيراد 883 ملفاً من حزمة P0-05. هذا لا يلغي بوابات القبول اللاحقة أو يثبت أن جميع ملفات `main` تبدلت.

## Railway وAPI

- النطاق الذي زوّد به المالك: `https://my-twin-pro-production-fd77.up.railway.app/`.
- أفاد المالك في 21 أكتوبر أن Railway غير مربوط حالياً بالمستودع. لا يوجد في جلسة التنفيذ Railway connector أو CLI موثوق لتأكيد الفرع المتصل أو إعداد Root Directory أو بدء deployment؛ لذلك لا يوجد إثبات أن أي commit حديث وصل إلى الخدمة.
- استجابة `/health` الناجحة التي سُجلت سابقاً هي liveness فقط. لا تُثبت أن Supabase أو أعمدة المصادقة أو RLS أو worker جاهزة.
- يضيف فرع المراجعة الجاري `/ready` لفحص اتصال قاعدة البيانات وعقد `profiles.id,status,deleted_at` دون قراءة صفوف؛ لم يُنشر المسار ولم ينجح CI الخاص بهذا التغيير بعد.
- على فرع المراجعة الجاري تحديث `app.json` وfallback الهاتف إلى النطاق الجديد. لن يحدث deploy تلقائي بسبب الفصل الذي أكده المالك.
- إعدادات `railway.json` في جذر المستودع و`backend/railway.json` تخدم سياقي build مختلفين؛ يجب اختيار ملف الإعداد ومسار الجذر بناءً على إعداد الخدمة الفعلي قبل ربطها، ولا يمكن استنتاج ذلك من الملفات وحدها.

## Supabase الإنتاج

- أكد المالك أن المشروع `nckgqvpocawknhkruhip` هو production. الفحوص السابقة كانت metadata/كتالوج فقط: لم تُقرأ صفوف مستخدمين ولم تطبق DDL أو تعديلات سياسات.
- فحص metadata الموثق في جلسة 21 أكتوبر أظهر غياب أعمدة `profiles.status`, `deleted_at`, `deletion_started_at` المطلوبة من مسارات الحساب/المصادقة والحذف؛ لذلك قد تفشل المسارات الموثقة حتى لو كان `/health` ناجحاً.
- RLS معطل على `twin_internal_states`, `twin_events`, `identity_versions`; رُصدت grants واسعة لـ`anon` و`authenticated` تشمل CRUD وامتيازات لا تضبطها RLS؛ وهناك سياسات `profiles` مكررة وملاحظات Advisor. هذه نتائج metadata سابقة للقراءة فقط وتحتاج إعادة تحقق على staging قبل كتابة أي migration.
- جدول `privacy_consents` غير موجود في metadata وقت الفحص؛ migration الموافقات لم تُثبت على قاعدة الإنتاج. لا تُطبق migrations أو SQL على الإنتاج من الفرع أو المحادثة مباشرة.
- لا توجد بيئة staging مثبتة لهذا الفحص، ولا نسخة احتياطية/اختبار استعادة معتمد. جميع اختبارات A/B أو worker التي تتطلب قاعدة حية تبقى `NOT RUN`.

## البناء والاعتماديات

- إعداد العميل على الفرع يستخدم Expo SDK 52 / React Native 0.76.9. لم تُنفذ ترقية SDK مدروسة أو بناء native APK/AAB على EAS أو قبول Android/iOS فعلي.
- UUID EAS المعتمد من المالك هو `49db469b-9aca-4ffc-8b34-88b140528840`، وموجود في `extra.eas.projectId` و`updates.url`؛ ذلك لا يثبت اكتمال credentials أو build أو النشر.
- GitHub Actions على PR #4: backend ناجح في تشغيلين حديثين، وfrontend يفشل عند `npm audit --omit=dev --audit-level=high`. السجل يعرض 62 finding (1 critical, 37 high, 24 moderate). اقتراح `npm audit fix --force` يقفز إلى `expo@44.0.6` وهو تغيير كاسر؛ لم يُستخدم.
- نتائج backend المحلية السابقة: 229 passed و9 skipped على بيئة Python 3.12.3. CI المثبت على Python 3.11.17 هو مرجع القبول؛ كما أن CI الحالي على GitHub يمر للـbackend.

## حالة خارطة الطريق

- **المرحلة 0:** baseline/manifest موجودان على فروع مراجعة؛ غير مقبولين في `main` بعد.
- **المرحلة 1:** جرد API جزئي موجود؛ capability/dependency/active-dormant inventory الكامل غير مثبت.
- **المرحلة 2:** EAS ID موحد وبناء JavaScript جرى محلياً سابقاً؛ CI audit يمنع الدمج، ولا native release build.
- **المرحلة 3:** توجد تغييرات SecureStore وconsent enforcement في PR #3/#4؛ سياسة الخصوصية مسودة، جدول الموافقات غير مطبق، واختبار staging غير منفذ.
- **المرحلة 4:** PR #4 يطوّر مدقق grants فقط؛ حالة الإنتاج بها موانع موثقة، ولا staging/A-B evidence.
- **المرحلة 5:** تصدير الحساب مغلق عمداً عبر `EXPORT_SCHEMA_VERIFICATION_PASSED=False` ومخزون غير مكتمل؛ لا يوجد worker/cron staging معتمد.
- **المرحلة 6:** يوجد كود lifecycle/continuity واختبارات ساكنة؛ Gate 0/A-E والجهاز و72 ساعة غير منفذة على staging.
- **المرحلتان 7–8:** موافقات مزودي AI موجودة جزئياً؛ في الفحص لم يوجد caller للـembedding client أو vector schema دائم، وتقييم الجودة/cache/cost/failure غير مقبول.
- **المرحلتان 9–10:** health الحالي لا يثبت الجاهزية؛ RTDN لمسار Google Play يرجع 503 حتى يضبط التحقق، ولا يوجد إثبات اختبار اشتراك end-to-end على Play sandbox.
- **المرحلة 11:** لا يوجد device/accessibility/performance matrix موثق.
- **المراحل 12–13:** لا restore drill أو SLO/alert evidence أو soak test 72 ساعة.
- **المرحلة 14:** لا إضافات OSS مسموحة قبل ADR/benchmark/review.
- **المرحلتان 15–16:** لم تبدأ beta قانونية/مراجعة أسواق/release checklist؛ القرار **NO-GO**.

## حدود التنفيذ والخطوة الآمنة التالية

لا تُعلن الجاهزية ولا تدمج إلى `main` حتى إغلاق اعتماديات frontend، وإثبات schema/RLS/ACL على staging، واجتياز A/B والتصدير/الحذف، واستقرار continuity، وبناء جهاز حقيقي. لأن Railway غير مربوط بالمستودع، يلزم من المالك اختيار الفرع/المصدر المراد ربطه من واجهة Railway عند الجاهزية؛ لا حاجة لإرسال مفاتيح أو متغيرات سرية في المحادثة.
