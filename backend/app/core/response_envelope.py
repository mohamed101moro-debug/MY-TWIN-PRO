"""Response Envelope v3 — عقد موحّد بين العقل الخلفي وطبقة الحضور."""
from datetime import datetime, timezone
from typing import Dict, Any

def build_envelope(brain: Dict[str, Any], request_id: str) -> Dict[str, Any]:
    emotion = str(brain.get("emotion", "neutral") or "neutral")
    intensity = max(0.0, min(1.0, float(brain.get("intensity", 0.5) or 0.5)))
    bond = max(0, int(brain.get("bond_level", 0) or 0))
    surfaced = brain.get("memory_surfaced")
    level = max(0, min(9, round(2 + intensity * 4 + (2 if surfaced else 0) + (1 if bond > 60 else 0))))
    updated_at = int(datetime.now(timezone.utc).timestamp() * 1000)
    env = dict(brain)
    env.update({
        "emotion": emotion,
        "emotion_meta": {"primaryEmotion": emotion, "intensity": intensity, "source": "unified_brain", "updatedAt": updated_at},
        "presence_state": {"emotion": emotion, "intensity": intensity, "level": level},
        "twin_emotional_state": {"current_emotion": emotion, "intensity": intensity, "confidence": 0.8, "source": "unified_brain", "updatedAt": updated_at},
        "twin_state_update": {"relationship": {"bond_level": bond, "trust": min(100, 50 + bond / 2)}, "personality_dna": brain.get("personality_dna", {}), "energy": brain.get("energy")},
        "expression_intent": brain.get("expression_intent", {"breath": "normal", "smile": 0.0, "pause": 0.0, "concern": 0.0}),
        "life_observation": brain.get("life_observation"), "request_id": request_id, "timestamp": updated_at,
    })
    return env
