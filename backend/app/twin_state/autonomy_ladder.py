"""Autonomy Ladder v1 — استقلالية متدرجة L0-L3 بسيادة إنسانية مطلقة (فيتو دائم)."""
import logging
from typing import Dict, Any, List
logger = logging.getLogger("autonomy_ladder")
LEVELS = {0: "كلام فقط", 1: "اقتراح", 2: "فعل داخلي محاكى", 3: "فعل خارجي بموافقة صريحة"}
async def _trust(user_id: str) -> float:
    from app.twin_state.event_store import get_timeline
    evs = await get_timeline(user_id, 100)
    conf = sum(1 for e in evs if e["type"] == "PredictionConfirmed")
    fail = sum(1 for e in evs if e["type"] == "PredictionFailed")
    return conf / max(1, conf + fail) if (conf + fail) else 0.5
async def _consents(user_id: str) -> Dict[str, bool]:
    from app.twin_state.event_store import get_timeline
    evs = await get_timeline(user_id, 100)
    c: Dict[str, bool] = {}
    for e in evs:
        if e["type"] in ("ConsentGranted", "ConsentRevoked"):
            c[(e.get("payload") or {}).get("scope", "")] = (e["type"] == "ConsentGranted")
    return c
async def level_for(user_id: str) -> Dict[str, Any]:
    try:
        from app.twin_state.internal_state import twin_internal_state as t
        st = await t.get_state(user_id); bond = float(st.get("bond_depth", 0.2) or 0.2)
    except Exception:
        bond = 0.2
    trust = await _trust(user_id); consents = await _consents(user_id)
    score = bond * 0.6 + trust * 0.4
    level = 0 if score < 0.3 else 1 if score < 0.55 else 2
    if consents.get("external"): level = 3
    return {"level": level, "label": LEVELS[level], "score": round(score, 2), "bond": round(bond, 2),
            "trust": round(trust, 2), "consents": consents,
            "sovereignty": "للإنسان فيتو دائم؛ L3 لا تُفتح إلا بموافقة صريحة قابلة للإلغاء."}
async def authorize(user_id: str, action_class: str) -> Dict[str, Any]:
    from app.twin_state.event_store import append_event
    info = await level_for(user_id)
    need = {"speak": 0, "suggest": 1, "internal": 2, "external": 3}.get(action_class, 3)
    allowed = info["level"] >= need
    if action_class == "external": allowed = bool(info["consents"].get("external"))
    await append_event(user_id, "AutonomyAudit", {"action": action_class, "allowed": allowed, "level": info["level"]})
    return {"allowed": allowed, "level": info["level"],
            "reason": "مستوى الاستقلالية كافٍ" if allowed else "يتطلب مستوى أعلى أو موافقة صريحة"}
async def set_consent(user_id: str, scope: str, granted: bool) -> Dict[str, Any]:
    from app.twin_state.event_store import append_event
    await append_event(user_id, "ConsentGranted" if granted else "ConsentRevoked", {"scope": scope})
    return {"scope": scope, "granted": granted}
async def audit(user_id: str) -> List[Dict[str, Any]]:
    from app.twin_state.event_store import get_timeline
    evs = await get_timeline(user_id, 100)
    return [e for e in evs if e["type"] == "AutonomyAudit"][:10]
