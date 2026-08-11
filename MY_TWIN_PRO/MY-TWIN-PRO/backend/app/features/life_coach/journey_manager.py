"""
JOURNEY MANAGER – نظام رحلة الحياة
=====================================
- تتبع الأيام (1، 3، 10، 50، 120)
- تحديث المرحلة تلقائياً
- رسائل مخصصة لكل مرحلة
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

MILESTONE_DAYS = [1, 3, 7, 10, 14, 21, 30, 50, 90, 120, 180, 365]

MILESTONE_MESSAGES = {
    1: {
        "ar": "اليوم الأول! رحلة الألف ميل تبدأ بخطوة. أنا فخور بأنك بدأت.",
        "en": "Day one! A journey of a thousand miles begins with a single step. I'm proud you started.",
    },
    3: {
        "ar": "ثلاثة أيام! البدايات صعبة، لكنك أثبت أنك جاد. استمر.",
        "en": "Three days! Beginnings are hard, but you've proven you're serious. Keep going.",
    },
    7: {
        "ar": "أسبوع كامل! 🎉 هذه علامة فارقة. معظم الناس يتوقفون قبل هذه النقطة.",
        "en": "A full week! 🎉 This is a milestone. Most people stop before this point.",
    },
    30: {
        "ar": "شهر كامل! العادات تترسخ الآن. أنا أرى التغيير فيك.",
        "en": "A full month! Habits are solidifying now. I see the change in you.",
    },
    90: {
        "ar": "90 يوماً! حياتك تتغير بالفعل. تذكر أين كنت قبل 3 أشهر.",
        "en": "90 days! Your life is already changing. Remember where you were 3 months ago.",
    },
}


class JourneyManager:
    def get_current_stage(self, start_date: str) -> Dict[str, Any]:
        """تحديد المرحلة الحالية"""
        start = datetime.fromisoformat(start_date)
        days = (datetime.now(timezone.utc) - start).days

        stage = "onboarding"
        if days >= 90:
            stage = "mastery"
        elif days >= 30:
            stage = "growth"
        elif days >= 7:
            stage = "foundation"
        elif days >= 1:
            stage = "initiation"

        next_milestone = next((d for d in MILESTONE_DAYS if d > days), None)
        days_to_next = next_milestone - days if next_milestone else 0

        return {
            "stage": stage,
            "days_active": days,
            "start_date": start_date,
            "next_milestone_day": next_milestone,
            "days_to_milestone": days_to_next,
            "milestones_achieved": [d for d in MILESTONE_DAYS if d <= days],
        }

    def check_milestone(self, days_active: int, lang: str = "ar") -> Optional[str]:
        """التحقق مما إذا كان اليوم هو يوم مميز"""
        if days_active in MILESTONE_MESSAGES:
            return MILESTONE_MESSAGES[days_active].get(lang)
        return None

    def get_stage_advice(self, stage: str, lang: str = "ar") -> str:
        """نصيحة حسب المرحلة"""
        advice = {
            "initiation": {
                "ar": "في هذه المرحلة، الأهم هو الاستمرار وليس الكمال. لا تقلق من الأخطاء.",
                "en": "At this stage, consistency matters more than perfection. Don't worry about mistakes.",
            },
            "foundation": {
                "ar": "العادات تبدأ بالتشكل. استمر في روتينك اليومي.",
                "en": "Habits are starting to form. Keep your daily routine.",
            },
            "growth": {
                "ar": "أنت تتطور! حان الوقت لتحدي نفسك أكثر.",
                "en": "You're growing! It's time to challenge yourself more.",
            },
            "mastery": {
                "ar": "لقد أصبحت مصدر إلهام. شارك تجربتك مع الآخرين.",
                "en": "You've become an inspiration. Share your experience with others.",
            },
        }
        return advice.get(stage, {}).get(lang, "")


journey_manager = JourneyManager()
