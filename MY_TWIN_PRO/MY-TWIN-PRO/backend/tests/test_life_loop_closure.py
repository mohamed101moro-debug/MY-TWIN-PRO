import asyncio
import os
import sys
import types
from types import SimpleNamespace

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")

# The project runtime requires the real supabase package; this focused unit test
# injects only the import surface because the DB itself is replaced by FakeDB.
if "supabase" not in sys.modules:
    fake_supabase = types.ModuleType("supabase")
    fake_supabase.Client = object
    fake_supabase.create_client = lambda *args, **kwargs: None
    sys.modules["supabase"] = fake_supabase

from app.twin_state import internal_state as internal_state_module
from app.twin_state.internal_state import TwinInternalState


class FakeQuery:
    def __init__(self, table, store):
        self.table_name = table
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
        self.payload = payload
        return self

    def execute(self):
        if self.mode == "upsert":
            self.store[self.payload["user_id"]] = dict(self.payload)
            return SimpleNamespace(data=[self.store[self.payload["user_id"]]])
        uid = self.filters.get("user_id")
        return SimpleNamespace(data=self.store.get(uid))


class FakeRPC:
    def __init__(self, db, args):
        self.db = db
        self.args = args
    def execute(self):
        uid = self.args["p_user_id"]
        canonical = dict(self.args["p_canonical"])
        previous = self.db.receipts.get((uid, self.args["p_fingerprint"]))
        if previous:
            return SimpleNamespace(data={"canonical": previous, "continuity_revision": self.db.revisions[uid], "deduplicated": True})
        revision = self.db.revisions.get(uid, 0) + 1
        self.db.revisions[uid] = revision
        self.db.receipts[(uid, self.args["p_fingerprint"])] = canonical
        self.db.states[uid] = {
            "user_id": uid, "mood": "unknown", "energy_level": 0.5, "curiosity": 0.5,
            "bond_depth": 0.0, "last_life_intention": canonical, "continuity_revision": revision,
            "continuity_schema_version": "s5.5",
        }
        return SimpleNamespace(data={"canonical": canonical, "continuity_revision": revision, "deduplicated": False})

class FakeDB:
    def __init__(self):
        self.states = {}
        self.receipts = {}
        self.revisions = {}

    def table(self, name):
        assert name == "twin_internal_states"
        return FakeQuery(name, self.states)

    def rpc(self, name, args):
        assert name == "commit_twin_life_intention"
        return FakeRPC(self, args)


def test_life_intention_roundtrip_uses_persistent_state():
    db = FakeDB()
    internal_state_module.get_db = lambda: db
    state = TwinInternalState()
    payload = {
        "intention": "rest",
        "evidence": {"energy": 0.18},
        "observed_at": "2026-09-25T20:00:00+00:00",
        "source": "frontend_existence_loop",
    }

    asyncio.run(state.save_life_intention("u1", payload))
    loaded = asyncio.run(state.get_state("u1"))

    assert loaded["last_life_intention"]["intention"] == "rest"
    assert loaded["last_life_intention"]["evidence"]["energy"] == 0.18


def test_new_state_has_evidence_neutral_defaults(monkeypatch):
    monkeypatch.setattr(internal_state_module, "get_db", lambda: (_ for _ in ()).throw(RuntimeError("no db")))
    state = TwinInternalState()
    loaded = asyncio.run(state.get_state("new-user"))
    assert loaded["mood"] == "unknown"
    assert loaded["energy_level"] == 0.5
    assert loaded["curiosity"] == 0.5
    assert loaded["bond_depth"] == 0.0
    assert loaded["last_life_intention"] is None


def test_brain_interprets_lifecycle_evidence_without_user_visible_action(monkeypatch):
    from app.twin_state import brain_scheduler as scheduler_module

    class FakeState:
        def __init__(self):
            self.state = {
                "user_id": "u2",
                "mood": "unknown",
                "energy_level": 0.5,
                "curiosity": 0.5,
                "bond_depth": 0.0,
                "last_life_intention": {
                    "intention": "reduce_presence",
                    "evidence": {"energy": 0.1},
                    "observed_at": "2026-09-25T20:00:00+00:00",
                },
            }

        async def get_state(self, uid):
            return dict(self.state)

        async def _save_state(self, uid, state):
            self.state = dict(state)
            return True

    fake = FakeState()
    monkeypatch.setattr(scheduler_module, "datetime", scheduler_module.datetime)

    import sys
    fake_module = SimpleNamespace(twin_internal_state=fake)
    monkeypatch.setitem(sys.modules, "app.twin_state.internal_state", fake_module)

    scheduler = scheduler_module.BrainScheduler()
    asyncio.run(scheduler._process_life_intention("u2"))

    assert fake.state["energy_level"] == 0.45
    li = fake.state["last_life_intention"]
    assert li["backend_effect"] == "bounded_energy_reduction"
    assert li["source_of_truth"] == "internal_state"
    assert li["processed_at"]
    assert "TWIN_SPEAK" not in repr(fake.state)

def test_life_intention_processing_is_idempotent_and_bounded(monkeypatch):
    from app.twin_state import brain_scheduler as scheduler_module

    class FakeState:
        def __init__(self):
            self.state = {
                "user_id": "u3", "mood": "unknown", "energy_level": 0.8,
                "curiosity": 0.5, "bond_depth": 0.0,
                "last_life_intention": {
                    "intention": "rest", "evidence": {"energy": 0.2},
                    "observed_at": "2026-09-25T20:00:00+00:00",
                    "intention_id": "i-1",
                },
            }
        async def get_state(self, uid): return dict(self.state)
        async def _save_state(self, uid, state): self.state = dict(state); return True

    fake = FakeState()
    monkeypatch.setitem(sys.modules, "app.twin_state.internal_state", SimpleNamespace(twin_internal_state=fake))
    scheduler = scheduler_module.BrainScheduler()
    asyncio.run(scheduler._process_life_intention("u3"))
    first = fake.state["energy_level"]
    asyncio.run(scheduler._process_life_intention("u3"))
    assert first == 0.65
    assert fake.state["energy_level"] == first
    assert fake.state["last_life_intention"]["processed_at"]


def test_rest_never_increases_low_energy_and_is_persisted(monkeypatch):
    from app.twin_state import brain_scheduler as scheduler_module

    class FakeState:
        def __init__(self):
            self.state = {
                "user_id": "u-low", "mood": "unknown", "energy_level": 0.2,
                "curiosity": 0.5, "bond_depth": 0.0,
                "last_life_intention": {
                    "intention": "rest", "evidence": {"energy": 0.18},
                    "observed_at": "2026-09-25T20:00:00+00:00",
                    "intention_id": "i-low",
                },
            }
        async def get_state(self, uid): return dict(self.state)
        async def _save_state(self, uid, state): self.state = dict(state); return True

    fake = FakeState()
    monkeypatch.setitem(sys.modules, "app.twin_state.internal_state", SimpleNamespace(twin_internal_state=fake))
    scheduler = scheduler_module.BrainScheduler()
    asyncio.run(scheduler._process_life_intention("u-low"))
    assert fake.state["energy_level"] == 0.2
    assert fake.state["last_life_intention"]["processed_at"]


def test_internal_state_outputs_consumes_list_contract(monkeypatch):
    state = TwinInternalState()

    class FakeMemory:
        async def get_engine_outputs(self, user_id, engine, limit=5):
            return [{"content": '[ENGINE:goal] {"goal":"ship"}'}]

    import sys
    monkeypatch.setitem(sys.modules, "app.memory.unified_memory", SimpleNamespace(unified_memory_engine=FakeMemory()))
    result = asyncio.run(state._outputs("u1", "goal", 5))
    assert result == [{"goal": "ship"}]


def test_life_intention_processing_fails_closed_when_state_save_fails(monkeypatch):
    from app.twin_state import brain_scheduler as scheduler_module

    class FakeState:
        def __init__(self):
            self.state = {
                "user_id": "u-fail", "mood": "unknown", "energy_level": 0.8,
                "curiosity": 0.5, "bond_depth": 0.0,
                "last_life_intention": {
                    "intention": "rest", "evidence": {},
                    "observed_at": "2026-09-25T20:00:00+00:00",
                    "intention_id": "i-fail",
                },
            }
        async def get_state(self, uid): return dict(self.state)
        async def _save_state(self, uid, state): return False

    fake = FakeState()
    monkeypatch.setitem(sys.modules, "app.twin_state.internal_state", SimpleNamespace(twin_internal_state=fake))
    scheduler = scheduler_module.BrainScheduler()
    try:
        asyncio.run(scheduler._process_life_intention("u-fail"))
    except RuntimeError as exc:
        assert "persistence_failed" in str(exc)
    else:
        raise AssertionError("processing must fail closed when persistence fails")
