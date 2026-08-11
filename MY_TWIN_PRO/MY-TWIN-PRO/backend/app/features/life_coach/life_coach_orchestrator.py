"""
L.I.F.E. C.O.A.C.H. v10.0 – التوأم الرقمي الحقيقي
=====================================================
يدمج: جميع محركات المراحل السابقة + محركات المرحلة 3
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.features.base_plugin import BasePlugin
from app.features.life_coach.emotion_analyzer import emotion_analyzer
from app.features.life_coach.life_analyzer import life_analyzer
from app.features.life_coach.clinical_intelligence import clinical_intelligence
from app.features.life_coach.nutrition_intelligence import nutrition_intelligence
from app.features.life_coach.fitness_intelligence import fitness_intelligence
from app.features.life_coach.sleep_coach import sleep_coach
from app.features.life_coach.life_score import life_score_calculator
from app.features.life_coach.goal_intelligence import goal_intelligence
from app.features.life_coach.decision_coach import decision_coach
from app.features.life_coach.conversation_memory import conversation_memory
from app.features.life_coach.emotional_growth import emotional_growth
from app.features.life_coach.preventive_coach import preventive_coach
from app.features.life_coach.long_term_memory_reasoning import long_term_memory_reasoning
from app.features.life_coach.relationship_coach import relationship_coach
from app.features.life_coach.financial_coach import financial_coach
from app.features.life_coach.career_coach import career_coach
from app.features.life_coach.ai_planner import ai_planner
from app.features.life_coach.digital_twin_core import digital_twin_core
from app.features.life_coach.habit_engine import habit_engine
from app.features.life_coach.recovery_engine import recovery_engine
from app.features.life_coach.progress_engine import progress_engine
from app.features.life_coach.prediction_engine import prediction_engine
from app.features.life_coach.coach_planner import coach_planner
from app.features.life_coach.twin_personality import twin_personality
from app.features.life_coach.journey_manager import journey_manager

logger = logging.getLogger(__name__)


class LifeCoachOrchestrator(BasePlugin):
    def __init__(self):
        super().__init__(name="LifeCoach", version="10.0.0")
        self.emotion = emotion_analyzer
        self.life = life_analyzer
        self.clinical = clinical_intelligence
        self.nutrition = nutrition_intelligence
        self.fitness = fitness_intelligence
        self.sleep = sleep_coach
        self.life_score = life_score_calculator
        self.goal = goal_intelligence
        self.decision = decision_coach
        self.memory = conversation_memory
        self.growth = emotional_growth
        self.preventive = preventive_coach
        self.long_term = long_term_memory_reasoning
        self.relationship = relationship_coach
        self.financial = financial_coach
        self.career = career_coach
        self.ai_planner = ai_planner
        self.twin_core = digital_twin_core
        self.habit = habit_engine
        self.recovery = recovery_engine
        self.progress = progress_engine
        self.prediction = prediction_engine
        self.planner = coach_planner
        self.personality = twin_personality
        self.journey = journey_manager

    @property
    def plugin_id(self) -> str: return "life_coach"
    @property
    def plugin_name_ar(self) -> str: return "مدرب الحياة"
    @property
    def plugin_name_en(self) -> str: return "Life Coach"

    async def full_session(self, user_id: str, topic: str, lang: str = "ar") -> Dict[str, Any]:
        emotion_result = self.emotion.analyze(topic)
        life_result = self.life.analyze(topic)
        clinical_result = self.clinical.comprehensive_assessment(topic)
        history = await self._get_history(user_id)
        user_context = await self._build_user_context(user_id)

        memory_context = self.memory.build_context(history, topic, lang)
        long_term = self.long_term.reason(history, user_context, lang)
        growth_analysis = self.growth.analyze_growth(history, user_context)
        relationship_analysis = self.relationship.analyze(topic, history, user_context, lang)
        preventive_check = self.preventive.check_and_intervene(user_id, {"mood_valence": emotion_result["emotion"]["valence"], "energy": user_context.get("energy", 50)}, history, lang)
        prediction = self.prediction.predict_relapse_risk(user_id, history, {"mood_valence": emotion_result["emotion"]["valence"]})
        
        # مخطط هجين
        plan = await self.ai_planner.create_hybrid_plan(
            {"emotion": emotion_result["emotion"], "life_domains": life_result["domain_scores"]},
            topic, user_context, self.ai.route, lang
        )

        try:
            prompt = self._build_ai_prompt(topic, emotion_result, clinical_result, memory_context, long_term, prediction, lang)
            ai_response, provider = await self.ai.route(prompt, task="life_coach")
        except:
            ai_response = self._fallback_response(emotion_result, lang)
            provider = "local"

        personality_msg = self.personality.get_compassionate_response("relapse" if prediction["relapse_risk"] > 0.5 else "celebration", lang)
        journey = self.journey.get_current_stage(user_context.get("start_date", datetime.now(timezone.utc).isoformat()))

        await self._save_session(user_id, topic, {"emotion": emotion_result, "clinical": clinical_result, "long_term": long_term}, plan)
        await self._save_session_to_history(user_id, topic, {"analysis": emotion_result, "plan": plan, "coach_reply": ai_response})
        await self._notify_consciousness(user_id, emotion_result)

        return {
            "analysis": {"emotion": emotion_result["emotion"], "distortions": emotion_result["cognitive_distortions"], "life_domains": life_result["domain_scores"], "clinical": clinical_result},
            "memory_context": memory_context,
            "long_term_reasoning": long_term,
            "growth_analysis": growth_analysis,
            "relationship_analysis": relationship_analysis,
            "preventive": preventive_check,
            "prediction": prediction,
            "plan": plan,
            "coach_reply": ai_response,
            "personality_touch": personality_msg,
            "journey": journey,
            "provider": provider,
        }

    async def get_dashboard(self, user_id: str, lang: str = "ar") -> Dict[str, Any]:
        context = await self._build_user_context(user_id)
        history = await self._get_history(user_id)
        goals = await self._get_goals(user_id)
        emotion = self.emotion.analyze(context.get("last_input", ""))
        progress_report = self.progress.generate_progress_report(goals, history)
        greeting = self.personality.get_greeting(context, lang)
        journey = self.journey.get_current_stage(context.get("start_date", datetime.now(timezone.utc).isoformat()))
        growth = self.growth.analyze_growth(history, context)
        preventive = self.preventive.check_and_intervene(user_id, {"mood_valence": emotion["emotion"]["valence"], "energy": context.get("energy", 50)}, history, lang)
        
        # رسالة استباقية من التوأم الرقمي
        proactive_msg = self.twin_core.generate_proactive_message(context, history, lang)
        # توقع الاحتياجات
        predicted_needs = self.twin_core.predict_needs(context, history)
        
        dashboard_data = {
            "daily_status": {"mood": emotion["emotion"]["primary"], "energy": context.get("energy", 50), "streak": habit_engine.calculate_streak(history)},
            "active_goals": progress_report.get("goal_reports", []),
        }
        life_score = self.life_score.calculate(dashboard_data, context)
        
        return {
            "greeting": greeting,
            "daily_status": dashboard_data["daily_status"],
            "active_goals": progress_report.get("goal_reports", []),
            "journey": journey,
            "life_score": life_score,
            "growth": growth,
            "preventive": preventive,
            "proactive_message": proactive_msg,
            "predicted_needs": predicted_needs,
            "tip": self._daily_tip(lang),
        }

    async def nutrition_plan(self, user_id: str, goal: str, profile: Dict, lang: str = "ar") -> Dict:
        return self.nutrition.comprehensive_plan(profile, goal, lang)

    async def fitness_plan(self, user_id: str, goal: str, profile: Dict, lang: str = "ar") -> Dict:
        return self.fitness.comprehensive_plan(profile, goal, lang)

    async def sleep_analysis(self, user_id: str, sleep_data: Dict, profile: Dict, lang: str = "ar") -> Dict:
        return self.sleep.analyze(sleep_data, profile, lang)

    async def assess_goal(self, user_id: str, goal_text: str, lang: str = "ar") -> Dict:
        return self.goal.assess_goal(goal_text, None, lang)

    async def analyze_decision(self, user_id: str, question: str, options: List[str] = None, lang: str = "ar") -> Dict:
        return self.decision.analyze_decision(question, options or [], None, lang)

    async def financial_analysis(self, user_id: str, financial_data: Dict, lang: str = "ar") -> Dict:
        return self.financial.analyze(financial_data, lang)

    async def career_analysis(self, user_id: str, topic: str, profile: Dict, lang: str = "ar") -> Dict:
        return self.career.analyze(topic, profile, lang)

    async def relationship_analysis(self, user_id: str, topic: str, lang: str = "ar") -> Dict:
        return self.relationship.analyze(topic, [], {}, lang)

    async def _build_user_context(self, user_id: str) -> Dict:
        ctx = {"energy": 50, "bond_level": 50}
        try:
            if self._memory_client:
                ctx.update(await self._memory_client.get_user_context(user_id) or {})
        except: pass
        return ctx

    async def _get_history(self, user_id: str) -> List:
        try:
            if self._memory_client:
                return await self._memory_client.get_recent_interactions(user_id, limit=50) or []
        except: return []

    async def _get_goals(self, user_id: str) -> List:
        try:
            if self._memory_client:
                return await self._memory_client.get_active_goals(user_id) or []
        except: return []

    async def _save_session(self, user_id, topic, analysis, plan):
        try:
            if self._memory_client:
                await self._memory_client.store_interaction(user_id, "life_coach", topic, analysis, plan)
        except: pass

    async def _notify_consciousness(self, user_id, analysis):
        try:
            from app.core.consciousness_bridge import consciousness_bridge
            await consciousness_bridge.on_feature_used(user_id, "life_coach", analysis)
        except: pass

    def _build_ai_prompt(self, topic, emotion, clinical, memory, long_term, prediction, lang):
        flagged = clinical.get("flagged_conditions", [])
        clinical_note = f"مؤشرات سريرية: {', '.join(flagged)}." if flagged else ""
        memory_note = memory.get("contextual_greeting", "")
        long_term_note = long_term.get("insights", [""])[0] if long_term.get("insights") else ""
        return f"""مدرب حياة محترف. {memory_note} {long_term_note} العميل: "{topic}". {clinical_note} قدم رداً داعماً بلغة {lang}."""

    def _fallback_response(self, emotion, lang):
        return "أسمعك. دعنا نعمل معاً." if lang == "ar" else "I hear you. Let's work together."

    def _daily_tip(self, lang):
        import random
        tips = ["خذ 5 دقائق للتنفس العميق", "اكتب 3 أشياء جيدة اليوم", "اشرب كوب ماء الآن"] if lang == "ar" else ["Take 5 min deep breathing", "Write 3 good things today", "Drink water now"]
        return random.choice(tips)



    async def _save_session_to_history(self, user_id: str, topic: str, result: Dict):
        """حفظ الجلسة كمشروع في History"""
        try:
            if self._memory_client:
                await self._memory_client.store_entity("project", user_id, {
                    "title": f"جلسة تدريب: {topic[:50]}",
                    "type": "life_coach",
                    "data": {
                        "topic": topic,
                        "analysis": result.get("analysis", {}),
                        "plan": result.get("plan", {}),
                        "coach_reply": result.get("coach_reply", "")
                    },
                    "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                    "user_id": user_id
                })
        except Exception as e:
            logger.warning(f"Failed to save life coach session: {e}")

life_coach = LifeCoachOrchestrator()
