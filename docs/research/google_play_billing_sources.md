# مصادر Google Play Billing والتحقق من الاشتراكات

تاريخ الاطلاع: 2026-10-07. هذه الملاحظات مرجع تنفيذ مختصر وليست إثباتاً لإعداد منتجات التطبيق في Play Console.

## حقائق تنفيذية موثقة

- يلزم اعتبار Google Play Billing Library 8 أو أحدث للإصدارات/التحديثات الجديدة منذ 31 أغسطس 2026. الأرشيف يولّد حالياً الاعتماد 6.2.1، ولذلك لا يجوز اعتماد بنائه للنشر قبل الترقية والتحقق بالبناء.
- في PBL 8 تغير callback الخاص بـ`queryProductDetailsAsync` ليعيد `QueryProductDetailsResult`، ويجب قراءة `productDetailsList` و`unfetchedProductList`. يلزم تمرير `offerToken` المناسب عند إطلاق اشتراك، واستخدام `PendingPurchasesParams` بدلاً من واجهة `enablePendingPurchases()` القديمة.
- مصدر الحقيقة لخادم الاشتراكات هو `purchases.subscriptionsv2.get`، وليس endpoint `purchases.subscriptions.get` المتقادم. يجب التحقق من حالة الاشتراك وخط المنتج `productId` ووقت الانتهاء `expiryTime` قبل منح الاستحقاق. الحالة `CANCELED` قد تبقى مستحقة إلى تاريخ الانتهاء؛ `ACTIVE` و`IN_GRACE_PERIOD` لهما قواعد استحقاق مذكورة في دورة الحياة الرسمية.
- يجب معالجة الشراء من الخادم ثم إقراره خلال المهلة التي توثقها Google (ثلاثة أيام للشراء الجديد)؛ لا يُمنح الاستحقاق لعملية pending.
- يمكن إرسال `obfuscatedAccountId` مع BillingFlowParams لربط شراء Play بحساب داخل التطبيق؛ الحد الأقصى 64 حرفاً، ولا يجوز وضع PII واضح فيه. يُستحسن استعمال hash أحادي الاتجاه.

## المصادر الرسمية

1. Google Play Billing Library 8 migration guide: https://developer.android.com/google/play/billing/migrate-gpblv8
2. Google Play Billing integration guide: https://developer.android.com/google/play/billing/integrate
3. `BillingFlowParams.Builder.setObfuscatedAccountId`: https://developer.android.com/reference/com/android/billingclient/api/BillingFlowParams.Builder
4. `PendingPurchasesParams.Builder`: https://developer.android.com/reference/com/android/billingclient/api/PendingPurchasesParams.Builder
5. Android Publisher `purchases.subscriptionsv2.get`: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
6. `SubscriptionPurchaseV2` and subscription states: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
7. Subscription lifecycle: https://developer.android.com/google/play/billing/lifecycle/subscriptions

## حد الإثبات

المراجعة المحلية لا تكشف Play Console أو المنتجات/base plans/offers المنشورة ولا اعتماد service account على تطبيق Play الفعلي. يلزم تشغيل اختبارات شراء/استعادة على قناة اختبار مصرح بها بعد إعداد أسرار الخدمة ومعرفات المنتجات وموافقة المستخدم على تفعيل موصل Supabase عند بوابة قاعدة البيانات.
