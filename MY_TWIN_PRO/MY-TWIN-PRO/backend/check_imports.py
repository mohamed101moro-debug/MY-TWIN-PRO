import importlib, sys, os
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

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
    "app.domain.billing.subscription_service",
    "app.domain.billing.revenue_service",
    "app.domain.billing.cost_dashboard",
    "app.api.routes.auth",
    "app.api.routes.billing",
    "app.api.routes.economy_routes",
    "app.api.routes.chat",
    "app.api.routes.passport_routes",
]

errors = []
for mod in modules:
    try:
        importlib.import_module(mod)
        print(f"✅ {mod}")
    except Exception as e:
        errors.append(f"❌ {mod}: {e}")

if errors:
    print("\n🔴 ERRORS:")
    for e in errors: print(e)
else:
    print("\n🟢 All imports successful!")
