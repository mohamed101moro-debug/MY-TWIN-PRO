"""
Image Lab API Routes v2.0 — توليد وتحليل وتعديل الصور
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/image-lab", tags=["image-lab"])

class ImageRequest(BaseModel):
    user_id: str = "test123"
    prompt: str
    style: str = "realistic"
    lighting: str = ""
    camera: str = ""
    negative: str = ""
    language: str = "ar"

class EnhanceRequest(BaseModel):
    user_id: str
    prompt: str
    language: str = "ar"

class AnalyzeRequest(BaseModel):
    user_id: str
    image_base64: str
    language: str = "ar"

class EditRequest(BaseModel):
    user_id: str
    operation: str
    image_base64: str

@router.post("/generate")
async def generate(req: ImageRequest):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        return await image_lab.generate(req.user_id, req.prompt, req.style, req.lighting, req.camera, req.negative, req.language)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/enhance-prompt")
async def enhance_prompt(req: EnhanceRequest):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        return await image_lab.enhance_prompt(req.user_id, req.prompt)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        return await image_lab.analyze_image(req.image_base64, req.language)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/edit")
async def edit(req: EditRequest):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        return await image_lab.edit_image(req.operation, req.image_base64)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/dashboard/{user_id}")
async def dashboard(user_id: str, lang: str = "ar"):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        return await image_lab.get_dashboard(user_id, lang)
    except Exception as e:
        raise HTTPException(500, str(e))
