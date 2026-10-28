"""S3 — Brain Evidence Integration.

Turns persisted lifecycle evidence into a deterministic, internal-only meaning
object. No LLM, speech, tool execution, random emotion, or user-visible action
is allowed in this layer.
"""
from __future__ import annotations

from typing import Any, Dict, List


_EVIDENCE_KEY_ALIASES = {
    "userPresent": "user_present",
    "batteryLow": "battery_low",
    "ambientLight": "ambient_light",
    "movement": "motion",
}


def normalize_evidence(evidence: Any) -> Dict[str, Any]:
    """Normalize boundary evidence into the backend canonical snake_case contract.

    The mobile existence loop may use JS/camelCase names. This is the single
    normalization boundary; the meaning layer itself only consumes canonical
    keys and never guesses alternate spellings.
    """
    if not isinstance(evidence, dict):
        return {}
    normalized = dict(evidence)
    for source, target in _EVIDENCE_KEY_ALIASES.items():
        if target not in normalized and source in evidence:
            normalized[target] = evidence[source]
        # Once normalized, do not retain the transport alias. This guarantees
        # semantically identical camelCase/snake_case evidence has one canonical
        # representation and therefore one retry fingerprint.
        normalized.pop(source, None)
    # batteryLow is a boolean threshold signal; preserve it as evidence without
    # pretending it is a numeric battery percentage.
    return normalized


def _clamp01(value: Any, default: float = 0.0) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(1.0, v))


def _num(value: Any) -> float | None:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if v == v else None


def derive_lifecycle_intention(evidence: Dict[str, Any], state: Dict[str, Any] | None = None) -> str:
    """Derive a non-executable lifecycle classification from normalized evidence.

    This is the canonical replacement for frontend lifecycle decision-making.
    It is deterministic, side-effect free, and returns data only; policy/action
    remains downstream of this classification.
    """
    state = state or {}
    ev = normalize_evidence(evidence)
    energy = _num(ev.get("energy"))
    if energy is None:
        energy = _num(state.get("energy_level"))
    should_rest = bool(ev.get("should_rest", False))
    battery_low = bool(ev.get("battery_low", False))
    battery = _num(ev.get("battery"))
    user_present = ev.get("user_present")
    if energy is not None and energy <= 0.25:
        return "rest"
    if should_rest and energy is not None and energy <= 0.40:
        return "rest"
    if battery_low or (battery is not None and battery <= 0.20):
        return "reduce_presence"
    if user_present is True:
        return "stay_present"
    return "observe"


def derive_meaning(life_intention: Dict[str, Any], state: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Derive a stable meaning object from evidence only.

    The same intention/evidence/state produces the same output. This function
    intentionally has no clock, randomness, model call, or side effect.
    """
    state = state or {}
    intention = str(life_intention.get("intention") or "").strip()
    evidence = normalize_evidence(life_intention.get("evidence"))
    causes: List[Dict[str, Any]] = []

    energy = _num(evidence.get("energy"))
    if energy is None:
        energy = _num(state.get("energy_level"))
    if energy is not None and energy <= 0.30:
        causes.append({"type": "energy_low", "value": round(_clamp01(energy, 0.5), 4), "confidence": 0.98})
    elif energy is not None and energy >= 0.80:
        causes.append({"type": "energy_high", "value": round(_clamp01(energy, 0.5), 4), "confidence": 0.95})

    battery = _num(evidence.get("battery"))
    if battery is not None and battery <= 0.20:
        causes.append({"type": "battery_low", "value": round(_clamp01(battery), 4), "confidence": 0.96})
    elif evidence.get("battery_low") is True:
        causes.append({"type": "battery_low", "value": True, "confidence": 0.96})

    if evidence.get("user_present") is False:
        causes.append({"type": "user_absent", "value": False, "confidence": 0.95})
    elif evidence.get("user_present") is True:
        causes.append({"type": "user_present", "value": True, "confidence": 0.95})

    ambient = _num(evidence.get("ambient_light"))
    if ambient is not None:
        if ambient <= 0.12:
            causes.append({"type": "low_light", "value": round(_clamp01(ambient), 4), "confidence": 0.90})
        elif ambient >= 0.85:
            causes.append({"type": "bright_environment", "value": round(_clamp01(ambient), 4), "confidence": 0.90})

    motion = _num(evidence.get("motion"))
    if motion is not None and motion >= 0.70:
        causes.append({"type": "high_motion", "value": round(_clamp01(motion), 4), "confidence": 0.88})

    # Intention itself is evidence too, but never an executable command here.
    causes.append({"type": "lifecycle_intention", "value": intention, "confidence": 1.0})

    implied_need = {
        "rest": "reduced_activity",
        "reduce_presence": "reduced_presence",
        "stay_present": "maintain_continuity",
        "observe": "observe_only",
    }.get(intention, "none")

    confidence = min((c["confidence"] for c in causes), default=0.0)
    return {
        "intention": intention,
        "causes": causes,
        "confidence": round(float(confidence), 4),
        "implied_need": implied_need,
        "internal_only": True,
        "intention_id": life_intention.get("intention_id"),
        "schema_version": "s3.0",
    }
