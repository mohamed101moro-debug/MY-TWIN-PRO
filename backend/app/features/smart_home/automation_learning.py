"""
AUTOMATION LEARNING v1.0 – محرك التعلم التلقائي
===================================================
يتعلم سلوك المستخدم ويقترح أتمتة ذكية.
يستخدم AI لفهم الأنماط بدلاً من العد الثابت.
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger("automation_learning")

class AutomationLearning:
    def __init__(self):
        self.ai_route = None
        self.action_log: Dict[str, List[Dict]] = {}

    def log_action(self, user_id: str, action: str, device: str, time: str = None):
        if user_id not in self.action_log:
            self.action_log[user_id] = []
        self.action_log[user_id].append({
            "action": action, "device": device,
            "time": time or datetime.now(timezone.utc).isoformat(),
        })

    async def learn_patterns(self, user_id: str, lang: str = "ar") -> List[Dict]:
        """تعلم الأنماط باستخدام AI"""
        actions = self.action_log.get(user_id, [])
        if len(actions) < 2:
            return []

        # تحليل بالذكاء الاصطناعي
        if self.ai_route:
            try:
                history = "\n".join([f"{a['action']} {a['device']} at {a['time']}" for a in actions[-20:]])
                prompt = f"""حلل سجل إجراءات المنزل الذكي التالي واكتشف أنماطاً متكررة:
{history}
اقترح أتمتة واحدة فقط (إن وجدت). اللغة: {lang}. أجب باقتراح واحد فقط."""
                text, _ = await self.ai_route(prompt, task="general")
                if text and "لا يوجد" not in text:
                    return [{"suggestion": text.strip(), "source": "ai"}]
            except: pass

        # تحليل بسيط (احتياطي)
        action_counts = {}
        for a in actions:
            try:
                hour = datetime.fromisoformat(a["time"]).hour
                key = f"{a['action']}_{a['device']}_{hour}"
                action_counts[key] = action_counts.get(key, 0) + 1
            except: pass

        patterns = []
        for key, count in action_counts.items():
            if count >= 3:
                action, device, hour = key.split("_")
                patterns.append({
                    "action": action, "device": device, "hour": int(hour),
                    "suggestion": f"هل تريد أتمتة {action} لـ {device} يومياً الساعة {hour}:00؟",
                    "source": "statistical",
                })
        return patterns


automation_learning = AutomationLearning()
