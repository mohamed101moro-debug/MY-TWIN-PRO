"""
Admin Routes v1.0 — للاستخدام الداخلي فقط
=============================================
تُستخدم لتصدير بيانات التدريب وإدارة النظام.
لا تُتاح للمستخدم العادي.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import logging, os

logger = logging.getLogger("admin_routes")
router = APIRouter(prefix="/api/admin", tags=["admin"])

# ✅ مفتاح سري بسيط للتحقق من الصلاحية (يُستخدم من لوحة التحكم فقط)
ADMIN_SECRET = os.getenv("SOUL_SYNC_ADMIN_KEY", "")

def verify_admin(secret: str):
    if secret != ADMIN_SECRET:
        raise HTTPException(403, "Unauthorized")

@router.get("/export/training")
async def export_training_data(secret: str, format: str = "json"):
    """تصدير بيانات التدريب (للاستخدام الداخلي فقط)"""
    verify_admin(secret)
    try:
        from app.memory.unified_memory import unified_memory_engine
        
        if format == "llama":
            # تنسيق Llama
            memories = await unified_memory_engine.get_core_memories("all", 10000)
            llama_data = []
            for m in (memories or []):
                llama_data.append({
                    "instruction": m.get("expressed_text", ""),
                    "input": "",
                    "output": "",
                    "emotion": m.get("real_emotion", "neutral"),
                })
            return {"format": "llama", "count": len(llama_data), "data": llama_data[:1000]}
        
        # تنسيق JSON كامل
        memories = await unified_memory_engine.get_core_memories("all", 1000)
        patterns = await unified_memory_engine.get_patterns("all", 365)
        
        return {
            "exportId": f"ADMIN-{__import__('time').time()}",
            "exportedAt": __import__('datetime').datetime.now().isoformat(),
            "totalMemories": len(memories or []),
            "patterns": patterns,
            "memories": memories,
        }
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/stats/training")
async def get_training_stats(secret: str):
    """إحصائيات بيانات التدريب"""
    verify_admin(secret)
    try:
        from app.memory.unified_memory import unified_memory_engine
        
        count = await unified_memory_engine.get_memory_count("all")
        core_count = await unified_memory_engine.get_core_memory_count("all")
        
        estimated_tokens = count * 50
        estimated_size_mb = round((estimated_tokens * 4) / (1024 * 1024), 2)
        
        return {
            "totalMemories": count,
            "coreMemories": core_count,
            "estimatedTokens": estimated_tokens,
            "estimatedFileSizeMB": estimated_size_mb,
        }
    except Exception as e:
        raise HTTPException(500, str(e))

logger.info("✅ Admin Routes initialized")
