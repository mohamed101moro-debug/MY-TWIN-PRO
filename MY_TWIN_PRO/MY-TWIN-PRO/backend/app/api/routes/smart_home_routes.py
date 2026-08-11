from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/smart-home", tags=["smart-home"])

class CommandRequest(BaseModel):
    user_id: str; command: str; lang: str = "ar"

@router.post("/command")
async def process_command(req: CommandRequest):
    from app.features.smart_home.smart_home_orchestrator import smart_home
    return await smart_home.process_command(req.user_id, req.command, req.lang)

@router.get("/status")
async def get_status(user_id: str = Query(...)):
    from app.features.smart_home.smart_home_orchestrator import smart_home
    return await smart_home.get_status(user_id)

@router.get("/environment/{user_id}")
async def get_environment(user_id: str, lang: str = "ar"):
    from app.features.smart_home.smart_home_orchestrator import smart_home
    await smart_home._inject_dependencies()
    return await smart_home.environment.build_world_model(user_id, lang)

@router.get("/predictions/{user_id}")
async def get_predictions(user_id: str):
    from app.features.smart_home.smart_home_orchestrator import smart_home
    await smart_home._inject_dependencies()
    env = await smart_home.environment.build_world_model(user_id)
    return await smart_home.predictive.predict(env)

@router.get("/personality/{emotion}")
async def get_personality(emotion: str = "neutral"):
    from app.features.smart_home.smart_home_orchestrator import smart_home
    return smart_home.personality.get_environment_for_emotion(emotion)

@router.post("/automation/suggest")
async def suggest_automation(user_id: str = Query(...), lang: str = "ar"):
    from app.features.smart_home.smart_home_orchestrator import smart_home
    await smart_home._inject_dependencies()
    return {"suggestions": await smart_home.automation.learn_patterns(user_id, lang)}
