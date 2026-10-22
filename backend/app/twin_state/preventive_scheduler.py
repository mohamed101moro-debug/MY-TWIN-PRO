"""
PREVENTIVE SCHEDULER – المراقب الاستباقي
يعمل كل ساعة: يتحقق من حالة المستخدمين النشطين ويرسل إشعارات عبر Preventive Coach
"""
import asyncio
import logging
from datetime import datetime, timezone
from app.features.life_coach.preventive_coach import preventive_coach

logger = logging.getLogger(__name__)

class PreventiveScheduler:
    def __init__(self):
        self.is_running = False

    async def start(self):
        """بدء المراقبة الدورية"""
        if self.is_running:
            return
        self.is_running = True
        logger.info("Preventive Scheduler started")
        while self.is_running:
            try:
                await self._check_all_active_users()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(3600)  # كل ساعة

    async def _check_all_active_users(self):
        """فحص جميع المستخدمين النشطين وإرسال تنبيهات"""
        # في الإنتاج، نجلب المستخدمين النشطين من Supabase
        # هنا نموذج مبسط
        try:
            from app.infrastructure.database.supabase_client import get_supabase_client
            client = get_supabase_client()
            if client:
                # جلب المستخدمين النشطين آخر 7 أيام
                response = client.table('profiles').select('id').limit(50).execute()
                if response.data:
                    for user in response.data:
                        user_id = user['id']
                        try:
                            # تحقق سريع من الحالة
                            result = await preventive_coach.check_and_intervene(
                                user_id,
                                {"mood_valence": 0.5, "energy": 50},
                                [],
                                "ar"
                            )
                            if result.get("should_intervene"):
                                logger.info(f"Preventive alert for {user_id}")
                                # إرسال الإشعار عبر Proactive Notifications
                                from app.features.life_coach.proactive_notifications import proactive_notifications
                                await proactive_notifications.send_proactive_message(
                                    user_id,
                                    result.get("intervention_message", "")
                                )
                        except Exception as e:
                            logger.warning(f"Failed to check user {user_id}: {e}")
        except Exception as e:
            logger.warning(f"Scheduler DB error: {e}")

    def stop(self):
        self.is_running = False

# Singleton
preventive_scheduler = PreventiveScheduler()
