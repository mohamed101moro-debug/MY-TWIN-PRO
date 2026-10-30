"""Challenge API v1.0.

The challenge engine existed without an HTTP contract, which made every
challenge screen fail at runtime. These endpoints deliberately keep the
presentation contract stable and degrade to deterministic catalog data when
TCMA/Supabase is unavailable.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, Field

logger = logging.getLogger("challenge_routes")
router = APIRouter(prefix="/api/challenges", tags=["challenges"])

ROOMS = [
    {"id": "solo", "slug": "solo", "name": "Solo", "name_ar": "تحدي Solo", "description_ar": "تحدٍ شخصي بينك وبين توأمك", "type": "solo", "available": True},
    {"id": "daily", "slug": "daily", "name": "Daily Journey", "name_ar": "رحلة اليوم", "description_ar": "خطوة صغيرة تصنع فرقاً اليوم", "type": "daily", "available": True},
    {"id": "reflection", "slug": "reflection", "name": "Reflection", "name_ar": "غرفة التأمل", "description_ar": "توقف قصير لفهم ما تشعر به", "type": "reflection", "available": True},
    {"id": "growth", "slug": "growth", "name": "Growth", "name_ar": "غرفة النمو", "description_ar": "تحديات مرتبطة بأهدافك", "type": "growth", "available": True},
]

_attempts: Dict[str, List[Dict[str, Any]]] = {}
_attempts_lock = asyncio.Lock()


class ChallengeStartRequest(BaseModel):
    user_id: Optional[str] = None
    challenge_id: str = Field(default="daily", min_length=1, max_length=80)
    lang: str = Field(default="ar", max_length=8)


class ChallengeCompleteRequest(BaseModel):
    user_id: Optional[str] = None
    challenge_id: str = Field(default="daily", min_length=1, max_length=80)
    response: Optional[str] = None
    score: Optional[float] = Field(default=None, ge=0, le=100)
    lang: str = Field(default="ar", max_length=8)


def _catalog_challenge(challenge_id: str, lang: str = "ar") -> Dict[str, Any]:
    titles = {
        "solo": {"ar": "شارك توأمك بشيء واحد يجعلك سعيداً اليوم", "en": "Share one thing that made you happy today"},
        "daily": {"ar": "اكتب خطوة صغيرة تريد إنجازها اليوم", "en": "Write one small step you want to complete today"},
        "reflection": {"ar": "ما الشعور الذي يحتاج منك إلى عناية اليوم؟", "en": "What feeling needs your care today?"},
        "growth": {"ar": "خطط لخطوة واحدة نحو هدفك الأكبر", "en": "Plan one step toward your biggest goal"},
    }
    text = titles.get(challenge_id, titles["daily"])
    return {
        "id": challenge_id,
        "challenge_id": challenge_id,
        "type": "daily" if challenge_id == "daily" else "solo",
        "title": text.get(lang, text["ar"]),
        "title_ar": text["ar"],
        "title_en": text["en"],
        "phase": "introduction",
        "status": "available",
        "estimated_minutes": 5,
    }


async def _daily(user_id: str, lang: str) -> Dict[str, Any]:
    try:
        from app.features.challenges import get_daily_challenge
        challenge = await get_daily_challenge(user_id, lang)
        if challenge:
            return {**_catalog_challenge("daily", lang), **challenge, "id": "daily", "challenge_id": "daily"}
    except Exception as exc:
        logger.warning("daily challenge fallback: %s", exc)
    return _catalog_challenge("daily", lang)


@router.get("")
@router.get("/")
async def list_challenges(
    user_id: str = Query(default="anonymous"),
    lang: str = Query(default="ar", max_length=8),
) -> Dict[str, Any]:
    daily = await _daily(user_id, lang)
    return {"status": "success", "challenges": [daily, _catalog_challenge("solo", lang), _catalog_challenge("reflection", lang), _catalog_challenge("growth", lang)], "daily": daily, "total": 4}


@router.get("/rooms")
async def list_rooms(lang: str = Query(default="ar", max_length=8)) -> Dict[str, Any]:
    rooms = [{**room, "name": room["name_ar"] if lang == "ar" else room["name"]} for room in ROOMS]
    return {"status": "success", "rooms": rooms, "total": len(rooms)}


@router.get("/daily")
async def daily_challenge(user_id: str = Query(default="anonymous"), lang: str = Query(default="ar", max_length=8)) -> Dict[str, Any]:
    return {"status": "success", "challenge": await _daily(user_id, lang)}


@router.get("/solo")
async def solo_challenge(user_id: str = Query(default="anonymous"), lang: str = Query(default="ar", max_length=8)) -> Dict[str, Any]:
    return {"status": "success", "challenge": _catalog_challenge("solo", lang)}


@router.post("/start")
async def start_challenge(payload: ChallengeStartRequest = Body(...)) -> Dict[str, Any]:
    attempt = {"attempt_id": str(uuid.uuid4()), "challenge_id": payload.challenge_id, "user_id": payload.user_id or "anonymous", "status": "started", "started_at": datetime.now(timezone.utc).isoformat()}
    async with _attempts_lock:
        _attempts.setdefault(attempt["user_id"], []).append(attempt)
    return {"status": "success", "attempt": attempt, "challenge": _catalog_challenge(payload.challenge_id, payload.lang)}


@router.post("/complete")
async def complete_challenge(payload: ChallengeCompleteRequest = Body(...)) -> Dict[str, Any]:
    user_id = payload.user_id or "anonymous"
    completed = {"result_id": str(uuid.uuid4()), "challenge_id": payload.challenge_id, "user_id": user_id, "status": "completed", "score": payload.score if payload.score is not None else 100, "completed_at": datetime.now(timezone.utc).isoformat()}
    async with _attempts_lock:
        _attempts.setdefault(user_id, []).append(completed)
    return {"status": "success", "result": completed, "message": "أحسنت، تم تسجيل نتيجة التحدي." if payload.lang == "ar" else "Well done, your challenge result was recorded."}


@router.get("/results")
async def challenge_results(user_id: str = Query(default="anonymous")) -> Dict[str, Any]:
    async with _attempts_lock:
        results = [item for item in _attempts.get(user_id, []) if item.get("status") == "completed"]
    return {"status": "success", "results": results, "total": len(results)}


logger.info("Challenge API v1.0 ready")
