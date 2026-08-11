"""
Decision Engine v1.0 — محرك القرار في الخلفية
================================================
يتخذ القرار بناءً على الهدف والهوية والعاطفة.
يُستدعى من unified_brain.py.
"""
import logging
from typing import Dict
from datetime import datetime, timezone

logger = logging.getLogger("decision_engine")

class DecisionEngine:
    def decide(
        self,
        goal: str,
        identity_role: str,
        bond_level: int,
        emotion: str,
        emotion_intensity: float,
        perception: str,
        time_of_day: str,
    ) -> Dict:
        decision = "listen"
        confidence = 0.7
        should_act = True
        urgency = "normal"
        reasoning = ""

        if goal == "comfort":
            if identity_role in ["soul_partner", "protector"]:
                decision = "protect"
                urgency = "immediate"
                reasoning = "أنا قريب جداً منه. سأحميه أولاً."
            elif bond_level > 80:
                decision = "comfort"
                urgency = "immediate"
                reasoning = "علاقتنا عميقة. المواساة ضرورية."
            else:
                decision = "comfort"
                urgency = "normal"
                reasoning = "سأواسيه بلطف."
        elif goal == "celebrate":
            decision = "celebrate"
            urgency = "immediate"
            reasoning = "لحظة فرح تستحق الاحتفال."
        elif goal == "listen":
            if emotion_intensity > 0.8 and bond_level > 70:
                decision = "stay_silent"
                urgency = "immediate"
                reasoning = "المشاعر قوية. الصمت أفضل."
                should_act = False
            else:
                decision = "listen"
                urgency = "normal"
                reasoning = "سأستمع باهتمام."
        elif goal == "protect":
            decision = "protect"
            urgency = "immediate"
            reasoning = "حمايته هي الأولوية."
        elif goal == "guide":
            if identity_role in ["soul_partner", "confidant"]:
                decision = "reflect"
                urgency = "normal"
                reasoning = "سأتأمل معه."
            else:
                decision = "guide"
                urgency = "normal"
                reasoning = "سأرشده."
        elif goal == "rest":
            decision = "wait"
            urgency = "low"
            should_act = False
            reasoning = "وقت الراحة."
        elif time_of_day == "night" and perception == "tired":
            decision = "wait"
            urgency = "low"
            should_act = False
            reasoning = "المستخدم متعب والوقت متأخر."
        else:
            decision = "observe"
            urgency = "low"
            should_act = False
            reasoning = "سأراقب بهدوء."

        return {
            "decision": decision,
            "confidence": confidence,
            "reasoning": reasoning,
            "should_act": should_act,
            "urgency": urgency,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

decision_engine = DecisionEngine()
logger.info("✅ Decision Engine initialized")
