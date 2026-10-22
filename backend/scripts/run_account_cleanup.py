"""One-shot account deletion worker intended for a dedicated platform cron job.

Run from the backend directory with the same private environment variables as the API:
    python scripts/run_account_cleanup.py
The process exits non-zero on an incomplete purge so the platform can alert; due
accounts marked deletion_failed are selected again by the next scheduled run.
"""
import asyncio
import logging
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.routes.account import run_deletion_cleanup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("account_cleanup_job")


def main() -> int:
    try:
        deleted = asyncio.run(run_deletion_cleanup())
        logger.info("Account cleanup run completed; deleted_accounts=%d", deleted)
        return 0
    except Exception as exc:
        # Do not log exception strings that could contain provider response data.
        logger.error("Account cleanup run failed; error_type=%s", type(exc).__name__)
        return 1


if __name__ == "__main__":
    sys.exit(main())
