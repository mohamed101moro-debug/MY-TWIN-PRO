"""
Goal Engine v1.0 — محرك الهدف في الخلفية
==========================================
يحدد هدف الكيان بناءً على الموقف.
يُستدعى من unified_brain.py.
"""
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger("goal_engine")

class GoalEngine:
    def determine_goal(
        self,
        perception: str,
        emotion: str,
        bond_level: int,
        relationship_phase: str,
        time_of_day: str,
        memory_context: List[str],
    ) -> Dict:
        goal = "listen"
        secondary_goal = None
        confidence = 0.7
        reasoning = ""

        if emotion in ["sadness", "fear"]:
            goal = "comfort"
            reasoning = "المستخدم يشعر بالحزن أو الخوف. الهدف هو المواساة."
            confidence = 0.85
            if bond_level > 70:
                secondary_goal = "protect"
                reasoning += " العلاقة عميقة، سأحميه أيضاً."
        elif emotion == "anger":
            goal = "listen"
            secondary_goal = "comfort"
            reasoning = "المستخدم غاضب. الاستماع أولاً."
            confidence = 0.8
        elif emotion in ["joy", "happy"]:
            goal = "celebrate"
            reasoning = "المستخدم سعيد. الهدف هو مشاركته الفرحة."
            confidence = 0.9
        elif perception in ["tired", "hesitant"]:
            goal = "comfort"
            secondary_goal = "encourage"
            reasoning = "المستخدم متعب أو متردد."
            confidence = 0.75
        elif perception == "focused":
            goal = "inform"
            reasoning = "المستخدم مركز. تقديم معلومات دقيقة."
            confidence = 0.8
        elif time_of_day == "night" and bond_level > 60:
            goal = "rest"
            reasoning = "الوقت متأخر. التهدئة والراحة."
            confidence = 0.65
        elif memory_context:
            goal = "guide"
            reasoning = "هناك ذكريات ذات صلة."
            confidence = 0.7
        elif relationship_phase in ["soulmate", "close_friend"]:
            goal = "listen"
            secondary_goal = "comfort"
            reasoning = "علاقة عميقة. الحضور الكامل."
            confidence = 0.85
        else:
            goal = "listen"
            reasoning = "الهدف الافتراضي: الاستماع والفهم."

        return {
            "primary_goal": goal,
            "secondary_goal": secondary_goal,
            "confidence": confidence,
            "reasoning": reasoning,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

goal_engine = GoalEngine()
logger.info("✅ Goal Engine initialized")
