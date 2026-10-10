"""Twin Internal State v4.1 — الحالة الكاملة: DNA، حياة، تأملات، أهداف، استمرارية.
v4.1: إزالة الاعتماد الضمني على profiles (FK زال) + معالجة صفراء واضحة عند فشل الكتابة.
"""
import logging, json, hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.infrastructure.database.supabase_client import get_db
logger = logging.getLogger("twin_internal_state")
MOODS = ["contemplative", "energetic", "calm", "playful", "serious", "affectionate", "curious"]
DEFAULT_DNA = {"empathy": 0.85, "curiosity": 0.8, "humor": 0.5, "initiative": 0.6,
               "reflection": 0.9, "logic": 0.75, "creativity": 0.8, "calmness": 0.85}
def _parse(content: str) -> Optional[Dict]:
    try:
        i = content.find("{")
        return json.loads(content[i:]) if i >= 0 else None
    except Exception:
        return None
LIFECYCLE_SCHEMA_VERSION = "s5.5"
LIFECYCLE_DEDUPE_WINDOW_SECONDS = 30

def _evidence_fingerprint(evidence: Dict[str, Any]) -> str:
    """Stable semantic fingerprint for retry-safe lifecycle evidence.

    Volatile transport fields (intention_id/observed_at) are intentionally
    excluded. The fingerprint is used only for bounded retry deduplication; it
    does not replace the caller supplied idempotency key.
    """
    material = {k: evidence[k] for k in sorted(evidence) if k not in {"intention_id", "observed_at"}}
    encoded = json.dumps(material, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

def _parse_timestamp(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None

class TwinInternalState:
    async def get_state(self, user_id: str) -> Dict[str, Any]:
        """قراءة الحالة — تعيد افتراضيًا إن لم يوجد صف (بلا رمي استثناء)."""
        try:
            res = get_db().table("twin_internal_states").select("*").eq("user_id", user_id).maybe_single().execute()
            if res.data:
                data = dict(res.data)
                data.setdefault("mood", "unknown")
                data.setdefault("energy_level", 0.5)
                data.setdefault("curiosity", 0.5)
                data.setdefault("bond_depth", 0.0)
                data.setdefault("last_thought", "")
                data.setdefault("last_thought_at", None)
                data.setdefault("last_experience_at", None)
                data.setdefault("pending_questions", [])
                data.setdefault("cognitive_load", 0.0)
                data.setdefault("continuity_revision", 0)
                data.setdefault("continuity_schema_version", "s5.5")
                data.setdefault("last_life_intention", None)
                return data
        except Exception as e:
            logger.debug(f"get_state select: {e}")
        return {"user_id": user_id, "mood": "unknown", "energy_level": 0.5,
                "curiosity": 0.5, "bond_depth": 0.0, "last_thought": "",
                "pending_questions": [], "cognitive_load": 0.0,
                "last_thought_at": None, "last_experience_at": None,
                "continuity_revision": 0, "continuity_schema_version": "s5.5",
                "last_life_intention": None,
                "updated_at": datetime.now(timezone.utc).isoformat()}
    async def _save_state(self, user_id: str, state: Dict[str, Any]) -> bool:
        """حفظ الحالة — تحذير صريح إن فشل (لا ابتلاع صامت)."""
        try:
            payload = {
                "user_id": user_id,
                "mood": state.get("mood", "unknown"),
                "energy_level": state.get("energy_level", 0.5),
                "curiosity": state.get("curiosity", 0.5),
                "bond_depth": state.get("bond_depth", 0.0),
                "last_thought": str(state.get("last_thought", ""))[:1000],
                "last_thought_at": state.get("last_thought_at"),
                "last_experience_at": state.get("last_experience_at"),
                "pending_questions": [str(q)[:300] for q in (state.get("pending_questions") or [])][-10:],
                "cognitive_load": max(0.0, min(1.0, float(state.get("cognitive_load", 0.0) or 0.0))),
                "continuity_revision": max(0, int(state.get("continuity_revision", 0) or 0)),
                "continuity_schema_version": "s5.5",
                "last_life_intention": state.get("last_life_intention"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            get_db().table("twin_internal_states").upsert(payload, on_conflict="user_id").execute()
            return True
        except Exception as e:
            logger.warning(f"⚠️ _save_state FAILED for {user_id}: {e}")
            return False
    async def update_field(self, user_id: str, key: str, value: Any):
        st = await self.get_state(user_id); st[key] = value; await self._save_state(user_id, st)

    async def _atomic_commit_life_intention(self, user_id: str, canonical: Dict[str, Any]) -> Dict[str, Any]:
        """Commit canonical lifecycle state through the atomic DB boundary.

        This is deliberately a separate seam so unit tests can verify the
        deterministic cognition phase without pretending an in-memory fake DB
        proves PostgreSQL transaction semantics. Production always reaches the
        Supabase RPC created by the S5.5.2 migration.
        """
        observed_at = _parse_timestamp(canonical.get("observed_at"))
        try:
            result = get_db().rpc(
                "commit_twin_life_intention",
                {
                    "p_user_id": user_id,
                    "p_canonical": canonical,
                    "p_fingerprint": canonical["evidence_fingerprint"],
                    "p_intention_id": canonical.get("intention_id"),
                    "p_observed_at": observed_at.isoformat() if observed_at else None,
                    "p_dedupe_window_seconds": LIFECYCLE_DEDUPE_WINDOW_SECONDS,
                },
            ).execute()
            data = result.data or {}
            committed = data.get("canonical") if isinstance(data, dict) else None
            if not isinstance(committed, dict):
                raise RuntimeError("invalid_lifecycle_commit_result")
            return committed
        except Exception as exc:
            logger.error("❌ atomic lifecycle commit failed for %s: %s", user_id, exc)
            raise RuntimeError("last_life_intention_atomic_commit_failed") from exc

    async def save_life_intention(self, user_id: str, payload: Dict[str, Any]):
        """Persist lifecycle evidence as the canonical internal-state signal.

        Unlike generic engine-output memory, this method fails closed: callers must
        not acknowledge an intention as accepted when the canonical state write fails.
        """
        st = await self.get_state(user_id)
        canonical = dict(payload)
        from app.twin_state.brain_evidence import derive_lifecycle_intention, derive_meaning, normalize_evidence
        canonical["evidence"] = normalize_evidence(canonical.get("evidence"))
        # The client may carry a legacy intention field, but it is never trusted.
        # Lifecycle classification is backend-owned and deterministic.
        canonical["intention"] = derive_lifecycle_intention(canonical["evidence"], st)
        canonical["meaning"] = derive_meaning(canonical, st)
        canonical["intention_id"] = str(canonical.get("intention_id") or "")[:128] or None
        canonical["evidence_fingerprint"] = _evidence_fingerprint(canonical["evidence"])
        canonical["accepted_at"] = datetime.now(timezone.utc).isoformat()

        # Idempotency is part of the canonical state contract. A retried device
        # event must not advance continuity or overwrite the authoritative state
        # a second time. The explicit intention_id is authoritative when present.
        # A bounded semantic fingerprint closes the common retry case where a
        # buggy client regenerates its id but resends the same observed event.
        previous = st.get("last_life_intention")
        if isinstance(previous, dict):
            same_id = bool(canonical.get("intention_id")) and previous.get("intention_id") == canonical.get("intention_id")
            same_observation = (
                canonical.get("observed_at") is not None
                and previous.get("observed_at") == canonical.get("observed_at")
                and previous.get("evidence_fingerprint") == canonical.get("evidence_fingerprint")
            )
            previous_at = _parse_timestamp(previous.get("accepted_at"))
            recent_semantic_retry = (
                previous.get("evidence_fingerprint") == canonical.get("evidence_fingerprint")
                and previous_at is not None
                and (datetime.now(timezone.utc) - previous_at).total_seconds() <= LIFECYCLE_DEDUPE_WINDOW_SECONDS
                and canonical.get("observed_at") is None
            )
            if same_id or same_observation or recent_semantic_retry:
                return previous

        canonical["continuity_schema_version"] = LIFECYCLE_SCHEMA_VERSION
        # Fail closed if the atomic database boundary is unavailable. There is
        # intentionally no non-atomic fallback.
        return await self._atomic_commit_life_intention(user_id, canonical)
    async def get_personality_dna(self, user_id: str) -> Dict[str, float]:
        for m in (await self._outputs(user_id, "personality_dna", 1)):
            p = _parse(m.get("content", ""))
            if p: return {**DEFAULT_DNA, **p}
        return dict(DEFAULT_DNA)
    async def update_personality_dna(self, user_id: str, dna: Dict[str, float]):
        from app.memory.unified_memory import unified_memory_engine as m
        await m.store_engine_output(user_id, "personality_dna", dna)
    async def add_life_book_entry(self, user_id: str, text: str, metadata: Optional[Dict] = None):
        from app.memory.unified_memory import unified_memory_engine as m
        await m.store_engine_output(user_id, "life_book",
            {"text": text[:300], "metadata": metadata or {}, "ts": datetime.now(timezone.utc).isoformat()})
    async def get_life_book(self, user_id: str, limit: int = 20) -> List[Dict]:
        return await self._outputs(user_id, "life_book", limit)
    async def add_self_reflection(self, user_id: str, observation: str, confidence: float = 0.5):
        from app.memory.unified_memory import unified_memory_engine as m
        await m.store_engine_output(user_id, "self_reflection",
            {"observation": observation[:300], "confidence": confidence, "ts": datetime.now(timezone.utc).isoformat()})
    async def get_self_reflections(self, user_id: str, limit: int = 5) -> List[Dict]:
        return await self._outputs(user_id, "self_reflection", limit)
    async def get_active_goals(self, user_id: str) -> List[Dict]:
        return await self._outputs(user_id, "goal", 5)
    async def save_continuity_snapshot(self, user_id: str):
        """Write a bounded trace copy; canonical continuity remains in TwinInternalState."""
        context = await self.get_continuity_context(user_id)
        from app.memory.unified_memory import unified_memory_engine as m
        await m.store_engine_output(user_id, "continuity", {
            **context,
            "mood": (await self.get_state(user_id)).get("mood", "unknown"),
            "ts": datetime.now(timezone.utc).isoformat(),
        })
    async def _outputs(self, user_id: str, engine: str, limit: int) -> List[Dict]:
        try:
            from app.memory.unified_memory import unified_memory_engine as m
            # get_engine_outputs() is a list-returning API. Keep the internal
            # state adapter aligned with that contract; treating the list as a
            # mapping silently erased DNA/life-book/goal/reflection state.
            outs = await m.get_engine_outputs(user_id, engine, limit=limit)
            if not isinstance(outs, list):
                logger.warning("get_engine_outputs returned %s; expected list", type(outs).__name__)
                return []
            return [p for p in (_parse(x.get("content", "")) for x in outs if isinstance(x, dict)) if p]
        except Exception: return []
    async def set_last_thought(self, user_id: str, thought: Any) -> bool:
        """Persist a bounded internal thought/continuity marker.

        This is state, not a claim of subjective consciousness. The value must be
        grounded in an actual observation/experience and is never generated here
        from randomness.
        """
        st = await self.get_state(user_id)
        now = datetime.now(timezone.utc).isoformat()
        st["last_thought"] = str(thought or "")[:1000]
        st["last_thought_at"] = now
        st["continuity_revision"] = int(st.get("continuity_revision", 0) or 0) + 1
        return await self._save_state(user_id, st)

    async def add_pending_question(self, user_id: str, question: Any) -> bool:
        """Append one bounded pending item while preserving existing continuity."""
        text = str(question or "").strip()
        if not text:
            return True
        st = await self.get_state(user_id)
        q = [str(x)[:300] for x in (st.get("pending_questions") or []) if str(x).strip()]
        if text in q:
            return True
        q.append(text[:300])
        st["pending_questions"] = q[-10:]
        st["continuity_revision"] = int(st.get("continuity_revision", 0) or 0) + 1
        return await self._save_state(user_id, st)

    async def get_continuity_context(self, user_id: str) -> Dict[str, Any]:
        """Return the canonical persistent continuity slice used by the brain.

        The context is read from the database-backed TwinInternalState on every
        interaction; it is therefore restart-safe and does not depend on process
        memory.
        """
        st = await self.get_state(user_id)
        li = st.get("last_life_intention")
        meaning = li.get("meaning") if isinstance(li, dict) else None
        return {
            "schema_version": "s5.5",
            "revision": int(st.get("continuity_revision", 0) or 0),
            "last_thought": str(st.get("last_thought", ""))[:1000],
            "last_thought_at": st.get("last_thought_at"),
            "last_experience_at": st.get("last_experience_at"),
            "pending_questions": [str(q)[:300] for q in (st.get("pending_questions") or [])][-5:],
            "cognitive_load": max(0.0, min(1.0, float(st.get("cognitive_load", 0.0) or 0.0))),
            "curiosity": max(0.0, min(1.0, float(st.get("curiosity", 0.5) or 0.5))),
            "brain_meaning": meaning,
        }

    async def record_interaction_continuity(
        self, user_id: str, message: str, reply: str, emotion: str = "neutral",
        importance: float = 50.0, memory_surfaced: bool = False,
    ) -> Dict[str, Any]:
        """Advance persistent continuity from a real interaction.

        The update is deterministic and grounded only in the interaction and
        previously persisted state. It deliberately does not invent feelings,
        goals, memories, or questions.
        """
        st = await self.get_state(user_id)
        now = datetime.now(timezone.utc).isoformat()
        previous = str(st.get("last_thought", "")).strip()
        msg = " ".join(str(message or "").split())[:180]
        prior_marker = previous[:220] if previous else "لا توجد ملاحظة داخلية سابقة محفوظة."
        memory_marker = "تم استرجاع ذاكرة ذات صلة." if memory_surfaced else "لم تُسترجع ذاكرة محددة لهذا التفاعل."
        thought = (
            f"استمرارية S4: قبل التفاعل كانت الملاحظة: {prior_marker} "
            f"الآن سُجل تفاعل جديد: {msg or 'بدون نص'}. "
            f"الحالة الانفعالية المفسرة: {str(emotion or 'neutral')[:40]}. {memory_marker}"
        )[:1000]
        # Cognitive load is persistent state; interaction importance contributes
        # a small bounded increment, while the existing engine remains the
        # authoritative calculator for detailed load factors.
        load = max(0.0, min(1.0, float(st.get("cognitive_load", 0.0) or 0.0)))
        load_increment = max(0.01, min(0.12, float(importance or 50.0) / 1000.0))
        st["cognitive_load"] = round(min(1.0, load * 0.85 + load_increment), 4)
        st["last_thought"] = thought
        st["last_thought_at"] = now
        st["last_experience_at"] = now
        st["continuity_revision"] = int(st.get("continuity_revision", 0) or 0) + 1
        st["continuity_schema_version"] = "s5.5"
        ok = await self._save_state(user_id, st)
        if not ok:
            raise RuntimeError("continuity_persistence_failed")
        return await self.get_continuity_context(user_id)
    async def get_cognitive_state(self, user_id: str) -> Dict[str, Any]:
        """Return the S5 canonical cognitive projection; no duplicate persistence."""
        from app.twin_state.cognitive_state import build_cognitive_state
        return build_cognitive_state(await self.get_state(user_id))

    async def get_mood_label(self, user_id, lang="ar"):
        st = await self.get_state(user_id); m = st.get("mood", "calm")
        ar = {"contemplative":"تأملي","energetic":"نشيط","calm":"هادئ","playful":"مرح","serious":"جاد","affectionate":"حنون","curious":"فضولي"}
        return ar.get(m, m) if lang=="ar" else m
    async def get_dominant_emotion_toward_user(self, user_id):
        outs = await self._outputs(user_id, "emotional_momentum", 5)
        if not outs: return "neutral"
        freq = {}
        for o in outs: freq[o.get("effective_emotion","neutral")] = freq.get(o.get("effective_emotion","neutral"),0)+1
        return max(freq, key=freq.get)
twin_internal_state = TwinInternalState()
logger.info("✅ Twin Internal State v4.1 ready (FK-independent + explicit save errors)")
