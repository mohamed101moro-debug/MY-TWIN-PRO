# Account deletion cleanup worker — deployment contract

The API service does **not** run the deletion cleanup loop in-process. Deploy this
one-shot worker as a separate scheduled service so web requests, restarts, or a
web-worker scale-down cannot silently disable account deletion.

## Railway service setup

1. Create a **separate service** from this repository; do not replace the API service.
2. Set its root directory to `backend`.
3. Set the Dockerfile path to `Dockerfile.cleanup`.
4. Use the same private Supabase environment variables required by the backend:
   `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Do not expose these as public variables.
5. Configure the service's Railway Cron Schedule to `*/15 * * * *` (every 15 minutes).
6. Keep restart-on-failure enabled. A non-zero worker exit means the run was incomplete;
   configure deployment/log alerting and investigate repeated failures.
7. First run only against a dedicated staging project. Verify the complete account-table
   inventory and owner columns before enabling a production schedule. Run
   `python scripts/verify_account_data_inventory.py` with a private `SUPABASE_DB_URL`
   or `DATABASE_URL` to inspect table presence, owner columns, primary keys, RLS flags,
   and export ordering columns. The verifier needs only the direct DB URL; keep it private and
   never paste it into reports. The script reads catalog metadata only and exits non-zero
   if the configured contract is not satisfied.

## Safety behavior

- The worker only processes accounts whose `deleted_at` is due.
- It preflights every table in `DELETION_USER_TABLES` for a usable `user_id` column
  before claiming any account. A missing table/column fails the invocation before
  irreversible deletion begins.
- It claims a due account with a conditional status/lease update, then deletes owned
  rows, then the Supabase Auth identity, and finally the profile marker.
- Any incomplete purge exits non-zero and is eligible for a later retry. Do not treat
  a successful container build as proof that the schedule is configured or working.

## Required staging acceptance evidence

Record the service/deployment identifier, cron expression, migration revision, worker
logs for one no-op run, one due test account, a simulated table-delete failure, retry
success, and a restore-vs-cleanup race. Confirm no account-A rows remain after deletion
and account-B rows remain untouched. Do not use real customer data for this test.
