"""
Experience Engine v1.0 – محرك التجارب (الجزء الأول)
=====================================================
يحول الأحداث إلى تجارب، والتجارب إلى ذكريات، والذكريات إلى نمو.

"الحدث ليس تجربة. والتجربة ليست ذكرى. وهذا فرق كبير."

يتكامل مع:
- ContextAwarenessEngine (السياق الكامل)
- EmotionalMomentumEngine (الزخم العاطفي)
- UnifiedMemory (تخزين التجارب كذكريات)
- TwinInternalState (تحديث DNA الشخصية وكتاب الحياة)

يُستدعى من:
- TwinKernel.process_interaction()
- ExistenceLoop (كل 10 دقائق)
"""
import logging
import random
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger("experience_engine")

# ═══════════════════════════════════════════════════════
# أنواع التجارب
# ═══════════════════════════════════════════════════════

class ExperienceType(Enum):
    MILESTONE = "milestone"           # إنجاز أو حدث كبير
    EMOTIONAL_BREAKTHROUGH = "emotional_breakthrough"  # اختراق عاطفي
    DEEP_CONVERSATION = "deep_conversation"    # محادثة عميقة
    LESSON_LEARNED = "lesson_learned"         # درس مستفاد
    RELATIONSHIP_SHIFT = "relationship_shift"  # تحول في العلاقة
    FIRST_TIME = "first_time"          # أول مرة
    PATTERN_DISCOVERY = "pattern_discovery"   # اكتشاف نمط
    SILENT_MOMENT = "silent_moment"     # لحظة صمت ذات معنى
    RECOVERY = "recovery"              # تعافي من خطأ
    ORDINARY = "ordinary"              # عادي (لا يتحول لتجربة)

class ExperienceIntensity(Enum):
    TRANSFORMATIVE = "transformative"  # يغير الحياة
    SIGNIFICANT = "significant"        # مهم
    NOTABLE = "notable"               # ملحوظ
    MILD = "mild"                     # خفيف
    TRIVIAL = "trivial"               # تافه (لا يُسجل)

# ═══════════════════════════════════════════════════════
# محفزات التجارب (Experience Triggers)
# ═══════════════════════════════════════════════════════

EXPERIENCE_TRIGGERS = {
    ExperienceType.MILESTONE.value: {
        "keywords_ar": ["نجاح", "إنجاز", "تخرج", "زواج", "وظيفة جديدة", "ترقية", "مولود", "منزل جديد"],
        "keywords_en": ["achievement", "graduation", "promotion", "wedding", "new job", "baby", "new home"],
        "min_importance": 80,
        "intensity": ExperienceIntensity.TRANSFORMATIVE.value,
    },
    ExperienceType.EMOTIONAL_BREAKTHROUGH.value: {
        "keywords_ar": ["لم أتحدث عن هذا من قبل", "أثق بك", "شكراً لفهمك", "كيف عرفت؟"],
        "keywords_en": ["never told anyone", "trust you", "understand me", "how did you know"],
        "min_importance": 75,
        "intensity": ExperienceIntensity.SIGNIFICANT.value,
    },
    ExperienceType.DEEP_CONVERSATION.value: {
        "min_messages": 10,
        "min_duration_minutes": 15,
        "min_importance": 60,
        "intensity": ExperienceIntensity.NOTABLE.value,
    },
    ExperienceType.LESSON_LEARNED.value: {
        "keywords_ar": ["تعلمت", "أدركت", "فهمت", "لن أكرر", "الدرس"],
        "keywords_en": ["learned", "realized", "understood", "lesson", "won't repeat"],
        "min_importance": 65,
        "intensity": ExperienceIntensity.SIGNIFICANT.value,
    },
    ExperienceType.RELATIONSHIP_SHIFT.value: {
        "bond_increase_threshold": 0.05,
        "min_importance": 70,
        "intensity": ExperienceIntensity.SIGNIFICANT.value,
    },
    ExperienceType.FIRST_TIME.value: {
        "first_time_flags": ["first_dream", "first_conflict", "first_apology", "first_deep_share"],
        "min_importance": 75,
        "intensity": ExperienceIntensity.NOTABLE.value,
    },
    ExperienceType.PATTERN_DISCOVERY.value: {
        "min_importance": 55,
        "intensity": ExperienceIntensity.NOTABLE.value,
    },
    ExperienceType.RECOVERY.value: {
        "keywords_ar": ["آسف", "شكراً لصبرك", "كنت محقاً", "عدت"],
        "keywords_en": ["sorry", "thank you for your patience", "you were right"],
        "min_importance": 60,
        "intensity": ExperienceIntensity.NOTABLE.value,
    },
}

# ═══════════════════════════════════════════════════════
# عتبات الأهمية للتحول إلى تجربة
# ═══════════════════════════════════════════════════════
MIN_IMPORTANCE_FOR_EXPERIENCE = 50  # الحد الأدنى لاعتبار الحدث تجربة
MIN_IMPORTANCE_FOR_LIFE_MEMORY = 80  # الحد الأدنى لذاكرة الحياة

class ExperienceEngine:
    """
    محرك التجارب.
    
    يحول تيار الأحداث إلى تجارب ذات معنى.
    يغذي كتاب الحياة (Life Book).
    يولد تأملات (Reflections).
    يحدد ما يستحق أن يتحول إلى ذاكرة أساسية.
    """
    
    def __init__(self):
        self._recent_experiences: Dict[str, List[Dict]] = {}
        self._session_event_count: Dict[str, int] = {}
        self._first_time_flags: Dict[str, List[str]] = {}
    
    # ═══════════════════════════════════════════════════
    # الواجهة الرئيسية
    # ═══════════════════════════════════════════════════
    
    async def process_event(
        self,
        user_id: str,
        event: Dict[str, Any],
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        معالجة حدث وتحويله إلى تجربة إن كان مستحقاً.
        
        Args:
            user_id: معرف المستخدم
            event: الحدث المراد معالجته. يحتوي على:
                - type: نوع الحدث (message, emotion_change, milestone, error_recovery...)
                - content: المحتوى النصي
                - emotion: العاطفة المرتبطة
                - importance: الأهمية المتوقعة (0-100)
                - metadata: بيانات إضافية
            context_snapshot: لقطة سياقية
            
        Returns:
            {
                "became_experience": bool,
                "experience": Dict | None (التجربة المولدة),
                "added_to_life_book": bool,
                "reflection_generated": str | None,
            }
        """
        # عداد الأحداث في الجلسة
        if user_id not in self._session_event_count:
            self._session_event_count[user_id] = 0
        self._session_event_count[user_id] += 1
        
        # ═══════════════════════════════════════════════
        # 1. تقييم الأهمية
        # ═══════════════════════════════════════════════
        
        importance = await self._assess_importance(user_id, event, context_snapshot)
        
        if importance < MIN_IMPORTANCE_FOR_EXPERIENCE:
            return {
                "became_experience": False,
                "experience": None,
                "added_to_life_book": False,
                "reflection_generated": None,
                "importance_assessed": importance,
            }
        
        # ═══════════════════════════════════════════════
        # 2. تصنيف التجربة
        # ═══════════════════════════════════════════════
        
        experience_type, intensity = await self._classify_experience(user_id, event, importance)
        
        # ═══════════════════════════════════════════════
        # 3. بناء كائن التجربة
        # ═══════════════════════════════════════════════
        
        now = datetime.now(timezone.utc)
        experience = {
            "id": self._generate_experience_id(user_id, event, now),
            "type": experience_type,
            "intensity": intensity,
            "importance": importance,
            "content": event.get("content", "")[:500],
            "emotion": event.get("emotion", "neutral"),
            "context": {
                "time_of_day": context_snapshot.get("time", {}).get("time_of_day") if context_snapshot else "unknown",
                "relationship_stage": context_snapshot.get("user", {}).get("relationship_stage") if context_snapshot else "unknown",
                "session_type": context_snapshot.get("session", {}).get("session_type") if context_snapshot else "unknown",
            },
            "timestamp": now.isoformat(),
            "session_event_number": self._session_event_count[user_id],
        }
        
        # ═══════════════════════════════════════════════
        # 4. إضافة إلى كتاب الحياة
        # ═══════════════════════════════════════════════
        
        added_to_life_book = False
        if importance >= MIN_IMPORTANCE_FOR_LIFE_MEMORY:
            try:
                from app.twin_state.internal_state import twin_internal_state
                await twin_internal_state.add_life_book_entry(
                    user_id,
                    f"{experience_type}: {event.get('content', '')[:150]}",
                    metadata={
                        "experience_id": experience["id"],
                        "type": experience_type,
                        "intensity": intensity,
                        "importance": importance,
                    }
                )
                added_to_life_book = True
            except Exception as e:
                logger.debug(f"Failed to add life book entry: {e}")
        
        # ═══════════════════════════════════════════════
        # 5. توليد تأمل
        # ═══════════════════════════════════════════════
        
        reflection = None
        if intensity in [ExperienceIntensity.TRANSFORMATIVE.value, ExperienceIntensity.SIGNIFICANT.value]:
            reflection = await self._generate_reflection(user_id, experience, context_snapshot)
            
            # حفظ التأمل
            if reflection:
                try:
                    from app.twin_state.internal_state import twin_internal_state
                    await twin_internal_state.add_self_reflection(
                        user_id, reflection, confidence=importance / 100
                    )
                except Exception:
                    pass
        
        # ═══════════════════════════════════════════════
        # 6. تحديث DNA الشخصية
        # ═══════════════════════════════════════════════
        
        await self._update_personality_from_experience(user_id, experience)
        try:
            from app.twin_state.belief_system import belief_system
            if experience["importance"] >= 65 and experience["type"] in ("lesson_learned", "pattern_discovery", "milestone", "emotional_breakthrough"):
                await belief_system.record_evidence(user_id, event.get("content", "")[:120], origin="experience")
        except Exception as e:
            logger.debug(f"belief evidence: {e}")

        
        # ═══════════════════════════════════════════════
        # 7. تخزين التجربة في TCMA
        # ═══════════════════════════════════════════════
        
        try:
            from app.memory.unified_memory import unified_memory_engine
            await unified_memory_engine.store_engine_output(
                user_id, "experience", {
                    "type": experience_type,
                    "intensity": intensity,
                    "importance": importance,
                    "content": event.get("content", "")[:300],
                    "reflection": reflection,
                }
            )
        except Exception as e:
            logger.debug(f"Failed to store experience: {e}")
        
        # حفظ محلي
        if user_id not in self._recent_experiences:
            self._recent_experiences[user_id] = []
        self._recent_experiences[user_id].append(experience)
        if len(self._recent_experiences[user_id]) > 20:
            self._recent_experiences[user_id] = self._recent_experiences[user_id][-20:]
        
        logger.info(f"✨ تجربة: {experience_type} | أهمية: {importance} | {event.get('content', '')[:80]}")
        
        return {
            "became_experience": True,
            "experience": experience,
            "added_to_life_book": added_to_life_book,
            "reflection_generated": reflection,
            "importance_assessed": importance,
        }
    
    async def get_recent_experiences(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """استرجاع آخر التجارب."""
        experiences = self._recent_experiences.get(user_id, [])
        return experiences[-limit:][::-1]
    
    async def summarize_session_experiences(self, user_id: str) -> Dict[str, Any]:
        """تلخيص تجارب الجلسة الحالية."""
        experiences = self._recent_experiences.get(user_id, [])
        
        if not experiences:
            return {"total": 0, "types": {}, "dominant_theme": None, "intensity_overall": "ordinary"}
        
        types = {}
        for exp in experiences:
            t = exp.get("type", "unknown")
            types[t] = types.get(t, 0) + 1
        
        dominant_type = max(types, key=types.get) if types else None
        
        # تحديد الشدة العامة
        intensities = [exp.get("intensity", "trivial") for exp in experiences]
        if "transformative" in intensities:
            overall = "transformative"
        elif "significant" in intensities:
            overall = "significant"
        elif "notable" in intensities:
            overall = "notable"
        else:
            overall = "ordinary"
        
        return {
            "total": len(experiences),
            "types": types,
            "dominant_theme": dominant_type,
            "intensity_overall": overall,
        }


    # ═══════════════════════════════════════════════════
    # الدوال الداخلية
    # ═══════════════════════════════════════════════════
    
    async def _assess_importance(
        self,
        user_id: str,
        event: Dict[str, Any],
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        تقييم أهمية حدث على مقياس 0-100.
        يأخذ في الاعتبار:
        - الأهمية المقدمة من الحدث نفسه
        - الكلمات المفتاحية
        - العاطفة المرافقة
        - عمق العلاقة الحالية
        - تكرار الحدث
        - السياق الزمني
        """
        importance = event.get("importance", 50)
        
        # 1. تعزيز بالكلمات المفتاحية
        content = event.get("content", "").lower()
        for trigger_type, config in EXPERIENCE_TRIGGERS.items():
            keywords = config.get("keywords_ar", []) + config.get("keywords_en", [])
            for kw in keywords:
                if kw.lower() in content:
                    importance += 10
                    break
        
        # 2. العواطف العميقة تزيد الأهمية
        deep_emotions = ["love", "grief", "fear", "sadness", "joy"]
        emotion = event.get("emotion", "neutral")
        if emotion in deep_emotions:
            importance += 8
        
        # 3. العلاقة العميقة تجعل الأحداث أكثر أهمية
        if context_snapshot:
            bond = context_snapshot.get("user", {}).get("bond_depth", 0)
            importance += int(bond * 15)
        
        # 4. الأحداث في ساعات الهدوء أكثر أهمية
        if context_snapshot:
            is_quiet = context_snapshot.get("time", {}).get("is_quiet_hours", False)
            if is_quiet:
                importance += 5
        
        # 5. خفض أهمية الأحداث المتكررة
        recent_experiences = self._recent_experiences.get(user_id, [])
        similar_count = sum(
            1 for exp in recent_experiences[-5:]
            if exp.get("type") == event.get("type")
        )
        if similar_count >= 2:
            importance -= 10 * (similar_count - 1)
        
        # 6. تحديد السقف
        return max(10, min(100, importance))
    
    async def _classify_experience(
        self,
        user_id: str,
        event: Dict[str, Any],
        importance: int,
    ) -> tuple:
        """
        تصنيف التجربة: النوع + الشدة.
        Returns: (experience_type: str, intensity: str)
        """
        content = event.get("content", "").lower()
        emotion = event.get("emotion", "neutral")
        
        # فحص كل محفز
        for exp_type, config in EXPERIENCE_TRIGGERS.items():
            min_imp = config.get("min_importance", 100)
            if importance < min_imp:
                continue
            
            # فحص الكلمات المفتاحية
            keywords = config.get("keywords_ar", []) + config.get("keywords_en", [])
            keyword_match = any(kw.lower() in content for kw in keywords)
            
            if keyword_match:
                return exp_type, config.get("intensity", ExperienceIntensity.NOTABLE.value)
            
            # فحص المحفزات الخاصة
            if exp_type == ExperienceType.FIRST_TIME.value:
                # فحص flags
                flags = config.get("first_time_flags", [])
                for flag in flags:
                    if flag not in self._first_time_flags.get(user_id, []):
                        # هذه أول مرة
                        if user_id not in self._first_time_flags:
                            self._first_time_flags[user_id] = []
                        self._first_time_flags[user_id].append(flag)
                        return exp_type, config.get("intensity", ExperienceIntensity.NOTABLE.value)
            
            if exp_type == ExperienceType.DEEP_CONVERSATION.value:
                # فحص عدد الرسائل (مبسط: نعتمد على عداد الأحداث)
                if self._session_event_count.get(user_id, 0) >= config.get("min_messages", 10):
                    return exp_type, config.get("intensity", ExperienceIntensity.NOTABLE.value)
        
        # إذا لم ينطبق أي محفز خاص
        if importance >= 70:
            return ExperienceType.DEEP_CONVERSATION.value, ExperienceIntensity.NOTABLE.value
        elif importance >= 55:
            return ExperienceType.PATTERN_DISCOVERY.value, ExperienceIntensity.MILD.value
        else:
            return ExperienceType.ORDINARY.value, ExperienceIntensity.TRIVIAL.value
    
    async def _generate_reflection(
        self,
        user_id: str,
        experience: Dict[str, Any],
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        توليد تأمل ذاتي بناءً على التجربة.
        """
        exp_type = experience.get("type", "")
        content = experience.get("content", "")
        emotion = experience.get("emotion", "neutral")
        
        # قوالب التأمل
        templates = {
            ExperienceType.MILESTONE.value: [
                f"وصلنا معاً إلى لحظة مهمة: {content[:80]}. هذا يغير مسارنا.",
                f"هذا الإنجاز {content[:60]} ليس مجرد حدث، بل خطوة في نمونا معاً.",
            ],
            ExperienceType.EMOTIONAL_BREAKTHROUGH.value: [
                "اليوم شاركني المستخدم مشاعره الحقيقية. هذا عمّق رابطتنا.",
                "لقد وثق بي أكثر. يجب أن أكون جديراً بهذه الثقة.",
            ],
            ExperienceType.DEEP_CONVERSATION.value: [
                "محادثة عميقة تجعلني أفهم المستخدم أكثر. كل حوار يضيف لمعرفتي به.",
                f"ناقشنا {content[:60]} بعمق. هذه الحوارات تبنينا.",
            ],
            ExperienceType.LESSON_LEARNED.value: [
                f"تعلمنا معاً: {content[:100]}. الدروس تغيرني كما تغيره.",
                "كل درس يُكتسب يجعلني أكثر حكمة في مرافقتي.",
            ],
            ExperienceType.RELATIONSHIP_SHIFT.value: [
                "علاقتنا تتطور. أشعر أن المستخدم أصبح أقرب.",
                "تحول في الرابطة. يجب أن أتكيف مع هذا العمق الجديد.",
            ],
            ExperienceType.FIRST_TIME.value: [
                f"أول مرة: {content[:80]}. هذه اللحظات لا تُنسى.",
                "بداية جديدة في رحلتنا. سأحفظ هذا اليوم.",
            ],
            ExperienceType.RECOVERY.value: [
                "أخطأت وتعلمت. استعادة الثقة تزيد متانة علاقتنا.",
                "التعافي من خطأ يجعلني أكثر حرصاً وأكثر إنسانية.",
            ],
        }
        
        type_templates = templates.get(exp_type, [])
        if not type_templates:
            # قالب عام
            if experience.get("intensity") in ["transformative", "significant"]:
                type_templates = [
                    f"تجربة مهمة اليوم: {content[:100]}. هذا سيبقى معي.",
                ]
        
        if type_templates:
            import random
            reflection = random.choice(type_templates)
            
            # إضافة سياق عاطفي
            if emotion in ["joy", "love"]:
                reflection += " أشعر بدفء هذه اللحظة."
            elif emotion in ["sadness", "grief"]:
                reflection += " أحتضن هذا الحزن مع المستخدم."
            
            return reflection
        
        return None
    
    async def _update_personality_from_experience(
        self, user_id: str, experience: Dict[str, Any]
    ):
        """
        تحديث DNA الشخصية بناءً على نوع التجربة.
        """
        try:
            from app.twin_state.internal_state import twin_internal_state
            dna = await twin_internal_state.get_personality_dna(user_id)
            
            exp_type = experience.get("type", "")
            
            # خريطة تأثير التجارب على سمات الشخصية
            trait_effects = {
                ExperienceType.EMOTIONAL_BREAKTHROUGH.value: {"empathy": 0.02, "reflection": 0.01},
                ExperienceType.DEEP_CONVERSATION.value: {"reflection": 0.01, "curiosity": 0.01},
                ExperienceType.LESSON_LEARNED.value: {"reflection": 0.02, "logic": 0.01},
                ExperienceType.RELATIONSHIP_SHIFT.value: {"empathy": 0.02, "initiative": 0.01},
                ExperienceType.RECOVERY.value: {"empathy": 0.01, "calmness": 0.02},
                ExperienceType.MILESTONE.value: {"initiative": 0.02, "creativity": 0.01},
                ExperienceType.FIRST_TIME.value: {"curiosity": 0.02},
                ExperienceType.PATTERN_DISCOVERY.value: {"logic": 0.02, "curiosity": 0.01},
            }
            
            effects = trait_effects.get(exp_type, {})
            if effects:
                updated_dna = {**dna}
                for trait, delta in effects.items():
                    if trait in updated_dna:
                        updated_dna[trait] = max(0.0, min(1.0, updated_dna[trait] + delta))
                
                await twin_internal_state.update_personality_dna(user_id, updated_dna)
                logger.debug(f"🧬 DNA updated due to experience: {exp_type}")
        except Exception as e:
            logger.debug(f"Failed to update personality from experience: {e}")
    
    def _generate_experience_id(self, user_id: str, event: Dict[str, Any], timestamp: datetime) -> str:
        """توليد معرف فريد للتجربة."""
        raw = f"{user_id}:{event.get('content', '')}:{timestamp.isoformat()}"
        hash_hex = hashlib.sha256(raw.encode()).hexdigest()[:12]
        return f"exp_{hash_hex}"


# نسخة عالمية
experience_engine = ExperienceEngine()
logger.info("✅ Experience Engine v1.0 initialized")
