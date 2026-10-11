"""Owner-scoped image analysis through the consent-gated Gemini Vision gateway."""
import base64
import json
import re
from typing import Any


MAX_IMAGE_BYTES = 6 * 1024 * 1024


class ImageAnalyzer:
    async def full_analysis(
        self,
        image_base64: str,
        language: str = "ar",
        user_id: str | None = None,
        mime_type: str = "image/jpeg",
    ) -> dict[str, Any]:
        if not user_id:
            return {"status": "consent_required", "purpose": "image_analysis"}
        try:
            image_bytes = base64.b64decode(image_base64, validate=True)
        except Exception:
            return {"status": "invalid_image", "message": "صيغة الصورة غير صالحة."}
        if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
            return {"status": "invalid_image", "message": "حجم الصورة غير صالح أو يتجاوز الحد المسموح."}
        if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
            return {"status": "invalid_image", "message": "نوع الصورة غير مدعوم."}

        from app.privacy.cloud_ai_consent import get_granted_providers
        if "gemini" not in get_granted_providers(user_id, "image_analysis"):
            return {"status": "consent_required", "purpose": "image_analysis"}

        from app.infrastructure.ai.ai_gateway import ai_gateway
        prompt = (
            "Analyze the supplied image. Return only one JSON object with string fields "
            "description, extracted_text; and arrays of strings tags, objects. "
            f"Use language {language}. Do not infer sensitive identity attributes."
        )
        result = await ai_gateway.see(prompt, image_base64, mime_type=mime_type, user_id=user_id)
        if not result:
            return {"status": "provider_error", "message": "تعذّر الوصول إلى مزود تحليل الصور."}
        try:
            candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", result.strip(), flags=re.IGNORECASE)
            parsed = json.loads(candidate)
            if not isinstance(parsed, dict):
                raise ValueError("expected object")
            description = str(parsed.get("description", ""))[:4000]
            extracted_text = str(parsed.get("extracted_text", ""))[:4000]
            tags = [str(item)[:100] for item in parsed.get("tags", []) if isinstance(item, str)][:20]
            objects = [str(item)[:100] for item in parsed.get("objects", []) if isinstance(item, str)][:40]
        except Exception:
            # Do not turn malformed provider output into a fabricated structured result.
            return {"status": "provider_error", "message": "تعذّر تفسير نتيجة تحليل الصورة."}
        return {
            "status": "success",
            "provider": "gemini",
            "description": description,
            "tags": tags,
            "extracted_text": extracted_text,
            "objects": objects,
        }


image_analyzer = ImageAnalyzer()
