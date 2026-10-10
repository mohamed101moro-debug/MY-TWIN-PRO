"""
ENVIRONMENT ENGINE v1.0 – محرك البيئة (World Model)
======================================================
يبني نموذجاً كاملاً للمنزل: غرف، أجهزة، طقس، وقت، أشخاص، ضوضاء.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("environment_engine")

class EnvironmentEngine:
    def __init__(self):
        self.world_model: Dict[str, Any] = {
            "rooms": {},
            "outdoor": {"weather": {}, "time": "", "season": ""},
            "people": [],
        }

    async def build_world_model(self, user_id: str, lang: str = "ar") -> Dict[str, Any]:
        """بناء نموذج كامل للمنزل"""
        # الغرف والأجهزة
        rooms = await self._discover_rooms()
        
        # الطقس
        weather = await self._get_weather("Cairo", lang)
        
        # الوقت
        now = datetime.now(timezone.utc)
        hour = now.hour + 3  # توقيت القاهرة
        
        # الأشخاص (من TCMA)
        people = await self._get_people(user_id)

        self.world_model = {
            "rooms": rooms,
            "outdoor": {
                "weather": weather,
                "time": now.isoformat(),
                "hour": hour,
                "season": self._get_season(now.month),
                "is_daytime": 6 <= hour < 18,
            },
            "people": people,
        }
        return self.world_model

    async def _discover_rooms(self) -> Dict[str, Any]:
        """اكتشاف الغرف والأجهزة"""
        try:
            from app.features.smart_home.device_controllers import discover_devices
            devices = await discover_devices()
            rooms = {}
            for device in devices:
                room = device.get("room", "unknown")
                if room not in rooms:
                    rooms[room] = {"devices": [], "lighting": "unknown", "occupancy": False}
                rooms[room]["devices"].append(device)
                if device.get("type") == "light" and device.get("state") == "on":
                    rooms[room]["lighting"] = "on"
            return rooms or {"living_room": {"devices": [], "lighting": "off"}}
        except:
            return {"living_room": {"devices": [], "lighting": "off"}}

    async def _get_weather(self, city: str, lang: str) -> Dict:
        try:
            from app.features.task_manager.external_services import get_weather
            return await get_weather(city, lang) or {}
        except: return {}

    async def _get_people(self, user_id: str) -> List[Dict]:
        try:
            from app.memory.relationship.person_node import get_person_network
            return await get_person_network(user_id, min_importance=30) or []
        except: return []

    def _get_season(self, month: int) -> str:
        if month in [12, 1, 2]: return "winter"
        if month in [3, 4, 5]: return "spring"
        if month in [6, 7, 8]: return "summer"
        return "autumn"

    def get_room_state(self, room: str) -> Dict:
        return self.world_model.get("rooms", {}).get(room, {})

    def get_outdoor_state(self) -> Dict:
        return self.world_model.get("outdoor", {})


environment_engine = EnvironmentEngine()
