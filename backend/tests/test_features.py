"""Local-only contract tests for the main feature orchestrators."""
import pytest


@pytest.mark.asyncio
async def test_study_session(monkeypatch):
    from app.features.study.athena_orchestrator import athena

    async def neutral(_user_id):
        return "neutral"

    async def greeting(_user_id, _mind, _memory, _language):
        return "مرحباً بك في جلسة الدراسة"

    monkeypatch.setattr(athena, "_get_emotion", neutral)
    monkeypatch.setattr(athena.personality, "get_greeting", greeting)
    result = await athena.start_study_session("test_user", "الذكاء الاصطناعي", "teen", "ar")

    assert result["concept"] == "الذكاء الاصطناعي"
    assert isinstance(result["explanation"], dict)
    assert result["session_id"] == "test_user_الذكاء الاصطناعي"


@pytest.mark.asyncio
async def test_dream_interpret(monkeypatch):
    from app.features.dreams.dream_orchestrator import dream_orchestrator

    async def context(_user_id, _dream_text, _lang):
        return {"previous_dreams_count": 0, "recurring_symbols": []}

    async def store_dream(*_args, **_kwargs):
        return None

    monkeypatch.setattr(dream_orchestrator.context, "build_context", context)
    monkeypatch.setattr(dream_orchestrator.bridge, "store_dream", store_dream)
    result = await dream_orchestrator.interpret("test_user", "حلمت أنني أطير", "ar")

    assert result["status"] == "success"
    assert isinstance(result["data"].get("interpretation"), str)


@pytest.mark.asyncio
async def test_life_coach_session():
    from app.features.life_coach.life_coach_orchestrator import life_coach

    result = await life_coach.full_session("test_user", "أشعر بالقلق", "ar")

    assert isinstance(result.get("coach_reply"), str)
    assert isinstance(result.get("plan"), dict)
    assert result["provider"] == "local"


@pytest.mark.asyncio
async def test_smart_home_command():
    from app.features.smart_home.smart_home_orchestrator import smart_home

    result = await smart_home.process_command("test_user", "شغل النور", "ar")

    assert isinstance(result["environment"], dict)
    assert isinstance(result["decisions"], dict)
    assert isinstance(result["decisions"].get("decisions"), list)
    assert isinstance(result["executed"], bool)
