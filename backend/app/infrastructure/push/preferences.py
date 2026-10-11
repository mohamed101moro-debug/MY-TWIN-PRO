"""Fail-closed lookup for explicit user opt-in to proactive notifications."""
import logging

logger = logging.getLogger("push_preferences")


def proactive_notifications_enabled(user_id: str | None) -> bool:
    if not user_id:
        return False
    try:
        from app.infrastructure.database.supabase_client import get_db
        result = (
            get_db().table("profiles")
            .select("push_settings")
            .eq("id", user_id)
            .single()
            .execute()
        )
        settings = (result.data or {}).get("push_settings") or {}
        return isinstance(settings, dict) and settings.get("proactive_enabled") is True
    except Exception as exc:
        logger.warning("Could not verify push preference (%s)", type(exc).__name__)
        return False
