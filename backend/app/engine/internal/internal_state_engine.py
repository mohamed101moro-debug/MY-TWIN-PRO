"""
Internal State Engine v1.0 — الحالة الداخلية في الخلفية
==========================================================
الفضول، الثقة، الدافع، التوتر، التعلق — موحدة في مكان واحد.
"""
import logging
from typing import Dict
from datetime import datetime, timezone

logger = logging.getLogger("internal_state_engine")

class InternalStateEngine:
    def evaluate(self, emotion: str, bond_level: int, twin_energy: float) -> Dict:
        state = {
            "curiosity": 0.8 if emotion == "curious" else 0.4,
            "confidence": 0.3 + (bond_level / 200) + (twin_energy * 0.2),
            "motivation": 0.8 if emotion == "joy" else 0.3 if emotion == "sadness" else 0.5,
            "stress": 0.7 if emotion in ["fear", "anger"] else 0.3,
            "attachment": 0.2 + (bond_level / 100),
            "uncertainty": 0.6 if emotion == "fear" else 0.3,
            "satisfaction": 0.8 if bond_level > 60 else 0.5,
            "mood": emotion,
            "overall_energy": twin_energy,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        return state

internal_state_engine = InternalStateEngine()
logger.info("✅ Internal State Engine initialized")
