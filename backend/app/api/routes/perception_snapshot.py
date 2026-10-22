"""Cloud sensory snapshots are disabled until an explicit, revocable consent flow exists."""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/perception", tags=["perception"])


@router.post("/snapshot")
async def snapshot():
    raise HTTPException(
        status_code=410,
        detail="Cloud perception snapshots are disabled pending an approved privacy and consent policy.",
    )
