"""Static anti-regression checks for P0 product-safety boundaries."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_no_secondary_railway_host_remains_in_client_sources():
    roots = [ROOT / "lib", ROOT / "src", ROOT / "app"]
    extensions = {".ts", ".tsx", ".js", ".jsx"}
    hits = []
    for base in roots:
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in extensions:
                if "my-twin-pro-production-b744.up.railway.app" in path.read_text(encoding="utf-8", errors="ignore"):
                    hits.append(str(path.relative_to(ROOT)))
    assert not hits, f"secondary API host found in: {hits}"


def test_signup_has_no_admin_email_confirmation_bypass_or_password_login_fallback():
    source = (ROOT / "backend/app/api/routes/auth.py").read_text(encoding="utf-8")
    assert "update_user_by_id" not in source
    signup = source.split('@router.post("/signup")', 1)[1].split('@router.post("/login")', 1)[0]
    assert 'sign_in_with_password' not in signup
    assert 'requires_email_confirmation' in signup
    assert '_email_is_confirmed(user)' in signup
    assert 'email_confirmed_at' in source and 'confirmed_at' in source


def test_private_lifecycle_tables_have_explicit_acl_migration():
    migration = ROOT / "backend/migrations/20261008_p0_account_status_and_private_tables.sql"
    source = migration.read_text(encoding="utf-8")
    for table in ("lifecycle_intention_receipts", "twin_entity_identity"):
        assert f"public.{table}" in source
    assert "ENABLE ROW LEVEL SECURITY" in source
    assert "REVOKE ALL ON TABLE" in source


def test_cloud_stt_is_fail_closed_until_consent_is_implemented():
    source = (ROOT / "backend/app/api/routes/stt_routes.py").read_text(encoding="utf-8")
    assert "Cloud STT stays disabled until explicit, revocable per-user consent" in source
    assert "status_code=503" in source


def test_auth_service_uses_canonical_session_boundary_for_login_and_logout():
    source = (ROOT / "src/services/authService.ts").read_text(encoding="utf-8")
    assert "await saveAuthData(token, userId)" in source
    assert "await clearAuthSession()" in source
    assert "await setToken(token)" not in source


def test_user_facing_privacy_copy_does_not_claim_no_third_party_processing():
    files = [
        ROOT / "PRIVACY_POLICY.md",
        ROOT / "docs/PRIVACY_POLICY.md",
        ROOT / "src/services/LegalDocuments.ts",
        ROOT / "src/world/SoulObservatory/AboutWing.tsx",
        ROOT / "app/genesis.tsx",
    ]
    forbidden = [
        "لا نشارك بياناتك الشخصية مع أي طرف ثالث",
        "We do not share your personal data with third parties",
        "I will never share your existence",
        "كل المعالجة تتم محلياً على جهازك فقط",
    ]
    for path in files:
        source = path.read_text(encoding="utf-8")
        for phrase in forbidden:
            assert phrase not in source, f"misleading privacy promise remains in {path}: {phrase}"


def test_account_export_is_paginated_and_fails_closed():
    source = (ROOT / "backend/app/api/routes/account.py").read_text(encoding="utf-8")
    inventory = (ROOT / "backend/app/core/account_data_inventory.py").read_text(encoding="utf-8")
    export = source.split('@router.get("/export")', 1)[1].split('# Deletion uses the shared account-data inventory', 1)[0]
    assert "EXPORT_PAGE_SIZE = 500" in inventory
    assert ".range(offset, offset + EXPORT_PAGE_SIZE - 1)" in source
    assert "refusing to return a partial archive" in export
    assert "except HTTPException" in export
    assert '"twin_entity_identity"' in inventory and '"lifecycle_intention_receipts"' in inventory

def test_account_cleanup_is_due_date_based_and_never_swallows_purge_failures():
    source = (ROOT / "backend/app/api/routes/account.py").read_text(encoding="utf-8")
    cleanup = source.split('async def run_deletion_cleanup():', 1)[1]
    assert '.lte("deleted_at", now)' in cleanup
    assert 'deletion_in_progress' in cleanup and 'deletion_failed' in cleanup
    assert "_delete_auth_user_idempotently(db, user_id)" in cleanup
    assert "if failures:" in cleanup and "raise RuntimeError" in cleanup
    assert "except: pass" not in cleanup


def test_cleanup_job_is_a_real_one_shot_process_with_failure_exit():
    job = ROOT / "backend/scripts/run_account_cleanup.py"
    assert job.exists()
    source = job.read_text(encoding="utf-8")
    assert "run_deletion_cleanup" in source
    assert "return 1" in source and "sys.exit(main())" in source
    assert "asyncio.run" in source
    assert "BACKEND_DIR = Path(__file__).resolve().parents[1]" in source


def test_mobile_export_uses_authenticated_identity_and_creates_shareable_file():
    source = (ROOT / "src/world/SoulObservatory/HelpWing.tsx").read_text(encoding="utf-8")
    assert "apiGet('/api/account/export', 60000)" in source
    assert "user_id=" not in source
    assert "require('../../core/BootstrapCoordinator')" in source
    assert "require('../../src/core/BootstrapCoordinator')" not in source
    assert "writeAsStringAsync" in source
    assert "getInfoAsync(fileUri)" in source
    assert "Sharing.shareAsync(fileUri" in source
    assert "Alert.alert('✅', `${t.export}:" not in source


def test_export_refuses_unverified_partial_inventory():
    source = (ROOT / "backend/app/api/routes/account.py").read_text(encoding="utf-8")
    inventory = (ROOT / "backend/app/core/account_data_inventory.py").read_text(encoding="utf-8")
    export = source.split('@router.get("/export")', 1)[1].split('# Deletion uses the shared account-data inventory', 1)[0]
    assert "if EXPORT_NOT_COVERED_TABLES or not EXPORT_SCHEMA_VERIFICATION_PASSED:" in export
    assert "EXPORT_SCHEMA_VERIFICATION_PASSED = False" in inventory
    assert "لم يتم إنشاء ملف جزئي" in export

def test_cleanup_preflights_all_owned_tables_before_claiming_accounts():
    source = (ROOT / "backend/app/api/routes/account.py").read_text(encoding="utf-8")
    cleanup = source.split("async def run_deletion_cleanup():", 1)[1]
    assert 'select("user_id").limit(0).execute()' in cleanup
    assert "no accounts were claimed" in cleanup
    assert cleanup.index("Account cleanup preflight failed") < cleanup.index("deleted_count = 0")


def test_schema_inventory_verifier_is_read_only_and_checks_rls_owner_and_ordering():
    script = ROOT / "backend/scripts/verify_account_data_inventory.py"
    assert script.exists()
    source = script.read_text(encoding="utf-8")
    assert "information_schema.columns" in source
    assert "relrowsecurity" in source
    assert "PRIMARY KEY" in source
    assert "owner_column_user_id_missing" in source
    assert "export_query_requires_primary_key_tiebreaker" in source
    assert "never reads customer rows or changes data" in source


def test_cleanup_has_dedicated_container_and_operational_schedule_contract():
    dockerfile = ROOT / "backend/Dockerfile.cleanup"
    runbook = ROOT / "backend/ACCOUNT_CLEANUP_WORKER.md"
    assert dockerfile.exists() and runbook.exists()
    assert 'CMD ["python", "scripts/run_account_cleanup.py"]' in dockerfile.read_text(encoding="utf-8")
    runbook_source = runbook.read_text(encoding="utf-8")
    assert "*/15 * * * *" in runbook_source
    assert "separate service" in runbook_source
    assert "staging" in runbook_source.lower()


def test_account_export_and_cleanup_share_one_explicit_inventory():
    source = (ROOT / "backend/app/api/routes/account.py").read_text(encoding="utf-8")
    inventory = (ROOT / "backend/app/core/account_data_inventory.py").read_text(encoding="utf-8")
    assert "_ACCOUNT_TABLE_ROWS" in source
    assert "EXPORT_TABLES" in source and "DELETION_USER_TABLES" in source
    assert "EXPORT_TABLES = {" in inventory
    assert "DELETION_USER_TABLES = tuple(table_name for table_name" in inventory
    assert "EXPORT_NOT_COVERED_TABLES" in inventory
    assert "deletion-only" in inventory
    assert inventory.count("DELETION_USER_TABLES =") == 1
    migration = (ROOT / "backend/migrations/20261009_p0_deletion_worker_lease.sql").read_text(encoding="utf-8")
    assert "ADD COLUMN IF NOT EXISTS deletion_started_at timestamptz" in migration
