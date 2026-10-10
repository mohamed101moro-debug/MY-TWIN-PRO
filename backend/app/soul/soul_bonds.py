"""
SoulBonds v1.0 – روابط الأرواح
===================================
يدير الروابط بين المستخدمين (Twin Plus).
يُقارن البصمات ويقيس التوافق.
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger("soul_bonds")

class SoulBonds:
    def __init__(self):
        self.bonds: Dict[str, List[Dict]] = {}

    async def create_bond(
        self,
        user_id: str,
        partner_id: str,
        compatibility: float,
        shared_interests: List[str],
    ) -> Dict[str, Any]:
        """إنشاء رابط جديد بين روحين"""
        bond = {
            "partner_id": partner_id,
            "compatibility": round(compatibility, 2),
            "shared_interests": shared_interests,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "strength": 0.1,
            "interactions": 0,
        }
        if user_id not in self.bonds:
            self.bonds[user_id] = []
        self.bonds[user_id].append(bond)
        return bond

    async def get_bonds(self, user_id: str) -> List[Dict]:
        """استرجاع كل روابط المستخدم"""
        return self.bonds.get(user_id, [])

    async def get_bond_strength(
        self,
        user_id: str,
        partner_id: str,
    ) -> float:
        """حساب قوة رابط معين"""
        bonds = self.bonds.get(user_id, [])
        for bond in bonds:
            if bond["partner_id"] == partner_id:
                base = bond["compatibility"] * 0.6
                interaction_bonus = min(0.4, bond["interactions"] * 0.01)
                return base + interaction_bonus
        return 0.0

    async def strengthen_bond(
        self,
        user_id: str,
        partner_id: str,
    ) -> Optional[Dict]:
        """تقوية رابط بعد تفاعل"""
        bonds = self.bonds.get(user_id, [])
        for bond in bonds:
            if bond["partner_id"] == partner_id:
                bond["interactions"] += 1
                bond["strength"] = await self.get_bond_strength(user_id, partner_id)
                return bond
        return None
