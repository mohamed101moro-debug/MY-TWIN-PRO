"""
EMOTION ANALYZER – الطبقة الأولى من Life Coach
=================================================
- تحليل المشاعر (TCGA Arabic Engine)
- اكتشاف التشوهات المعرفية (CBT)
- تحليل الثقة، الدافع، التوتر، الاحتراق
"""
import logging
from typing import Dict, Any, List, Optional
from app.models.relationship import EmotionState

logger = logging.getLogger(__name__)

EMOTION_LEXICON = {
    "حزين": {"primary": "sadness", "intensity": 0.7, "valence": -0.6},
    "فرحان": {"primary": "joy", "intensity": 0.8, "valence": 0.9},
    "خائف": {"primary": "fear", "intensity": 0.7, "valence": -0.5},
    "غاضب": {"primary": "anger", "intensity": 0.8, "valence": -0.7},
    "قلق": {"primary": "anxiety", "intensity": 0.6, "valence": -0.4},
    "متوتر": {"primary": "anxiety", "intensity": 0.7, "valence": -0.5},
    "سعيد": {"primary": "joy", "intensity": 0.9, "valence": 1.0},
    "مكتئب": {"primary": "sadness", "intensity": 0.9, "valence": -0.9},
    "وحيد": {"primary": "sadness", "intensity": 0.7, "valence": -0.7},
    "محتار": {"primary": "confusion", "intensity": 0.5, "valence": -0.2},
    "نادم": {"primary": "regret", "intensity": 0.6, "valence": -0.5},
    "ممتن": {"primary": "gratitude", "intensity": 0.8, "valence": 0.9},
    "فخور": {"primary": "pride", "intensity": 0.7, "valence": 0.8},
    "متحمس": {"primary": "excitement", "intensity": 0.8, "valence": 0.9},
    "مرهق": {"primary": "exhaustion", "intensity": 0.7, "valence": -0.6},
    "محبط": {"primary": "frustration", "intensity": 0.6, "valence": -0.5},
    "متفائل": {"primary": "optimism", "intensity": 0.7, "valence": 0.8},
}

COGNITIVE_DISTORTIONS = {
    "catastrophizing": ["دائماً", "أبداً", "أسوأ", "كارثة", "لن يتحسن", "ميؤوس"],
    "all_or_nothing": ["إما", "أو", "كامل", "فاشل", "مثالي", "مطلقاً"],
    "mind_reading": ["بالتأكيد يعتقد", "يعرف أنني", "يظن أنني", "سيقول"],
    "overgeneralization": ["كل مرة", "دائماً هكذا", "كل الناس", "كل شيء"],
    "emotional_reasoning": ["أشعر أنني", "إحساسي يقول", "قلبي يقول"],
    "labeling": ["أنا فاشل", "أنا غبي", "أنا ضعيف", "أنا غير محبوب"],
    "should_statements": ["يجب أن", "لازم", "مفروض", "الواجب"],
    "personalization": ["بسببي", "خطأي", "أنا السبب"],
    "magnification": ["ضخم", "مصيبة", "رهيب", "لا يطاق"],
}

BURNOUT_INDICATORS = ["مرهق", "لا أستطيع", "فقدت الشغف", "لا طاقة", "محبط", "لا فائدة"]
MOTIVATION_INDICATORS = ["متحمس", "أستطيع", "جاهز", "سأفعل", "مصمم", "واثق"]


class EmotionAnalyzer:
    def analyze(self, text: str) -> Dict[str, Any]:
        words = text.split()
        detected = []
        for word in words:
            if word in EMOTION_LEXICON:
                detected.append(EMOTION_LEXICON[word])

        if not detected:
            emotion = EmotionState(primary="neutral", intensity=0.3, valence=0.0, confidence=0.3, method="local")
        else:
            primary = max(detected, key=lambda x: x["intensity"])
            avg_valence = sum(d["valence"] for d in detected) / len(detected)
            avg_intensity = sum(d["intensity"] for d in detected) / len(detected)
            emotion = EmotionState(
                primary=primary["primary"],
                intensity=avg_intensity,
                valence=avg_valence,
                confidence=0.7,
                method="local",
                needs_support=avg_valence < -0.4,
                risk_level="high" if avg_valence < -0.7 else ("medium" if avg_valence < -0.3 else "low"),
            )

        distortions = self._detect_distortions(text)
        burnout_risk = self._detect_burnout(text)
        motivation = self._detect_motivation(text)

        return {
            "emotion": emotion.dict(),
            "cognitive_distortions": distortions,
            "burnout_risk": burnout_risk,
            "motivation_level": motivation,
            "needs_cbt": len(distortions) > 0,
            "needs_support": emotion.needs_support or burnout_risk > 0.5,
        }

    def _detect_distortions(self, text: str) -> List[Dict[str, Any]]:
        results = []
        text_lower = text.lower()
        for distortion, keywords in COGNITIVE_DISTORTIONS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    results.append({
                        "type": distortion,
                        "trigger": keyword,
                        "probability": 0.6 + min(len(text) / 100, 0.3),
                    })
                    break
        return results[:4]

    def _detect_burnout(self, text: str) -> float:
        score = 0.0
        for indicator in BURNOUT_INDICATORS:
            if indicator in text:
                score += 0.25
        return min(score, 1.0)

    def _detect_motivation(self, text: str) -> float:
        score = 0.3
        for indicator in MOTIVATION_INDICATORS:
            if indicator in text:
                score += 0.2
        return min(score, 1.0)


emotion_analyzer = EmotionAnalyzer()
