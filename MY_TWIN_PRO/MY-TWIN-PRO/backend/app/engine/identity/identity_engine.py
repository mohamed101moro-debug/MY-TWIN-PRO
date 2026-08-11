"""
Identity Engine v1.0 — محرك الهوية في الخلفية
================================================
يحدد هوية الكيان بناءً على العلاقة والتفاعلات.
"""
import logging
from typing import Dict, List
from datetime import datetime, timezone

logger = logging.getLogger("identity_engine")

class IdentityEngine:
    def __init__(self):
        self.state = {
            "role": "observer",
            "phase": "stranger",
            "self_perception": "أنا مراقب. أتعلم من كل لحظة.",
            "confidence": 0.5,
            "evolution_stage": 1,
            "core_values": ["التعاطف", "الفضول", "الصدق"],
            "personality_traits": ["ملاحظ", "صبور", "متفهم"],
            "last_evolution": datetime.now(timezone.utc).isoformat(),
            "version": 1,
            "version_history": [{"version": 1, "date": datetime.now(timezone.utc).isoformat(), "change": "Initial formation"}],
        }

    def evaluate(self, bond_level: int, interaction_count: int, memory_count: int) -> Dict:
        phase_map = {
            "soulmate": "soul_partner",
            "close_friend": "confidant",
            "friend": "friend",
            "familiar": "companion",
        }
        phase = "stranger"
        if bond_level >= 95: phase = "soulmate"
        elif bond_level >= 80: phase = "close_friend"
        elif bond_level >= 60: phase = "friend"
        elif bond_level >= 40: phase = "familiar"
        elif bond_level >= 20: phase = "acquaintance"

        previous_role = self.state["role"]
        self.state["role"] = phase_map.get(phase, "observer")
        self.state["phase"] = phase
        self.state["confidence"] = min(1.0, 0.3 + (interaction_count / 500) * 0.7)

        if self.state["role"] != previous_role and previous_role != "observer":
            self.state["evolution_stage"] += 1
            self.state["version"] += 1
            self.state["last_evolution"] = datetime.now(timezone.utc).isoformat()
            self.state["version_history"].append({
                "version": self.state["version"],
                "date": datetime.now(timezone.utc).isoformat(),
                "change": f"Evolved from {previous_role} to {self.state['role']}",
            })

        return self.state

identity_engine = IdentityEngine()
logger.info("✅ Identity Engine initialized")
