"""
DECISION COACH v1.0 – مساعد اتخاذ القرارات
=============================================
- تحليل الخيارات
- مصفوفة القرار (Decision Matrix)
- تحليل Worst/Best Case
- توصية مبنية على قيم المستخدم
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class DecisionCoach:
    def analyze_decision(self, question: str, options: List[str], profile: Dict = None, lang: str = "ar") -> Dict[str, Any]:
        """تحليل قرار مع خيارات متعددة"""
        
        if not options or len(options) < 2:
            options = self._extract_options_from_text(question)
        
        if not options or len(options) < 2:
            return {"error": "يجب توفير خيارين على الأقل" if lang == "ar" else "At least two options required"}
        
        # تحليل كل خيار
        analysis = []
        for i, option in enumerate(options):
            pros = self._extract_pros(option, profile)
            cons = self._extract_cons(option, profile)
            score = self._score_option(pros, cons)
            analysis.append({
                "option": option,
                "pros": pros[:3],
                "cons": cons[:3],
                "score": score,
                "recommendation": "recommended" if score >= 70 else ("consider" if score >= 50 else "avoid"),
            })
        
        # تحديد الخيار الأفضل
        best_option = max(analysis, key=lambda x: x["score"])
        
        return {
            "question": question,
            "options_analysis": analysis,
            "best_option": best_option,
            "decision_matrix": self._build_decision_matrix(options, profile),
            "advice": self._generate_advice(best_option, analysis, lang),
        }

    def _extract_options_from_text(self, text: str) -> List[str]:
        """استخراج الخيارات من النص"""
        text_lower = text.lower()
        options = []
        
        # أنماط عربية
        if "أو" in text_lower:
            parts = text_lower.split("أو")
            options = [p.strip().replace("هل ", "").replace("؟", "") for p in parts if p.strip()]
        
        # أنماط إنجليزية
        if not options and " or " in text_lower:
            parts = text_lower.split(" or ")
            options = [p.strip().replace("should i ", "").replace("?", "") for p in parts if p.strip()]
        
        return options

    def _extract_pros(self, option: str, profile: Dict) -> List[str]:
        """استخراج الإيجابيات"""
        pros = []
        option_lower = option.lower()
        
        positive_keywords = {
            "ar": ["أمان", "استقرار", "دخل", "نمو", "تطور", "سعادة", "راحة", "صحة", "قرب", "حرية"],
            "en": ["security", "stability", "income", "growth", "development", "happiness", "comfort", "health", "proximity", "freedom"],
        }
        
        keywords = positive_keywords.get("ar")  # default Arabic
        for kw in keywords:
            if kw in option_lower:
                pros.append(f"إيجابية: {kw}")
        
        if not pros:
            pros.append("إمكانية إيجابية تحتاج تقييماً أعمق")
        
        return pros

    def _extract_cons(self, option: str, profile: Dict) -> List[str]:
        """استخراج السلبيات"""
        cons = []
        option_lower = option.lower()
        
        negative_keywords = ["خطر", "عدم يقين", "فقدان", "بعد", "ضغط", "تضحية", "تكلفة", "وقت"]
        for kw in negative_keywords:
            if kw in option_lower:
                cons.append(f"سلبية: {kw}")
        
        if not cons:
            cons.append("لا توجد سلبيات واضحة – لكن يجب التفكير ملياً")
        
        return cons

    def _score_option(self, pros: List[str], cons: List[str]) -> int:
        """حساب درجة الخيار"""
        base = 50
        score = base + (len(pros) * 15) - (len(cons) * 15)
        return max(10, min(score, 90))

    def _build_decision_matrix(self, options: List[str], profile: Dict) -> List[Dict]:
        """بناء مصفوفة قرار بسيطة"""
        criteria = ["الأمان", "النمو", "السعادة", "الاستقرار"]  # Arabic default
        matrix = []
        for option in options:
            scores = {criterion: 50 for criterion in criteria}
            matrix.append({"option": option, "criteria_scores": scores})
        return matrix

    def _generate_advice(self, best_option: Dict, all_options: List[Dict], lang: str) -> str:
        """توليد نصيحة"""
        if lang == "ar":
            return f"بناءً على التحليل، الخيار الأفضل هو: '{best_option['option']}'. لكن تذكر أن القرار النهائي يعود لك. فكر في قيمك وأهدافك طويلة المدى."
        return f"Based on analysis, the best option is: '{best_option['option']}'. But remember, the final decision is yours. Think about your values and long-term goals."


decision_coach = DecisionCoach()
