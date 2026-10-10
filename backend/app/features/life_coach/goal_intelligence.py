"""
GOAL INTELLIGENCE v1.0 – ذكاء الأهداف
========================================
- تقييم واقعية الهدف (SMART Criteria)
- اكتشاف الأهداف الخطرة أو المستحيلة
- اقتراح تعديلات ذكية
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class GoalIntelligence:
    def assess_goal(self, goal_text: str, profile: Dict = None, lang: str = "ar") -> Dict[str, Any]:
        """تقييم شامل للهدف"""
        
        # تحليل SMART
        smart = self._evaluate_smart(goal_text, profile)
        
        # اكتشاف المخاطر
        risks = self._detect_risks(goal_text, profile)
        
        # تقييم الواقعية
        realistic = self._evaluate_realism(goal_text, profile, smart)
        
        # اقتراح تعديلات
        suggestions = self._suggest_modifications(goal_text, smart, risks, realistic, lang)
        
        return {
            "original_goal": goal_text,
            "smart_assessment": smart,
            "risks": risks,
            "realistic_score": realistic["score"],
            "realistic_verdict": realistic["verdict"],
            "suggestions": suggestions,
            "approved": realistic["score"] >= 50 and not risks.get("dangerous", False),
        }

    def _evaluate_smart(self, goal_text: str, profile: Dict) -> Dict[str, Any]:
        """تقييم SMART"""
        text_lower = goal_text.lower()
        
        # Specific (محدد)
        specific_keywords = ["كيلو", "ساعة", "دقيقة", "مرة", "عدد", "كجم", "كم", "دولار", "ريال"]
        specific = any(kw in text_lower for kw in specific_keywords)
        
        # Measurable (قابل للقياس)
        measurable_keywords = ["%", "نسبة", "عدد", "مرات", "كيلو", "ساعة", "دقيقة"]
        measurable = any(kw in text_lower for kw in measurable_keywords)
        
        # Achievable (قابل للتحقيق)
        achievable = True  # سيتم تقييمه لاحقاً
        if "20 كيلو في أسبوع" in text_lower or "30 كيلو في شهر" in text_lower:
            achievable = False
        
        # Relevant (ذو صلة)
        relevant = True  # يفترض أن المستخدم يعرف ما يريد
        
        # Time-bound (محدد بزمن)
        time_keywords = ["أسبوع", "شهر", "سنة", "يوم", "أيام", "أسابيع", "شهور"]
        time_bound = any(kw in text_lower for kw in time_keywords)
        
        score = sum([specific, measurable, achievable, relevant, time_bound]) / 5 * 100
        
        return {
            "specific": specific,
            "measurable": measurable,
            "achievable": achievable,
            "relevant": relevant,
            "time_bound": time_bound,
            "smart_score": round(score),
        }

    def _detect_risks(self, goal_text: str, profile: Dict) -> Dict[str, Any]:
        """اكتشاف المخاطر في الهدف"""
        text_lower = goal_text.lower()
        risks = []
        dangerous = False
        
        # أهداف خطرة
        dangerous_patterns = [
            ("20 كيلو في أسبوع", "فقدان وزن سريع جداً – خطر على الصحة"),
            ("30 كيلو في شهر", "فقدان وزن غير آمن – استشر طبيباً"),
            ("صفر أكل", "تجويع الذات – خطر"),
            ("تمارين 5 ساعات", "إفراط في التمارين – خطر الإصابة"),
            ("أنام ساعتين", "حرمان من النوم – خطر"),
        ]
        
        for pattern, warning in dangerous_patterns:
            if pattern in text_lower:
                risks.append({"type": "dangerous", "pattern": pattern, "warning": warning})
                dangerous = True
        
        # أهداف غير صحية نفسياً
        unhealthy_patterns = [
            ("أثبت للجميع", "دافع خارجي – قد يؤدي للإحباط"),
            ("أكون مثالياً", "كمالية – غير واقعية"),
            ("لن أخطئ أبداً", "توقع غير واقعي"),
        ]
        
        for pattern, warning in unhealthy_patterns:
            if pattern in text_lower:
                risks.append({"type": "unhealthy", "pattern": pattern, "warning": warning})
        
        return {
            "risks_found": risks,
            "dangerous": dangerous,
            "risk_count": len(risks),
        }

    def _evaluate_realism(self, goal_text: str, profile: Dict, smart: Dict) -> Dict[str, Any]:
        """تقييم واقعية الهدف"""
        score = smart["smart_score"]
        verdict = "realistic"
        
        if score < 30:
            verdict = "unrealistic"
            score = 20
        elif score < 50:
            verdict = "needs_adjustment"
            score = 40
        elif score < 70:
            verdict = "mostly_realistic"
            score = 65
        
        return {"score": score, "verdict": verdict}

    def _suggest_modifications(self, goal_text: str, smart: Dict, risks: Dict, realistic: Dict, lang: str) -> List[str]:
        """اقتراح تعديلات"""
        suggestions = []
        
        if not smart["specific"]:
            suggestions.append("حدد هدفك برقم واضح (مثلاً: 5 كيلو بدلاً من 'بعض الوزن')" if lang == "ar" else "Specify your goal with a clear number")
        
        if not smart["measurable"]:
            suggestions.append("أضف طريقة للقياس (مثلاً: الوزن، عدد المرات)" if lang == "ar" else "Add a way to measure progress")
        
        if not smart["time_bound"]:
            suggestions.append("حدد موعداً نهائياً (مثلاً: خلال 3 أشهر)" if lang == "ar" else "Set a deadline (e.g., within 3 months)")
        
        if risks.get("dangerous"):
            suggestions.append("هدفك يحتاج تعديل عاجل – قد يكون خطراً على صحتك. استشر مختصاً." if lang == "ar" else "Your goal needs urgent adjustment – it may be dangerous. Consult a professional.")
        
        if realistic["verdict"] == "unrealistic":
            suggestions.append("الهدف كبير جداً. قسمه إلى أهداف أصغر." if lang == "ar" else "The goal is too big. Break it into smaller goals.")
        
        return suggestions


goal_intelligence = GoalIntelligence()
