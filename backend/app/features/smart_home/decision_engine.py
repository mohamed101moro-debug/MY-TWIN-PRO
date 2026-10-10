"""
DECISION ENGINE v1.0 – محرك القرار البيئي
=============================================
يقرر: هل نشغل؟ هل ننتظر؟ هل نسأل؟ هل نتوقع؟
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("decision_engine")

class DecisionEngine:
    def __init__(self):
        self.ai_route = None

    async def decide(self, environment: Dict, user_context: Dict, command: str = "", lang: str = "ar") -> Dict[str, Any]:
        """اتخاذ قرار بشأن البيئة"""
        outdoor = environment.get("outdoor", {})
        rooms = environment.get("rooms", {})
        emotion = user_context.get("emotion", "neutral")
        
        decisions = []

        # قاعدة: إذا كان الجو حاراً (>35) والمستخدم في البيت → شغل المكيف
        if outdoor.get("weather", {}).get("temperature", 25) > 35:
            for room_name, room in rooms.items():
                if room.get("occupancy") and not self._device_on(room, "climate"):
                    decisions.append({
                        "action": "turn_on_climate",
                        "room": room_name,
                        "reason": f"درجة الحرارة {outdoor['weather']['temperature']}° مرتفعة",
                        "confidence": 90,
                        "ask_user": True,
                    })

        # قاعدة: إذا كانت الساعة بعد 11 مساءً والأنوار شغالة → أطفئ أو اسأل
        if outdoor.get("hour", 12) >= 23:
            for room_name, room in rooms.items():
                if room.get("lighting") == "on":
                    decisions.append({
                        "action": "dim_lights",
                        "room": room_name,
                        "reason": "وقت متأخر",
                        "confidence": 85,
                        "ask_user": True,
                    })

        # قاعدة: إذا كان المستخدم حزيناً → إضاءة دافئة
        if emotion in ["sadness", "fear", "anxiety"]:
            decisions.append({
                "action": "set_warm_lighting",
                "room": "living_room",
                "reason": f"المستخدم يشعر بـ {emotion}",
                "confidence": 75,
                "ask_user": False,
            })

        # استخدام AI للقرارات المعقدة
        if not decisions and command and self.ai_route:
            try:
                prompt = f"""بيئة المنزل: {environment}. أمر المستخدم: "{command}". اقترح إجراءً واحداً مناسباً. اللغة: {lang}."""
                text, _ = await self.ai_route(prompt, task="general")
                decisions.append({"action": "ai_suggested", "ai_response": text, "confidence": 60})
            except: pass

        return {
            "decisions": decisions[:3],
            "should_act": len(decisions) > 0,
            "should_ask": any(d.get("ask_user") for d in decisions),
        }

    def _device_on(self, room: Dict, device_type: str) -> bool:
        for device in room.get("devices", []):
            if device.get("type") == device_type and device.get("state") == "on":
                return True
        return False


decision_engine = DecisionEngine()
