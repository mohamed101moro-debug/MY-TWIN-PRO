"""
CAPABILITY REGISTRY v1.0 – سجل القدرات الموسع
=================================================
كل قدرة تحمل Metadata: متى تستخدم، الثقة، التكلفة، الوقت.
"""
import logging
from typing import Dict, Any, Optional, Callable, List

logger = logging.getLogger("capability_registry")

class CapabilityRegistry:
    _capabilities: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register(cls, name: str, func: Callable, metadata: Dict[str, Any] = None):
        cls._capabilities[name] = {
            "function": func,
            "metadata": metadata or {},
            "health": {"success_rate": 100, "avg_latency_ms": 0, "last_executed": None},
        }

    @classmethod
    def get(cls, name: str) -> Optional[Callable]:
        cap = cls._capabilities.get(name)
        return cap["function"] if cap else None

    @classmethod
    def get_metadata(cls, name: str) -> Dict[str, Any]:
        return cls._capabilities.get(name, {}).get("metadata", {})

    @classmethod
    def list_all(cls) -> List[str]:
        return list(cls._capabilities.keys())

    @classmethod
    def update_health(cls, name: str, latency_ms: float, success: bool):
        if name in cls._capabilities:
            h = cls._capabilities[name]["health"]
            h["avg_latency_ms"] = (h["avg_latency_ms"] * 0.7 + latency_ms * 0.3) if h["avg_latency_ms"] else latency_ms
            if not success: h["success_rate"] = max(0, h["success_rate"] - 5)
            import datetime; h["last_executed"] = datetime.datetime.now().isoformat()

# ── تسجيل القدرات مع Metadata ──────────────────────────────
CapabilityRegistry.register("weather", None, {"when_to_use": "أسئلة الطقس", "confidence": 90, "cost": 0, "latency_ms": 500})
CapabilityRegistry.register("news", None, {"when_to_use": "أخبار", "confidence": 85, "cost": 0, "latency_ms": 600})
CapabilityRegistry.register("memory", None, {"when_to_use": "تذكر الماضي", "confidence": 80, "cost": 0, "latency_ms": 200})
CapabilityRegistry.register("emotion", None, {"when_to_use": "تحليل المشاعر", "confidence": 85, "cost": 0, "latency_ms": 150})
CapabilityRegistry.register("study", None, {"when_to_use": "تعلم", "confidence": 90, "cost": 2, "latency_ms": 1500})
CapabilityRegistry.register("business", None, {"when_to_use": "مشاريع", "confidence": 85, "cost": 2, "latency_ms": 2000})
CapabilityRegistry.register("code", None, {"when_to_use": "برمجة", "confidence": 90, "cost": 3, "latency_ms": 2000})
CapabilityRegistry.register("life_coach", None, {"when_to_use": "دعم نفسي", "confidence": 95, "cost": 1, "latency_ms": 1000})
CapabilityRegistry.register("dream", None, {"when_to_use": "تفسير أحلام", "confidence": 75, "cost": 2, "latency_ms": 1500})
CapabilityRegistry.register("recommendation", None, {"when_to_use": "توصيات", "confidence": 90, "cost": 0, "latency_ms": 300})

logger.info(f"✅ Capability Registry: {len(CapabilityRegistry._capabilities)} capabilities")
