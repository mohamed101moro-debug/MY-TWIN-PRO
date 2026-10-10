"""Server-authoritative Google Play subscription verification and lifecycle API."""
from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Request as FastAPIRequest
from pydantic import BaseModel, Field

from app.api.dependencies.auth import get_current_user_id
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("billing_routes")
router = APIRouter(prefix="/api", tags=["billing"])
PACKAGE = "com.soulsync.mytwin"
PRODUCT_TO_TIER = {
    "mytwin_plus_monthly": "plus",
    "mytwin_premium_monthly": "premium",
    "mytwin_pro_semiannual": "pro",
    "mytwin_yearly_annual": "yearly",
}
ALLOWED_ENTITLEMENT_STATES = {
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    # A cancelled auto-renewing plan remains entitled until its expiryTime.
    "SUBSCRIPTION_STATE_CANCELED",
}


class PurchaseVerificationRequest(BaseModel):
    sku: str = Field(min_length=1, max_length=128)
    token: str = Field(min_length=1, max_length=4096)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _creds():
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        return None
    try:
        credentials = json.loads(raw)
        if not isinstance(credentials, dict):
            return None
        if not credentials.get("client_email") or not credentials.get("private_key"):
            return None
        if credentials.get("token_uri") != "https://oauth2.googleapis.com/token":
            return None
        return credentials
    except (TypeError, ValueError):
        return None


def _http_json(url: str, data=None, headers=None):
    request_headers = {"Accept": "application/json", **(headers or {})}
    body = None
    if data is not None:
        body = urlencode(data).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = Request(url, data=body, headers=request_headers, method="POST" if body is not None else "GET")
    with urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def _service_access_token(credentials):
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        now = int(time.time())
        header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
        claims = _b64url(json.dumps({
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/androidpublisher",
            "aud": credentials["token_uri"],
            "iat": now,
            "exp": now + 3600,
        }, separators=(",", ":")).encode())
        private_key = serialization.load_pem_private_key(credentials["private_key"].encode(), password=None)
        signature = private_key.sign(f"{header}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256())
        assertion = f"{header}.{claims}.{_b64url(signature)}"
        result = _http_json(credentials["token_uri"], {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        })
        return result.get("access_token") if isinstance(result, dict) else None
    except Exception as error:
        logger.warning("Google service-account token acquisition failed (%s)", type(error).__name__)
        return None


def _parse_google_time(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _verify_google(product_id: str, token: str, user_id: str):
    """Return verified entitlement metadata, False for an invalid purchase, None if verification is unavailable."""
    credentials = _creds()
    if not credentials:
        return None
    access_token = _service_access_token(credentials)
    if not access_token:
        return None

    url = (
        "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
        f"{quote(PACKAGE, safe='')}/purchases/subscriptionsv2/tokens/{quote(token, safe='')}"
    )
    try:
        payload = _http_json(url, headers={"Authorization": f"Bearer {access_token}"})
    except HTTPError as error:
        # 400/404 means this token cannot identify a valid subscription; auth/quota/server errors are unavailable.
        if error.code in (400, 404):
            return False
        logger.warning("Google Play verification HTTP failure (%s)", error.code)
        return None
    except (URLError, TimeoutError, OSError, ValueError) as error:
        logger.warning("Google Play verification transport failure (%s)", type(error).__name__)
        return None
    except Exception as error:
        logger.warning("Google Play verification failed (%s)", type(error).__name__)
        return None

    if not isinstance(payload, dict):
        return False
    state = payload.get("subscriptionState")
    if state not in ALLOWED_ENTITLEMENT_STATES:
        return False
    if payload.get("testPurchase") and not (
        os.getenv("ENVIRONMENT", "production").lower() != "production"
        and os.getenv("GOOGLE_PLAY_ALLOW_TEST_PURCHASES", "false").lower() == "true"
    ):
        return False

    matching_items = [item for item in payload.get("lineItems", []) if item.get("productId") == product_id]
    expiry_times = [_parse_google_time(item.get("expiryTime", "")) for item in matching_items]
    future_expiries = [expiry for expiry in expiry_times if expiry and expiry > datetime.now(timezone.utc)]
    if not future_expiries:
        return False

    external = payload.get("externalAccountIdentifiers") or {}
    reported_account_id = external.get("obfuscatedExternalAccountId")
    expected_account_id = hashlib.sha256(f"mytwin:{user_id}".encode("utf-8")).hexdigest()
    if not reported_account_id or not hmac.compare_digest(str(reported_account_id), expected_account_id):
        return False

    return {
        "product_id": product_id,
        "expires_at": max(future_expiries).isoformat().replace("+00:00", "Z"),
        "subscription_state": state,
        "acknowledgement_state": payload.get("acknowledgementState"),
        "account_id_bound": True,
    }


@router.post("/economy/purchase/verify")
async def purchase_verify(body: PurchaseVerificationRequest, uid: str = Depends(get_current_user_id)):
    tier = PRODUCT_TO_TIER.get(body.sku)
    if not tier:
        raise HTTPException(status_code=400, detail="unknown store product")

    verification = await asyncio.to_thread(_verify_google, body.sku, body.token, uid)
    if verification is None:
        raise HTTPException(status_code=503, detail="purchase verification temporarily unavailable")
    if verification is False:
        raise HTTPException(status_code=402, detail="purchase is invalid, pending, expired, or belongs to another account")

    token_hash = hashlib.sha256(body.token.encode("utf-8")).hexdigest()
    try:
        result = get_db().rpc("commit_google_subscription", {
            "p_user_id": uid,
            "p_product_id": body.sku,
            "p_tier": tier,
            "p_purchase_token_hash": token_hash,
            "p_expires_at": verification["expires_at"],
            "p_subscription_state": verification["subscription_state"],
        }).execute()
        if result is None or getattr(result, "data", None) is None:
            raise RuntimeError("entitlement RPC returned no result")
        rpc_data = result.data
        if isinstance(rpc_data, list):
            rpc_data = rpc_data[0] if rpc_data else {}
        effective_tier = rpc_data.get("tier", tier) if isinstance(rpc_data, dict) else tier
    except Exception as error:
        logger.error("Could not persist verified Google Play entitlement (%s)", type(error).__name__)
        raise HTTPException(status_code=503, detail="verified purchase could not be safely activated") from error

    return {
        "success": True,
        "verified": True,
        "tier": effective_tier,
        "expires_at": verification["expires_at"],
        "subscription_state": verification["subscription_state"],
    }


@router.get("/billing/status")
async def billing_status(uid: str = Depends(get_current_user_id)):
    try:
        row = get_db().table("profiles").select("tier,tier_expires_at").eq("id", uid).single().execute()
        profile = row.data or {}
    except Exception as error:
        logger.error("Subscription status unavailable (%s)", type(error).__name__)
        raise HTTPException(status_code=503, detail="subscription status unavailable") from error

    tier = profile.get("tier") or "free"
    expires_at = profile.get("tier_expires_at")
    parsed_expiry = _parse_google_time(expires_at) if expires_at else None
    if tier != "free" and (parsed_expiry is None or parsed_expiry <= datetime.now(timezone.utc)):
        try:
            get_db().table("profiles").update({"tier": "free", "tier_expires_at": None}).eq("id", uid).execute()
        except Exception as error:
            logger.error("Expired subscription downgrade failed (%s)", type(error).__name__)
            raise HTTPException(status_code=503, detail="subscription status update unavailable") from error
        tier, expires_at = "free", None
    return {"tier": tier, "is_active": tier != "free", "expires_at": expires_at}


@router.post("/billing/rtdn")
async def rtdn(_request: FastAPIRequest):
    """Fail closed until Google Pub/Sub OIDC validation and token re-verification are configured."""
    raise HTTPException(status_code=503, detail="subscription notifications are not configured safely")


logger.info("Billing routes ready (subscriptionsv2, fail-closed, atomic entitlement RPC)")
