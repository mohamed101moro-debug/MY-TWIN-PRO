"""Owner-scoped cloud AI consent. Grants stay disabled until the matching policy is approved."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("cloud_ai_consent")

POLICY_VERSION = "cloud-ai-2026-10-v1"
APPROVED_POLICY_ENV = "MYTWIN_CLOUD_AI_APPROVED_POLICY_VERSION"
PURPOSE_PROVIDERS: dict[str, tuple[str, ...]] = {
    "text_generation": ("gemini", "groq", "openrouter", "huggingface"),
    "image_generation": ("gemini_image", "pollinations"),
    "image_analysis": ("gemini",),
    "image_editing": ("huggingface", "pollinations"),
    "voice_synthesis": ("elevenlabs", "edge_tts"),
    "audio_transcription": ("groq", "gemini"),
    "memory_embedding": ("gemini_embedding", "openai_embedding"),
}
PROVIDER_LABELS = {
    "gemini": "Google Gemini",
    "gemini_image": "Google Gemini Image",
    "groq": "Groq",
    "openrouter": "OpenRouter",
    "huggingface": "Hugging Face",
    "pollinations": "Pollinations",
    "elevenlabs": "ElevenLabs",
    "edge_tts": "Microsoft Edge TTS",
    "gemini_embedding": "Google Gemini Embeddings",
    "openai_embedding": "OpenAI Embeddings",
}
PURPOSE_LABELS = {
    "text_generation": ("توليد النص", "قد يُرسل نص طلبك والسياق اللازم إلى المزود المحدد."),
    "image_generation": ("توليد الصور", "قد يُرسل وصف الصورة إلى المزود المحدد لإنشاء صورة."),
    "image_analysis": ("تحليل الصور", "قد تُرسل الصورة وتعليماتك إلى المزود المحدد للتحليل."),
    "image_editing": ("تحرير الصور", "قد تُرسل الصورة إلى المزود المحدد لتنفيذ عملية التحرير."),
    "voice_synthesis": ("تحويل النص إلى صوت", "قد يُرسل النص إلى مزود الصوت المحدد لإنشاء ملف صوتي."),
    "audio_transcription": ("تفريغ الصوت", "قد يُرسل التسجيل الصوتي إلى مزود التفريغ المحدد لتحويله إلى نص."),
    "memory_embedding": ("فهرسة الذاكرة", "قد يُرسل النص إلى مزود embeddings المحدد لتجهيزه للبحث الدلالي."),
}


class ConsentStoreUnavailable(RuntimeError):
    """The consent source of truth could not be read or written."""


class ConsentPolicyNotApproved(RuntimeError):
    """The current provider disclosure has not been approved for collection of consent."""


def policy_is_approved() -> bool:
    return os.getenv(APPROVED_POLICY_ENV, "").strip() == POLICY_VERSION


def _query_snapshot(user_id: str) -> list[dict[str, Any]]:
    try:
        response = (
            get_db()
            .table("privacy_consents")
            .select("purpose,provider,granted,policy_version,updated_at")
            .eq("user_id", user_id)
            .execute()
        )
        return response.data or []
    except Exception as exc:
        logger.warning("cloud consent read unavailable (%s)", type(exc).__name__)
        raise ConsentStoreUnavailable("Cloud AI consent settings are unavailable") from exc


def get_granted_providers(user_id: str | None, purpose: str) -> set[str]:
    """Return effective, current-policy grants; every uncertainty denies cloud egress."""
    if not user_id or purpose not in PURPOSE_PROVIDERS or not policy_is_approved():
        return set()
    try:
        rows = _query_snapshot(user_id)
    except ConsentStoreUnavailable:
        return set()
    return {
        str(row.get("provider"))
        for row in rows
        if row.get("purpose") == purpose
        and row.get("provider") in PURPOSE_PROVIDERS[purpose]
        and row.get("granted") is True
        and row.get("policy_version") == POLICY_VERSION
    }


def consent_snapshot(user_id: str) -> dict[str, Any]:
    rows = _query_snapshot(user_id)
    recorded = {
        (str(row.get("purpose")), str(row.get("provider"))): row
        for row in rows
    }
    approved = policy_is_approved()
    purposes = []
    for purpose, providers in PURPOSE_PROVIDERS.items():
        title, description = PURPOSE_LABELS[purpose]
        provider_statuses = []
        for provider in providers:
            row = recorded.get((purpose, provider))
            stored_grant = bool(
                row
                and row.get("granted") is True
                and row.get("policy_version") == POLICY_VERSION
            )
            provider_statuses.append({
                "key": provider,
                "name": PROVIDER_LABELS[provider],
                "granted": stored_grant,
                "effective": approved and stored_grant,
            })
        purposes.append({
            "key": purpose,
            "title": title,
            "description": description,
            "providers": provider_statuses,
        })
    return {
        "policy_version": POLICY_VERSION,
        "policy_approved": approved,
        "grants_available": approved,
        "purposes": purposes,
    }


def set_consent(user_id: str, purpose: str, provider: str, granted: bool) -> dict[str, Any]:
    if purpose not in PURPOSE_PROVIDERS or provider not in PURPOSE_PROVIDERS[purpose]:
        raise ValueError("Unsupported purpose/provider pair")
    if granted and not policy_is_approved():
        raise ConsentPolicyNotApproved("The current cloud AI privacy notice is not approved")
    payload = {
        "user_id": user_id,
        "purpose": purpose,
        "provider": provider,
        "granted": granted,
        "policy_version": POLICY_VERSION,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        (
            get_db()
            .table("privacy_consents")
            .upsert(payload, on_conflict="user_id,purpose,provider")
            .execute()
        )
    except Exception as exc:
        logger.warning("cloud consent write unavailable (%s)", type(exc).__name__)
        raise ConsentStoreUnavailable("Cloud AI consent could not be saved") from exc
    return {
        "purpose": purpose,
        "provider": provider,
        "granted": granted,
        "policy_version": POLICY_VERSION,
        "updated_at": payload["updated_at"],
        "saved": True,
    }
