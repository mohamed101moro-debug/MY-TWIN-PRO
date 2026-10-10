#!/usr/bin/env python3
"""S5.5.3 Production Validation Gate.

This script intentionally performs real Supabase writes only when the operator
explicitly opts in. It validates the database boundary introduced by S5.5.2:
health, atomic commit, exact retry deduplication, and concurrent lifecycle
commits for one validation Twin.

Required environment:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY
  MYTWIN_VALIDATION_USER_ID
  MYTWIN_VALIDATION_ALLOW_WRITE=true

Optional:
  MYTWIN_VALIDATION_PREFIX (default: s553-gate)

It does not claim Railway restart, Android lifecycle, or multi-day continuity;
those require the real deployed environments and are recorded separately.
"""
from __future__ import annotations

import concurrent.futures
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from supabase import create_client


REQUIRED = ("SUPABASE_URL", "MYTWIN_VALIDATION_USER_ID")


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rpc(db, user_id: str, canonical: Dict[str, Any]) -> Dict[str, Any]:
    result = db.rpc(
        "commit_twin_life_intention",
        {
            "p_user_id": user_id,
            "p_canonical": canonical,
            "p_fingerprint": canonical["evidence_fingerprint"],
            "p_intention_id": canonical.get("intention_id"),
            "p_observed_at": canonical.get("observed_at"),
            "p_dedupe_window_seconds": 30,
        },
    ).execute()
    if not isinstance(result.data, dict):
        fail(f"RPC returned non-object: {result.data!r}")
    return result.data


def main() -> int:
    missing = [name for name in REQUIRED if not os.getenv(name)]
    if missing:
        fail("missing environment: " + ", ".join(missing))
    if os.getenv("MYTWIN_VALIDATION_ALLOW_WRITE", "").lower() != "true":
        fail("set MYTWIN_VALIDATION_ALLOW_WRITE=true to authorize real database writes")

    service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not service_key:
        fail("missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY")

    db = create_client(os.environ["SUPABASE_URL"], service_key)
    user_id = os.environ["MYTWIN_VALIDATION_USER_ID"]
    prefix = os.getenv("MYTWIN_VALIDATION_PREFIX", "s553-gate")

    # 1. Database health / table existence.
    try:
        db.table("twin_internal_states").select("user_id,continuity_revision").eq("user_id", user_id).maybe_single().execute()
        db.table("lifecycle_intention_receipts").select("user_id").eq("user_id", user_id).limit(1).execute()
    except Exception as exc:
        fail(f"database/receipt ledger unavailable: {exc}")
    print("PASS: Supabase connectivity + required tables")

    # 2. Exact retry: same intention_id must return the same revision.
    intention_id = f"{prefix}-retry-{uuid.uuid4()}"
    fingerprint = f"{prefix}-fp-{uuid.uuid4()}"
    canonical = {
        "intention_id": intention_id,
        "evidence_fingerprint": fingerprint,
        "evidence": {"user_present": True, "battery_low": False, "validation": True},
        "intention": "user_present",
        "meaning": {
            "intention": "user_present",
            "causes": ["validation"],
            "confidence": 1.0,
            "implied_need": "continuity_check",
            "internal_only": True,
            "schema_version": "s3.0",
        },
        "observed_at": now_iso(),
        "continuity_schema_version": "s5.5",
        "source": "s5.5.3_production_gate",
    }
    first = rpc(db, user_id, canonical)
    second = rpc(db, user_id, canonical)
    if first.get("continuity_revision") != second.get("continuity_revision"):
        fail("same intention retry advanced continuity_revision")
    if not second.get("deduplicated"):
        fail("same intention retry was not deduplicated")
    print("PASS: exact retry idempotency")

    # 3. Two legitimate events in parallel must both commit and receive
    # different monotonic revisions. The advisory lock serializes the commit.
    def make_event(label: str) -> Dict[str, Any]:
        return {
            "intention_id": f"{prefix}-parallel-{label}-{uuid.uuid4()}",
            "evidence_fingerprint": f"{prefix}-parallel-fp-{label}-{uuid.uuid4()}",
            "evidence": {"user_present": True, "validation": True, "parallel": label},
            "intention": "user_present",
            "meaning": {
                "intention": "user_present",
                "causes": ["parallel_validation", label],
                "confidence": 1.0,
                "implied_need": "continuity_check",
                "internal_only": True,
                "schema_version": "s3.0",
            },
            "observed_at": now_iso(),
            "continuity_schema_version": "s5.5",
            "source": "s5.5.3_production_gate",
        }

    events = [make_event("a"), make_event("b")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda item: rpc(db, user_id, item), events))

    revisions = sorted(int(r["continuity_revision"]) for r in results)
    if revisions[1] != revisions[0] + 1:
        fail(f"parallel revisions are not consecutive: {revisions}")
    if any(r.get("deduplicated") for r in results):
        fail("distinct parallel events were incorrectly deduplicated")
    print(f"PASS: concurrent atomic commits ({revisions[0]} -> {revisions[1]})")

    # 4. Final persisted state must expose the latest lifecycle revision.
    state = db.table("twin_internal_states").select("continuity_revision,continuity_schema_version,last_life_intention").eq("user_id", user_id).single().execute()
    data = state.data or {}
    if int(data.get("continuity_revision", -1)) != revisions[1]:
        fail("persisted state revision does not match latest atomic commit")
    if data.get("continuity_schema_version") != "s5.5":
        fail("persisted continuity schema is not s5.5")
    print("PASS: persisted canonical state matches atomic commit")

    print("\nS5.5.3 DATABASE GATE: PASS")
    print("Remaining gates: Railway restart, network/app-kill durable queue, EAS/device lifecycle, multi-day continuity.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
