"""Authentication routes: never bypass provider email verification or session checks."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.api.dependencies.auth import get_current_user_id
from app.infrastructure.database.supabase_client import get_db, get_service_role_db

logger = logging.getLogger("auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


class SignupBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)
    twin_name: Optional[str] = "توأمي"
    lang: Optional[str] = "ar"


class ForgotBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _profile_payload(user_id: str, email: str, twin_name: Optional[str], lang: Optional[str]):
    return {
        "id": user_id,
        "email": email,
        "full_name": email.split("@", 1)[0],
        "twin_name": twin_name or email.split("@", 1)[0],
        "lang": lang or "ar",
        "tier": "free",
        "twin_energy": 100,
        "onboarded": False,
        "status": "active",
        "last_active": _now(),
        "updated_at": _now(),
    }


def _ensure_profile(service_db, user_id: str, email: str, twin_name=None, lang=None) -> None:
    """Create a missing profile only; never upsert over a banned/deleting profile."""
    if service_db is None:
        raise RuntimeError("Account profile service is unavailable")
    existing = service_db.table("profiles").select("id,status").eq("id", user_id).limit(1).execute()
    if existing.data:
        return
    service_db.table("profiles").insert(
        _profile_payload(user_id, email, twin_name, lang)
    ).execute()


def _assert_active_profile(service_db, user_id: str) -> None:
    if service_db is None:
        raise HTTPException(status_code=503, detail="تعذر التحقق من حالة الحساب. حاول لاحقًا.")
    try:
        result = service_db.table("profiles").select("status,deleted_at").eq("id", user_id).limit(1).execute()
    except Exception:
        logger.exception("Account status lookup failed")
        raise HTTPException(status_code=503, detail="تعذر التحقق من حالة الحساب. حاول لاحقًا.")
    if not result.data:
        raise HTTPException(status_code=403, detail="الحساب غير مهيأ للاستخدام.")
    profile = result.data[0]
    status = profile.get("status")
    if status != "active" or profile.get("deleted_at"):
        raise HTTPException(status_code=403, detail="هذا الحساب غير متاح حاليًا.")


def _email_is_confirmed(user) -> bool:
    return bool(
        getattr(user, "email_confirmed_at", None)
        or getattr(user, "confirmed_at", None)
    )


@router.post("/signup")
async def signup(body: SignupBody, response: Response):
    db = get_db()
    service_db = get_service_role_db()
    email = str(body.email).strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=422, detail="أدخل بريدًا إلكترونيًا صالحًا.")
    try:
        result = db.auth.sign_up({"email": email, "password": body.password})
    except Exception as exc:
        logger.info("Signup rejected by identity provider (%s)", type(exc).__name__)
        raise HTTPException(status_code=400, detail="تعذر إنشاء الحساب. تحقق من البيانات أو سجّل الدخول إذا كان الحساب موجودًا.")

    user = getattr(result, "user", None)
    session = getattr(result, "session", None)
    if not user or not getattr(user, "id", None):
        # Do not attempt password login here: signup must never become an auth bypass.
        raise HTTPException(status_code=400, detail="تعذر إنشاء الحساب. تحقق من البريد وكلمة المرور.")

    try:
        _ensure_profile(service_db, user.id, email, body.twin_name, body.lang)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not initialize signup profile")
        raise HTTPException(status_code=503, detail="تم استلام التسجيل لكن تعذر تهيئة الحساب. حاول تسجيل الدخول لاحقًا.")

    if not session or not _email_is_confirmed(user):
        response.status_code = 202
        return {
            "requires_email_confirmation": True,
            "message": "تم إنشاء طلب التسجيل. افتح رسالة التحقق المرسلة إلى بريدك الإلكتروني قبل تسجيل الدخول.",
        }

    _assert_active_profile(service_db, user.id)
    logger.info("Signup session issued after verified email")
    return {"token": session.access_token, "user_id": user.id, "onboarded": False}


@router.post("/login")
async def login(body: LoginBody):
    db = get_db()
    service_db = get_service_role_db()
    email = str(body.email).strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=422, detail="أدخل بريدًا إلكترونيًا صالحًا.")
    try:
        result = db.auth.sign_in_with_password({"email": email, "password": body.password})
    except Exception:
        raise HTTPException(status_code=400, detail="بيانات الدخول غير صحيحة أو لم يتم تأكيد البريد الإلكتروني.")
    if not result or not getattr(result, "session", None) or not getattr(result, "user", None):
        raise HTTPException(status_code=400, detail="بيانات الدخول غير صحيحة أو لم يتم تأكيد البريد الإلكتروني.")

    user = result.user
    if not _email_is_confirmed(user):
        raise HTTPException(status_code=403, detail="أكد بريدك الإلكتروني قبل تسجيل الدخول.")
    try:
        _ensure_profile(service_db, user.id, email)
    except Exception:
        logger.exception("Could not ensure login profile")
        raise HTTPException(status_code=503, detail="تعذر تهيئة الحساب. حاول لاحقًا.")
    _assert_active_profile(service_db, user.id)
    return {"token": result.session.access_token, "user_id": user.id, "onboarded": False}


@router.post("/forgot-password")
async def forgot_password(body: ForgotBody):
    try:
        email = str(body.email).strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            return {"success": True, "message": "إن كان البريد مسجلًا فستصلك رسالة الاستعادة."}
        get_db().auth.reset_password_for_email(email, {"redirect_to": "mytwin://reset"})
    except Exception as exc:
        # Keep a generic response to avoid account enumeration.
        logger.info("Password reset request could not be completed (%s)", type(exc).__name__)
    return {"success": True, "message": "إن كان البريد مسجلًا فستصلك رسالة الاستعادة."}


@router.get("/verify-token")
async def verify_token(
    user_id: Optional[str] = Query(default=None),
    authenticated_user_id: str = Depends(get_current_user_id),
):
    """A valid bearer session is required; a caller-supplied user_id is never proof."""
    if user_id and user_id != authenticated_user_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"valid": True, "user_id": authenticated_user_id}


@router.post("/google")
async def google():
    raise HTTPException(501, "تسجيل الدخول عبر Google غير مفعّل على الخادم حاليًا.")
