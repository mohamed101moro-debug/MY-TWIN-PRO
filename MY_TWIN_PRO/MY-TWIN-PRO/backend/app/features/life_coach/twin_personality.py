"""
TWIN PERSONALITY – الطبقة الثامنة من Life Coach
===================================================
- نبرة شخصية للمدرب
- رسائل مخصصة حسب العلاقة
- تعبيرات عاطفية (فخور، متحمس، داعم)
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TwinPersonality:
    def __init__(self):
        self.tones = {
            "supportive": {
                "ar": ["أنا معك", "أنت تستطيع", "دعنا نفعلها معاً", "أفهم ما تمر به"],
                "en": ["I'm with you", "You can do it", "Let's do it together", "I understand"],
            },
            "celebratory": {
                "ar": ["فخور بك!", "إنجاز رائع!", "أنت تلهمني!", "واو، تقدم مذهل!"],
                "en": ["Proud of you!", "Amazing achievement!", "You inspire me!", "Wow, incredible progress!"],
            },
            "encouraging": {
                "ar": ["لا بأس، غداً يوم جديد", "كل خطوة صغيرة مهمة", "أنت أقوى مما تظن"],
                "en": ["It's okay, tomorrow is a new day", "Every small step matters", "You're stronger than you think"],
            },
            "reflective": {
                "ar": ["تذكر عندما بدأنا؟", "منذ شهر كنت...", "انظر كم تغيرت!"],
                "en": ["Remember when we started?", "A month ago you were...", "Look how much you've changed!"],
            },
        }

    def get_greeting(self, user_profile: Dict, lang: str = "ar") -> str:
        """تحية مخصصة حسب الوقت والعلاقة"""
        hour = datetime.now(timezone.utc).hour + 3  # توقيت السعودية تقريباً
        bond = user_profile.get("bond_level", 50)
        name = user_profile.get("twin_name", "رفيقي" if lang == "ar" else "my friend")

        if hour < 12:
            base = f"صباح الخير {name}!" if lang == "ar" else f"Good morning {name}!"
        elif hour < 17:
            base = f"مساء النور {name}!" if lang == "ar" else f"Good afternoon {name}!"
        else:
            base = f"مساء الخير {name}!" if lang == "ar" else f"Good evening {name}!"

        if bond > 70:
            base += " " + ("اشتقت لك اليوم!" if lang == "ar" else "I missed you today!")
        elif bond > 40:
            base += " " + ("سعيد برؤيتك!" if lang == "ar" else "Happy to see you!")
        
        return base

    def get_milestone_message(self, milestone: str, lang: str = "ar") -> str:
        """رسالة عند تحقيق إنجاز"""
        messages = {
            "first_week": {
                "ar": "أسبوع كامل من الالتزام! فخور بك جداً. هذه بداية رحلة رائعة.",
                "en": "A full week of commitment! So proud of you. This is the start of an amazing journey.",
            },
            "month": {
                "ar": "شهر كامل! لم أكن أقلق عليك أبداً. أنت تثبت لنفسك كل يوم أنك تستطيع.",
                "en": "A full month! I never doubted you. You prove to yourself every day that you can.",
            },
            "streak_10": {
                "ar": "10 أيام متتالية! هذه أول مرة تصل فيها لهذا الرقم منذ بدأنا. أشعر بالفخر!",
                "en": "10 days in a row! This is the first time you've reached this number since we started. I feel proud!",
            },
        }
        return messages.get(milestone, {}).get(lang, "")

    def get_compassionate_response(self, situation: str, lang: str = "ar") -> str:
        """رد متعاطف حسب الموقف"""
        responses = {
            "relapse": {
                "ar": "لا بأس يا صديقي. الانتكاسة ليست نهاية الطريق، بل إشارة لنفهم ما حدث ونتعلم منه. أنا هنا معك.",
                "en": "It's okay, my friend. Relapse is not the end, but a signal to understand what happened and learn. I'm here with you.",
            },
            "celebration": {
                "ar": "واو! هذا يستحق الاحتفال! 🎉 تذكر هذا الشعور، أنت قادر على تحقيقه دائماً.",
                "en": "Wow! This deserves celebration! 🎉 Remember this feeling, you're always capable of achieving it.",
            },
        }
        return responses.get(situation, {}).get(lang, "")


twin_personality = TwinPersonality()
