from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUTH_ROUTE = (ROOT / "backend/app/api/routes/auth.py").read_text()
AUTH_DEP = (ROOT / "backend/app/api/dependencies/auth.py").read_text()


def test_signup_never_confirms_email_administratively():
    assert "email_confirm\": True" not in AUTH_ROUTE
    assert "email_confirm=True" not in AUTH_ROUTE
    assert "admin.update_user_by_id" not in AUTH_ROUTE
    assert "requires_email_confirmation" in AUTH_ROUTE


def test_protected_auth_requires_active_profile():
    assert "_require_active_profile" in AUTH_DEP
    assert 'row.get("status") != "active"' in AUTH_DEP
    assert 'row.get("deleted_at")' in AUTH_DEP
