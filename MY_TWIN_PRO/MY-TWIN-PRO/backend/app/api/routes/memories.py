"""
Memories Routes v4.0 – متكاملة مع TCMA + Unified Memory
============================================================
تستدعي جميع طبقات الذاكرة، بما فيها القصص (Episodic) ونقاط TCMA الجديدة.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.api.dependencies.auth import get_current_user_id

router = APIRouter(prefix="/api/memories", tags=["memories"])

# ═══════════════════════════════════════
# نقاط النهاية الأصلية
# ═══════════════════════════════════════

@router.get("/")
async def get_memories(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    memory_type: Optional[str] = None,
):
    try:
        from app.memory.archive.raw_archive import get_conversation_archive
        memories = await get_conversation_archive(user_id, limit, offset)
        return {"memories": memories, "total": len(memories), "limit": limit, "offset": offset, "source": "raw_archive"}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/emotional")
async def get_emotional_memories(
    user_id: str = Depends(get_current_user_id),
    days: int = Query(30, ge=1, le=365),
):
    try:
        from app.memory.emotional.emotional_memory import get_emotional_patterns
        patterns = await get_emotional_patterns(user_id, days)
        return {"source": "emotional_memory", "patterns": patterns}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/reflections")
async def get_reflections(
    user_id: str = Depends(get_current_user_id),
    min_confidence: float = Query(0.6, ge=0, le=1),
):
    try:
        from app.memory.reflection.reflection_engine import get_user_insights
        insights = await get_user_insights(user_id, min_confidence)
        return {"source": "reflection_engine", "insights": insights}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/graph")
async def get_graph_memories(
    user_id: str = Depends(get_current_user_id),
    memory_id: Optional[str] = Query(None),
    depth: int = Query(2, ge=1, le=5),
):
    try:
        from app.memory.graph.memory_graph import get_connected_memories
        if not memory_id:
            return {"error": "يجب تحديد memory_id"}
        edges = await get_connected_memories(user_id, memory_id, depth)
        return {"source": "memory_graph", "edges": edges, "depth": depth}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/context")
async def get_context(
    query: str = Query(..., min_length=1),
    user_id: str = Depends(get_current_user_id),
):
    try:
        from app.memory.retrieval.memory_retriever import retrieve_full_context
        context = await retrieve_full_context(user_id, query)
        return {"source": "all_tcma_layers", "context": context}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/identity")
async def get_identity_endpoint(
    user_id: str = Depends(get_current_user_id),
):
    try:
        from app.memory.identity.identity_model import get_identity
        identity = await get_identity(user_id)
        return {"source": "identity_model", "identity": identity}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/people")
async def get_people_network(
    user_id: str = Depends(get_current_user_id),
    min_importance: int = Query(20, ge=0, le=100),
):
    try:
        from app.memory.relationship.person_node import get_person_network
        network = await get_person_network(user_id, min_importance)
        return {"source": "person_node", "people": network}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/stories")
async def get_stories(
    user_id: str = Depends(get_current_user_id),
    lang: str = Query("ar"),
):
    """استرجاع قصص الذاكرة العرضية (Episodic Memory)"""
    try:
        from app.memory.episodic.episodic_memory import episodic_memory
        stories = await episodic_memory.get_all_stories(user_id, lang)
        return {"stories": stories, "count": len(stories), "source": "episodic_memory"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ═══════════════════════════════════════
# ✅ نقاط نهاية TCMA الجديدة (Unified Memory)
# ═══════════════════════════════════════

@router.get("/core")
async def get_core_memories(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(12, ge=1, le=50),
):
    """استرجاع الذكريات الأساسية (عالية الأهمية) من TCMA"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        memories = await unified_memory_engine.get_core_memories(user_id, limit)
        return {"memories": memories, "source": "tcma_unified"}
    except Exception as e:
        return {"memories": [], "error": str(e)}

@router.get("/capability")
async def get_capability_memories(
    user_id: str = Depends(get_current_user_id),
    capability: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
):
    """استرجاع ذكريات مرتبطة بقدرة معينة"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        memories = await unified_memory_engine.get_capability_memories(user_id, capability, limit)
        return {"memories": memories, "source": "tcma_unified"}
    except Exception as e:
        return {"memories": [], "error": str(e)}

@router.get("/on_this_day")
async def get_on_this_day(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(5, ge=1, le=20),
):
    """ذكريات في مثل هذا اليوم من السنوات السابقة"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        memories = await unified_memory_engine.get_on_this_day(user_id, limit)
        return {"memories": memories, "source": "tcma_unified"}
    except Exception as e:
        return {"memories": [], "error": str(e)}

@router.get("/patterns")
async def get_memory_patterns(
    user_id: str = Depends(get_current_user_id),
    days: int = Query(14, ge=1, le=365),
):
    """أنماط الذاكرة من TCMA"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        patterns = await unified_memory_engine.get_patterns(user_id, days)
        return {"patterns": patterns, "source": "tcma_unified"}
    except Exception as e:
        return {"patterns": {}, "error": str(e)}


@router.get("/count")
async def get_memory_count(
    user_id: str = Depends(get_current_user_id),
):
    """إجمالي عدد الذكريات"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        count = await unified_memory_engine.get_memory_count(user_id)
        return {"count": count, "source": "tcma_unified"}
    except Exception as e:
        return {"count": 0, "error": str(e)}



@router.get("/most_used_capability")
async def get_most_used_capability(
    user_id: str = Depends(get_current_user_id),
):
    """أكثر قدرة استخداماً"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        capability = await unified_memory_engine.get_most_used_capability(user_id)
        return {"capability": capability, "source": "tcma_unified"}
    except Exception as e:
        return {"capability": "", "error": str(e)}



@router.get("/recent_emotions")
async def get_recent_emotions(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(5, ge=1, le=20),
):
    """آخر المشاعر المسجلة"""
    try:
        from app.memory.emotional.emotional_memory import get_emotional_patterns
        patterns = await get_emotional_patterns(user_id, days=7)
        recent = patterns.get("recent_emotions", [])
        return {"emotions": recent[:limit], "source": "emotional_memory"}
    except Exception as e:
        return {"emotions": [], "error": str(e)}


@router.post("/store")
async def store_memory(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    """تخزين ذاكرة جديدة عبر TCMA"""
    try:
        from app.memory.unified_memory import unified_memory_engine
        memory_id = await unified_memory_engine.store(
            user_id=user_id,
            content=payload.get("content", ""),
            reply="",
            emotion=payload.get("emotion", "neutral"),
            importance=payload.get("importance", 50),
        )
        return {"id": memory_id, "status": "stored"}
    except Exception as e:
        raise HTTPException(500, str(e))
