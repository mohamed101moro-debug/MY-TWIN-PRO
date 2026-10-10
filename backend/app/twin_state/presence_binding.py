"""S3P — minimal presence binding contract.

Backend owns truth; the mobile renderer consumes this state. No UI decision or
sensor-to-tool path is created here.
"""
from typing import Any, Dict


def build_presence_binding(state: Dict[str, Any]) -> Dict[str, Any]:
    energy = max(0.0, min(1.0, float(state.get("energy_level", 0.5))))
    mood = str(state.get("mood", "unknown"))
    if mood.lower() == "unknown":
        mood = "unknown"
    life_intention = state.get("last_life_intention")
    return {
        "energy": energy,
        "mood": mood,
        "life_intention": life_intention,
        "brain_meaning": (life_intention or {}).get("meaning") if isinstance(life_intention, dict) else None,
        "source": "backend_internal_state",
        "authoritative": True,
        "schema_version": "s3p.1",
    }
