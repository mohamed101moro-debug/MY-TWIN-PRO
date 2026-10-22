"""Quick import smoke-test helpers for selected engine modules."""
import importlib


def _collect_import_errors():
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
    ]
    for module_name in modules:
        try:
            importlib.import_module(module_name)
        except Exception as exc:
            errors.append(f"{module_name}: {exc}")
    return errors


def test_all_imports():
    errors = _collect_import_errors()
    assert not errors, "Import failures: " + "; ".join(errors)


if __name__ == "__main__":
    errors = _collect_import_errors()
    if errors:
        print("Import failures:")
        for error in errors:
            print(error)
    else:
        print("All selected imports succeeded.")
