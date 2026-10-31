"""Soul Sync Digital Passport — canonical entity identity projection."""
from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies.canonical_user_id import get_current_canonical_user_id
import logging

logger = logging.getLogger("passport_routes")
router = APIRouter(prefix="/api/v1", tags=["passport"])


@router.get("/passport")
async def get_digital_passport(user_id: str = Depends(get_current_canonical_user_id)):
    """Return the durable identity passport projection.

    Unlike the legacy route, this endpoint never manufactures a fake passport
    when canonical identity storage is unavailable. Failure is explicit so a
    client cannot mistake an unavailable identity for a newly born entity.
    """
    try:
        from app.twin_state.internal_state import twin_internal_state
        from app.memory.unified_memory import unified_memory_engine
        from app.twin_state.entity_identity import build_passport

        state = await twin_internal_state.get_state(user_id)
        memory_count = await unified_memory_engine.get_memory_count(user_id)
        return await build_passport(user_id, state, memory_count)
    except Exception as exc:
        logger.error("Canonical passport unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="entity_identity_unavailable") from exc


@router.get("/fingerprint")
async def get_digital_fingerprint(user_id: str = Depends(get_current_canonical_user_id)):
    """Return the separate digital fingerprint feature."""
    try:
        from app.features.digital_fingerprint import fingerprint_engine
        return await fingerprint_engine.generate_fingerprint(user_id)
    except Exception as exc:
        logger.error("Fingerprint error: %s", exc)
        raise HTTPException(500, "Internal server error") from exc
