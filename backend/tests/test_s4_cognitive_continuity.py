import asyncio
import os
import sys
import types
from types import SimpleNamespace
from pathlib import Path

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")

if "supabase" not in sys.modules:
    fake_supabase = types.ModuleType("supabase")
    fake_supabase.Client = object
    fake_supabase.create_client = lambda *args, **kwargs: None
    sys.modules["supabase"] = fake_supabase

from app.twin_state import internal_state as internal_state_module
from app.twin_state.internal_state import TwinInternalState


class FakeQuery:
    def __init__(self, store):
        self.store = store
        self.mode = "select"
        self.filters = {}
        self.payload = None

    def select(self, *_):
        self.mode = "select"
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def maybe_single(self):
        return self

    def upsert(self, payload, on_conflict=None):
        self.mode = "upsert"
        self.payload = dict(payload)
        return self

    def execute(self):
        if self.mode == "upsert":
            self.store[self.payload["user_id"]] = dict(self.payload)
            return SimpleNamespace(data=[self.store[self.payload["user_id"]]])
        uid = self.filters.get("user_id")
        return SimpleNamespace(data=self.store.get(uid))


class FakeDB:
    def __init__(self):
        self.states = {}

    def table(self, name):
        assert name == "twin_internal_states"
        return FakeQuery(self.states)


def test_s4_thought_experience_restart_continuity(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(internal_state_module, "get_db", lambda: db)

    first = TwinInternalState()
    assert asyncio.run(first.set_last_thought("u-s4", "Thought A: the user is exploring continuity."))
    assert asyncio.run(first.add_pending_question("u-s4", "What should I remember next?"))

    second = TwinInternalState()  # simulated process restart: no in-memory state is reused
    context = asyncio.run(second.record_interaction_continuity(
        "u-s4", "Experience B", "Reply B", emotion="curious", importance=80,
        memory_surfaced=True,
    ))

    third = TwinInternalState()  # second restart
    state = asyncio.run(third.get_state("u-s4"))

    assert "Thought A" in state["last_thought"]
    assert "Experience B" in state["last_thought"]
    assert state["pending_questions"] == ["What should I remember next?"]
    assert state["continuity_schema_version"] == "s5.5"
    assert state["continuity_revision"] >= 3
    assert context["revision"] == state["continuity_revision"]
    assert context["cognitive_load"] > 0


def test_s4_continuity_is_bounded_and_persistent(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(internal_state_module, "get_db", lambda: db)
    state = TwinInternalState()

    asyncio.run(state.set_last_thought("u-bound", "x" * 5000))
    for i in range(20):
        asyncio.run(state.add_pending_question("u-bound", f"q-{i}"))

    loaded = asyncio.run(state.get_state("u-bound"))
    assert len(loaded["last_thought"]) <= 1000
    assert len(loaded["pending_questions"]) == 10
    assert loaded["pending_questions"][-1] == "q-19"


def test_s4_brain_reads_persisted_continuity(monkeypatch):
    from app.twin_brain import unified_brain as brain_module

    captured = {}

    async def fake_identity(user_id, lang):
        return {"twin_name": "MyTwin", "personality": "supportive", "traits": [], "bond_level": 20, "phase": "companion", "evolution_stage": 1}

    async def fake_emotion(**kwargs):
        return {"primary_emotion": "neutral", "real_emotion": "neutral", "intensity": 0.4}

    async def fake_retrieve(**kwargs):
        return {"memories": []}

    async def fake_relationship(user_id):
        return {"bond_level": 20, "stage": "companion"}

    async def fake_momentum(**kwargs):
        return {"current_emotion": "neutral"}

    async def fake_build_response(**kwargs):
        captured["strategy"] = kwargs["strategy"]
        return "reply"

    class FakeMemory:
        async def store(self, **kwargs):
            return None

    class FakeLoad:
        async def evaluate_load(self, **kwargs):
            return {"load_value": 0.2}

    class FakeSalience:
        async def evaluate_salience(self, **kwargs):
            return None

    async def fake_dna(_):
        return {"empathy": 0.85, "curiosity": 0.8}

    async def fake_save_dna(*args):
        return None

    async def fake_continuity(_):
        return {
            "schema_version": "s5.5", "revision": 7,
            "last_thought": "Thought A persisted before restart",
            "pending_questions": ["Question A"],
            "cognitive_load": 0.42, "curiosity": 0.81,
            "brain_meaning": {"implied_need": "maintain_continuity"},
        }

    monkeypatch.setattr(brain_module, "get_identity_context", fake_identity)
    monkeypatch.setattr(brain_module.unified_emotion_engine, "analyze", fake_emotion)
    monkeypatch.setattr(brain_module.unified_memory_engine, "retrieve", fake_retrieve)
    monkeypatch.setattr(brain_module, "load_relationship", fake_relationship)
    monkeypatch.setattr(brain_module.emotional_momentum_engine, "update_momentum", fake_momentum)
    monkeypatch.setattr(brain_module, "build_response", fake_build_response)
    monkeypatch.setattr(brain_module, "get_personality_dna", fake_dna)
    monkeypatch.setattr(brain_module, "save_personality_dna", fake_save_dna)
    monkeypatch.setattr(brain_module.unified_memory_engine, "store", FakeMemory().store)
    monkeypatch.setattr(brain_module.cognitive_load_engine, "evaluate_load", FakeLoad().evaluate_load)
    monkeypatch.setattr(brain_module.salience_engine, "evaluate_salience", FakeSalience().evaluate_salience)
    monkeypatch.setattr(brain_module.twin_internal_state, "get_continuity_context", fake_continuity)

    result = asyncio.run(brain_module.unified_brain.process("u-brain", "hello"))
    context = captured["strategy"]["engine_context"]

    assert "Thought A persisted before restart" in context
    assert "Question A" in context
    assert "0.420" in context
    assert "maintain_continuity" in context
    assert result["continuity_context"]["revision"] == 7


def test_s4_reflection_is_deterministic():
    from app.twin_state.self_reflection import SelfReflection

    engine = SelfReflection()
    report = {"total_messages": 120, "dominant_emotion": "joy"}
    state = {"bond_depth": 0.9, "curiosity": 0.9, "last_thought": "x"}
    a = engine._generate_reflection(report, state)
    b = engine._generate_reflection(report, state)
    assert a == b
    assert "120" in a


def test_s4_migration_declares_continuity_contract():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "20260927_s4_cognitive_continuity.sql"
    text = migration.read_text()
    for token in ("last_thought", "last_thought_at", "last_experience_at", "pending_questions", "cognitive_load", "continuity_revision", "continuity_schema_version"):
        assert token in text
