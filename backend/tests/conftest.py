"""Shared pytest fixtures and explicit gates for live integration tests."""
import os
import uuid

import pytest


@pytest.fixture
def test_user_id():
    """Return an isolated synthetic user id for a test."""
    return f"test_{uuid.uuid4().hex[:10]}"


@pytest.fixture
def test_message_ar():
    return "الحمد لله على كل حال، الأيام معدية"


@pytest.fixture
def test_message_en():
    return "I feel really tired today"


@pytest.fixture
def sample_emotion():
    return {"primary": "neutral", "intensity": 0.5, "valence": 0.0}


@pytest.fixture
def requires_live_supabase():
    """Require explicit opt-in and real-looking Supabase configuration before live I/O."""
    if os.getenv("MYTWIN_RUN_LIVE_INTEGRATION_TESTS") != "1":
        pytest.skip("Requires explicit opt-in: MYTWIN_RUN_LIVE_INTEGRATION_TESTS=1")
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        pytest.skip("Requires SUPABASE_URL and SUPABASE_SERVICE_KEY")
    if ".invalid" in os.environ["SUPABASE_URL"]:
        pytest.skip("Configured Supabase URL is a non-routable test placeholder")
