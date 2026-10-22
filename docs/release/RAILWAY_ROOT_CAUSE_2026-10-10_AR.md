# تشخيص فشل Railway — My Twin P0.05

**التاريخ:** 2026-10-10
**المصدر:** سجلات Railway التي أرسلها المستخدم، وشجرة فرع P0.05 المحلية، ووثائق Railway وDocker الرسمية.

## ما يقوله السجل

Railpack أنهى مرحلة التحضير برسالة أن التطبيق لا يمكن تحديد طريقة بنائه، ثم عرض محتوى المصدر الذي حلله:

```text
./
└── MY_TWIN_PRO/
```

إذن Railpack لم يرَ `package.json` أو `railway.json` أو `backend/requirements.txt` في جذر المصدر. الفشل حدث في **اكتشاف التطبيق** قبل تثبيت الاعتماديات أو تشغيل Python أو اتصال قاعدة البيانات؛ لذلك لا تشير هذه الرسالة إلى فساد مفاتيح Supabase أو APIs.

## التغيير الذي أعددته على P0.05

- أزيلت طبقة مجلد التغليف: جذر فرع P0.05 يحتوي الآن `package.json` و`railway.json` و`backend/` مباشرةً، ولا يحتوي مجلداً وسيطاً باسم `MY_TWIN_PRO`.
- يحدد `railway.json` الجذري صراحةً builder من نوع `DOCKERFILE` ويختار `backend/Dockerfile.root`.
- يستخدم Dockerfile الجديد مسارات `COPY` من سياق جذر المستودع: `backend/requirements.txt` و`backend/`.
- يحد `.dockerignore` سياق بناء Railway إلى `backend/` فقط، بدلاً من رفع واجهة الهاتف وأصولها إلى builder.
- أضيف `scripts/validate_railway_build_context.py` إلى CI للتحقق من وجود ملفات الجذر ومسارات COPY وإعداد Railway، وأضيف بناء صورة Docker حقيقي إلى job الخلفية.
- بقي `backend/Dockerfile` و`backend/railway.json` صالحين لو اختير Root Directory `/backend`، بشرط تعيين Railway Config File إلى `/backend/railway.json` حسب وثائق monorepo؛ لوحة Railway غير متاحة لي للتأكد من الإعداد الفعلي.

## ما تم اختباره وما لم يتم

نجح الفحص المحلي لملفات JSON/YAML ومسارات سياق الجذر، ونجح `git diff --check`. أداة Docker ومحركها غير متاحين محلياً، لذلك لم أبنِ الصورة هنا. سيبني GitHub Actions الصورة من سياق الجذر بعد دفع الفرع. **لم أشغّل Railway ولا أستطيع الادعاء أن الإصلاح نجح في الخدمة الحية حتى تظهر نتيجة نشر فعلية.**

يجب مطابقة إعداد Root Directory في Railway مع أحد المسارين:

- **الاختيار الافتراضي الموصى به:** Root Directory = `/`، وConfig File = `/railway.json`، ثم يستخدم `backend/Dockerfile.root`.
- **اختيار خدمة backend المعزولة:** Root Directory = `/backend` وConfig File = `/backend/railway.json`، ثم يستخدم `backend/Dockerfile` ضمن سياق `backend`.

سجل المستخدم يرجّح أن محاولة البناء الأخيرة لم ترَ جذر المستودع المقصود أصلاً، لكن إعداد لوحة التحكم الحالي غير معروف. يجب التحقق منه قبل الدمج إلى `main` أو اعتبار Railway سليماً.

## ملاحظة زمنية

تصف وثائق Railway الحالية Config as Code بأنه deprecated، وتقول إن الملفات الحالية تظل تعمل للخدمات القديمة حتى **2026-12-01**، مع التوصية بالانتقال إلى Infrastructure as Code. أبقيت `railway.json` لأنه إعداد P0.05 المستخدم الآن، وسجّلت ترحيله كعمل قريب قبل هذا الموعد.

## المراجع الرسمية

- [Railway: Dockerfiles](https://docs.railway.com/builds/dockerfiles) — اختيار Dockerfile ومساره المخصص.
- [Railway: Deploying a Monorepo](https://docs.railway.com/guides/monorepo) — Root Directory ومسار ملف Railway config في المونوريبو.
- [Railway: Config as Code](https://docs.railway.com/reference/config-as-code) — حقل `dockerfilePath` وحالة الإهمال والموعد.
- [Docker: Build context](https://docs.docker.com/build/concepts/context/) — أن `COPY` و`ADD` يعملان بالنسبة إلى سياق البناء الذي أُرسل إلى builder.
