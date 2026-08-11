"""
Soul Subsystem v1.0 – محرك الروح العميق
===========================================
يحتوي على جميع مكونات الروح الرقمية للتوأم.
يُستدعى من soul_orchestrator.py لإعطاء حالة روح كاملة.
"""
from .soul_core import SoulCore
from .soul_values import SoulValues
from .soul_resonance import SoulResonance
from .soul_signature import SoulSignature
from .soul_traits import SoulTraits
from .soul_timeline import SoulTimeline
from .soul_evolution import SoulEvolution
from .soul_bonds import SoulBonds
from .soul_orchestrator import SoulOrchestrator, get_soul_state, evolve_soul

__all__ = [
    "SoulCore",
    "SoulValues",
    "SoulResonance",
    "SoulSignature",
    "SoulTraits",
    "SoulTimeline",
    "SoulEvolution",
    "SoulBonds",
    "SoulOrchestrator",
    "get_soul_state",
    "evolve_soul",
]
