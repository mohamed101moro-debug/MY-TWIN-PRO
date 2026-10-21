"""Offline unit tests for the read-only account inventory access verifier."""
from pathlib import Path
import sys

BACKEND = Path(__file__).resolve().parents[1]
SCRIPTS = BACKEND / "scripts"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from verify_account_data_inventory import evaluate_access_contract, _policy_covers_command


def _priv(table, role, **grants):
    return {
        "table_name": table, "role_name": role,
        "select": grants.get("select", False),
        "insert": grants.get("insert", False),
        "update": grants.get("update", False),
        "delete": grants.get("delete", False),
        "truncate": grants.get("truncate", False),
        "trigger": grants.get("trigger", False),
        "references": grants.get("references", False),
    }

def _policy(table, roles, cmd="SELECT", qual="(auth.uid() = user_id)", with_check=None):
    return {"table_name": table, "policy_name": "owner_policy", "roles": roles,
            "cmd": cmd, "qual": qual, "with_check": with_check}

def test_public_policy_applies_to_authenticated_and_anon():
    policy = _policy("emotional_memory", ["public"], "ALL")
    assert _policy_covers_command(policy, "authenticated", "UPDATE")
    assert _policy_covers_command(policy, "anon", "SELECT")

def test_access_evaluator_flags_anonymous_table_access():
    tables = {"emotional_memory": {"rls_enabled": True, "rls_forced": False}}
    policies = [_policy("emotional_memory", ["authenticated"], "ALL")]
    privileges = [_priv("emotional_memory", "anon", select=True),
                  _priv("emotional_memory", "authenticated", select=True, insert=True, update=True, delete=True)]
    issues, report = evaluate_access_contract(["emotional_memory"], tables, policies, privileges)
    assert any(issue["issue"] == "anonymous_role_has_table_privileges" for issue in issues)
    assert report["emotional_memory"]["roles"]["authenticated"]["applicable_policy_count"] == 1

def test_access_evaluator_flags_authenticated_grant_without_matching_policy_command():
    tables = {"goals": {"rls_enabled": True, "rls_forced": True}}
    policies = [_policy("goals", ["authenticated"], "SELECT")]
    privileges = [_priv("goals", "authenticated", select=True, insert=True)]
    issues, _ = evaluate_access_contract(["goals"], tables, policies, privileges)
    assert {issue.get("privilege") for issue in issues if issue["issue"] == "authenticated_privilege_without_applicable_rls_policy"} == {"INSERT"}

def test_access_evaluator_flags_privileges_that_row_policies_cannot_constrain():
    tables = {"twin_internal_states": {"rls_enabled": False, "rls_forced": False}}
    policies = [_policy("twin_internal_states", ["public"], "ALL")]
    privileges = [
        _priv("twin_internal_states", "anon", select=True, truncate=True),
        _priv("twin_internal_states", "authenticated", select=True, trigger=True),
    ]
    issues, report = evaluate_access_contract(
        ["twin_internal_states"], tables, policies, privileges
    )
    elevated = [issue for issue in issues if issue["issue"] == "role_has_non_row_level_privileges"]
    assert {issue["role"] for issue in elevated} == {"anon", "authenticated"}
    assert next(issue for issue in elevated if issue["role"] == "anon")["privileges"] == ["TRUNCATE"]
    assert next(issue for issue in elevated if issue["role"] == "authenticated")["privileges"] == ["TRIGGER"]
    assert report["twin_internal_states"]["roles"]["anon"]["truncate"] is True

def test_access_evaluator_does_not_claim_policy_predicate_is_proven():
    tables = {"goals": {"rls_enabled": True, "rls_forced": True}}
    policies = [_policy("goals", ["authenticated"], "ALL", qual="true", with_check="true")]
    privileges = [_priv("goals", "authenticated", select=True, insert=True, update=True, delete=True)]
    issues, report = evaluate_access_contract(["goals"], tables, policies, privileges)
    assert not issues
    assert report["goals"]["policies"][0]["qual"] == "true"
    # A policy's existence/coverage is not a semantic ownership proof; human review remains required.

def test_verifier_queries_catalog_policies_and_effective_grants():
    source = (BACKEND / "scripts" / "verify_account_data_inventory.py").read_text(encoding="utf-8")
    assert "FROM pg_policies" in source
    assert "has_table_privilege" in source
    assert "'TRUNCATE'" in source
    assert "'TRIGGER'" in source
    assert "'REFERENCES'" in source
    assert "role_has_non_row_level_privileges" in source
    assert "anonymous_role_has_table_privileges" in source
    assert "policy_review_required" in source
    assert "never reads customer rows or changes data" in source
