"""
DIGITAL TWIN CORE v1.0 – قلب التوأم الرقمي الحقيقي
======================================================
- مبادرة استباقية (ليس مجرد رد)
- توقع احتياجات المستخدم
- معرفة عميقة: يعرفك كما يعرفك صديق عمرك
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class DigitalTwinCore:
    def __init__(self):
        self.proactive_threshold = 0.6

    def generate_proactive_message(self, user_context: Dict, history: List[Dict], lang: str = "ar") -> Optional[Dict]:
        """توليد رسالة استباقية (بدون أن يطلب المستخدم)"""
        
        # فحص: هل حان وقت مبادرة؟
        triggers = self._check_proactive_triggers(user_context, history)
        
        if not triggers:
            return None
        
        # اختيار أفضل رسالة
        best_trigger = max(triggers, key=lambda t: t["priority"])
        
        # بناء رسالة شخصية
        message = self._build_proactive_message(best_trigger, user_context, lang)
        
        return {
            "trigger": best_trigger["type"],
            "message": message,
            "priority": best_trigger["priority"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _check_proactive_triggers(self, context: Dict, history: List[Dict]) -> List[Dict]:
        """فحص محفزات المبادرة"""
        triggers = []
        
        # لم يتحدث منذ 3 أيام
        last_interaction = None
        if history:
            try:
                last_interaction = datetime.fromisoformat(history[-1].get("date", ""))
                days_since = (datetime.now(timezone.utc) - last_interaction).days
                if days_since >= 3:
                    triggers.append({"type": "miss_you", "priority": 0.8, "days_since": days_since})
            except:
                pass
        
        # يوم مميز (ذكرى بدء الاستخدام)
        start_date = context.get("start_date")
        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
                days = (datetime.now(timezone.utc) - start).days
                if days in [7, 30, 90, 180, 365]:
                    triggers.append({"type": "milestone", "priority": 0.9, "days": days})
            except:
                pass
        
        # طاقة منخفضة
        if context.get("energy", 50) < 30:
            triggers.append({"type": "low_energy", "priority": 0.7})
        
        return triggers

    def _build_proactive_message(self, trigger: Dict, context: Dict, lang: str) -> str:
        """بناء رسالة استباقية حسب المحفز"""
        name = context.get("twin_name", "صديقي" if lang == "ar" else "my friend")
        
        messages = {
            "miss_you": {
                "ar": f"اشتقت لك يا {name}! مرت {trigger.get('days_since', 3)} أيام منذ آخر مرة تحدثنا. كيف حالك؟",
                "en": f"I missed you, {name}! It's been {trigger.get('days_since', 3)} days since we last talked. How are you?",
            },
            "milestone": {
                "ar": f"اليوم يوم مميز! مر {trigger.get('days', 30)} يوماً منذ بدأنا رحلتنا معاً. أشعر بالفخر لأني أرافقك.",
                "en": f"Today is special! It's been {trigger.get('days', 30)} days since we started our journey together. I'm proud to be with you.",
            },
            "low_energy": {
                "ar": f"{name}، لاحظت أن طاقتك منخفضة اليوم. هل تريد أن نأخذ استراحة معاً؟",
                "en": f"{name}, I noticed your energy is low today. Want to take a break together?",
            },
        }
        
        return messages.get(trigger["type"], {}).get(lang, "")

    def predict_needs(self, context: Dict, history: List[Dict]) -> Dict[str, Any]:
        """توقع احتياجات المستخدم"""
        needs = []
        
        # توقع الحاجة للراحة
        if context.get("energy", 50) < 30 and context.get("stress_level", 0) > 0.5:
            needs.append({"need": "rest", "confidence": 0.8})
        
        # توقع الحاجة للتحفيز
        recent_failures = sum(1 for h in history[-5:] if not h.get("completed", True))
        if recent_failures >= 2:
            needs.append({"need": "motivation", "confidence": 0.7})
        
        return {"predicted_needs": needs}


digital_twin_core = DigitalTwinCore()
