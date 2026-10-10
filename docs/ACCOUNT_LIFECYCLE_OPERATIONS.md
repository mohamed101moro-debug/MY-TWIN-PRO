# Account lifecycle operations — P0

## Export contract

`GET /api/account/export` derives the account identity from the validated bearer token. Clients must not send a `user_id` query parameter. The API returns the complete JSON payload or an explicit error; it must never return a partial export as success. The current API cap is `EXPORT_MAX_RECORDS`; an HTTP 413 is an intentional, visible limit until a streaming/object-storage export workflow is implemented. The response includes `export_coverage.complete` and `pending_schema_verification`; because deletion-only tables have not yet been verified for export schema/order, this response must not be represented as a complete account-data export until that list is empty and staging proves it.

The mobile UI writes the verified response to a temporary JSON file and opens the platform share sheet. A user chooses a destination; the app must not claim the file was saved to Downloads unless the operating system confirms that action.

## Scheduled deletion worker

Configure a **separate Railway Cron Job** using the same repository revision and the same required private environment variables as the API service (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, and any required runtime configuration).

- Working directory: `backend`
- Command: `python scripts/run_account_cleanup.py`
- Schedule: every 15 minutes (`*/15 * * * *`)
- Alert when a run exits non-zero; do not suppress failed runs.

The worker is deliberately a one-shot process, not an in-process FastAPI background task. This avoids every API replica independently starting a permanent cleanup loop. The database state transition `pending_deletion`/`deletion_failed` → `deletion_in_progress` is conditional and precedes deletion. A failed purge is marked `deletion_failed` and is retried by the next run; a process crash leaves a 15-minute lease that later runs can reclaim. Restoration is only allowed from `pending_deletion`, so a partially purged account cannot be restored accidentally.

Do not enable the cron job against production until the deletion table inventory is reconciled against the deployed schema and the full workflow has passed on isolated staging data. The source code alone does not prove a cron service has been created or that Supabase permissions and table names are correct.

## Release evidence required

1. The scheduled service exists and has a successful dry run.
2. A due test account is purged; a not-yet-due account is unchanged.
3. A concurrent restore/purge test has exactly one winning state transition.
4. An injected table-delete failure leaves the account in `deletion_failed`, preserves remaining data, exits non-zero, and succeeds on retry after the fault is removed.
5. Post-purge checks confirm the Auth identity and all in-scope personal rows are gone.
