# P0-04 — Account export and deletion inventory hardening

Date: 2026-10-09
Status: **Code changes + targeted tests complete; deployment and staging evidence pending.**

## Changes

- The account export endpoint now refuses to emit an artifact while any account-owned table remains unverified or the explicit staging-verification gate is false. This prevents a partial archive from being mistaken for a complete user-data export.
- The deletion worker validates the configured deletion table inventory using a zero-row `user_id` select before claiming any due account. A missing table or owner column fails the run before irreversible deletion starts.
- Added a dedicated worker Dockerfile for deployment as a separate scheduled service, plus the Railway deployment and staging acceptance runbook.
- Added regression tests for fail-closed export, pagination/owner filtering, inventory preflight, and worker deployment contract.

## Local evidence

- Targeted P0 tests: 30 passed.
- Python compile checks: passed.
- `package.json` JSON validation: passed.
- Existing static lifecycle/backbone verification scripts: passed.
- Full backend test collection: blocked before execution by missing environment dependencies `slowapi` and `supabase`; this is not a test pass.
- Expo/TypeScript build: not run.

## Known blockers

1. `EXPORT_NOT_COVERED_TABLES` is non-empty and `EXPORT_SCHEMA_VERIFICATION_PASSED` is false in this source snapshot, so account export intentionally returns HTTP 503 until schema and deterministic ordering columns are verified, registered, and proven in staging. This is a safety stop, not a completed export feature.
2. The cleanup worker is packaged but not scheduled by source code. A separate Railway service and cron schedule must be configured and evidenced in staging.
3. The deletion inventory must be compared with the deployed Supabase catalog. Preflight will stop the worker before deletion if a listed table or `user_id` column is missing.
4. No staging database, production deployment, device, or live account-deletion test was run in this execution.

## Acceptance required before calling the account lifecycle complete

- Verify all account-data tables and columns against a dedicated staging database.
- Complete the export registry and test every category with two users, ensuring no cross-account rows appear.
- Test deletion due-date, restore-vs-cleanup race, worker crash/lease recovery, simulated delete failure, retry, and final absence of user-owned rows while preserving another user's rows.
- Configure the scheduled worker and capture its service/deployment ID, cron expression, logs, and migration revision.
- Only then remove the export safety stop and mark the account lifecycle gate complete.
