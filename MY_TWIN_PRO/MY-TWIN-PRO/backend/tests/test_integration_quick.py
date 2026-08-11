"""
اختبار تكامل سريع لجميع المحركات
"""
import asyncio

async def test_all_imports():
    errors = []
    modules = [
        "app.twin_state.context_awareness_engine",
        "app.twin_state.emotional_momentum",
        "app.twin_state.curiosity_dynamics",
        "app.twin_state.experience_engine",
        "app.twin_state.self_model",
        "app.twin_state.world_model",
        "app.twin_state.salience_engine",
        "app.twin_state.cognitive_load",
        "app.twin_state.twin_kernel",
        "app.twin_state.existence_loop",
        "app.soul.soul_orchestrator",
        "app.twin_brain.unified_brain",
        "app.engine.energy.twin_energy_engine",
        "app.features.digital_fingerprint",
        "app.domain.services.tier_service",
        "app.domain.services.limits_service",
        "app.domain.billing.ad_service",
    ]
    for mod in modules:
        try:
            importlib.import_module(mod)
            print(f"✅ {mod}")
        except Exception as e:
            errors.append(f"❌ {mod}: {e}")
    return errors

if __name__ == "__main__":
    import importlib
    errors = asyncio.run(test_all_imports())
    if errors:
        print("\n🔴 فشل في الاستيرادات:")
        for e in errors: print(e)
    else:
        print("\n🟢 جميع الاستيرادات ناجحة!")
