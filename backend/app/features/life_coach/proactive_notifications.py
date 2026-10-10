"""
PROACTIVE NOTIFICATIONS v1.0 – ربط الرسائل الاستباقية بالإشعارات
==================================================================
- يأخذ رسائل Digital Twin Core
- يرسلها عبر OneSignal
- يعمل بشكل دوري (يمكن استدعاؤه من Scheduler)
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ProactiveNotifications:
    def __init__(self):
        self.onesignal_app_id = None
        self.onesignal_api_key = None
        self._load_credentials()

    def _load_credentials(self):
        """تحميل بيانات اعتماد OneSignal من البيئة"""
        import os
        self.onesignal_app_id = os.getenv("ONESIGNAL_APP_ID")
        self.onesignal_api_key = os.getenv("ONESIGNAL_API_KEY")

    async def send_proactive_message(self, user_id: str, message: str, data: Dict = None) -> bool:
        """إرسال إشعار استباقي للمستخدم"""
        if not self.onesignal_app_id or not self.onesignal_api_key:
            logger.warning("OneSignal credentials not configured")
            return False

        try:
            import httpx
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Basic {self.onesignal_api_key}"
            }
            payload = {
                "app_id": self.onesignal_app_id,
                "include_external_user_ids": [user_id],
                "contents": {"en": message, "ar": message},
                "data": data or {"type": "proactive", "feature": "life_coach"},
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://onesignal.com/api/v1/notifications",
                    json=payload,
                    headers=headers,
                    timeout=10
                )
                if response.status_code == 200:
                    logger.info(f"Proactive notification sent to {user_id}")
                    return True
                else:
                    logger.warning(f"OneSignal error: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send proactive notification: {e}")
            return False

    async def process_user(self, user_id: str, context: Dict, history: list) -> Optional[Dict]:
        """معالجة مستخدم واحد: توليد رسالة استباقية وإرسالها"""
        try:
            from app.features.life_coach.digital_twin_core import digital_twin_core
            proactive = digital_twin_core.generate_proactive_message(context, history)
            if proactive and proactive.get("priority", 0) > 0.7:
                sent = await self.send_proactive_message(user_id, proactive["message"])
                if sent:
                    return {"user_id": user_id, "message": proactive["message"], "sent": True}
        except Exception as e:
            logger.error(f"Error processing proactive for {user_id}: {e}")
        return None


proactive_notifications = ProactiveNotifications()
