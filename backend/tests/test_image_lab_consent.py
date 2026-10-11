"""Image Lab egress must be blocked unless the owner grants the exact purpose/provider."""
import asyncio
import os
import sys

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_image_generation_returns_before_safety_memory_or_provider_work_without_consent(monkeypatch):
    from app.features.image_lab.image_orchestrator import ImageOrchestrator
    from app.privacy import cloud_ai_consent

    service = ImageOrchestrator()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def must_not_run(*_args, **_kwargs): raise AssertionError("generation pipeline must not start")
    monkeypatch.setattr(service.safety, "check_prompt", must_not_run)
    result = asyncio.run(service.generate("user-A", "private prompt"))
    assert result == {"status": "consent_required", "purpose": "image_generation"}


def test_image_provider_call_checks_consent_again_at_egress(monkeypatch):
    from app.features.image_lab.image_orchestrator import ImageOrchestrator
    from app.privacy import cloud_ai_consent

    service = ImageOrchestrator()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    result = asyncio.run(service._try_provider("user-A", "private prompt", "", "flux"))
    assert result is None


def test_image_editor_endpoints_fail_closed_before_any_network_request(monkeypatch):
    from app.features.image_lab.image_editor import ImageEditor
    from app.privacy import cloud_ai_consent

    editor = ImageEditor()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    for result in (
        asyncio.run(editor.upscale("aW1hZ2U=", user_id="user-A")),
        asyncio.run(editor.remove_background("aW1hZ2U=", user_id="user-A")),
        asyncio.run(editor.restore_face("aW1hZ2U=", user_id="user-A")),
        asyncio.run(editor.inpaint("aW1hZ2U=", "bWFzaw==", "prompt", user_id="user-A")),
    ):
        assert result["status"] == "consent_required"


def test_image_routes_never_treat_legacy_provider_alias_as_permission(monkeypatch):
    from app.features.image_lab.image_orchestrator import ImageOrchestrator
    from app.privacy import cloud_ai_consent

    service = ImageOrchestrator()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: {"gemini_image"})
    # Pollinations/Flux cannot use Google's consent; only the configured Gemini provider may proceed.
    result = asyncio.run(service._try_provider("user-A", "prompt", "", "flux"))
    assert result is None
