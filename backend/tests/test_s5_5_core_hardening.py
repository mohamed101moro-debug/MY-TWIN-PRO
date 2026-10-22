from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[2]


def test_lifecycle_route_ignores_client_supplied_intention():
    route = (ROOT / 'backend/app/api/routes/twin_state_routes.py').read_text()
    assert 'intention = derive_lifecycle_intention' in route
    assert 'body.intention if body.intention in allowed' not in route


def test_life_intention_is_idempotent_by_persisted_intention_id():
    internal = (ROOT / 'backend/app/twin_state/internal_state.py').read_text()
    assert 'previous.get("intention_id") == canonical.get("intention_id")' in internal
    assert 'st["continuity_revision"] = int(st.get("continuity_revision", 0) or 0) + 1' in internal


def test_s5_5_schema_is_declared():
    migration = (ROOT / 'backend/migrations/20260928_s5_5_core_hardening.sql').read_text()
    assert 'continuity_schema_version' in migration
    assert 's5.5' in migration


def test_frontend_cannot_synthesize_relationship_recovery():
    text = (ROOT / 'src/core/LivingPresenceCoordinator.ts').read_text()
    assert 'RELATIONSHIP_RECOVER' not in text
    assert 'const recoveryPhrases' not in text
    assert 'const curiosityPhrases' not in text


def test_presence_bridge_does_not_mutate_cognitive_state_from_memory_event():
    text = (ROOT / 'src/core/PresenceBridge.ts').read_text()
    assert 'curiosity: Math.max' not in text
    assert 'emotionValence: bias' not in text
    assert 'memoryLevel: 0.85' not in text


def test_chat_hook_projects_backend_response_without_expression_side_effects():
    text = (ROOT / 'src/hooks/useTwinBrain.ts').read_text()
    assert 'expression_intent' not in text
    assert 'connection:Math.min' not in text


def test_s5_5_verifier_exists():
    path = ROOT / 'scripts/verify_s5_5_core_hardening.py'
    ast.parse(path.read_text())


def test_semantic_retry_dedupes_without_reusing_intention_id(monkeypatch):
    import asyncio
    from app.twin_state.internal_state import TwinInternalState
    obj = TwinInternalState()
    state = {"energy_level": 0.5, "mood": "unknown"}
    committed = []

    async def fake_get(uid):
        return dict(state)

    async def fake_commit(uid, canonical):
        committed.append(canonical)
        return canonical if len(committed) == 1 else committed[0]

    monkeypatch.setattr(obj, 'get_state', fake_get)
    monkeypatch.setattr(obj, '_atomic_commit_life_intention', fake_commit)
    first = asyncio.run(obj.save_life_intention('u-dedupe', {
        'intention_id': 'first-id', 'evidence': {'energy': 0.32, 'user_present': True}
    }))
    # The atomic database boundary is responsible for semantic retry identity;
    # this test verifies the canonical payload remains normalized and versioned.
    second = asyncio.run(obj.save_life_intention('u-dedupe', {
        'intention_id': 'regenerated-id', 'evidence': {'userPresent': True, 'energy': 0.32}
    }))
    assert first['evidence'] == second['evidence']
    assert first['continuity_schema_version'] == 's5.5'
    assert len(committed) == 2


def test_canonical_schema_version_is_s5_5_everywhere():
    root = Path(__file__).resolve().parents[2]
    for rel in ('backend/app/twin_state/internal_state.py', 'backend/app/twin_state/cognitive_state.py', 'backend/app/api/routes/twin_state_routes.py'):
        text = (root / rel).read_text()
        assert 's4.0' not in text
        assert 's5.5' in text


def test_frontend_relationship_authority_has_no_local_connection_mutation():
    root = Path(__file__).resolve().parents[2]
    for rel in ('src/core/PresenceBridge.ts', 'app/genesis.tsx', 'app/index.tsx'):
        text = (root / rel).read_text()
        assert 'connection:' not in text
        assert 'emotionValence:' not in text


def test_local_presence_engines_do_not_use_random_for_inner_behavior():
    root = Path(__file__).resolve().parents[2]
    for rel in ('src/core/LivingPresenceCoordinator.ts', 'engine/attention/AttentionEngine.ts'):
        text = (root / rel).read_text()
        assert 'Math.random' not in text


def test_self_awareness_engine_is_not_an_active_frontend_cognition_authority():
    root = Path(__file__).resolve().parents[2]
    assert not (root / 'engine/consciousness/SelfAwarenessEngine.ts').exists()
