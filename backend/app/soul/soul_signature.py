"""
SoulSignature v1.0 – البصمة الفريدة
=======================================
بصمة رقمية فريدة تتغير مع تطور الروح.
تُستخدم للتعرف على التوأم ومقارنة الأرواح.
"""
import logging
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger("soul_signature")

class SoulSignature:
    def __init__(self):
        self.base_seed = "soul_sync_my_twin"

    async def generate(
        self,
        user_id: str,
        values: List[str],
        traits: List[str],
        role: str,
        harmony: float,
        evolution_count: int,
    ) -> str:
        """توليد بصمة فريدة من مكونات الروح"""
        raw = (
            f"{self.base_seed}:{user_id}:"
            f"{','.join(sorted(values))}:"
            f"{','.join(sorted(traits))}:"
            f"{role}:{harmony:.2f}:{evolution_count}"
        )
        fingerprint = hashlib.sha256(raw.encode()).hexdigest()[:32]
        return fingerprint

    async def compare(
        self, sig1: str, sig2: str
    ) -> float:
        """مقارنة بصمتين (للتوافق بين المستخدمين)"""
        if not sig1 or not sig2:
            return 0.0
        matches = sum(1 for a, b in zip(sig1, sig2) if a == b)
        return matches / max(len(sig1), len(sig2))

    async def get_uniqueness_score(self, fingerprint: str) -> float:
        """تقييم مدى تفرد البصمة (بناءً على توزيع الأحرف)"""
        if not fingerprint:
            return 0.0
        unique_chars = len(set(fingerprint))
        return min(1.0, unique_chars / 16)
