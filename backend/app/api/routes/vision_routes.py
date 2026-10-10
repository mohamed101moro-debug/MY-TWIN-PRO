"""Cloud vision is intentionally unavailable until consent and retention controls are approved."""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/vision", tags=["vision"])


def _disabled():
    raise HTTPException(
        status_code=503,
        detail="Cloud vision and location awareness are disabled pending an approved consent and privacy policy.",
    )


@router.post("/describe")
async def describe():
    _disabled()


@router.post("/place-aware")
async def place_aware():
    _disabled()
