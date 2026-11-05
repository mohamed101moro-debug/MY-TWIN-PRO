# Staging migration runbook

هذه الخطوة تخص Supabase staging فقط. لا تستخدم `SUPABASE_URL` أو أي اتصال إنتاجي. قبل التنفيذ يجب أخذ نسخة احتياطية من staging والتأكد من أن المشروع منفصل عن الإنتاج.

شغّل السكربت من جذر المستودع بعد توفير رابط PostgreSQL الخاص بـstaging فقط:

```bash
export STAGING_DATABASE_URL='postgresql://...staging...'
export ALLOW_STAGING_MIGRATION=YES
./scripts/apply_staging_migration.sh
```

السكربت يرفض التنفيذ إذا لم يوجد المتغيران، أو إذا احتوى الرابط على `prod` أو `production`، أو إذا ساوى `SUPABASE_DB_URL`. بعد التنفيذ يجب التحقق من الأعمدة والقيد والفهرس، ثم تشغيل اختبارات عزل A/B وRLS على staging. لا يكفي نجاح `psql` لإغلاق بند الثقة.

الم migration هو `backend/migrations/20261105_account_lifecycle_status.sql`. لا يتم تشغيله على الإنتاج من هذا المسار، ولا تُرفع قيم الاتصال أو الأسرار إلى GitHub.
