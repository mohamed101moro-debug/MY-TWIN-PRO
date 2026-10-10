"""
PROMPT COMPOSER v2.0 – بناء Prompt احترافي ديناميكي (100%)
=============================================================
- Style, Lighting, Camera, Composition, Negative Prompt
- يستخدم AI للتخصيص العميق
- يتصل بـ TCMA لتذكر تفضيلات المستخدم
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

STYLE_PROFILES = {
    "realistic": "photorealistic, hyperrealistic, professional photography, 8k, sharp focus",
    "anime": "anime style, studio ghibli, key visual, vibrant, cel shaded",
    "oil_painting": "oil painting, textured, artistic, classic, brush strokes",
    "digital_art": "digital art, artstation, concept art, trending, intricate details",
    "cinematic": "cinematic, film grain, depth of field, anamorphic, movie poster",
    "logo": "vector logo, minimalist, flat design, clean lines, professional branding",
    "product": "product photography, commercial, studio lighting, white background, e-commerce",
    "cyberpunk": "cyberpunk, neon, futuristic, blade runner style, rain, dark",
    "fantasy": "fantasy art, epic, magical, detailed fantasy, ethereal",
    "watercolor": "watercolor painting, artistic, soft, flowing, delicate",
    "portrait": "portrait photography, professional lighting, bokeh, 85mm",
}

LIGHTING_PRESETS = {
    "golden_hour": "golden hour, warm sunlight, long shadows, magical glow",
    "studio": "studio lighting, soft box, professional, even illumination",
    "neon": "neon lights, cyberpunk, vibrant colors, dark background",
    "dramatic": "dramatic lighting, chiaroscuro, high contrast, moody",
    "soft": "soft light, diffused, gentle, dreamy",
    "volumetric": "volumetric lighting, god rays, atmospheric",
}

CAMERA_PRESETS = {
    "50mm": "50mm lens, portrait, bokeh, shallow depth of field",
    "24mm": "24mm wide angle, landscape, expansive view",
    "drone": "drone shot, aerial view, top down, bird eye perspective",
    "macro": "macro lens, extreme close up, detailed texture",
    "telephoto": "telephoto lens, compressed perspective, 200mm",
}

class PromptComposer:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None

    async def compose(self, user_id: str, prompt: str, style: str = "realistic", lighting: str = "", camera: str = "", negative: str = "") -> Dict[str, str]:
        """بناء Prompt احترافي مع تذكر تفضيلات المستخدم"""
        # استرجاع تفضيلات المستخدم من TCMA
        preferred_style = style
        if self.memory_client:
            try:
                prefs = await self.memory_client.get_entity("visual_prefs", user_id)
                if prefs and prefs.get("preferred_style"):
                    preferred_style = prefs["preferred_style"]
            except: pass

        style_add = STYLE_PROFILES.get(preferred_style, STYLE_PROFILES.get(style, STYLE_PROFILES["realistic"]))
        lighting_add = LIGHTING_PRESETS.get(lighting, "")
        camera_add = CAMERA_PRESETS.get(camera, "")
        
        # استخدام AI لتوليد Negative Prompt مخصص
        negative_prompt = negative or await self._generate_negative_ai(prompt, style)

        full_prompt = f"{prompt}, {style_add}"
        if lighting_add: full_prompt += f", {lighting_add}"
        if camera_add: full_prompt += f", {camera_add}"
        full_prompt += ", masterpiece, best quality, 4k"

        # حفظ التفضيلات
        if self.memory_client:
            try:
                await self.memory_client.store_entity("visual_prefs", user_id, {"preferred_style": preferred_style})
            except: pass

        return {"positive": full_prompt, "negative": negative_prompt, "style": preferred_style}

    async def _generate_negative_ai(self, prompt: str, style: str) -> str:
        """توليد Negative Prompt مخصص باستخدام AI"""
        if not self.ai_route:
            return self._default_negative(style)
        try:
            ai_prompt = f"Generate a negative prompt for image generation with prompt '{prompt}' and style '{style}'. List only negative terms separated by commas."
            text, _ = await self.ai_route(ai_prompt, task="creative")
            return text.strip() if text else self._default_negative(style)
        except:
            return self._default_negative(style)

    def _default_negative(self, style: str) -> str:
        base = "ugly, blurry, low quality, distorted, deformed, bad anatomy, watermark, text, signature"
        if style == "anime": return f"{base}, photorealistic, realistic, 3d"
        if style == "realistic": return f"{base}, cartoon, anime, illustration, painting"
        if style == "logo": return f"{base}, photorealistic, complex, 3d"
        return base

    async def enhance_with_ai(self, prompt: str, intent: str = "general", language: str = "ar") -> str:
        """تحسين Prompt باستخدام AI"""
        if not self.ai_route:
            return prompt
        try:
            ai_prompt = f"Enhance this image prompt for {intent}: '{prompt}'. Add artistic details, lighting, and composition. Return only the enhanced prompt. Language: {language}."
            text, _ = await self.ai_route(ai_prompt, task="creative")
            return text.strip() if text else prompt
        except:
            return prompt


prompt_composer = PromptComposer()
