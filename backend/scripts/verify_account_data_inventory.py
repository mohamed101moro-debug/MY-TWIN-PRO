"""Read-only staging verifier for the account export/deletion table inventory.

Requires SUPABASE_DB_URL (preferred) or DATABASE_URL for a direct PostgreSQL
connection. It reads only catalog metadata and never reads customer rows or changes data.
Exit status: 0 when the configured tables/columns/RLS/primary keys satisfy the current
inventory contract; 2 when any required catalog property is missing.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.account_data_inventory import DELETION_USER_TABLES, EXPORT_TABLES


def _policy_applies(policy_roles: list[str], role_name: str) -> bool:
    """PostgreSQL PUBLIC policies apply to both anon and authenticated roles."""
    normalized = {str(role).lower() for role in policy_roles}
    return "public" in normalized or role_name.lower() in normalized


def _policy_covers_command(policy: dict, role_name: str, command: str) -> bool:
    return _policy_applies(policy.get("roles") or [], role_name) and str(
        policy.get("cmd") or ""
    ).upper() in {"ALL", command.upper()}


def evaluate_access_contract(
    requested_tables: list[str],
    tables: dict[str, dict],
    policies: list[dict],
    privileges: list[dict],
) -> tuple[list[dict], dict]:
    """Evaluate effective role grants against RLS policy presence, not policy correctness.

    This deliberately does not claim to prove row-level ownership predicates. It flags
    missing policy coverage and emits policy expressions for an explicit human review.
    """
    issues: list[dict] = []
    policy_by_table: dict[str, list[dict]] = {}
    for policy in policies:
        policy_by_table.setdefault(policy["table_name"], []).append(policy)

    privilege_by_table_role: dict[tuple[str, str], dict] = {}
    for privilege in privileges:
        privilege_by_table_role[(privilege["table_name"], privilege["role_name"])] = privilege

    commands = {
        "select": "SELECT",
        "insert": "INSERT",
        "update": "UPDATE",
        "delete": "DELETE",
    }
    non_row_privileges = ("truncate", "trigger", "references")
    access_report: dict[str, dict] = {}
    for table_name in requested_tables:
        if table_name not in tables:
            continue
        table_access = {"policies": policy_by_table.get(table_name, []), "roles": {}}
        for role_name in ("anon", "authenticated"):
            privilege = privilege_by_table_role.get((table_name, role_name), {})
            role_access = {
                action: bool(privilege.get(action, False))
                for action in (*commands, *non_row_privileges)
            }
            applicable = [
                policy for policy in policy_by_table.get(table_name, [])
                if _policy_applies(policy.get("roles") or [], role_name)
            ]
            role_access["applicable_policy_count"] = len(applicable)
            table_access["roles"][role_name] = role_access

            if role_name == "anon" and any(role_access[action] for action in commands):
                issues.append({
                    "table": table_name,
                    "issue": "anonymous_role_has_table_privileges",
                    "privileges": [action.upper() for action in commands if role_access[action]],
                })
            elevated = [action.upper() for action in non_row_privileges if role_access[action]]
            if elevated:
                issues.append({
                    "table": table_name,
                    "issue": "role_has_non_row_level_privileges",
                    "role": role_name,
                    "privileges": elevated,
                    "review_note": "RLS policies do not constrain TRUNCATE; review each grant under least privilege.",
                })
            if role_name == "authenticated":
                for action, command in commands.items():
                    if role_access[action] and not any(
                        _policy_covers_command(policy, role_name, command)
                        for policy in policy_by_table.get(table_name, [])
                    ):
                        issues.append({
                            "table": table_name,
                            "issue": "authenticated_privilege_without_applicable_rls_policy",
                            "privilege": command,
                        })
        access_report[table_name] = table_access
    return issues, access_report


async def inspect_inventory(dsn: str) -> dict:
    # Import the optional DB driver only for live verification; pure policy-contract
    # tests can run in offline environments without a database dependency.
    import asyncpg

    requested_tables = sorted(set(DELETION_USER_TABLES) | {"profiles"})
    conn = await asyncpg.connect(dsn=dsn, timeout=10, command_timeout=20)
    try:
        table_rows = await conn.fetch(
            """
            SELECT c.relname AS table_name,
                   c.relrowsecurity AS rls_enabled,
                   c.relforcerowsecurity AS rls_forced
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relkind IN ('r', 'p')
               AND c.relname = ANY($1::text[])
            """,
            requested_tables,
        )
        column_rows = await conn.fetch(
            """
            SELECT table_name, column_name, data_type, is_nullable
              FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = ANY($1::text[])
            """,
            requested_tables,
        )
        pk_rows = await conn.fetch(
            """
            SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_schema = kcu.constraint_schema
               AND tc.constraint_name = kcu.constraint_name
               AND tc.table_name = kcu.table_name
             WHERE tc.constraint_type = 'PRIMARY KEY'
               AND tc.table_schema = 'public'
               AND tc.table_name = ANY($1::text[])
             ORDER BY tc.table_name, kcu.ordinal_position
            """,
            requested_tables,
        )
        policy_rows = await conn.fetch(
            """
            SELECT schemaname, tablename AS table_name, policyname AS policy_name,
                   permissive, roles, cmd, qual, with_check
              FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename = ANY($1::text[])
             ORDER BY tablename, policyname
            """,
            requested_tables,
        )
        privilege_rows = await conn.fetch(
            """
            SELECT t.table_name, r.rolname AS role_name,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'SELECT') AS select,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'INSERT') AS insert,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'UPDATE') AS update,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'DELETE') AS delete,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'TRUNCATE') AS truncate,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'TRIGGER') AS trigger,
                   has_table_privilege(r.rolname, format('public.%I', t.table_name), 'REFERENCES') AS references
              FROM unnest($1::text[]) AS t(table_name)
              CROSS JOIN pg_roles r
             WHERE r.rolname IN ('anon', 'authenticated')
               AND to_regclass(format('public.%I', t.table_name)) IS NOT NULL
             ORDER BY t.table_name, r.rolname
            """,
            requested_tables,
        )
    finally:
        await conn.close()

    tables = {row["table_name"]: dict(row) for row in table_rows}
    columns: dict[str, set[str]] = {}
    for row in column_rows:
        columns.setdefault(row["table_name"], set()).add(row["column_name"])
    primary_keys: dict[str, list[str]] = {}
    for row in pk_rows:
        primary_keys.setdefault(row["table_name"], []).append(row["column_name"])

    policies = [dict(row) for row in policy_rows]
    privileges = [dict(row) for row in privilege_rows]
    issues = []
    warnings = []
    for table_name in requested_tables:
        if table_name not in tables:
            issues.append({"table": table_name, "issue": "table_missing"})
            continue
        if table_name != "profiles" and "user_id" not in columns.get(table_name, set()):
            issues.append({"table": table_name, "issue": "owner_column_user_id_missing"})
        if not tables[table_name]["rls_enabled"]:
            issues.append({"table": table_name, "issue": "rls_disabled"})
        elif not tables[table_name]["rls_forced"]:
            warnings.append({"table": table_name, "issue": "rls_not_forced_review_owner_bypass"})
        if not primary_keys.get(table_name):
            issues.append({"table": table_name, "issue": "primary_key_missing"})

    access_issues, access_report = evaluate_access_contract(requested_tables, tables, policies, privileges)
    issues.extend(access_issues)

    for export_key, (table_name, order_column) in EXPORT_TABLES.items():
        table_columns = columns.get(table_name, set())
        if table_name in tables and order_column not in table_columns:
            issues.append({"table": table_name, "issue": "export_order_column_missing", "column": order_column})
        if table_name in tables and order_column and order_column in table_columns:
            pk_columns = primary_keys.get(table_name, [])
            # The current API orders by the configured business timestamp/score only.
            # Unless that column itself is the full primary key, pagination needs a
            # primary-key tiebreaker in the actual query to be deterministic.
            if pk_columns != [order_column]:
                issues.append({
                    "table": table_name,
                    "issue": "export_query_requires_primary_key_tiebreaker",
                    "order_column": order_column,
                    "primary_key_columns": pk_columns,
                })

    profiles_columns = columns.get("profiles", set())
    for required in ("id", "status", "deleted_at", "deletion_started_at"):
        if required not in profiles_columns:
            issues.append({"table": "profiles", "issue": "required_profile_column_missing", "column": required})

    # Keep policy expressions in the private operator report so the reviewer can verify
    # that predicates enforce user ownership. Presence alone is not proof of correctness.
    return {
        "schema": "public",
        "tables_checked": len(requested_tables),
        "export_tables_configured": len(EXPORT_TABLES),
        "deletion_tables_configured": len(DELETION_USER_TABLES),
        "status": "PASS" if not issues else "FAIL",
        "issues": issues,
        "warnings": warnings,
        "primary_keys": primary_keys,
        "rls": {
            name: {"enabled": info["rls_enabled"], "forced": info["rls_forced"]}
            for name, info in sorted(tables.items())
        },
        "access_control": access_report,
        "policy_review_required": True,
        "policy_review_note": "A policy's presence does not prove its predicate enforces per-user ownership; review each returned qual/with_check before accepting the schema.",
    }


def main() -> int:
    dsn = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if not dsn:
        print("SUPABASE_DB_URL or DATABASE_URL is required; no database was contacted.", file=sys.stderr)
        return 2
    try:
        report = asyncio.run(inspect_inventory(dsn))
    except Exception as exc:
        print(json.dumps({"status": "ERROR", "error_type": type(exc).__name__}, indent=2), file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
