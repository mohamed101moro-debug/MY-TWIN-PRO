"""
CLINICAL INTELLIGENCE v1.0 – طبقة التقييم السريري
===================================================
- ADHD Screening (ASRS v1.1)
- Burnout Assessment (MBI-GS)
- OCD Screening (Y-BOCS Lite)
- Panic Disorder Screening (PDSS-SR)
- Social Anxiety Screening (SPIN)
- PTSD Screening (PC-PTSD-5)
- Beck Depression Inventory (BDI-II Lite)
- GAD-7 Anxiety Screening
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ClinicalIntelligence:
    def __init__(self):
        self.screeners = {
            "adhd": self._screen_adhd,
            "burnout": self._screen_burnout,
            "ocd": self._screen_ocd,
            "panic": self._screen_panic,
            "social_anxiety": self._screen_social_anxiety,
            "ptsd": self._screen_ptsd,
            "depression": self._screen_depression,
            "anxiety": self._screen_anxiety,
        }

    def comprehensive_assessment(self, text: str, history: List[Dict] = None) -> Dict[str, Any]:
        """تقييم شامل لكل الاضطرابات المحتملة"""
        results = {}
        for condition, screener in self.screeners.items():
            results[condition] = screener(text, history)
        
        # تحديد الاضطرابات المحتملة (احتمالية > 40%)
        flagged = {k: v for k, v in results.items() if v.get("probability", 0) > 0.4}
        
        # تحديد مستوى الخطر العام
        risk_level = "low"
        if any(v.get("severity") == "high" for v in flagged.values()):
            risk_level = "high"
        elif len(flagged) >= 2:
            risk_level = "medium"
        
        return {
            "assessment_date": datetime.now(timezone.utc).isoformat(),
            "screenings": results,
            "flagged_conditions": list(flagged.keys()),
            "overall_risk": risk_level,
            "requires_professional_referral": risk_level == "high" or len(flagged) >= 3,
            "disclaimer": "هذه أداة فحص أولية فقط، وليست تشخيصاً طبياً. يجب استشارة أخصائي الصحة النفسية للتشخيص الدقيق."
        }

    def _screen_adhd(self, text: str, history: List[Dict] = None) -> Dict:
        """ADHD Screening (ASRS v1.1 – Adult ADHD Self-Report Scale)"""
        indicators = {
            "inattention": ["أفقد التركيز", "لا أركز", "سهل التشتت", "أنسى بسرعة", "أخطاء بسبب عدم التركيز"],
            "hyperactivity": ["لا أستطيع الجلوس", "أتحرك كثيراً", "تململ", "نشاط زائد", "كثرة الحركة"],
            "impulsivity": ["أقاطع الآخرين", "أندفع", "لا أنتظر دوري", "سريع الغضب", "قرارات متهورة"],
            "executive_dysfunction": ["لا أنظم وقتي", "فوضوي", "لا أنجز مهامي", "تأجيل مستمر", "صعوبة التخطيط"],
        }
        return self._calculate_screening_result(text, indicators, "adhd")

    def _screen_burnout(self, text: str, history: List[Dict] = None) -> Dict:
        """Burnout Assessment (MBI-GS – Maslach Burnout Inventory)"""
        indicators = {
            "emotional_exhaustion": ["مرهق", "استنزاف", "لا طاقة", "محبط", "فقدت الشغف", "لا أقوى"],
            "depersonalization": ["لا أهتم", "غير مبال", "جاف", "لا أشعر", "غير متصل"],
            "reduced_efficacy": ["لا أنجز", "فاشل", "غير كفؤ", "ضعيف الأداء", "لا أحقق أهدافي"],
        }
        result = self._calculate_screening_result(text, indicators, "burnout")
        if history:
            work_stress_patterns = sum(1 for h in history[-10:] if "عمل" in str(h) or "ضغط" in str(h))
            if work_stress_patterns >= 5:
                result["probability"] = min(result["probability"] + 0.2, 1.0)
                result["severity"] = "high" if result["probability"] > 0.7 else result["severity"]
        return result

    def _screen_ocd(self, text: str, history: List[Dict] = None) -> Dict:
        """OCD Screening (Y-BOCS Lite)"""
        indicators = {
            "obsessions": ["أفكار متكررة", "لا أستطيع التوقف", "أفكار مزعجة", "هواجس", "أفكار لا أريدها"],
            "compulsions": ["أكرر", "أتفقد", "أغسل", "أعد", "طقوس", "ترتيب قهري"],
            "distress": ["أشعر بالقلق إذا لم أفعل", "لا أستطيع المقاومة", "تستغرق ساعات"],
        }
        return self._calculate_screening_result(text, indicators, "ocd")

    def _screen_panic(self, text: str, history: List[Dict] = None) -> Dict:
        """Panic Disorder Screening (PDSS-SR)"""
        indicators = {
            "panic_attacks": ["نوبة هلع", "خفقان", "ضيق تنفس", "أزمة", "رعشة", "غثيان مفاجئ"],
            "anticipatory_anxiety": ["أخاف من النوبة", "خائف أن تتكرر", "قلق من الهلع"],
            "avoidance": ["أتجنب الأماكن", "لا أخرج", "أخاف الزحام", "تجنب المواقف"],
        }
        return self._calculate_screening_result(text, indicators, "panic")

    def _screen_social_anxiety(self, text: str, history: List[Dict] = None) -> Dict:
        """Social Anxiety Screening (SPIN – Social Phobia Inventory)"""
        indicators = {
            "fear": ["أخاف من الناس", "المواقف الاجتماعية", "أخاف التحدث", "الاجتماعات"],
            "avoidance": ["أتجنب الناس", "لا أحضر مناسبات", "أرفض الدعوات", "أعزل نفسي"],
            "physiological": ["أحمر", "أتعرق", "يرتجف صوتي", "قلب سريع في الاجتماعات"],
        }
        return self._calculate_screening_result(text, indicators, "social_anxiety")

    def _screen_ptsd(self, text: str, history: List[Dict] = None) -> Dict:
        """PTSD Screening (PC-PTSD-5)"""
        indicators = {
            "re_experiencing": ["ذكريات مزعجة", "كوابيس", "فلاش باك", "أتذكر الصدمة"],
            "avoidance": ["أتجنب التذكر", "لا أتحدث عنها", "أتجنب الأماكن المرتبطة"],
            "hyperarousal": ["متوتر دائماً", "سهل الفزع", "لا أنام", "غاضب"],
            "negative_alterations": ["لا أشعر بشيء", "منفصل", "لا أستمتع", "لوم ذاتي"],
        }
        return self._calculate_screening_result(text, indicators, "ptsd")

    def _screen_depression(self, text: str, history: List[Dict] = None) -> Dict:
        """Depression Screening (BDI-II Lite)"""
        indicators = {
            "mood": ["حزين", "مكتئب", "بائس", "كئيب", "لا أمل"],
            "anhedonia": ["لا أستمتع", "لا أشعر بمتعة", "فقدان الاهتمام", "لا شيء يسعدني"],
            "somatic": ["لا أنام", "لا آكل", "متعب", "لا طاقة", "فقدان الشهية"],
            "cognitive": ["لا قيمة لي", "ذنب", "ألوم نفسي", "أفكار سوداء", "لا أستحق"],
        }
        return self._calculate_screening_result(text, indicators, "depression")

    def _screen_anxiety(self, text: str, history: List[Dict] = None) -> Dict:
        """GAD-7 Anxiety Screening"""
        indicators = {
            "excessive_worry": ["قلق", "متوتر", "خائف", "أفكار سلبية", "لا أرتاح"],
            "somatic": ["صداع", "شد عضلي", "أرق", "عصبي", "لا أرتاح"],
            "functional_impairment": ["القلق يمنعني", "لا أعمل بسبب القلق", "القلق يفسد يومي"],
        }
        return self._calculate_screening_result(text, indicators, "anxiety")

    def _calculate_screening_result(self, text: str, indicators: Dict[str, List[str]], condition: str) -> Dict:
        """حساب نتيجة الفحص"""
        text_lower = text.lower()
        matches = {}
        total_indicators = 0
        matched_indicators = 0
        
        for category, keywords in indicators.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > 0:
                matches[category] = count
                matched_indicators += count
            total_indicators += len(keywords)
        
        probability = min(matched_indicators / max(total_indicators * 0.3, 1), 1.0)
        
        severity = "low"
        if probability > 0.7:
            severity = "high"
        elif probability > 0.4:
            severity = "medium"
        
        return {
            "condition": condition,
            "probability": round(probability, 2),
            "severity": severity,
            "matched_categories": list(matches.keys()),
            "recommendation": self._get_recommendation(condition, severity),
        }

    def _get_recommendation(self, condition: str, severity: str) -> str:
        recommendations = {
            "adhd": {
                "high": "يوصى بشدة باستشارة طبيب نفسي لتقييم اضطراب فرط الحركة وتشتت الانتباه.",
                "medium": "قد تكون هناك مؤشرات على تشتت الانتباه. جرب تقنيات التنظيم وإدارة الوقت.",
                "low": "لا توجد مؤشرات قوية على ADHD.",
            },
            "burnout": {
                "high": "أنت في حالة احتراق وظيفي. خذ إجازة فوراً واستشر مختصاً.",
                "medium": "هناك مؤشرات على الإرهاق. قلل ساعات العمل وركز على الراحة.",
                "low": "لا توجد مؤشرات قوية على الاحتراق الوظيفي.",
            },
            "ocd": {
                "high": "يوصى باستشارة معالج نفسي متخصص في العلاج السلوكي المعرفي للوسواس القهري.",
                "medium": "هناك بعض الأفكار المتكررة. تقنيات اليقظة الذهنية قد تساعد.",
                "low": "لا توجد مؤشرات قوية على الوسواس القهري.",
            },
            "panic": {
                "high": "يوصى باستشارة طبيب نفسي لتقييم نوبات الهلع.",
                "medium": "تعلم تقنيات التنفس العميق والاسترخاء.",
                "low": "لا توجد مؤشرات قوية على اضطراب الهلع.",
            },
            "social_anxiety": {
                "high": "يوصى بالعلاج السلوكي المعرفي للقلق الاجتماعي.",
                "medium": "جرب التعرض التدريجي للمواقف الاجتماعية.",
                "low": "لا توجد مؤشرات قوية على القلق الاجتماعي.",
            },
            "ptsd": {
                "high": "يوصى بشدة باستشارة معالج نفسي متخصص في الصدمات.",
                "medium": "قد تكون هناك آثار لصدمة سابقة. الدعم النفسي مفيد.",
                "low": "لا توجد مؤشرات قوية على اضطراب ما بعد الصدمة.",
            },
            "depression": {
                "high": "يوصى بشدة باستشارة طبيب نفسي. لا تتردد في طلب المساعدة.",
                "medium": "هناك مؤشرات على اكتئاب. تحدث مع شخص تثق به.",
                "low": "لا توجد مؤشرات قوية على الاكتئاب.",
            },
            "anxiety": {
                "high": "يوصى باستشارة مختص لتقييم اضطراب القلق العام.",
                "medium": "تقنيات الاسترخاء والتنفس قد تساعد في تقليل القلق.",
                "low": "لا توجد مؤشرات قوية على اضطراب القلق العام.",
            },
        }
        return recommendations.get(condition, {}).get(severity, "لا توجد توصية محددة.")


clinical_intelligence = ClinicalIntelligence()
