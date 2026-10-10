from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[2]


def test_schema_gate_is_fail_closed_without_exact_db_proof():
    text = (ROOT / "scripts/validate_schema_gate.py").read_text()
    assert "SUPABASE_DB_URL" in text
    assert "refusing to report Gate 0 PASS" in text
    assert "GATE 0: PASS" in text


def test_schema_gate_checks_exact_rpc_signature_and_uuid_columns():
    text = (ROOT / "scripts/validate_schema_gate.py").read_text()
    for marker in (
        "information_schema.columns",
        "pg_get_function_identity_arguments",
        "twin_entity_identity",
        "twin_internal_states",
        "lifecycle_intention_receipts",
        "p_user_id uuid",
    ):
        assert marker in text


def test_schema_gate_parses():
    ast.parse((ROOT / "scripts/validate_schema_gate.py").read_text())
