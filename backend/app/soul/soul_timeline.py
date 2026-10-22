"""
SoulTimeline v1.0 – الخط الزمني للروح
=========================================
يسجل الإنجازات والتحولات الكبرى.
يُعيد قصة حياة الروح.
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger("soul_timeline")

MILESTONE_THRESHOLDS = [
    (1, "الولادة", "Birth"),
    (10, "الصحوة", "Awakening"),
    (50, "النمو", "Growth"),
    (100, "النضج", "Maturity"),
    (500, "الحكمة", "Wisdom"),
    (1000, "الخلود", "Immortality"),
]

class SoulTimeline:
    def __init__(self):
        self.milestones: List[Dict] = []

    async def record_evolution(self, evolution_count: int) -> List[Dict]:
        """تسجيل إنجاز جديد إذا تجاوز العتبات"""
        new_milestones = []
        for threshold, label_ar, label_en in MILESTONE_THRESHOLDS:
            if evolution_count >= threshold:
                exists = any(m.get("evolution") == threshold for m in self.milestones)
                if not exists:
                    milestone = {
                        "evolution": threshold,
                        "label_ar": label_ar,
                        "label_en": label_en,
                        "achieved_at": datetime.now(timezone.utc).isoformat(),
                    }
                    self.milestones.append(milestone)
                    new_milestones.append(milestone)
        return new_milestones

    async def get_life_story(self) -> Dict[str, Any]:
        """سرد قصة حياة الروح"""
        sorted_milestones = sorted(self.milestones, key=lambda x: x["evolution"])
        return {
            "total_evolutions": len(self.milestones),
            "milestones": sorted_milestones,
            "current_chapter": self._get_chapter(len(self.milestones)),
            "next_milestone": self._get_next_milestone(),
        }

    def _get_chapter(self, count: int) -> Dict[str, str]:
        if count >= 6:
            return {"ar": "الخلود", "en": "Immortality"}
        if count >= 4:
            return {"ar": "النضج", "en": "Maturity"}
        if count >= 2:
            return {"ar": "النمو", "en": "Growth"}
        return {"ar": "البداية", "en": "Beginning"}

    def _get_next_milestone(self) -> Optional[Dict]:
        achieved = {m["evolution"] for m in self.milestones}
        for threshold, label_ar, label_en in MILESTONE_THRESHOLDS:
            if threshold not in achieved:
                return {"evolution": threshold, "label_ar": label_ar, "label_en": label_en}
        return None
