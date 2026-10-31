#!/usr/bin/env python3
"""S5.5 static architecture gate: backend authority + frontend presence boundaries."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
failures = []

def require(path, text, label):
    value = (ROOT / path).read_text()
    if text not in value:
        failures.append(f"missing {label}: {path} -> {text}")

def forbid(path, patterns, label):
    value = (ROOT / path).read_text()
    for pattern in patterns:
        if re.search(pattern, value):
            failures.append(f"forbidden {label}: {path} -> {pattern}")

require('backend/app/twin_state/internal_state.py', 'derive_lifecycle_intention', 'backend lifecycle classification')
require('backend/app/twin_state/internal_state.py', 'continuity_revision', 'canonical revision')
require('backend/app/twin_state/internal_state.py', 'intention_id', 'lifecycle idempotency')
require('backend/app/api/routes/twin_state_routes.py', 'intention = derive_lifecycle_intention', 'route ignores client intention')
require('src/core/PresenceClient.ts', 'evidence', 'presence evidence boundary')
require('backend/migrations/20260928_s5_5_core_hardening.sql', 'continuity_schema_version', 'S5.5 migration')

forbid('src/core/PresenceBridge.ts', [r'curiosity:\s*Math\.max', r'emotionValence:\s*bias', r'memoryLevel:\s*0\.85'], 'local cognitive mutation')
forbid('src/hooks/useTwinBrain.ts', [r'connection:Math\.min', r'emotionValence:-'], 'local cognitive mutation')
forbid('src/core/LivingPresenceCoordinator.ts', [r'const curiosityPhrases', r'const recoveryPhrases', r'RELATIONSHIP_RECOVER.*amount:\s*2'], 'synthetic inner-life mutation')

if failures:
    print('S5.5 CORE HARDENING: FAIL')
    for f in failures: print('-', f)
    raise SystemExit(1)
print('S5.5 CORE HARDENING: PASS')
print('Backend owns lifecycle classification; frontend owns evidence/presentation only.')
