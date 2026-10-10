import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.twin_state.brain_evidence import derive_meaning


def test_rest_meaning_is_deterministic_and_internal_only():
    raw = {"intention_id": "i-1", "intention": "rest", "evidence": {"energy": 0.18}}
    a = derive_meaning(raw, {"energy_level": 0.18})
    b = derive_meaning(raw, {"energy_level": 0.18})
    assert a == b
    assert a["implied_need"] == "reduced_activity"
    assert a["internal_only"] is True
    assert any(c["type"] == "energy_low" for c in a["causes"])


def test_meaning_does_not_create_action_or_speech():
    meaning = derive_meaning({"intention": "stay_present", "evidence": {"user_present": True}})
    assert "action" not in meaning
    assert "reply" not in meaning
    assert "speech" not in meaning
    assert meaning["implied_need"] == "maintain_continuity"


def test_meaning_is_evidence_based_not_random():
    raw = {"intention": "observe", "evidence": {"ambient_light": 0.05, "motion": 0.8}}
    meaning = derive_meaning(raw)
    assert [c["type"] for c in meaning["causes"]] == ["low_light", "high_motion", "lifecycle_intention"]


def test_scheduler_persists_meaning_with_processed_intention(monkeypatch):
    import asyncio
    from types import SimpleNamespace
    import app.twin_state.brain_scheduler as scheduler_module

    class FakeState:
        def __init__(self):
            self.state = {
                "energy_level": 0.18,
                "last_life_intention": {
                    "intention_id": "i-meaning",
                    "intention": "rest",
                    "evidence": {"energy": 0.18},
                },
            }

        async def get_state(self, uid):
            return self.state

        async def _save_state(self, uid, state):
            self.state = state
            return True

    fake = FakeState()
    monkeypatch.setattr(scheduler_module, "twin_internal_state", fake, raising=False)
    # _process_life_intention imports the singleton locally, so patch the module it imports.
    import app.twin_state.internal_state as internal_state_module
    monkeypatch.setattr(internal_state_module, "twin_internal_state", fake)
    scheduler = scheduler_module.BrainScheduler()
    asyncio.run(scheduler._process_life_intention("u-meaning"))
    meaning = fake.state["last_life_intention"]["meaning"]
    assert meaning["intention_id"] == "i-meaning"
    assert meaning["internal_only"] is True
    assert meaning["implied_need"] == "reduced_activity"
    assert fake.state["last_life_intention"]["processed_at"]


def test_mobile_camel_case_evidence_is_normalized_and_interpreted():
    raw = {
        "intention": "reduce_presence",
        "evidence": {
            "userPresent": True,
            "batteryLow": True,
            "ambientLight": 0.05,
            "movement": 0.8,
        },
    }
    meaning = derive_meaning(raw)
    types = [c["type"] for c in meaning["causes"]]
    assert types == ["battery_low", "user_present", "low_light", "high_motion", "lifecycle_intention"]


def test_save_life_intention_derives_meaning_before_persistence(monkeypatch):
    import asyncio
    from app.twin_state.internal_state import TwinInternalState

    obj = TwinInternalState()
    state = {"energy_level": 0.5, "mood": "unknown"}
    saved = {}

    async def fake_get(uid):
        return dict(state)

    async def fake_commit(uid, canonical):
        saved["last_life_intention"] = canonical
        return canonical

    monkeypatch.setattr(obj, "get_state", fake_get)
    monkeypatch.setattr(obj, "_atomic_commit_life_intention", fake_commit)
    result = asyncio.run(obj.save_life_intention("u-immediate", {
        "intention_id": "i-immediate",
        "intention": "observe",
        "evidence": {"ambientLight": 0.05, "movement": 0.8},
    }))

    assert result["meaning"]["causes"][0]["type"] == "low_light"
    assert result["meaning"]["causes"][1]["type"] == "high_motion"
    assert result["evidence"]["ambient_light"] == 0.05
    assert result["evidence"]["motion"] == 0.8
    assert saved["last_life_intention"]["meaning"]["internal_only"] is True


def test_presence_binding_carries_authoritative_meaning():
    from app.twin_state.presence_binding import build_presence_binding
    state = {
        "energy_level": 0.22,
        "mood": "unknown",
        "last_life_intention": {
            "intention": "rest",
            "meaning": {"implied_need": "reduced_activity", "internal_only": True},
        },
    }
    binding = build_presence_binding(state)
    assert binding["authoritative"] is True
    assert binding["energy"] == 0.22
    assert binding["brain_meaning"]["implied_need"] == "reduced_activity"
    assert binding["mood"] == "unknown"
