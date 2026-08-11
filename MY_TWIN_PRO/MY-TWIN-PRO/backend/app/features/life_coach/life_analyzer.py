"""
LIFE ANALYZER – الطبقة الثانية من Life Coach
===============================================
- تحليل شامل: الصحة، العمل، العلاقات، النوم، الأكل، المال، الطاقة
- اكتشاف الأنماط والترابطات
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

LIFE_DOMAINS = {
    "health": ["وزن", "مرض", "ألم", "طبيب", "دواء", "صحة", "لياقة", "رياضة"],
    "work": ["عمل", "مدير", "شركة", "راتب", "مشروع", "وظيفة", "اجتماع", "ضغط"],
    "relationships": ["زوج", "زوجة", "أب", "أم", "صديق", "حب", "شريك", "أهل"],
    "sleep": ["نوم", "أرق", "سهر", "نعسان", "مرهق", "تعب", "نمت"],
    "nutrition": ["أكل", "طعام", "جوع", "شهية", "دايت", "وزن", "سعرات"],
    "money": ["مال", "فلوس", "دين", "قرض", "مصاريف", "راتب", "ميزانية"],
    "energy": ["طاقة", "نشاط", "خمول", "حيوية", "كسل", "همة"],
    "self_esteem": ["ثقتي", "أنا", "نفسي", "شكلي", "قدراتي", "أستحق"],
    "social": ["أصدقاء", "ناس", "مجتمع", "وحيد", "عزلة", "تواصل"],
    "spiritual": ["صلاة", "قرآن", "تأمل", "روح", "سلام", "معنى"],
}


class LifeAnalyzer:
    def analyze(self, text: str, history: List[Dict] = None) -> Dict[str, Any]:
        scores = self._classify_domains(text)
        
        # تحليل السياق من التاريخ
        domain_trends = {}
        if history:
            domain_trends = self._analyze_trends(history)

        # تحديد مجالات الخطر والفرص
        weak_domains = [k for k, v in scores.items() if v < 0.4]
        strong_domains = [k for k, v in scores.items() if v > 0.7]

        return {
            "domain_scores": scores,
            "primary_domain": max(scores, key=scores.get) if scores else "general",
            "weak_domains": weak_domains,
            "strong_domains": strong_domains,
            "domain_trends": domain_trends,
            "needs_balance": len(weak_domains) >= 2,
            "overall_wellness": sum(scores.values()) / len(scores) if scores else 0.5,
        }

    def _classify_domains(self, text: str) -> Dict[str, float]:
        scores = {domain: 0.0 for domain in LIFE_DOMAINS}
        text_lower = text.lower()
        for domain, keywords in LIFE_DOMAINS.items():
            for kw in keywords:
                if kw in text_lower:
                    scores[domain] += 0.2
        return {k: min(v, 1.0) for k, v in scores.items() if v > 0}

    def _analyze_trends(self, history: List[Dict]) -> Dict[str, str]:
        # تحليل مبسط للاتجاهات من آخر 10 تفاعلات
        trends = {}
        domain_counts = {}
        for interaction in history[-10:]:
            text = interaction.get("input", "") or interaction.get("content", "")
            domains = self._classify_domains(text)
            for d in domains:
                domain_counts[d] = domain_counts.get(d, 0) + 1
        
        for domain, count in domain_counts.items():
            if count >= 3:
                trends[domain] = "improving" if count > 5 else "stable"
            else:
                trends[domain] = "declining"
        return trends


life_analyzer = LifeAnalyzer()
