"""Static release-gate checks for the S0-S4.1 canonical backbone."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(label: str, ok: bool):
    checks.append((label, bool(ok)))
    print(("PASS" if ok else "FAIL") + ": " + label)

internal = (ROOT / "backend/app/twin_state/internal_state.py").read_text()
routes = (ROOT / "backend/app/api/routes/twin_state_routes.py").read_text()
bridge = (ROOT / "src/core/LifeIntentionBridge.ts").read_text()
registry = (ROOT / "backend/app/api/routes/__init__.py").read_text()

check("canonical lifecycle persistence boundary exists", "async def save_life_intention" in internal)
check("deterministic meaning is derived before persistence", 'canonical["meaning"] = derive_meaning' in internal)
check("canonical lifecycle API exists", '@router.post("/life-intention")' in routes)
check("canonical API persists through TwinInternalState", "save_life_intention(user_id, payload)" in routes)
check("frontend lifecycle bridge uses canonical endpoint", "/api/twin/life-intention" in bridge)
check("frontend does not call removed legacy endpoint", "/api/life/intentions" not in bridge)
check("legacy lifecycle route module is absent", not (ROOT / "backend/app/api/routes/life_intentions.py").exists())
check("legacy lifecycle service module is absent", not (ROOT / "backend/app/twin_state/life_intention_service.py").exists())
check("legacy lifecycle router is not registered", "life_intentions" not in registry)
check("S4 continuity migration exists", (ROOT / "backend/migrations/20260927_s4_cognitive_continuity.sql").exists())
check("S3 meaning module exists", (ROOT / "backend/app/twin_state/brain_evidence.py").exists())
check("S3P presence binding exists", (ROOT / "backend/app/twin_state/presence_binding.py").exists())

failed = [label for label, ok in checks if not ok]
if failed:
    raise SystemExit("BACKBONE VERIFICATION FAILED: " + ", ".join(failed))
print(f"PASS: {len(checks)} reconciled backbone assertions")
