from fastapi import APIRouter, Query, Body
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/pass", tags=["pass"])

class TaskCreate(BaseModel):
    user_id: str; title: str; due_date: Optional[str] = None; priority: str = "medium"

@router.post("/tasks/create")
async def create_task(req: TaskCreate):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant.create_task(req.user_id, req.title, req.due_date, req.priority)

@router.get("/tasks")
async def list_tasks(user_id: str = Query(...)):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant.list_tasks(user_id)

@router.post("/tasks/complete")
async def complete_task(user_id: str = Query(...), task_id: str = Query(...)):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant.complete_task(user_id, task_id)

@router.get("/dashboard")
async def dashboard(user_id: str = Query(...)):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant.get_dashboard(user_id)

@router.get("/weather")
async def weather(city: str = "Cairo", lang: str = "ar"):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant._get_weather(city)

@router.get("/habits")
async def habits(user_id: str = Query(...)):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant.habit.get_daily_habits(user_id)

@router.post("/habits/track")
async def track_habit(user_id: str = Query(...), habit_name: str = Query(...), progress: int = Query(...)):
    from app.features.task_manager.pass_orchestrator import pass_assistant
    return await pass_assistant.habit.track_habit(user_id, habit_name, progress)
