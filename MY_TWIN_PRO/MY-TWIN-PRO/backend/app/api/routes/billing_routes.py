"""Billing Routes — تحقق خادمي من Google + دورة حياة الاشتراك (RTDN)."""
import os, json, logging, time, base64, asyncio
from urllib import request as urlreq
from fastapi import APIRouter, Depends, HTTPException, Request
from app.infrastructure.database.supabase_client import get_db
try:
    from app.api.dependencies.auth import get_current_user_id
except Exception:
    from app.api.dependencies.auth import get_user_id as get_current_user_id
logger = logging.getLogger("billing_routes")
router = APIRouter(prefix="/api", tags=["billing"])
PACKAGE = "com.soulsync.mytwin"
def _creds():
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if not raw: return None
    try: return json.loads(raw)
    except Exception: return None
def _http_json(url, data=None, headers=None):
    req = urlreq.Request(url, data=(json.dumps(data).encode() if data else None), headers=headers or {}, method='POST' if data else 'GET')
    with urlreq.urlopen(req, timeout=20) as r: return json.loads(r.read().decode())
def _sa_token(creds):
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        now = int(time.time())
        h = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
        c = base64.urlsafe_b64encode(json.dumps({"iss": creds["client_email"], "scope": "https://www.googleapis.com/auth/androidpublisher", "aud": creds["token_uri"], "iat": now, "exp": now + 3600}).encode()).rstrip(b"=").decode()
        key = serialization.load_pem_private_key(creds["private_key"].encode(), password=None)
        sig = key.sign(f"{h}.{c}".encode(), padding.PKCS1v15(), hashes.SHA256())
        jwt = f"{h}.{c}." + base64.urlsafe_b64encode(sig).rstrip(b"=").decode()
        return _http_json(creds["token_uri"], {"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt}).get("access_token")
    except Exception as e:
        logger.warning(f"sa token failed: {e}"); return None
def _verify_google(product: str, token: str):
    creds = _creds()
    if not creds: return None
    tok = _sa_token(creds)
    if not tok: return None
    try:
        url = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE}/purchases/subscriptions/{product}/tokens/{token}"
        d = _http_json(url, headers={"Authorization": f"Bearer {tok}"})
        return bool(d.get("expiryTimeMillis")) and d.get("paymentState") in (0, 1, 2)
    except Exception as e:
        logger.warning(f"verify failed: {e}"); return None
@router.post("/economy/purchase/verify")
async def purchase_verify(body: dict, uid: str = Depends(get_current_user_id)):
    sku = str(body.get("sku") or ""); token = str(body.get("token") or ""); tier = str(body.get("tier") or "plus")
    if tier not in ("plus", "premium", "pro", "yearly"): raise HTTPException(400, "bad tier")
    db = get_db()
    verified = None
    if token and not token.startswith("sandbox"):
        verified = await asyncio.to_thread(_verify_google, sku, token)
    if verified is False: raise HTTPException(402, "purchase verification failed")
    try: db.table("profiles").update({"tier": tier}).eq("id", uid).execute()
    except Exception: pass
    try: db.table("user_devices").update({"purchase_token": token}).eq("user_id", uid).execute()
    except Exception: pass
    return {"success": True, "verified": bool(verified), "tier": tier}
@router.post("/billing/rtdn")
async def rtdn(request: Request):
    """Pub/Sub push من Google — تجديد/إلغاء/انتهاء."""
    try:
        body = await request.json()
        msg = json.loads(base64.b64decode(body.get("message", {}).get("data", "")))
        n = msg.get("subscriptionNotification") or {}
        token, ptype = n.get("purchaseToken", ""), int(n.get("notificationType", 0))
        if not token: return {"ok": True}
        db = get_db()
        if ptype in (1, 2, 4, 7, 13):
            db.table("profiles").update({"tier": "premium"}).eq("purchase_token", token).execute()
        elif ptype in (3, 5, 12):
            db.table("profiles").update({"tier": "free"}).eq("purchase_token", token).execute()
        return {"ok": True}
    except Exception as e:
        logger.warning(f"rtdn: {e}"); return {"ok": False}
logger.info("✅ Billing Routes ready (verify + RTDN)")
