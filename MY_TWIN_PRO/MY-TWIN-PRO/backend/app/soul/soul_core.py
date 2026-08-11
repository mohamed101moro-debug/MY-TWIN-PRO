"""
SoulCore v1.0 – جوهر الروح (الدور والهوية)
=============================================
يحدد دور التوأم ومرحلة وعيه بناءً على العلاقة والتفاعلات.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("soul_core")

ROLE_MAP = {
    "soulmate": "soul_partner",
    "trusted_companion": "protector",
    "close_friend": "confidant",
    "friend": "companion",
    "familiar": "explorer",
    "stranger": "observer",
}

ROLE_LABELS = {
    "soul_partner": {"ar": "رفيق الروح", "en": "Soul Partner"},
    "protector": {"ar": "الحامي", "en": "Protector"},
    "confidant": {"ar": "المقرب", "en": "Confidant"},
    "companion": {"ar": "الرفيق", "en": "Companion"},
    "explorer": {"ar": "المستكشف", "en": "Explorer"},
    "observer": {"ar": "المراقب", "en": "Observer"},
}

class SoulCore:
    def __init__(self):
        self.default_role = "observer"

    async def get_role(self, relationship_stage: str) -> str:
        """يُحدد دور الروح بناءً على مرحلة العلاقة"""
        return ROLE_MAP.get(relationship_stage, self.default_role)

    def get_labels(self, role: str) -> Dict[str, str]:
        """يُعيد التسميات العربية والإنجليزية للدور"""
        return ROLE_LABELS.get(role, ROLE_LABELS["observer"])

    async def evolve_phase(
        self,
        current_role: str,
        bond_level: int,
        interaction_count: int,
    ) -> str:
        """تطوير مرحلة الروح بناءً على مستوى الرابطة والتفاعلات"""
        if bond_level >= 95 and interaction_count > 500:
            return "soul_partner"
        if bond_level >= 80 and interaction_count > 200:
            return "protector"
        if bond_level >= 60 and interaction_count > 100:
            return "confidant"
        if bond_level >= 40 and interaction_count > 50:
            return "companion"
        if bond_level >= 20:
            return "explorer"
        return "observer"
