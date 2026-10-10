from fastapi import APIRouter, Depends, Query
from app.api.dependencies.auth import require_request_owner

router = APIRouter(
    prefix="/api/meta",
    tags=["meta"],
    dependencies=[Depends(require_request_owner)],
)

@router.get("/relationship-health")
async def relationship_health(user_id: str = Query(...)):
    from app.features.meta_reflection import meta_engine
    return await meta_engine.analyze_relationship_health(user_id)

@router.get("/proactive-message")
async def proactive_message(user_id: str = Query(...), lang: str = "ar"):
    from app.features.proactive_engine import proactive_engine
    return await proactive_engine.generate_proactive_message(user_id, lang)
