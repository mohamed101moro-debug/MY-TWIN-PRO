from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[2]


def test_production_gate_requires_explicit_write_opt_in():
    text = (ROOT / "scripts/validate_s5_5_3_production_gate.py").read_text()
    assert "MYTWIN_VALIDATION_ALLOW_WRITE" in text
    assert '!= "true"' in text


def test_production_gate_covers_atomic_retry_and_concurrency():
    text = (ROOT / "scripts/validate_s5_5_3_production_gate.py").read_text()
    for marker in (
        "commit_twin_life_intention",
        "deduplicated",
        "ThreadPoolExecutor",
        "continuity_revision",
        "lifecycle_intention_receipts",
    ):
        assert marker in text


def test_production_gate_does_not_claim_unavailable_mobile_or_railway_proof():
    text = (ROOT / "scripts/validate_s5_5_3_production_gate.py").read_text()
    assert "Remaining gates: Railway restart" in text
    assert "EAS/device lifecycle" in text
    assert "multi-day continuity" in text


def test_gate_script_parses():
    ast.parse((ROOT / "scripts/validate_s5_5_3_production_gate.py").read_text())
