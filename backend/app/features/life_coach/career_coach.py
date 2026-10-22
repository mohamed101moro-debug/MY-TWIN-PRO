"""
CAREER COACH v1.0 – المدرب المهني
====================================
- تغيير وظيفة
- تحسين CV
- تحضير المقابلات
- الترقية
- الاحتراق الوظيفي
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class CareerCoach:
    def analyze(self, topic: str, profile: Dict, lang: str = "ar") -> Dict[str, Any]:
        """تحليل مهني شامل"""
        
        # تحديد مجال المشكلة
        domain = self._identify_career_domain(topic)
        
        # تحليل المهارات
        skills = profile.get("skills", [])
        
        # نصائح حسب المجال
        advice = self._generate_advice(domain, skills, lang)
        
        # خطة عمل
        action_plan = self._create_action_plan(domain, lang)
        
        return {
            "domain": domain,
            "current_skills": skills,
            "advice": advice,
            "action_plan": action_plan,
            "burnout_risk": self._assess_burnout_risk(topic),
        }

    def _identify_career_domain(self, topic: str) -> str:
        """تحديد مجال المشكلة المهنية"""
        text_lower = topic.lower()
        domains = {
            "job_change": ["تغيير وظيفة", "وظيفة جديدة", "أترك", "استقالة", "أبحث عن عمل"],
            "cv": ["سيرة ذاتية", "CV", "resume", "خبرات"],
            "interview": ["مقابلة", "interview", "توظيف"],
            "promotion": ["ترقية", "promotion", "زيادة راتب", "منصب"],
            "burnout": ["احتراق", "burnout", "مرهق من العمل", "فقدت الشغف"],
            "skills": ["مهارات", "تعلم", "دورة", "تطوير"],
        }
        for domain, keywords in domains.items():
            if any(kw in text_lower for kw in keywords):
                return domain
        return "general"

    def _generate_advice(self, domain: str, skills: List[str], lang: str) -> List[str]:
        """نصائح مخصصة"""
        advice = []
        if lang == "ar":
            if domain == "job_change":
                advice.append("قبل الاستقالة، تأكد من وجود عرض عمل بديل أو مدخرات تكفي 6 أشهر.")
                advice.append("حدث LinkedIn و CV قبل البدء بالبحث.")
            elif domain == "interview":
                advice.append("ابحث عن الشركة جيداً قبل المقابلة. استخدم STAR للإجابة.")
            elif domain == "burnout":
                advice.append("خذ إجازة فوراً. الاحتراق الوظيفي لا يتحسن بالاستمرار.")
        else:
            if domain == "job_change":
                advice.append("Secure a new offer or 6-month savings before resigning.")
            elif domain == "burnout":
                advice.append("Take leave immediately. Burnout doesn't improve by pushing through.")
        return advice

    def _create_action_plan(self, domain: str, lang: str) -> List[Dict]:
        """خطة عمل"""
        plans = {
            "job_change": [
                {"step_ar": "تحديث السيرة الذاتية", "step_en": "Update CV", "timeline": "أسبوع"},
                {"step_ar": "تفعيل LinkedIn", "step_en": "Activate LinkedIn", "timeline": "3 أيام"},
                {"step_ar": "تقديم 5 طلبات يومياً", "step_en": "Apply to 5 jobs daily", "timeline": "شهر"},
            ],
            "interview": [
                {"step_ar": "البحث عن الشركة", "step_en": "Research company", "timeline": "قبل المقابلة بيومين"},
                {"step_ar": "تحضير إجابات STAR", "step_en": "Prepare STAR answers", "timeline": "قبل المقابلة بيوم"},
            ],
        }
        return plans.get(domain, [{"step_ar": "حدد هدفك المهني بوضوح", "step_en": "Define your career goal clearly", "timeline": "اليوم"}])

    def _assess_burnout_risk(self, topic: str) -> float:
        """تقييم خطر الاحتراق"""
        burnout_keywords = ["مرهق", "استنزاف", "لا طاقة", "فقدت الشغف", "لا أستطيع", "محبط"]
        score = sum(1 for kw in burnout_keywords if kw in topic) * 0.2
        return min(score, 1.0)


career_coach = CareerCoach()
