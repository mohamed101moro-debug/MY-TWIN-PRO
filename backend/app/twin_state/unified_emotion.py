"""
Unified Emotion Engine v2.0 — محرك المشاعر الموحد
====================================================
يدمج TCMA العربي العميق مع نظام التوافق العاطفي.
يدعم العربي والإنجليزي والعالمي.
يُقرأ من Supabase ويُعيد حالة عاطفية كاملة.
"""
import logging, re
from typing import Dict, Any, Optional, List

logger = logging.getLogger("unified_emotion")

# ═══════════════════════════════════════════
# قاموس التوافق العاطفي (12 مشاعر)
# ═══════════════════════════════════════════
EMOTION_COMPATIBILITY = {
    "joy": ["calm", "love", "inspired", "happy", "neutral"],
    "sadness": ["neutral", "calm", "concerned", "fear", "curious"],
    "calm": ["joy", "neutral", "focused", "love", "inspired"],
    "love": ["joy", "calm", "happy", "inspired", "neutral"],
    "anger": ["neutral", "fear", "concerned", "focused"],
    "fear": ["neutral", "sadness", "concerned", "anger"],
    "neutral": ["joy", "sadness", "calm", "curious", "focused", "concerned", "love", "anger", "fear", "inspired", "happy"],
    "curious": ["focused", "inspired", "neutral", "joy"],
    "focused": ["neutral", "calm", "curious", "inspired"],
    "inspired": ["joy", "focused", "love", "happy", "curious"],
    "concerned": ["neutral", "sadness", "fear", "focused"],
    "happy": ["joy", "love", "inspired", "neutral", "calm"],
}

# ═══════════════════════════════════════════
# قاموس التعابير العربية (TCMA)
# ═══════════════════════════════════════════
ARABIC_CONTEXTUAL_PATTERNS = {
    "sadness_disguised": {
        "patterns": [
            "الحمد لله على كل حال", "ربنا يفرجها", "مش مهم",
            "كل شيء قسمة ونصيب", "الدنيا وما فيها", "خير إن شاء الله",
            "أنا مش شايل هم", "بقول الحمد لله علشان خاطري",
            "مش عايز أتعب حد معايا", "أنا تعبان بس مش مهم",
            "الهم ما يخففش", "أنا خلاص تعودت", "ما فيش فايدة",
        ],
        "weight": 0.85,
    },
    "anxiety_disguised": {
        "patterns": [
            "ربنا يستر", "إن شاء الله تعدي", "الواحد بيعمل اللي عليه",
            "الله كريم", "إن شاء الله خير", "ربنا يكتب اللي فيه الخير",
            "مش عارف إيه اللي جاي", "أنا مش مرتاح", "في حاجة جوايا مش مطمناني",
            "الواحد خايف من بكرة", "مش قادر أنام الليالي دي", "ربنا يسهل",
        ],
        "weight": 0.80,
    },
    "anger_disguised": {
        "patterns": [
            "حسبي الله ونعم الوكيل", "أنا مش عايز أتكلم", "خلاص بقى",
            "ربنا ياخدهم", "أنا زهقت", "مش قادر أستحمل", "كفاية كده",
            "أنا هادي بس جوايا نار", "العدل ربنا هو اللي بيجيبه",
            "أنا مش هرد", "سيبتها على الله",
        ],
        "weight": 0.90,
    },
    "joy_disguised": {
        "patterns": [
            "الحمد لله", "ربنا أكرمنا", "ده من فضل ربي",
            "ربنا رزقني من حيث لا أحتسب", "دي نعمة من ربنا",
            "ما شاء الله", "ربنا يحفظها", "اللهم لا حسد",
            "أنا مش مصدق", "حاجة تفرح بجد", "ربنا عوضني خير",
        ],
        "weight": 0.75,
    },
    "shame_disguised": {
        "patterns": [
            "أنا مش قد كده", "دي ستر وغطا من ربنا",
            "أنا أصلاً مش فاهم حاجة", "الناس دي أكبر مني",
            "أنا خايف أتكلم قدامهم", "مش عايز حد ياخد عني فكرة وحشة",
            "أنا اللي غلطان أكيد", "مش عايز أحرج حد",
        ],
        "weight": 0.70,
    },
    "despair_disguised": {
        "patterns": [
            "أنا تعبت من كل حاجة", "مش فارقة معايا خلاص",
            "الواحد بيعمل إيه تاني", "أنا وصلت لطريق مسدود",
            "مش قادر أقوم من السرير", "أنا مش عايز حاجة تاني",
            "خلاص أنا استسلمت", "الواحد يئس من الفرج",
        ],
        "weight": 0.95,
    },
}

# ═══════════════════════════════════════════
# قاموس التعابير الإنجليزية والعالمية
# ═══════════════════════════════════════════
ENGLISH_CONTEXTUAL_PATTERNS = {
    "sadness_disguised": {
        "patterns": [
            "I'm fine", "It's fine", "Don't worry about me",
            "It is what it is", "I'll manage", "No worries",
            "I'm just tired", "It's not a big deal", "I'm okay",
            "Whatever", "It doesn't matter", "I'm used to it",
        ],
        "weight": 0.80,
    },
    "anxiety_disguised": {
        "patterns": [
            "Hopefully", "Let's see how it goes", "Fingers crossed",
            "I'm not sure what's next", "I can't sleep these days",
            "Something feels off", "I'm a bit stressed",
            "It'll work out somehow", "One day at a time",
        ],
        "weight": 0.78,
    },
    "anger_disguised": {
        "patterns": [
            "I'm not mad", "Whatever you say", "I'm done",
            "I don't want to talk about it", "It's whatever",
            "I'm fine. Really.", "Leave it", "Forget it",
        ],
        "weight": 0.85,
    },
}

# قاموس عكسي للبحث السريع
REVERSE_PATTERNS = {}
for emotion_type, data in {**ARABIC_CONTEXTUAL_PATTERNS, **ENGLISH_CONTEXTUAL_PATTERNS}.items():
    for pattern in data["patterns"]:
        REVERSE_PATTERNS[pattern.lower()] = {"emotion_type": emotion_type, "weight": data["weight"]}


class UnifiedEmotionEngine:
    """محرك المشاعر الموحد."""
    
    async def analyze(
        self,
        user_id: str,
        text: str,
        lang: str = "ar",
        previous_messages: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        تحليل عاطفي كامل.
        يُرجع: primary_emotion, real_emotion, intensity, confidence,
               cultural_analysis, is_disguised, recommendation
        """
        previous_messages = previous_messages or []
        text_lower = text.lower().strip()
        
        # 1. البحث في الأنماط السياقية
        detected = None
        for pattern, info in REVERSE_PATTERNS.items():
            if pattern in text_lower:
                detected = info
                break
        
        # 2. كشف المشاعر المباشرة
        direct_emotion = self._detect_direct_emotion(text, lang)
        
        # 3. تحديد المشاعر الحقيقية
        if detected:
            real_emotion_map = {
                "sadness_disguised": "sadness",
                "anxiety_disguised": "fear",
                "anger_disguised": "anger",
                "joy_disguised": "joy",
                "shame_disguised": "sadness",
                "despair_disguised": "sadness",
            }
            real_emotion = real_emotion_map.get(detected["emotion_type"], "neutral")
            confidence = detected["weight"]
            is_disguised = True
            cultural_note = f"نمط مقنع: {detected['emotion_type']}"
        elif direct_emotion:
            real_emotion = direct_emotion
            confidence = 0.70
            is_disguised = False
            cultural_note = "تعبير مباشر"
        else:
            real_emotion = "neutral"
            confidence = 0.5
            is_disguised = False
            cultural_note = "محايد"
        
        # 4. حساب الشدة
        intensity = self._calculate_intensity(text, real_emotion)
        
        # 5. المشاعر الظاهرية (للعرض)
        primary_emotion = real_emotion
        
        # 6. توصية
        recommendation = self._generate_recommendation(real_emotion, intensity, is_disguised)
        
        return {
            "primary_emotion": primary_emotion,
            "real_emotion": real_emotion,
            "intensity": round(intensity, 2),
            "confidence": round(confidence, 2),
            "cultural_analysis": cultural_note,
            "is_disguised": is_disguised,
            "recommendation": recommendation,
        }
    
    def _detect_direct_emotion(self, text: str, lang: str) -> Optional[str]:
        """كشف المشاعر المباشرة."""
        text_lower = text.lower()
        direct_map = {
            "sadness": ["حزين", "زعلان", "مكتئب", "مهموم", "sad", "depressed", "unhappy", "miserable"],
            "fear": ["خايف", "قلقان", "مرعوب", "متوتر", "scared", "afraid", "anxious", "terrified"],
            "anger": ["غضبان", "عصبي", "متضايق", "قرفان", "angry", "mad", "furious", "annoyed"],
            "joy": ["فرحان", "مبسوط", "سعيد", "مستانس", "happy", "glad", "excited", "joyful"],
            "love": ["أحبك", "حبيب", "قلبي", "love", "adore", "dear"],
        }
        for emotion, keywords in direct_map.items():
            if any(kw in text_lower for kw in keywords):
                return emotion
        return None
    
    def _calculate_intensity(self, text: str, emotion: str) -> float:
        """حساب شدة المشاعر."""
        base = 0.5
        intensifiers = ["جداً", "كثير", "للغاية", "very", "extremely", "really", "so", "too"]
        for word in intensifiers:
            if word in text.lower():
                base += 0.15
        if len(text) > 100:
            base += 0.1
        return min(1.0, base)
    
    def _generate_recommendation(self, emotion: str, intensity: float, is_disguised: bool) -> str:
        """توليد توصية للتوأم."""
        if is_disguised:
            return "المشاعر مقنعة. عامل بلطف وحذر."
        if emotion == "sadness" and intensity > 0.6:
            return "قدم تعاطفاً عميقاً دون حلول سريعة."
        elif emotion == "fear":
            return "طمئن بدون وعود زائفة."
        elif emotion == "anger":
            return "استمع أولاً. لا تنصح."
        elif emotion == "joy":
            return "شارك الفرحة وشجع."
        return "كن متوازناً."


unified_emotion_engine = UnifiedEmotionEngine()
logger.info("✅ Unified Emotion Engine v2.0 ready")
