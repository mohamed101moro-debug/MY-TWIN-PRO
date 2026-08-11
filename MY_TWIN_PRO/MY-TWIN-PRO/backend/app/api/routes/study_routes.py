"""
Study API Routes v9.0 – مسارات الوعي التعليمي
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter(prefix="/api/study", tags=["study"])

class StudyRequest(BaseModel):
    user_id: str; concept: str; age_group: str = "teen"; language: str = "ar"

class AnswerRequest(BaseModel):
    user_id: str; answer: str

class QuestionRequest(BaseModel):
    concept: str; bloom_level: int = 1; age_group: str = "teen"; language: str = "ar"; count: int = 1; user_id: str = ""

@router.post("/start")
async def start_study_session(request: StudyRequest) -> Dict[str, Any]:
    from app.features.study.athena_orchestrator import athena
    return await athena.start_study_session(request.user_id, request.concept, request.age_group, request.language)

@router.post("/answer")
async def process_study_answer(request: AnswerRequest) -> Dict[str, Any]:
    from app.features.study.athena_orchestrator import athena
    return await athena.process_answer(request.user_id, request.answer)

@router.post("/end")
async def end_study_session(user_id: str = Query(...)) -> Dict[str, Any]:
    from app.features.study.athena_orchestrator import athena
    return await athena.end_session(user_id)

@router.post("/questions")
async def generate_questions(request: QuestionRequest) -> Dict[str, Any]:
    from app.features.study.bloom_question_generator import bloom_gen
    if request.user_id:
        question = await bloom_gen.generate_adaptive_question(request.concept, request.user_id, request.age_group, request.language)
        return {"concept": request.concept, "questions": [question], "count": 1}
    questions = [await bloom_gen.generate_question(request.concept, request.bloom_level, request.age_group, request.language)]
    return {"concept": request.concept, "questions": questions, "count": 1}

@router.get("/dashboard/{user_id}")
async def learning_dashboard(user_id: str, lang: str = "ar"):
    from app.features.study.athena_orchestrator import athena
    return await athena.get_learning_dashboard(user_id, lang)

@router.post("/explain")
async def generate_explanation(request: StudyRequest) -> Dict[str, Any]:
    from app.features.study.scaffold_explainer import scaffold
    student_profile = {"important_people": [], "identity_traits": []}
    return await scaffold.explain(request.concept, student_profile, request.age_group, request.language)
