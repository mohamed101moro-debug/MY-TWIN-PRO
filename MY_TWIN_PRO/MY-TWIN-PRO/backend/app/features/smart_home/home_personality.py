"""
HOME PERSONALITY v1.0 – شخصية المنزل
=======================================
يضبط الإضاءة والموسيقى والألوان حسب عاطفة التوأم والمستخدم.
"""
import logging
from typing import Dict, Any

logger = logging.getLogger("home_personality")

EMOTION_ENVIRONMENTS = {
    "joy": {"lighting": "bright_warm", "music": "happy", "color": "#FFD700", "brightness": 90},
    "sadness": {"lighting": "dim_warm", "music": "calm", "color": "#FF8C42", "brightness": 40},
    "calm": {"lighting": "soft_neutral", "music": "ambient", "color": "#A78BFA", "brightness": 50},
    "love": {"lighting": "warm_romantic", "music": "romantic", "color": "#FF69B4", "brightness": 60},
    "anger": {"lighting": "cool_calm", "music": "silence", "color": "#4A90E2", "brightness": 50},
    "fear": {"lighting": "bright_safe", "music": "calm", "color": "#FFFFFF", "brightness": 80},
    "neutral": {"lighting": "adaptive", "music": "none", "color": "#D8B4FE", "brightness": 70},
    "focused": {"lighting": "bright_cool", "music": "lofi", "color": "#60A5FA", "brightness": 85},
    "inspired": {"lighting": "bright_creative", "music": "upbeat", "color": "#34D399", "brightness": 90},
}

class HomePersonality:
    def get_environment_for_emotion(self, emotion: str) -> Dict[str, Any]:
        """الحصول على إعدادات البيئة المناسبة للعاطفة"""
        return EMOTION_ENVIRONMENTS.get(emotion, EMOTION_ENVIRONMENTS["neutral"])

    def get_lighting_command(self, emotion: str) -> Dict[str, Any]:
        env = self.get_environment_for_emotion(emotion)
        return {
            "action": "set_lighting",
            "color": env["color"],
            "brightness": env["brightness"],
            "lighting_type": env["lighting"],
            "reason": f"تعديل الإضاءة لتناسب حالة {emotion}",
        }

    def get_music_suggestion(self, emotion: str) -> str:
        env = self.get_environment_for_emotion(emotion)
        return env["music"]


home_personality = HomePersonality()
