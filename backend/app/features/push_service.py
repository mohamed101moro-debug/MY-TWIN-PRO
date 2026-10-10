"""Push Service — لحظات حية تصل المستخدم عبر Expo Push."""
import logging
logger = logging.getLogger("push_service")
async def send_push(user_id: str, title: str, body: str) -> bool:
    try:
        import aiohttp
        from app.infrastructure.database.supabase_client import get_db
        r = get_db().table("user_devices").select("push_token").eq("user_id", user_id).limit(5).execute()
        toks = [x.get("push_token") for x in (r.data or []) if x.get("push_token")]
        if not toks: return False
        async with aiohttp.ClientSession() as s:
            async with s.post("https://exp.host/--/api/v2/send", json=[{"to": t, "title": title, "body": body, "sound": "default", "data": {"twin": True}} for t in toks]) as resp:
                return resp.status == 200
    except Exception as e:
        logger.debug(f"push failed: {e}"); return False
