"""Compatibility adapter: legacy orchestrators delegate to the central AI Gateway."""
from typing import Optional, Tuple

from app.infrastructure.ai.ai_gateway import ai_gateway


async def generate_with_fallback(
    prompt: str,
    language: str = "ar",
    prefer_internal: bool = False,
    task: str = "general",
    user_id: Optional[str] = None,
    tier: str = "free",
) -> Tuple[str, str]:
    """Preserve the former import/signature while using one governed provider router."""
    text, provider = await ai_gateway.route(
        prompt=prompt,
        task=task,
        user_id=user_id,
        tier=tier,
        language=language,
    )
    return text or "", provider or "local"
