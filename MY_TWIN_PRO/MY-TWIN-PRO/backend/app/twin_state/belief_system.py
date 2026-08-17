"""Belief System v2.1 — معتقدات بثقة وأدلة وتناقضات، في عمود beliefs القائم."""
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone
logger = logging.getLogger("belief_system")
class BeliefSystem:
    async def _load(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            from app.infrastructure.database.supabase_client import get_db
            res = get_db().table("twin_internal_states").select("beliefs").eq("user_id", user_id).maybe_single().execute()
            raw = ((res.data or {}).get("beliefs")) or []
            return [({"text": b, "confidence": 0.5, "evidence": 1, "origin": "legacy", "last_validated": None, "contradictions": 0, "status": "active"}) if isinstance(b, str) else b for b in raw]
        except Exception:
            return []
    async def _save(self, user_id: str, beliefs: List[Dict[str, Any]]):
        try:
            from app.infrastructure.database.supabase_client import get_db
            get_db().table("twin_internal_states").upsert(
                {"user_id": user_id, "beliefs": beliefs, "updated_at": datetime.now(timezone.utc).isoformat()},
                on_conflict="user_id").execute()
        except Exception as e:
            logger.debug(f"belief save: {e}")
    async def get_beliefs(self, user_id: str) -> List[Dict[str, Any]]:
        return await self._load(user_id)
    async def record_evidence(self, user_id: str, text: str, origin: str = "experience") -> Dict[str, Any]:
        text = (text or "").strip()[:160]
        if not text: return {}
        beliefs = await self._load(user_id)
        now = datetime.now(timezone.utc).isoformat()
        for b in beliefs:
            if b.get("text") == text and b.get("status") == "active":
                b["confidence"] = min(0.95, (b.get("confidence") or 0.5) + 0.05)
                b["evidence"] = (b.get("evidence") or 1) + 1
                b["last_validated"] = now
                await self._save(user_id, beliefs)
                return b
        nb = {"text": text, "confidence": 0.5, "evidence": 1, "origin": origin, "last_validated": now, "contradictions": 0, "status": "active"}
        beliefs.append(nb)
        await self._save(user_id, beliefs)
        logger.info(f"💡 معتقد جديد: {text[:60]}")
        return nb
    async def note_contradiction(self, user_id: str, text: str) -> Dict[str, Any]:
        beliefs = await self._load(user_id)
        for b in beliefs:
            if b.get("text") == text and b.get("status") == "active":
                b["contradictions"] = (b.get("contradictions") or 0) + 1
                b["confidence"] = max(0.1, (b.get("confidence") or 0.5) - 0.1)
                if b["contradictions"] >= 3: b["status"] = "revising"
                await self._save(user_id, beliefs)
                return b
        return {}
    async def update_beliefs(self, user_id: str) -> List[str]:
        try:
            from app.memory.retrieval.memory_retriever import get_recent_chat
            recent = await get_recent_chat(user_id, limit=50)
            if not recent: return []
            text = "\n".join([f"المستخدم: {m.get('content', '')[:200]}" for m in recent if m.get('role') == 'user'])
            if len(text) < 200: return []
            from app.infrastructure.ai.ai_gateway import ai_gateway
            prompt = f"استخلص 1-3 قناعات لدى هذا المستخدم كجمل قصيرة بالعامية المصرية.\nالمحادثات:\n{text[:3000]}"
            result, _ = await ai_gateway.route(prompt, task="general")
            added = []
            if result:
                for line in [l.strip().lstrip("-•* ").strip() for l in result.split("\n") if l.strip() and len(l.strip()) > 10][:3]:
                    await self.record_evidence(user_id, line, origin="inference")
                    added.append(line)
            return added
        except Exception as e:
            logger.debug(f"Belief update skipped: {e}")
            return []
belief_system = BeliefSystem()
logger.info("✅ Belief System v2.1 ready (beliefs column + confidence/evidence/contradictions)")
