"""
Image Lab API Routes v2.0 — توليد وتحليل وتعديل الصور
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.api.dependencies.auth import require_request_owner

router = APIRouter(
    prefix="/api/image-lab",
    tags=["image-lab"],
    dependencies=[Depends(require_request_owner)],
)

class ImageRequest(BaseModel):
    user_id: str
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
    image_base64: str = Field(max_length=8_400_000)
    language: str = "ar"
    mime_type: str = "image/jpeg"

class EditRequest(BaseModel):
    user_id: str
    operation: str
    image_base64: str = Field(max_length=8_400_000)

@router.post("/generate")
async def generate(req: ImageRequest):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        result = await image_lab.generate(req.user_id, req.prompt, req.style, req.lighting, req.camera, req.negative, req.language)
        if result.get("status") == "consent_required":
            raise HTTPException(403, "يلزم اختيار موافقة توليد الصور لهذا المزود قبل إرسال الوصف.")
        return result
    except HTTPException:
        raise
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
        result = await image_lab.analyze_image(req.image_base64, req.language, user_id=req.user_id, mime_type=req.mime_type)
        if result.get("status") == "consent_required":
            raise HTTPException(403, "يلزم اختيار موافقة تحليل الصور عبر Google Gemini قبل إرسال الصورة.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/edit")
async def edit(req: EditRequest):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        result = await image_lab.edit_image(req.operation, req.image_base64, user_id=req.user_id)
        if result.get("status") == "consent_required":
            raise HTTPException(403, "يلزم اختيار موافقة تحرير الصور للمزود المستخدم.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/dashboard/{user_id}")
async def dashboard(user_id: str, lang: str = "ar"):
    try:
        from app.features.image_lab.image_orchestrator import image_lab
        return await image_lab.get_dashboard(user_id, lang)
    except Exception as e:
        raise HTTPException(500, str(e))
