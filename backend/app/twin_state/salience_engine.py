"""
Salience Engine v1.0 – محرك الأهمية الوجودية
===============================================
يحدد: "هل هذا الحدث سيغير حياتي؟"
يقيس الأهمية النسبية للأحداث والتجارب والمعلومات.

يتكامل مع:
- ExperienceEngine (تقييم التجارب)
- WorldModel (ربط الأحداث بالكيانات)
- UnifiedMemory (استرجاع أنماط الماضي للمقارنة)
- EmotionalMomentumEngine (العواطف تؤثر على الأهمية)

يُستدعى من:
- TwinKernel.process_interaction()
- ExistenceLoop (كل 10 دقائق)
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger("salience_engine")

# ═══════════════════════════════════════════════════════
# مستويات الأهمية
# ═══════════════════════════════════════════════════════

class SalienceLevel(Enum):
    LIFE_CHANGING = "life_changing"       # سيغير مسار الحياة
    HIGHLY_SIGNIFICANT = "highly_significant"  # مهم جداً
    SIGNIFICANT = "significant"           # مهم
    MODERATE = "moderate"                 # متوسط
    MILD = "mild"                         # خفيف
    TRIVIAL = "trivial"                   # تافه
    NOISE = "noise"                       # ضوضاء - لا قيمة له


class SalienceEngine:
    """
    محرك الأهمية الوجودية.
    
    يحسب درجة الأهمية لكل حدث بناءً على:
    - الندرة (هل حدث من قبل؟)
    - التأثير العاطفي (ما مدى قوة المشاعر المرتبطة؟)
    - التأثير طويل المدى (هل سيغير سلوك المستخدم أو الكيان؟)
    - الترابط (هل يرتبط بأحداث/أشخاص مهمين آخرين؟)
    - التوقيت (هل يحدث في لحظة حساسة؟)
    """
    
    def __init__(self):
        self._salience_history: Dict[str, List[Dict]] = {}
        self._baseline: Dict[str, Dict[str, float]] = {}  # خط الأساس لكل مستخدم
    
    # ═══════════════════════════════════════════════════
    # الواجهة الرئيسية
    # ═══════════════════════════════════════════════════
    
    async def evaluate_salience(
        self,
        user_id: str,
        event: Dict[str, Any],
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        تقييم الأهمية الوجودية لحدث ما.
        
        Args:
            user_id: معرف المستخدم
            event: الحدث المطلوب تقييمه
            context_snapshot: لقطة سياقية
            
        Returns:
            {
                "salience_score": float (0-100),
                "level": str,
                "factors": Dict (العوامل المساهمة),
                "recommendation": str (ماذا يفعل الكيان؟),
                "will_change_life": bool,
            }
        """
        # ═══════════════════════════════════════════════
        # 1. تقييم الندرة (Rarity)
        # ═══════════════════════════════════════════════
        rarity_score = await self._evaluate_rarity(user_id, event)
        
        # ═══════════════════════════════════════════════
        # 2. تقييم التأثير العاطفي (Emotional Impact)
        # ═══════════════════════════════════════════════
        emotional_score = self._evaluate_emotional_impact(event)
        
        # ═══════════════════════════════════════════════
        # 3. تقييم التأثير طويل المدى (Long-term Impact)
        # ═══════════════════════════════════════════════
        longterm_score = await self._evaluate_longterm_impact(user_id, event, context_snapshot)
        
        # ═══════════════════════════════════════════════
        # 4. تقييم الترابط (Connectedness)
        # ═══════════════════════════════════════════════
        connectedness_score = await self._evaluate_connectedness(user_id, event)
        
        # ═══════════════════════════════════════════════
        # 5. تقييم التوقيت (Timing)
        # ═══════════════════════════════════════════════
        timing_score = self._evaluate_timing(event, context_snapshot)
        
        # ═══════════════════════════════════════════════
        # 6. حساب الدرجة النهائية
        # ═══════════════════════════════════════════════
        weights = {
            "rarity": 0.25,
            "emotional_impact": 0.25,
            "longterm_impact": 0.25,
            "connectedness": 0.15,
            "timing": 0.10,
        }
        
        raw_score = (
            rarity_score * weights["rarity"] +
            emotional_score * weights["emotional_impact"] +
            longterm_score * weights["longterm_impact"] +
            connectedness_score * weights["connectedness"] +
            timing_score * weights["timing"]
        )
        
        # تطبيع إلى 0-100
        salience_score = min(100, max(0, int(raw_score * 100)))
        
        # تحديد المستوى
        level = self._determine_level(salience_score)
        will_change_life = level in [
            SalienceLevel.LIFE_CHANGING.value,
            SalienceLevel.HIGHLY_SIGNIFICANT.value,
        ]
        
        # توصية
        recommendation = self._generate_recommendation(level, salience_score)
        
        result = {
            "salience_score": salience_score,
            "level": level,
            "will_change_life": will_change_life,
            "factors": {
                "rarity": round(rarity_score, 3),
                "emotional_impact": round(emotional_score, 3),
                "longterm_impact": round(longterm_score, 3),
                "connectedness": round(connectedness_score, 3),
                "timing": round(timing_score, 3),
            },
            "recommendation": recommendation,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        # حفظ في التاريخ
        if user_id not in self._salience_history:
            self._salience_history[user_id] = []
        self._salience_history[user_id].append(result)
        if len(self._salience_history[user_id]) > 100:
            self._salience_history[user_id] = self._salience_history[user_id][-100:]
        
        # تخزين في TCMA للأحداث عالية الأهمية
        if salience_score >= 50:
            try:
                from app.memory.unified_memory import unified_memory_engine
                await unified_memory_engine.store_engine_output(
                    user_id, "salience", {
                        "score": salience_score,
                        "level": level,
                        "event_content": event.get("content", "")[:200],
                        "recommendation": recommendation,
                    }
                )
            except Exception as e:
                logger.debug(f"Failed to store salience: {e}")
        
        if will_change_life:
            logger.info(f"🔮 حدث سيغير الحياة: {salience_score}/100 | {event.get('content', '')[:80]}")
        
        return result
    
    async def get_baseline(self, user_id: str) -> Dict[str, float]:
        """استرجاع خط الأساس للأهمية."""
        if user_id in self._baseline:
            return self._baseline[user_id]
        
        # حساب من التاريخ
        history = self._salience_history.get(user_id, [])
        if not history:
            return {"avg_score": 30, "volatility": 10}
        
        scores = [h.get("salience_score", 30) for h in history]
        avg = sum(scores) / len(scores) if scores else 30
        variance = sum((s - avg) ** 2 for s in scores) / len(scores) if scores else 0
        
        baseline = {
            "avg_score": round(avg, 1),
            "volatility": round(variance ** 0.5, 1),
            "total_events": len(history),
        }
        self._baseline[user_id] = baseline
        return baseline
    
    async def is_significant(self, user_id: str, event: Dict[str, Any]) -> bool:
        """تقييم سريع: هل هذا الحدث مهم؟"""
        result = await self.evaluate_salience(user_id, event)
        return result["salience_score"] >= 40
    
    # ═══════════════════════════════════════════════════
    # دوال التقييم الفرعية
    # ═══════════════════════════════════════════════════
    
    async def _evaluate_rarity(self, user_id: str, event: Dict[str, Any]) -> float:
        """
        تقييم ندرة الحدث.
        1.0 = لم يحدث مثله أبداً
        0.0 = حدث مئات المرات
        """
        event_type = event.get("type", "unknown")
        event_content = event.get("content", "")
        
        # فحص التاريخ
        history = self._salience_history.get(user_id, [])
        similar_events = [
            h for h in history[-50:]
            if h.get("factors", {}).get("type") == event_type
        ]
        
        if not similar_events:
            return 0.95  # نادر جداً
        
        # إذا تكرر كثيراً
        occurrence_ratio = len(similar_events) / max(len(history), 1)
        if occurrence_ratio > 0.3:
            return 0.1  # شائع
        elif occurrence_ratio > 0.1:
            return 0.4  # متكرر قليلاً
        
        return 0.7  # نادر نسبياً
    
    def _evaluate_emotional_impact(self, event: Dict[str, Any]) -> float:
        """
        تقييم التأثير العاطفي.
        """
        emotion = event.get("emotion", "neutral")
        intensity = event.get("intensity", 0.5)
        
        # المشاعر العميقة لها وزن أكبر
        emotion_weights = {
            "grief": 0.95,
            "love": 0.90,
            "fear": 0.80,
            "sadness": 0.75,
            "joy": 0.70,
            "anger": 0.65,
            "surprise": 0.60,
            "neutral": 0.30,
        }
        
        base = emotion_weights.get(emotion, 0.40)
        # تعزيز بالشدة
        weighted = base * (0.5 + intensity * 0.5)
        
        return min(1.0, weighted)
    
    async def _evaluate_longterm_impact(
        self, user_id: str, event: Dict[str, Any], context: Optional[Dict]
    ) -> float:
        """
        تقييم التأثير طويل المدى.
        هل سيغير هذا سلوك المستخدم أو الكيان؟
        """
        score = 0.3  # أساسي
        
        event_type = event.get("type", "unknown")
        event_content = event.get("content", "").lower()
        
        # أنواع الأحداث عالية التأثير
        high_impact_types = [
            "milestone", "emotional_breakthrough", "relationship_shift",
            "lesson_learned", "first_time",
        ]
        if event_type in high_impact_types:
            score += 0.4
        
        # كلمات مفتاحية تدل على تغيير
        change_keywords = [
            "تغير", "تحول", "قررت", "سأبدأ", "سأتوقف", "من اليوم",
            "change", "decided", "starting", "stopping", "from now on",
        ]
        if any(kw in event_content for kw in change_keywords):
            score += 0.3
        
        # إذا كان مرتبطاً بأهداف
        if event.get("metadata", {}).get("related_to_goal"):
            score += 0.2
        
        return min(1.0, score)
    
    async def _evaluate_connectedness(self, user_id: str, event: Dict[str, Any]) -> float:
        """
        تقييم مدى ترابط الحدث مع أشياء مهمة أخرى.
        """
        score = 0.2  # أساسي
        
        try:
            from app.twin_state.world_model import world_model_engine
            # كم عدد الكيانات المرتبطة بهذا الحدث؟
            event_content = event.get("content", "")
            related_entities = await world_model_engine.query_world(user_id, event_content[:50])
            
            if len(related_entities) >= 5:
                score += 0.5
            elif len(related_entities) >= 2:
                score += 0.3
            elif len(related_entities) >= 1:
                score += 0.1
        except Exception:
            pass
        
        return min(1.0, score)
    
    def _evaluate_timing(
        self, event: Dict[str, Any], context: Optional[Dict]
    ) -> float:
        """
        تقييم حساسية التوقيت.
        """
        score = 0.5  # أساسي
        
        if context:
            time_of_day = context.get("time", {}).get("time_of_day", "morning")
            is_quiet = context.get("time", {}).get("is_quiet_hours", False)
            
            # الأحداث في ساعات الهدوء أكثر أهمية
            if is_quiet:
                score += 0.3
            
            # الأحداث المسائية أكثر تأملاً
            if time_of_day in ["evening", "night"]:
                score += 0.1
        
        # إذا كان الحدث عاجلاً
        if event.get("urgency") == "high":
            score += 0.2
        
        return min(1.0, score)
    
    def _determine_level(self, score: int) -> str:
        """تحديد مستوى الأهمية من الدرجة."""
        if score >= 90:
            return SalienceLevel.LIFE_CHANGING.value
        elif score >= 75:
            return SalienceLevel.HIGHLY_SIGNIFICANT.value
        elif score >= 60:
            return SalienceLevel.SIGNIFICANT.value
        elif score >= 40:
            return SalienceLevel.MODERATE.value
        elif score >= 25:
            return SalienceLevel.MILD.value
        elif score >= 10:
            return SalienceLevel.TRIVIAL.value
        else:
            return SalienceLevel.NOISE.value
    
    def _generate_recommendation(self, level: str, score: int) -> str:
        """توليد توصية بناءً على مستوى الأهمية."""
        recommendations = {
            "life_changing": "هذا حدث مفصلي. يجب تخزينه كذاكرة حياة، وتحديث الهوية، والتأمل فيه بعمق.",
            "highly_significant": "حدث مهم جداً. يُخزن في كتاب الحياة، ويُحدث DNA الشخصية، ويُولد تأملاً.",
            "significant": "حدث مهم. يُسجل كتجربة ويُضاف إلى السجل.",
            "moderate": "حدث متوسط. يُلاحظ ويُخزن في الذاكرة قصيرة المدى.",
            "mild": "حدث خفيف. يُلاحظ فقط.",
            "trivial": "حدث عابر. لا إجراء.",
            "noise": "ضوضاء. يتم تجاهله.",
        }
        return recommendations.get(level, "لا إجراء.")


# نسخة عالمية
salience_engine = SalienceEngine()
logger.info("✅ Salience Engine v1.0 initialized")
