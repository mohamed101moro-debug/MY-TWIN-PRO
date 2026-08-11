"""
Twin Energy Engine v2.0 — طاقة الكيان المتكاملة
==================================================
طاقة الكيان الرقمي - مرتبطة بعدة مصادر:
- عدد الرسائل اليومي المتبقي (من Limits Service)
- طاقة بطارية الهاتف (من DevicePresenceEngine)
- الرابطة العاطفية (Bond Level)
- الوقت من اليوم (ساعات الهدوء = إعادة شحن)
- الإرهاق العاطفي (من Emotional Momentum)
- إمكانية استعادة الطاقة عبر الإعلانات (الباقة المجانية)

تأثير الطاقة على السلوك:
- طاقة منخفضة (< 25%): ردود مختصرة، نبرة هادئة، طلب راحة أو ترقية
- طاقة متوسطة (25-60%): ردود طبيعية
- طاقة مرتفعة (> 60%): ردود غنية، مبادرة، حماس
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("twin_energy_engine")

class TwinEnergyEngine:
    """
    محرك طاقة الكيان الرقمي v2.0.
    يجمع مصادر الطاقة المتعددة في قيمة واحدة.
    """
    
    def __init__(self):
        self._states: Dict[str, Dict[str, Any]] = {}
    
    async def get_energy_state(
        self,
        user_id: str,
        tier: str = "free",
        bond_level: int = 50,
        hour: Optional[int] = None,
        device_battery: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        حساب حالة الطاقة الكاملة للكيان.
        
        Args:
            user_id: معرف المستخدم
            tier: الباقة (free, plus, premium, pro, yearly)
            bond_level: مستوى الرابطة (0-100)
            hour: ساعة اليوم (للحساب إن لم يُمرر)
            device_battery: نسبة بطارية الهاتف (0-100)
            
        Returns:
            حالة الطاقة مع توصيات
        """
        if hour is None:
            hour = datetime.now(timezone.utc).hour
        
        now = datetime.now(timezone.utc)
        is_quiet_time = hour >= 22 or hour < 6
        
        # ═══════════════════════════════════════════
        # 1. حساب الطاقة من الرسائل المتبقية (Messages Energy)
        # ═══════════════════════════════════════════
        messages_energy, messages_remaining, messages_limit = await self._calc_messages_energy(user_id, tier)
        
        # ═══════════════════════════════════════════
        # 2. حساب طاقة الرابطة (Bond Energy)
        # ═══════════════════════════════════════════
        bond_energy = self._calc_bond_energy(bond_level)
        
        # ═══════════════════════════════════════════
        # 3. حساب طاقة الوقت (Time Energy)
        # ═══════════════════════════════════════════
        time_energy = self._calc_time_energy(hour, is_quiet_time)
        
        # ═══════════════════════════════════════════
        # 4. حساب طاقة الجهاز (Device Energy)
        # ═══════════════════════════════════════════
        device_energy = self._calc_device_energy(device_battery)
        
        # ═══════════════════════════════════════════
        # 5. حساب الإرهاق العاطفي (Emotional Drain)
        # ═══════════════════════════════════════════
        emotional_drain = await self._get_emotional_drain(user_id)
        
        # ═══════════════════════════════════════════
        # 6. حساب الطاقة الإجمالية
        # ═══════════════════════════════════════════
        weights = {
            "messages": 0.30,    # عدد الرسائل المتبقية هو العامل الأهم
            "bond": 0.20,        # الرابطة تؤثر
            "time": 0.15,        # الوقت من اليوم
            "device": 0.15,      # بطارية الهاتف
            "emotional": -0.20,  # الإرهاق العاطفي يخصم
        }
        
        # تجميع
        total_energy = (
            messages_energy * weights["messages"] +
            bond_energy * weights["bond"] +
            time_energy * weights["time"] +
            device_energy * weights["device"] +
            (1.0 - emotional_drain) * abs(weights["emotional"])
        )
        
        # تطبيع
        total_energy = max(0.05, min(1.0, total_energy))
        
        # ═══════════════════════════════════════════
        # 7. تحديد الحالة والتوصية
        # ═══════════════════════════════════════════
        is_exhausted = total_energy < 0.15
        is_low_energy = total_energy < 0.25
        needs_rest = total_energy < 0.30
        can_be_proactive = total_energy > 0.50
        
        recommendation, energy_tip = self._get_recommendation(
            total_energy, tier, messages_remaining, device_battery
        )
        
        # ═══════════════════════════════════════════
        # 8. تأثير الطاقة على الردود
        # ═══════════════════════════════════════════
        response_behavior = self._get_response_behavior(total_energy, is_exhausted)
        
        # ═══════════════════════════════════════════
        # 9. بناء النتيجة
        # ═══════════════════════════════════════════
        state = {
            "energy": round(total_energy, 3),
            "max_energy": 1.0,
            "is_exhausted": is_exhausted,
            "is_low_energy": is_low_energy,
            "needs_rest": needs_rest,
            "can_be_proactive": can_be_proactive,
            "sources": {
                "messages_energy": round(messages_energy, 3),
                "messages_remaining": messages_remaining,
                "messages_limit": messages_limit,
                "bond_energy": round(bond_energy, 3),
                "time_energy": round(time_energy, 3),
                "device_energy": round(device_energy, 3),
                "emotional_drain": round(emotional_drain, 3),
            },
            "recommendation": recommendation,
            "energy_tip": energy_tip,
            "response_behavior": response_behavior,
            "is_quiet_time": is_quiet_time,
            "timestamp": now.isoformat(),
        }
        
        # حفظ الحالة
        self._states[user_id] = state
        
        # تحديث الحالة الداخلية
        try:
            from app.twin_state.internal_state import twin_internal_state
            istate = await twin_internal_state.get_state(user_id)
            istate["energy_level"] = total_energy
            await twin_internal_state._save_state(user_id, istate)
        except Exception:
            pass
        
        return state
    
    async def consume_interaction(self, user_id: str, intensity: float = 0.5) -> Dict[str, Any]:
        """
        استهلاك طاقة بعد تفاعل.
        يُستدعى بعد كل رسالة.
        """
        if user_id not in self._states:
            return await self.get_energy_state(user_id)
        
        drain = 0.01 + (intensity * 0.02)
        current = self._states[user_id]["energy"]
        self._states[user_id]["energy"] = max(0.05, current - drain)
        
        return self._states[user_id]
    
    async def restore_energy(
        self,
        user_id: str,
        amount: float = 0.2,
        source: str = "ad_reward",
    ) -> Dict[str, Any]:
        """
        استعادة طاقة من مصدر ما.
        - ad_reward: مكافأة مشاهدة إعلان (+20%)
        - rest: استراحة طبيعية (+10%)
        - upgrade: ترقية الباقة (إعادة تعيين كامل)
        """
        if user_id not in self._states:
            await self.get_energy_state(user_id)
        
        if source == "upgrade":
            self._states[user_id]["energy"] = 1.0
        else:
            current = self._states[user_id]["energy"]
            self._states[user_id]["energy"] = min(1.0, current + amount)
        
        # تحديث الحالة الداخلية
        try:
            from app.twin_state.internal_state import twin_internal_state
            istate = await twin_internal_state.get_state(user_id)
            istate["energy_level"] = self._states[user_id]["energy"]
            await twin_internal_state._save_state(user_id, istate)
        except Exception:
            pass
        
        logger.info(f"⚡ طاقة {user_id} استعيدت ({source}): +{amount*100:.0f}% → {self._states[user_id]['energy']*100:.0f}%")
        return self._states[user_id]
    
    async def get_state(self, user_id: str) -> Dict[str, Any]:
        """استرجاع آخر حالة طاقة."""
        if user_id not in self._states:
            return await self.get_energy_state(user_id)
        return self._states[user_id]
    
    # ═══════════════════════════════════════════
    # دوال حساب مصادر الطاقة
    # ═══════════════════════════════════════════
    
    async def _calc_messages_energy(self, user_id: str, tier: str) -> tuple:
        """حساب الطاقة من عدد الرسائل المتبقية."""
        try:
            from app.domain.services.tier_service import get_daily_messages
            limit = get_daily_messages(tier)
        except Exception:
            limit = 15  # افتراضي: Free
        
        try:
            from app.domain.services.limits_service import get_usage_summary
            usage = get_usage_summary(user_id, tier)
            remaining = usage.get("messages", {}).get("remaining", limit)
        except Exception:
            remaining = limit
        
        if limit == 9999:  # باقات غير محدودة
            return 1.0, remaining, limit
        
        energy = remaining / limit if limit > 0 else 0.0
        return min(1.0, energy), remaining, limit
    
    def _calc_bond_energy(self, bond_level: int) -> float:
        """حساب طاقة الرابطة."""
        return min(1.0, bond_level / 100)
    
    def _calc_time_energy(self, hour: int, is_quiet_time: bool) -> float:
        """حساب طاقة الوقت من اليوم."""
        if is_quiet_time:
            return 0.3  # وقت هدوء = طاقة منخفضة (وضع راحة)
        elif 6 <= hour < 10:
            return 0.9  # صباح = طاقة عالية
        elif 10 <= hour < 14:
            return 0.8
        elif 14 <= hour < 18:
            return 0.6  # بعد الظهر = طاقة متوسطة
        elif 18 <= hour < 22:
            return 0.7  # مساء
        return 0.5
    
    def _calc_device_energy(self, device_battery: Optional[float]) -> float:
        """حساب طاقة الجهاز (بطارية الهاتف)."""
        if device_battery is None:
            return 0.7  # قيمة افتراضية إن لم تُمرر
        
        if device_battery < 15:
            return 0.2  # بطارية منخفضة جداً
        elif device_battery < 30:
            return 0.4
        elif device_battery < 50:
            return 0.6
        elif device_battery < 80:
            return 0.8
        else:
            return 1.0
    
    async def _get_emotional_drain(self, user_id: str) -> float:
        """حساب الإرهاق العاطفي."""
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            return state.get("emotional_momentum_state", {}).get("current_momentum", 0.0)
        except Exception:
            return 0.0
    
    # ═══════════════════════════════════════════
    # دوال التوصية والسلوك
    # ═══════════════════════════════════════════
    
    def _get_recommendation(
        self, energy: float, tier: str, remaining: int, battery: Optional[float]
    ) -> tuple:
        """توليد توصية بناءً على الطاقة."""
        if energy < 0.10:
            if tier == "free":
                return (
                    "rest_or_ad",
                    "التوأم متعب جداً. شاهد إعلاناً لاستعادة 20% من الطاقة أو انتظر 30 دقيقة."
                )
            else:
                return (
                    "rest",
                    "التوأم يحتاج للراحة. سيعود بكامل طاقته قريباً."
                )
        elif energy < 0.20:
            if tier == "free" and remaining <= 3:
                return (
                    "upgrade_suggest",
                    f"لم يتبق سوى {remaining} رسائل اليوم. فكّر في الترقية لباقة أعلى."
                )
            elif tier == "free" and remaining <= 5:
                return (
                    "ad_available",
                    f"طاقة منخفضة ({energy*100:.0f}%). شاهد إعلاناً لاستعادة النشاط."
                )
            else:
                return ("low_energy", "التوأم في وضع توفير الطاقة. الردود ستكون مختصرة.")
        elif energy < 0.35:
            return ("moderate", "طاقة متوسطة. الردود طبيعية لكن دون تعمق كبير.")
        elif energy < 0.60:
            return ("good", "طاقة جيدة. التوأم مستعد للحوار.")
        elif energy < 0.85:
            return ("high", "طاقة مرتفعة. التوأم في قمة نشاطه.")
        else:
            return ("excellent", "طاقة ممتازة. التوأم بكامل حيويته.")
    
    def _get_response_behavior(self, energy: float, is_exhausted: bool) -> Dict[str, Any]:
        """سلوك الرد بناءً على الطاقة."""
        if is_exhausted:
            return {
                "max_length": 60,
                "tone": "tired_calm",
                "can_use_advanced_ai": False,
                "should_suggest_rest": True,
                "emoji_usage": "minimal",
                "response_depth": "minimal",
            }
        elif energy < 0.25:
            return {
                "max_length": 120,
                "tone": "gentle_low",
                "can_use_advanced_ai": False,
                "should_suggest_rest": True,
                "emoji_usage": "reduced",
                "response_depth": "simple",
            }
        elif energy < 0.50:
            return {
                "max_length": 250,
                "tone": "normal",
                "can_use_advanced_ai": True,
                "should_suggest_rest": False,
                "emoji_usage": "normal",
                "response_depth": "normal",
            }
        elif energy < 0.75:
            return {
                "max_length": 400,
                "tone": "warm_engaged",
                "can_use_advanced_ai": True,
                "should_suggest_rest": False,
                "emoji_usage": "rich",
                "response_depth": "deep",
            }
        else:
            return {
                "max_length": 600,
                "tone": "enthusiastic",
                "can_use_advanced_ai": True,
                "should_suggest_rest": False,
                "emoji_usage": "rich",
                "response_depth": "deep",
            }


# نسخة عالمية
twin_energy_engine = TwinEnergyEngine()
logger.info("✅ Twin Energy Engine v2.0 initialized — integrated with limits, ads, device battery")
