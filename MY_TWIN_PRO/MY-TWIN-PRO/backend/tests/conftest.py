"""
Pytest configuration – shared fixtures for all tests.
"""
import pytest
import asyncio
import uuid
from datetime import datetime, timezone

# Historical suites depend on removed modules or external Supabase state.
# Keep them visible in the quarantine document, but out of automatic collection.
collect_ignore = ["test_api_routes.py", "test_memory_engine.py"]

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def test_user_id():
    """Generate unique test user ID."""
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
