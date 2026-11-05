#!/usr/bin/env bash
set -euo pipefail

MIGRATION="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend/migrations/20261105_account_lifecycle_status.sql"

: "${STAGING_DATABASE_URL:?Set STAGING_DATABASE_URL to the dedicated staging Postgres URL}"
: "${ALLOW_STAGING_MIGRATION:?Set ALLOW_STAGING_MIGRATION=YES to acknowledge staging-only execution}"

if [[ "${ALLOW_STAGING_MIGRATION}" != "YES" ]]; then
  echo "Refusing migration: ALLOW_STAGING_MIGRATION must equal YES" >&2
  exit 2
fi

case "${STAGING_DATABASE_URL}" in
  *prod*|*production*|*SUPABASE_URL*)
    echo "Refusing migration: URL looks like production" >&2
    exit 3
    ;;
esac

if [[ -n "${SUPABASE_DB_URL:-}" && "${STAGING_DATABASE_URL}" == "${SUPABASE_DB_URL}" ]]; then
  echo "Refusing migration: staging URL equals SUPABASE_DB_URL" >&2
  exit 4
fi

command -v psql >/dev/null || { echo "psql is required" >&2; exit 5; }
echo "Applying account lifecycle migration to the explicitly supplied staging database..."
psql "${STAGING_DATABASE_URL}" --set ON_ERROR_STOP=1 --file "${MIGRATION}"
echo "Staging migration applied successfully. Run the RLS/A-B verifier before any production change."
