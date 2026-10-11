"""Multimodal analysis is sent only after a matching owner grant."""
import asyncio
import json
import os
import sys

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_image_analysis_does_not_send_payload_without_current_grant(monkeypatch):
    from app.features.image_lab.image_analyzer import ImageAnalyzer
    from app.privacy import cloud_ai_consent
    from app.infrastructure.ai.ai_gateway import ai_gateway

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def fake_see(*args, **kwargs): calls.append((args, kwargs)); return "{}"
    monkeypatch.setattr(ai_gateway, "see", fake_see)
    result = asyncio.run(ImageAnalyzer().full_analysis("aW1hZ2U=", user_id="user-A"))
    assert result["status"] == "consent_required"
    assert calls == []


def test_image_analysis_uses_owner_grant_and_returns_parsed_structured_fields(monkeypatch):
    from app.features.image_lab.image_analyzer import ImageAnalyzer
    from app.privacy import cloud_ai_consent
    from app.infrastructure.ai.ai_gateway import ai_gateway

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: {"gemini"} if user == "user-A" and purpose == "image_analysis" else set())
    async def fake_see(prompt, image, **kwargs):
        calls.append((prompt, image, kwargs))
        return json.dumps({"description": "tree", "tags": ["tree"], "extracted_text": "", "objects": ["tree"]})
    monkeypatch.setattr(ai_gateway, "see", fake_see)
    result = asyncio.run(ImageAnalyzer().full_analysis("aW1hZ2U=", user_id="user-A", mime_type="image/png"))
    assert result["status"] == "success"
    assert result["provider"] == "gemini"
    assert calls[0][1] == "aW1hZ2U="
    assert calls[0][2] == {"mime_type": "image/png", "user_id": "user-A"}


def test_image_analysis_rejects_invalid_mime_and_oversized_payload_before_gateway(monkeypatch):
    from app.features.image_lab.image_analyzer import ImageAnalyzer
    from app.infrastructure.ai.ai_gateway import ai_gateway

    async def must_not_run(*args, **kwargs): raise AssertionError("invalid image must not reach gateway")
    monkeypatch.setattr(ai_gateway, "see", must_not_run)
    invalid = asyncio.run(ImageAnalyzer().full_analysis("aW1hZ2U=", user_id="user-A", mime_type="image/gif"))
    oversized = asyncio.run(ImageAnalyzer().full_analysis("YQ==" * 2_200_000, user_id="user-A"))
    assert invalid["status"] == "invalid_image"
    assert oversized["status"] == "invalid_image"
