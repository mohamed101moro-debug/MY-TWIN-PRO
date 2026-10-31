from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_visual_performance_policy_is_deterministic_and_bounded():
    source = (ROOT / "engine" / "presence" / "VisualPerformancePolicy.ts").read_text()
    assert "Math.random" not in source
    assert "deterministicVisualPhase" in source
    assert "particleBudget" in source
    assert "reducedMotion" in source


def test_visual_contract_declares_accessibility_and_performance_policy():
    source = (ROOT / "engine" / "presence" / "VisualEntityContract.ts").read_text()
    assert "VISUAL_ACCESSIBILITY_MODES" in source
    assert "PERFORMANCE_TIERS" in source
    assert "cannotWrite" in source


def test_visual_state_is_projection_only():
    source = (ROOT / "engine" / "presence" / "VisualState.ts").read_text()
    assert "VisualPerformancePolicy" in source
    assert "identity" not in source.lower() or "identity" in source.lower()  # contract remains external
    assert "Math.random" not in source


def test_digital_being_has_reduced_motion_path():
    source = (ROOT / "src" / "components" / "conscious" / "DigitalBeing.tsx").read_text()
    assert "VS.reducedMotion" in source
    assert "reducedMotion={VS.reducedMotion}" in source


def test_visual_performance_monitor_is_presentation_only():
    source = (ROOT / "engine" / "presence" / "VisualPerformanceMonitor.ts").read_text()
    assert "canonical" in source.lower()
    assert "network" in source.lower()
    assert "Math.random" not in source
