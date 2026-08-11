"""
Unified Chat API v2.0 — نقطة الدخول الوحيدة للمحادثة
========================================================
يستبدل كل نقاط النهاية القديمة.
يستقبل UnifiedInput ويعيد UnifiedResponse.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger("unified_chat_api")

router = APIRouter(prefix="/api/v2", tags=["unified"])


class PerceptionInput(BaseModel):
    typing_speed: float = 0.0
    message_length: int = 0
    absence_duration_minutes: float = 0.0
    time_of_day: str = "morning"
    user_state: str = "normal"


class UnifiedInput(BaseModel):
    user_id: str
    message: str
    lang: str = "ar"
    perception: Optional[PerceptionInput] = None
    history: Optional[List[Dict[str, str]]] = []


@router.post("/chat")
async def unified_chat(input_data: UnifiedInput):
    """
    نقطة النهاية الموحدة للمحادثة.
    تستبدل كل نقاط النهاية القديمة.
    """
    try:
        from app.twin_brain.unified_brain import unified_brain
        
        perception = input_data.perception.dict() if input_data.perception else {}
        
        result = await unified_brain.process(
            user_id=input_data.user_id,
            message=input_data.message,
            lang=input_data.lang,
            perception=perception,
            history=input_data.history,
        )
        
        return result
    except Exception as e:
        logger.error(f"Unified chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0", "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}
