"""اختبارات بوابة الذكاء الاصطناعي"""
import pytest, asyncio

@pytest.mark.asyncio
async def test_ai_gateway_general():
    from app.infrastructure.ai.ai_gateway import ai_gateway
    text, provider = await ai_gateway.route(
        prompt="ما هو الذكاء الاصطناعي؟",
        task="general"
    )
    assert isinstance(text, str)
    assert len(text) > 10

@pytest.mark.asyncio
async def test_cache_service():
    from app.infrastructure.cache.cache_service import set, get
    set("test_key", "test_value", 60)
    result = get("test_key")
    assert result == "test_value"

@pytest.mark.asyncio
async def test_semantic_cache():
    from app.infrastructure.cache.cache_service import (
        set_semantic_cached, get_semantic_cached
    )
    set_semantic_cached("كيف حالك اليوم", "marker-user-A", 60, scope="user-A|general|free|ar")
    result, score = get_semantic_cached(
        "كيف حالك اليوم", scope="user-A|general|free|ar"
    )
    assert result == "marker-user-A"
    assert score == 1.0
    foreign_result, _ = get_semantic_cached(
        "كيف حالك اليوم", scope="user-B|general|free|ar"
    )
    assert foreign_result is None


def test_ai_cache_requires_an_explicit_user_scope():
    from app.infrastructure.cache.cache_service import cache_ai_response, get_ai_response

    cache_ai_response("private prompt", "private marker")
    assert get_ai_response("private prompt") is None
    cache_ai_response("private prompt", "marker-A", scope="user-A|study|plus|ar")
    assert get_ai_response("private prompt", scope="user-A|study|plus|ar") == "marker-A"
    assert get_ai_response("private prompt", scope="user-B|study|plus|ar") is None
