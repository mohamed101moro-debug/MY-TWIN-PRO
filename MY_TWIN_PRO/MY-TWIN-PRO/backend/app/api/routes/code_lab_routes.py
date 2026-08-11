"""
CODE LAB ROUTES – مسارات موحدة (Code Lab + Engineering Brain)
==============================================================
- تحليل الأفكار، بدء المشاريع، مراجعة الكود، اتخاذ القرارات
- Startup Mode، DevOps، Performance، Project Health
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/code-lab", tags=["code-lab"])

# ============================================================
# نماذج الطلبات
# ============================================================
class IdeaRequest(BaseModel):
    user_id: str
    idea: str
    lang: str = "ar"

class ProjectRequest(BaseModel):
    user_id: str
    idea: str
    frontend: str = "react"
    backend: str = "fastapi"
    database: str = "postgresql"
    lang: str = "ar"

class ReviewRequest(BaseModel):
    user_id: str
    code: str
    lang: str = "Python"

class DecisionRequest(BaseModel):
    user_id: str
    question: str
    options: List[str] = []
    lang: str = "ar"

class HealthRequest(BaseModel):
    project_id: str
    lang: str = "ar"

class DevOpsRequest(BaseModel):
    user_id: str
    frontend: str = "react"
    backend: str = "fastapi"
    database: str = "postgresql"
    lang: str = "ar"

# ============================================================
# المسارات الفعلية (بدون تكرار)
# ============================================================
@router.post("/analyze-idea")
async def analyze_idea(req: IdeaRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.analyze_idea(req.user_id, req.idea, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/start-project")
async def start_project(req: ProjectRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        stack = {"frontend": req.frontend, "backend": req.backend, "database": req.database}
        return await code_lab.start_project(req.user_id, req.idea, stack, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/review-code")
async def review_code(req: ReviewRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.review_code(req.user_id, req.code, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/make-decision")
async def make_decision(req: DecisionRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.make_decision(req.question, req.options, {}, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/dashboard/{user_id}")
async def dashboard(user_id: str, lang: str = "ar"):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.get_cto_dashboard(user_id, lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/startup-mode")
async def startup_mode(req: IdeaRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.startup_mode(req.user_id, req.idea, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/project-health")
async def project_health(req: HealthRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.get_project_health(req.project_id, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/generate-devops")
async def generate_devops(req: DevOpsRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        stack = {"frontend": req.frontend, "backend": req.backend, "database": req.database}
        return await code_lab.devops.generate_docker_files(stack, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/generate-code")
async def generate_code(req: ReviewRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.generate_code(req.user_id, req.code, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/debug")
async def debug(req: ReviewRequest):
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        return await code_lab.debug_code(req.user_id, req.code, req.lang)
    except Exception as e:
        raise HTTPException(500, str(e))
