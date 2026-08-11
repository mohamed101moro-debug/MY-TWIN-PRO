"""
P.A.S.S. ORCHESTRATOR v6.1 – Life Executive Engine (مع Supabase كـ Source of Truth)
====================================================================================
- جميع المهام تُحفظ في Supabase أولاً، والذاكرة المحلية Cache فقط
- يستخدم UUID لتجنب تصادم المعرفات
- يحفظ تلقائياً في History عبر pass_memory
"""
import logging, uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from app.features.base_plugin import BasePlugin
from app.features.task_manager.priority_engine import priority_engine
from app.features.task_manager.energy_scheduler import energy_scheduler
from app.features.task_manager.habit_intelligence import habit_intelligence
from app.features.task_manager.calendar_ai import calendar_ai
from app.features.task_manager.context_awareness import context_awareness
from app.features.task_manager.proactive_ai import proactive_ai
from app.features.task_manager.daily_planner import daily_planner
from app.features.task_manager.pass_memory import pass_memory

logger = logging.getLogger(__name__)

class PASSOrchestrator(BasePlugin):
    def __init__(self):
        super().__init__(name="PASS", version="6.1.0")
        self.tasks_cache: Dict[str, List[Dict]] = {}
        self.calendar_events: Dict[str, List[Dict]] = {}
        self.priority = priority_engine
        self.energy_sched = energy_scheduler
        self.habit = habit_intelligence
        self.calendar = calendar_ai
        self.context = context_awareness
        self.proactive = proactive_ai
        self.planner = daily_planner
        self.memory = pass_memory

    async def _inject_dependencies(self):
        ai = self.ai.route if hasattr(self, 'ai') and self.ai else None
        mem = self._memory_client
        for e in [self.priority, self.calendar, self.context, self.proactive, self.planner]:
            e.ai_route = ai
        for e in [self.habit, self.context, self.memory]:
            e.memory_client = mem

    @property
    def plugin_id(self) -> str: return "pass"
    @property
    def plugin_name_ar(self) -> str: return "المدير التنفيذي الرقمي"
    @property
    def plugin_name_en(self) -> str: return "Life Executive"

    # ── دوال Supabase ──────────────────────────────────────
    def _get_db(self):
        try:
            from app.infrastructure.database.supabase_client import get_db
            return get_db()
        except: return None

    async def _fetch_tasks_from_db(self, user_id: str) -> List[Dict]:
        db = self._get_db()
        if not db: return []
        try:
            res = db.table("tasks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data if res.data else []
        except Exception as e:
            logger.warning(f"DB fetch failed: {e}")
            return []

    async def _insert_task_to_db(self, user_id: str, task: Dict):
        db = self._get_db()
        if db:
            try:
                db.table("tasks").insert({
                    "id": task["id"], "user_id": user_id, "title": task["title"],
                    "due_date": task.get("due_date"), "priority": task.get("priority", "medium"),
                    "status": task.get("status", "pending"), "created_at": task.get("created_at")
                }).execute()
            except Exception as e:
                logger.warning(f"DB insert failed: {e}")

    async def _update_task_in_db(self, task_id: str, updates: Dict):
        db = self._get_db()
        if db:
            try:
                db.table("tasks").update(updates).eq("id", task_id).execute()
            except Exception as e:
                logger.warning(f"DB update failed: {e}")

    async def _delete_task_from_db(self, task_id: str):
        db = self._get_db()
        if db:
            try:
                db.table("tasks").delete().eq("id", task_id).execute()
            except Exception as e:
                logger.warning(f"DB delete failed: {e}")

    # ── CRUD ───────────────────────────────────────────────
    async def create_task(self, user_id: str, title: str, due_date: str = "", priority: str = "medium") -> Dict:
        await self._inject_dependencies()
        task_id = str(uuid.uuid4())
        task = {
            "id": task_id, "title": title, "due_date": due_date,
            "priority": priority, "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        # تخزين في Supabase
        await self._insert_task_to_db(user_id, task)
        # حفظ في History
        await self.memory.save_task(user_id, task)
        # تحديث الكاش
        if user_id not in self.tasks_cache: self.tasks_cache[user_id] = []
        self.tasks_cache[user_id].append(task)
        return {"task": task}

    async def list_tasks(self, user_id: str) -> Dict:
        await self._inject_dependencies()
        # الجلب من Supabase كمصدر أساسي
        tasks = await self._fetch_tasks_from_db(user_id)
        # تحديث الكاش
        self.tasks_cache[user_id] = tasks
        sorted_tasks = self.priority.sort_by_priority(tasks, 50)
        return {"tasks": sorted_tasks, "total": len(sorted_tasks)}

    async def complete_task(self, user_id: str, task_id: str) -> Dict:
        # تحديث Supabase
        await self._update_task_in_db(task_id, {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()})
        # تحديث الكاش
        for t in self.tasks_cache.get(user_id, []):
            if t["id"] == task_id:
                t["status"] = "completed"
                await self.memory.complete_task(user_id, t)
                return {"task": t}
        return {"error": "غير موجودة"}

    async def delete_task(self, user_id: str, task_id: str) -> Dict:
        await self._delete_task_from_db(task_id)
        self.tasks_cache[user_id] = [t for t in self.tasks_cache.get(user_id, []) if t["id"] != task_id]
        return {"message": "تم الحذف"}

    async def get_dashboard(self, user_id: str) -> Dict:
        await self._inject_dependencies()
        tasks = await self._fetch_tasks_from_db(user_id)
        habits = await self.habit.get_daily_habits(user_id)
        weather = await self._get_weather("Cairo")
        suggestions = await self.proactive.generate_suggestions(user_id, tasks, habits, weather)
        plan = self.planner.build_daily_plan(tasks, habits, weather, 60)
        return {"tasks": tasks, "habits": habits, "weather": weather, "suggestions": suggestions, "daily_plan": plan}

    async def _get_weather(self, city: str) -> Dict:
        try:
            from app.features.task_manager.external_services import get_weather
            return await get_weather(city) or {}
        except: return {}

    def register_routes(self, app: Any) -> bool:
        try:
            from app.api.routes.task_manager_routes import router
            app.include_router(router)
            return True
        except: return False


pass_assistant = PASSOrchestrator()
