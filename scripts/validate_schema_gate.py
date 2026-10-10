#!/usr/bin/env python3
"""Gate 0 — live Supabase schema contract validation.

The gate is intentionally fail-closed:
- SUPABASE_URL + service key prove REST table reachability.
- SUPABASE_DB_URL is required for an automated exact PostgreSQL schema proof.
  This avoids falsely reporting PASS when information_schema/RPC signatures
  have only been described in a SQL file but never inspected in the target DB.

No writes are performed.
"""
from __future__ import annotations

import asyncio
import os
import sys
from typing import Any

from supabase import create_client

REQUIRED = {
    "twin_entity_identity": {"entity_id": "uuid", "user_id": "uuid"},
    "twin_internal_states": {
        "user_id": "uuid",
        "continuity_revision": "bigint",
        "continuity_schema_version": "text",
    },
    "lifecycle_intention_receipts": {
        "user_id": "uuid",
        "continuity_revision": "bigint",
    },
}
EXPECTED_COMMIT_SIGNATURE = (
    "p_user_id uuid, p_canonical jsonb, p_fingerprint text, "
    "p_intention_id text, p_observed_at timestamp with time zone, "
    "p_dedupe_window_seconds integer"
)


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def validate_rest_reachability() -> None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        fail("missing SUPABASE_URL and service-role key")

    db = create_client(url, key)
    for table in REQUIRED:
        try:
            db.table(table).select("*").limit(0).execute()
        except Exception as exc:  # pragma: no cover - target environment
            fail(f"required table unavailable: {table}: {exc}")
        print(f"PASS: table reachable: {table}")


def _pg_data_type(row: Any) -> str:
    # asyncpg Record and tuple both work here.
    return str(row[0])


async def validate_postgres_schema() -> None:
    database_url = os.getenv("SUPABASE_DB_URL")
    if not database_url:
        fail(
            "exact schema proof requires SUPABASE_DB_URL; refusing to report Gate 0 PASS "
            "from REST table reachability alone. Alternatively run scripts/sql/validate_schema_gate.sql "
            "in the target Supabase SQL editor and retain its output as evidence."
        )

    try:
        import asyncpg
    except ImportError as exc:  # pragma: no cover - environment dependency
        fail(f"asyncpg is required for automated exact schema proof: {exc}")

    conn = await asyncpg.connect(database_url)
    try:
        for table, columns in REQUIRED.items():
            for column, expected in columns.items():
                row = await conn.fetchrow(
                    """
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = $1
                      AND column_name = $2
                    """,
                    table,
                    column,
                )
                if not row:
                    fail(f"missing column: public.{table}.{column}")
                actual = _pg_data_type(row)
                if actual != expected:
                    fail(
                        f"wrong type: public.{table}.{column}: expected {expected}, got {actual}"
                    )
                print(f"PASS: public.{table}.{column} = {actual}")

        null_receipts = await conn.fetchval(
            "SELECT COUNT(*) FROM public.lifecycle_intention_receipts WHERE user_id IS NULL"
        )
        if int(null_receipts or 0) != 0:
            fail(f"receipt ledger contains {null_receipts} NULL user IDs")
        print("PASS: receipt ledger contains no NULL user IDs")

        ensure_exists = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.proname = 'ensure_twin_entity_identity'
            )
            """
        )
        if not ensure_exists:
            fail("ensure_twin_entity_identity RPC missing")
        print("PASS: ensure_twin_entity_identity exists")

        commit_signature = await conn.fetchval(
            """
            SELECT pg_get_function_identity_arguments(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = 'commit_twin_life_intention'
            ORDER BY p.oid DESC
            LIMIT 1
            """
        )
        if commit_signature != EXPECTED_COMMIT_SIGNATURE:
            fail(
                "commit_twin_life_intention signature mismatch: "
                f"expected {EXPECTED_COMMIT_SIGNATURE!r}, got {commit_signature!r}"
            )
        print("PASS: commit_twin_life_intention UUID signature")

        print("\nGATE 0: PASS — exact target PostgreSQL schema contract verified")
    finally:
        await conn.close()


def main() -> int:
    validate_rest_reachability()
    asyncio.run(validate_postgres_schema())
    return 0


if __name__ == "__main__":
    sys.exit(main())
