"""
Account Routes v3.0 – حذف مؤجل، تصدير TCMA، استعادة
=========================================================
- حذف مؤجل (30 يوم سماح) بدلاً من الحذف الفوري
- تصدير جميع طبقات TCMA
- استعادة الحساب قبل الحذف النهائي
"""
import logging
import os
import hmac
from fastapi import APIRouter, Depends, Header, HTTPException
from datetime import datetime, timezone, timedelta
from app.api.dependencies.auth import get_current_user_id, get_pending_deletion_user_id
from app.infrastructure.database.supabase_client import get_db
from app.core.account_data_inventory import (
    _ACCOUNT_TABLE_ROWS,
    EXPORT_TABLES,
    DELETION_USER_TABLES,
    EXPORT_NOT_COVERED_TABLES,
    EXPORT_PAGE_SIZE,
    EXPORT_MAX_RECORDS,
    EXPORT_SCHEMA_VERIFICATION_PASSED,
)

logger = logging.getLogger("account_routes")
router = APIRouter(prefix="/api/account", tags=["account"])

# ============================================================
# حذف مؤجل (30 يوم)
# ============================================================
@router.delete("/delete")
async def delete_account(user_id: str = Depends(get_current_user_id)):
    """
    تعطيل الحساب بدلاً من حذفه فوراً.
    يُحذف نهائياً بعد 30 يوماً إذا لم يستعد.
    """
    db = get_db()
    try:
        deletion_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        updated = (
            db.table("profiles")
            .update({"deleted_at": deletion_date, "status": "pending_deletion"})
            .eq("id", user_id)
            .eq("status", "active")
            .select("id")
            .execute()
        )
        if not (updated.data or []):
            raise HTTPException(409, "الحساب غير نشط أو أن طلب الحذف قائم بالفعل.")

        return {
            "message": "تم تعطيل الحساب. سيتم حذفه نهائياً بعد 30 يوماً. سجل الدخول قبل انتهاء المدة لاستعادته.",
            "deletion_date": deletion_date,
            "restore_possible": True
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Account deletion request failed; error_type=%s", type(exc).__name__)
        raise HTTPException(503, "تعذر بدء حذف الحساب حاليًا. حاول لاحقًا.")

@router.post("/restore")
async def restore_account(user_id: str = Depends(get_pending_deletion_user_id)):
    """استعادة الحساب قبل الحذف النهائي"""
    db = get_db()
    try:
        profile = db.table("profiles").select("deleted_at,status").eq("id", user_id).single().execute()
        record = profile.data
        if not record or record.get("status") != "pending_deletion" or not record.get("deleted_at"):
            raise HTTPException(400, "الحساب ليس في حالة حذف")
        scheduled_at = datetime.fromisoformat(record["deleted_at"].replace("Z", "+00:00"))
        if scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(410, "انتهت مهلة استعادة الحساب؛ يلزم التواصل مع الدعم.")

        restored = (
            db.table("profiles")
            .update({"deleted_at": None, "status": "active"})
            .eq("id", user_id)
            .eq("status", "pending_deletion")
            .select("id")
            .execute()
        )
        if not (restored.data or []):
            raise HTTPException(409, "تعذر استعادة الحساب بسبب تغير حالته؛ أعد المحاولة.")

        return {"message": "تم استعادة الحساب بنجاح. أهلاً بك من جديد!"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Account restoration failed; error_type=%s", type(exc).__name__)
        raise HTTPException(503, "تعذر استعادة الحساب حاليًا. حاول لاحقًا.")

# ============================================================
# تصدير بيانات الحساب والكيان
# ============================================================


def _fetch_all_owned_rows(db, table_name: str, user_id: str, order_column: str, remaining: int):
    """Read every owned row using deterministic paginated queries; never truncate silently."""
    rows = []
    offset = 0
    while True:
        page = (
            db.table(table_name)
            .select("*")
            .eq("user_id", user_id)
            .order(order_column, desc=False)
            .range(offset, offset + EXPORT_PAGE_SIZE - 1)
            .execute()
        )
        page_rows = page.data or []
        if not isinstance(page_rows, list):
            raise RuntimeError(f"Unexpected export result shape for {table_name}")
        if len(rows) + len(page_rows) > remaining:
            raise HTTPException(
                status_code=413,
                detail="بيانات التصدير تتجاوز الحد الآمن للطلب. لم يُرجع تصدير جزئي؛ يلزم مسار تصدير كبير الحجم.",
            )
        rows.extend(page_rows)
        if len(page_rows) < EXPORT_PAGE_SIZE:
            return rows
        offset += len(page_rows)


@router.get("/export")
async def export_all_data(user_id: str = Depends(get_current_user_id)):
    """Export only when the inventory is verified complete; never label a partial export as complete."""
    # The source snapshot does not prove schemas/order columns for every account-owned
    # table. Refuse to produce a downloadable artifact until that inventory is verified.
    # This intentionally favors an honest, actionable failure over a misleading partial export.
    if EXPORT_NOT_COVERED_TABLES or not EXPORT_SCHEMA_VERIFICATION_PASSED:
        logger.error(
            "Account export blocked because schema coverage is unverified; pending_table_count=%s",
            len(EXPORT_NOT_COVERED_TABLES),
        )
        raise HTTPException(
            status_code=503,
            detail="تصدير الحساب الكامل غير متاح مؤقتًا حتى التحقق من مخطط جميع فئات البيانات. لم يتم إنشاء ملف جزئي.",
        )
    db = get_db()
    try:
        profile_result = (
            db.table("profiles").select("*").eq("id", user_id).limit(1).execute()
        )
        profile_rows = profile_result.data or []
        if not profile_rows:
            raise HTTPException(status_code=404, detail="ملف الحساب غير موجود")
        profile = profile_rows[0] if isinstance(profile_rows, list) else profile_rows

        # Never include credential-like fields even if the profile schema changes.
        safe_profile = {
            key: value for key, value in profile.items()
            if not any(marker in key.lower() for marker in ("password", "token", "secret", "api_key", "private_key"))
        }
        data = {"profile": safe_profile}
        total_records = 1
        for export_key, (table_name, order_column) in EXPORT_TABLES.items():
            rows = _fetch_all_owned_rows(
                db, table_name, user_id, order_column,
                remaining=EXPORT_MAX_RECORDS - total_records,
            )
            data[export_key] = rows
            total_records += len(rows)

        return {
            "schema_version": "1.2",
            "user_id": user_id,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "total_records": total_records,
            "export_coverage": {
                "complete": len(EXPORT_NOT_COVERED_TABLES) == 0,
                "included_tables": [table_name for table_name, _key, _order in _ACCOUNT_TABLE_ROWS if _key is not None],
                "pending_schema_verification": list(EXPORT_NOT_COVERED_TABLES),
            },
            "data": data,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Account data export failed; refusing to return a partial archive; error_type=%s",
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=503,
            detail="تعذر إكمال تصدير بيانات الحساب بالكامل. لم يتم إنشاء تصدير جزئي؛ حاول لاحقًا أو تواصل مع الدعم.",
        )

# Deletion uses the shared account-data inventory defined above.

def _delete_auth_user_idempotently(db, user_id: str) -> None:
    """Delete the Supabase Auth user; tolerate only a positively identified missing user."""
    try:
        db.auth.admin.delete_user(user_id)
    except Exception as exc:
        message = str(exc).lower()
        if "user_not_found" in message or "user not found" in message or "user does not exist" in message:
            return
        # A generic 404 is not enough evidence: it could refer to another failure.
        raise


async def run_deletion_cleanup():
    """Purge due accounts idempotently; claimed work is leased and retryable."""
    db = get_db()
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    stale_before = (now_dt - timedelta(minutes=15)).isoformat()

    # Normal due work and expired leases are queried separately so an interrupted
    # process can be recovered without allowing two active workers to claim it.
    pending_response = (
        db.table("profiles")
        .select("id,status,deleted_at,deletion_started_at")
        .in_("status", ["pending_deletion", "deletion_failed"])
        .lte("deleted_at", now)
        .order("deleted_at", desc=False)
        .limit(100)
        .execute()
    )
    stale_response = (
        db.table("profiles")
        .select("id,status,deleted_at,deletion_started_at")
        .eq("status", "deletion_in_progress")
        .lt("deletion_started_at", stale_before)
        .lte("deleted_at", now)
        .order("deletion_started_at", desc=False)
        .limit(100)
        .execute()
    )
    candidates = []
    seen_ids = set()
    for row in (pending_response.data or []) + (stale_response.data or []):
        candidate_id = row.get("id")
        if candidate_id and candidate_id not in seen_ids:
            seen_ids.add(candidate_id)
            candidates.append(row)

    # Validate the whole deletion inventory before claiming or deleting any account.
    # PostgREST validates both table and column names even for a zero-row select.
    # A missing table/owner column must stop the run before any irreversible action.
    if candidates:
        try:
            for table_name in DELETION_USER_TABLES:
                db.table(table_name).select("user_id").limit(0).execute()
        except Exception as exc:
            logger.error(
                "Account cleanup preflight failed; no accounts were claimed; error_type=%s",
                type(exc).__name__,
            )
            raise RuntimeError(
                "Account deletion inventory preflight failed; no accounts were claimed"
            ) from exc

    deleted_count = 0
    failures = []

    for row in candidates:
        user_id = row.get("id")
        if not user_id:
            failures.append("pending deletion profile without id")
            continue
        claimed_work = False
        try:
            claim_update = (
                db.table("profiles")
                .update({"status": "deletion_in_progress", "deletion_started_at": now})
                .eq("id", user_id)
                .lte("deleted_at", now)
            )
            if row.get("status") == "deletion_in_progress":
                claim_update = claim_update.eq("status", "deletion_in_progress").lt("deletion_started_at", stale_before)
            else:
                claim_update = claim_update.in_("status", ["pending_deletion", "deletion_failed"])
            claimed = claim_update.select("id").execute()
            if not (claimed.data or []):
                continue  # restored or claimed by another worker
            claimed_work = True

            # Deleting child/user-owned records is idempotent. Stop on the first
            # error; never delete Auth/profile while personal data may remain.
            for table_name in DELETION_USER_TABLES:
                db.table(table_name).delete().eq("user_id", user_id).execute()

            # Auth deletion is last among data operations. The profile remains
            # as a retry marker if Auth or the final profile delete fails.
            _delete_auth_user_idempotently(db, user_id)
            db.table("profiles").delete().eq("id", user_id).execute()
            deleted_count += 1
        except Exception as exc:
            logger.error("Account purge failed; marking account for retry; error_type=%s", type(exc).__name__)
            failures.append(f"{user_id}:{type(exc).__name__}")
            # Only mutate status if this worker actually acquired the lease. If
            # claiming itself failed, leave the row untouched for a future run.
            if claimed_work:
                try:
                    db.table("profiles").update({
                        "status": "deletion_failed",
                        "deletion_started_at": None,
                    }).eq("id", user_id).eq("status", "deletion_in_progress").execute()
                except Exception as retry_exc:
                    # The old lease timestamp allows recovery after 15 minutes.
                    logger.error(
                        "Could not persist deletion retry state; stale lease recovery remains enabled; error_type=%s",
                        type(retry_exc).__name__,
                    )

    if failures:
        # The external scheduler must record the failed invocation and retry.
        raise RuntimeError(f"Account deletion cleanup incomplete for {len(failures)} account(s)")
    if deleted_count:
        logger.info("Account deletion cleanup completed for %s account(s)", deleted_count)
    return deleted_count


logger.info("✅ Account Routes v3.0 initialized (Graceful Deletion + TCMA Export)")
