"""
RELATIONSHIP COACH v1.0 – محرك العلاقات المستقل
==================================================
- تحليل أنماط العلاقات
- نصائح للتواصل، الحب، الزواج، الأطفال، الطلاق، الخيانة
- تتبع صحة العلاقات عبر الزمن
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class RelationshipCoach:
    def analyze(self, topic: str, history: List[Dict], profile: Dict, lang: str = "ar") -> Dict[str, Any]:
        """تحليل شامل للعلاقات"""
        
        # تحديد مجال العلاقة
        domain = self._identify_relationship_domain(topic)
        
        # تحليل أنماط التواصل
        communication_patterns = self._analyze_communication(topic, history)
        
        # تقييم صحة العلاقة
        health_score = self._assess_relationship_health(history, profile)
        
        # نصائح مخصصة
        advice = self._generate_advice(domain, communication_patterns, health_score, lang)
        
        return {
            "domain": domain,
            "communication_patterns": communication_patterns,
            "health_score": health_score,
            "advice": advice,
            "resources": self._get_resources(domain, lang),
        }

    def _identify_relationship_domain(self, topic: str) -> str:
        """تحديد مجال العلاقة من النص"""
        text_lower = topic.lower()
        domains = {
            "romantic": ["حب", "زوج", "زوجة", "شريك", "زواج", "طلاق", "خيانة", "ارتباط"],
            "family": ["أب", "أم", "أخ", "أخت", "أهل", "عائلة", "أطفال", "ابن"],
            "friendship": ["صديق", "صديقة", "أصدقاء", "معارف"],
            "professional": ["زميل", "مدير", "فريق", "عميل"],
            "self": ["نفسي", "علاقتي بنفسي", "ثقة", "تقدير الذات"],
        }
        for domain, keywords in domains.items():
            if any(kw in text_lower for kw in keywords):
                return domain
        return "general"

    def _analyze_communication(self, topic: str, history: List[Dict]) -> Dict[str, Any]:
        """تحليل أنماط التواصل"""
        patterns = {
            "blame_language": any(kw in topic for kw in ["أنت دائماً", "أنت أبداً", "بسببك", "خطؤك"]),
            "needs_expression": any(kw in topic for kw in ["أحتاج", "أريد", "أتمنى", "يفضل"]),
            "active_listening": any(kw in topic for kw in ["أفهم", "أسمعك", "معك حق"]),
        }
        return patterns

    def _assess_relationship_health(self, history: List[Dict], profile: Dict) -> float:
        """تقييم صحة العلاقة بناءً على Bond Level"""
        return profile.get("bond_level", 50)

    def _generate_advice(self, domain: str, patterns: Dict, health: float, lang: str) -> List[str]:
        """توليد نصائح مخصصة"""
        advice = []
        if lang == "ar":
            if patterns.get("blame_language"):
                advice.append("حاول استخدام لغة 'أنا' بدلاً من 'أنت' عند التعبير عن مشاعرك.")
            if patterns.get("needs_expression"):
                advice.append("أنت تعبر عن احتياجاتك بوضوح – هذا ممتاز للتواصل الصحي.")
            if domain == "romantic":
                advice.append("خصص وقتاً يومياً للتواصل غير المشروط مع شريك حياتك.")
            if domain == "family":
                advice.append("الاستماع دون إصدار أحكام هو أقوى هدية تقدمها لأسرتك.")
        else:
            if patterns.get("blame_language"):
                advice.append("Try using 'I' statements instead of 'You' statements.")
            if domain == "romantic":
                advice.append("Set aside daily time for unconditional connection with your partner.")
        return advice

    def _get_resources(self, domain: str, lang: str) -> List[str]:
        """موارد مقترحة"""
        resources = {
            "romantic": ["كتاب: لغات الحب الخمس", "تمرين: 5 دقائق تواصل بصري"],
            "family": ["كتاب: تربية بذكاء عاطفي", "تمرين: اجتماع عائلي أسبوعي"],
            "friendship": ["تمرين: رسالة امتنان لصديق"],
            "professional": ["كتاب: الذكاء العاطفي في العمل"],
            "self": ["تمرين: كتابة رسالة حب لنفسك"],
        }
        return resources.get(domain, [])[:2]


relationship_coach = RelationshipCoach()
