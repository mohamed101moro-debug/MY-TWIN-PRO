"""User-owned privacy controls for cloud AI provider consent."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_user_id

router = APIRouter(prefix="/api/privacy", tags=["privacy"])


class CloudAIConsentRequest(BaseModel):
    purpose: Literal["text_generation", "image_generation", "image_analysis", "image_editing", "voice_synthesis", "audio_transcription", "memory_embedding"]
    provider: Literal["gemini", "gemini_image", "groq", "openrouter", "huggingface", "pollinations", "elevenlabs", "edge_tts", "gemini_embedding"]
    granted: bool
    policy_version: str


@router.get("/cloud-ai")
async def get_cloud_ai_consents(user_id: str = Depends(get_current_user_id)):
    from app.privacy.cloud_ai_consent import ConsentStoreUnavailable, consent_snapshot

    try:
        return consent_snapshot(user_id)
    except ConsentStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail="إعدادات الخصوصية غير متاحة حالياً؛ لم يتم تغيير أي موافقة.") from exc


@router.put("/cloud-ai")
async def update_cloud_ai_consent(
    request: CloudAIConsentRequest,
    user_id: str = Depends(get_current_user_id),
):
    from app.privacy.cloud_ai_consent import (
        POLICY_VERSION,
        ConsentPolicyNotApproved,
        ConsentStoreUnavailable,
        set_consent,
    )

    if request.policy_version != POLICY_VERSION:
        raise HTTPException(status_code=409, detail="إصدار إشعار الخصوصية تغيّر؛ حدّث الصفحة قبل الاختيار.")
    try:
        return set_consent(user_id, request.purpose, request.provider, request.granted)
    except ConsentPolicyNotApproved as exc:
        raise HTTPException(status_code=503, detail="لم يعتمد إشعار معالجة الذكاء الاصطناعي السحابي بعد؛ لا يمكن منح موافقة الآن.") from exc
    except ConsentStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail="تعذّر حفظ اختيار الخصوصية؛ لم يُعتبر التغيير محفوظاً.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="اختيار الغرض والمزود غير صالح.") from exc
