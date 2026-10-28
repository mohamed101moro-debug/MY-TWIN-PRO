#!/usr/bin/env python3
"""Regression guards for the reconciled lifecycle architecture."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
life = (root / "engine/life/LifeRhythmEngine.ts").read_text()
loop = (root / "src/core/ExistenceLoop.ts").read_text()
kernel = (root / "engine/kernel/SoulKernel.ts").read_text()
bridge = (root / "src/core/LifeIntentionBridge.ts").read_text()
checks = {
    "LifeRhythm does not overwrite authoritative emotion": "presenceEngine.setEmotion" not in life,
    "ExistenceLoop has no random cognitive event generator": "Math.random" not in loop,
    "ExistenceLoop does not synthesize emotion": "setEmotion(" not in loop,
    "ExistenceLoop emits evidence-only lifecycle data": "LIFE_EVIDENCE" in loop and "evidence" in loop and "LIFE_INTENTION" not in loop,
    "Lifecycle evidence has a backend consumer": "/api/twin/life-intention" in bridge,
    "SoulKernel delegates lifecycle to BootstrapCoordinator": "bootstrapCoordinator.bootstrap" in kernel and "bootstrapCoordinator.stop" in kernel,
    "SoulKernel does not start a second SensorBridge": "SensorBridge" not in kernel,
    "SoulKernel does not export memory for training on awaken": "exportForTraining" not in kernel,
    "SoulKernel does not own an engine registry": "registerEngines" not in kernel and "this.engines" not in kernel,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
raise SystemExit(bool(failed))
