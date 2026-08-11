"""
LIFE COACH ROUTES v2.0 – مسارات كاملة للمنظومة
=================================================
- جميع نقاط النهاية للمحركات الجديدة
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/life-coach", tags=["life-coach"])

# ============================================================
# نماذج الطلبات
# ============================================================
class SessionRequest(BaseModel):
    user_id: str
    topic: str
    lang: str = "ar"

class NutritionRequest(BaseModel):
    user_id: str
    goal: str
    restrictions: str = ""
    lang: str = "ar"
    age: int = 30
    weight: float = 70
    height: float = 170
    gender: str = "male"
    country: str = "EG"
    budget: str = "medium"
    activity_level: str = "sedentary"
    medical_conditions: List[str] = []
    allergies: List[str] = []
    disliked_foods: List[str] = []

class FitnessRequest(BaseModel):
    user_id: str
    goal: str
    level: str = "beginner"
    equipment: str = "none"
    lang: str = "ar"
    weight: float = 70
    height: float = 170
    injuries: str = ""
    medical_conditions: List[str] = []
    age: int = 30
    pregnant: bool = False

class SleepRequest(BaseModel):
    user_id: str
    hours: float = 6
    quality: str = "medium"
    issues: List[str] = []
    lang: str = "ar"

class GoalAssessmentRequest(BaseModel):
    user_id: str
    goal_text: str
    lang: str = "ar"

class DecisionRequest(BaseModel):
    user_id: str
    question: str
    options: List[str] = []
    lang: str = "ar"

class FinancialRequest(BaseModel):
    user_id: str
    monthly_income: float = 0
    monthly_expenses: float = 0
    total_debts: float = 0
    current_savings: float = 0
    lang: str = "ar"

class CareerRequest(BaseModel):
    user_id: str
    topic: str
    skills: List[str] = []
    lang: str = "ar"

class RelationshipRequest(BaseModel):
    user_id: str
    topic: str
    lang: str = "ar"

class PreventiveRequest(BaseModel):
    user_id: str
    current_state: Dict[str, Any] = {}
    lang: str = "ar"

# ============================================================
# المسارات
# ============================================================
@router.post("/session")
async def session(req: SessionRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        return await life_coach.full_session(req.user_id, req.topic, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/nutrition")
async def nutrition(req: NutritionRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        profile = {
            "age": req.age, "weight": req.weight, "height": req.height,
            "gender": req.gender, "country": req.country, "budget": req.budget,
            "activity_level": req.activity_level,
            "medical_conditions": req.medical_conditions,
            "allergies": req.allergies, "disliked_foods": req.disliked_foods,
        }
        return await life_coach.nutrition_plan(req.user_id, req.goal, profile, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/fitness")
async def fitness(req: FitnessRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        profile = {
            "weight": req.weight, "height": req.height,
            "injuries": req.injuries.split(",") if req.injuries else [],
            "medical_conditions": req.medical_conditions,
            "age": req.age, "pregnant": req.pregnant,
        }
        return await life_coach.fitness_plan(req.user_id, req.goal, profile, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/sleep")
async def sleep_analysis(req: SleepRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        sleep_data = {"hours": req.hours, "quality": req.quality, "issues": req.issues}
        profile = {}
        return await life_coach.sleep_analysis(req.user_id, sleep_data, profile, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/assess-goal")
async def assess_goal(req: GoalAssessmentRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        return await life_coach.assess_goal(req.user_id, req.goal_text, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/decision")
async def decision(req: DecisionRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        return await life_coach.analyze_decision(req.user_id, req.question, req.options, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/financial")
async def financial(req: FinancialRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        data = {
            "monthly_income": req.monthly_income,
            "monthly_expenses": req.monthly_expenses,
            "total_debts": req.total_debts,
            "current_savings": req.current_savings,
        }
        return await life_coach.financial_analysis(req.user_id, data, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/career")
async def career(req: CareerRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        profile = {"skills": req.skills}
        return await life_coach.career_analysis(req.user_id, req.topic, profile, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/relationship")
async def relationship(req: RelationshipRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        return await life_coach.relationship_analysis(req.user_id, req.topic, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/preventive")
async def preventive(req: PreventiveRequest):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        return await life_coach.preventive.check_and_intervene(
            req.user_id, req.current_state, [], req.lang
        )
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/dashboard/{user_id}")
async def dashboard(user_id: str, lang: str = "ar"):
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        return await life_coach.get_dashboard(user_id, lang)
    except Exception as e:
        raise HTTPException(500, str(e))
