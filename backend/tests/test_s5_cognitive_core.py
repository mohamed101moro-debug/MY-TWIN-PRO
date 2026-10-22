from pathlib import Path
import ast
import json

ROOT = Path(__file__).resolve().parents[2]


def test_legacy_unified_chat_route_is_removed_from_production_tree():
    assert not (ROOT / "backend/app/api/routes/unified_chat.py").exists()
    registry = (ROOT / "backend/app/api/routes/__init__.py").read_text()
    assert "unified_chat" not in registry
    flags = (ROOT / "backend/app/core/release_flags.py").read_text()
    assert "unified_chat" not in flags


def test_frontend_chat_uses_single_canonical_endpoint():
    bridge = (ROOT / "src/core/UnifiedBrainBridge.ts").read_text()
    assert "apiPost('/api/chat'" in bridge
    assert "/api/v2/chat" not in bridge


def test_frontend_lifecycle_reports_evidence_not_intention():
    existence = (ROOT / "src/core/ExistenceLoop.ts").read_text()
    life_bridge = (ROOT / "src/core/LifeIntentionBridge.ts").read_text()
    assert "LIFE_EVIDENCE" in existence
    assert "LIFE_INTENTION" not in existence
    assert "intention:" not in existence
    assert "LIFE_EVIDENCE" in life_bridge


def test_backend_has_deterministic_lifecycle_classifier():
    path = ROOT / "backend/app/twin_state/brain_evidence.py"
    tree = ast.parse(path.read_text())
    names = {n.name for n in tree.body if isinstance(n, ast.FunctionDef)}
    assert "derive_lifecycle_intention" in names
    assert "derive_meaning" in names


def test_lifecycle_classifier_is_deterministic_and_evidence_driven():
    from app.twin_state.brain_evidence import derive_lifecycle_intention
    evidence = {"energy": 0.18, "should_rest": True, "battery_low": False, "user_present": True}
    assert derive_lifecycle_intention(evidence) == "rest"
    assert derive_lifecycle_intention(evidence) == derive_lifecycle_intention(dict(evidence))
    assert derive_lifecycle_intention({"battery_low": True, "user_present": True}) == "reduce_presence"
    assert derive_lifecycle_intention({"user_present": True, "energy": 0.7}) == "stay_present"
    assert derive_lifecycle_intention({"user_present": False, "energy": 0.7}) == "observe"


def test_canonical_cognitive_state_contract_is_integrated():
    contract = ROOT / "backend/app/twin_state/cognitive_state.py"
    assert contract.exists()
    internal = (ROOT / "backend/app/twin_state/internal_state.py").read_text()
    brain = (ROOT / "backend/app/twin_brain/unified_brain.py").read_text()
    route = (ROOT / "backend/app/api/routes/twin_state_routes.py").read_text()
    assert "get_cognitive_state" in internal
    assert "cognitive_state" in brain
    assert "cognitive_state" in route


def test_twin_state_identity_is_not_taken_from_query_string():
    route = (ROOT / "backend/app/api/routes/twin_state_routes.py").read_text()
    assert "Depends(get_current_user_id)" in route
    assert "user_id: str = Query(...)" not in route


def test_unconsented_sensor_collection_is_not_started_automatically():
    bridge = (ROOT / "src/core/PresenceBridge.ts").read_text()
    voice = (ROOT / "engine/voice/VoiceEngine.ts").read_text()
    config = json.loads((ROOT / "app.json").read_text())["expo"]
    permissions = set(config.get("android", {}).get("permissions", []))
    assert "PresenceClient" not in bridge and "SensorBridge" not in bridge
    assert "Audio.Recording" not in voice and "startListening" not in voice
    assert not permissions.intersection({"CAMERA", "RECORD_AUDIO", "BODY_SENSORS", "ACTIVITY_RECOGNITION", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"})
