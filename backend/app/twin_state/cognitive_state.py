"""S5 — Canonical Cognitive State Contract.

One bounded, serializable representation of the Twin's persistent cognitive
state. It is a projection of authoritative backend state, not a second store.
No UI/device signal is interpreted here and no action is produced here.
"""
from __future__ import annotations
from typing import Any, Dict

SCHEMA_VERSION = "s5.0"


def _clamp01(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(1.0, number))


def build_cognitive_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Build the canonical cognitive snapshot from TwinInternalState only."""
    life = state.get("last_life_intention")
    life = life if isinstance(life, dict) else None
    meaning = life.get("meaning") if life else None
    continuity = {
        "revision": int(state.get("continuity_revision", 0) or 0),
        "schema_version": str(state.get("continuity_schema_version") or "s5.5"),
        "last_thought": str(state.get("last_thought") or "")[:1000],
        "last_thought_at": state.get("last_thought_at"),
        "last_experience_at": state.get("last_experience_at"),
        "pending_questions": [str(q)[:300] for q in (state.get("pending_questions") or [])][-5:],
        "cognitive_load": _clamp01(state.get("cognitive_load"), 0.0),
        "curiosity": _clamp01(state.get("curiosity"), 0.5),
    }
    return {
        "schema_version": SCHEMA_VERSION,
        "source": "twin_internal_state",
        "authoritative": True,
        "identity": {"user_id": str(state.get("user_id") or "")},
        "continuity": continuity,
        "affect": {
            "mood": str(state.get("mood") or "unknown"),
            "energy": _clamp01(state.get("energy_level"), 0.5),
            "bond_depth": _clamp01(state.get("bond_depth"), 0.0),
        },
        "life": {
            "intention": life,
            "meaning": meaning,
        },
    }
