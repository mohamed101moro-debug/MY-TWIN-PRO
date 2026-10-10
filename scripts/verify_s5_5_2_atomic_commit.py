#!/usr/bin/env python3
"""Static release-gate checks for S5.5.2 atomic lifecycle persistence."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def check(name, condition):
    if not condition:
        raise SystemExit(f'FAIL: {name}')
    print(f'PASS: {name}')

sql = read('backend/migrations/20260928_s5_5_2_atomic_lifecycle_commit.sql')
internal = read('backend/app/twin_state/internal_state.py')
bridge = read('src/core/LifeIntentionBridge.ts')

check('atomic lifecycle migration exists', 'commit_twin_life_intention' in sql)
check('receipt ledger has a primary dedupe key', 'PRIMARY KEY (user_id, dedupe_key)' in sql)
check('database serializes commits per Twin', 'pg_advisory_xact_lock(hashtextextended(p_user_id, 0))' in sql)
check('continuity revision is computed inside the transaction', 'MAX(continuity_revision), 0) + 1' in sql)
check('state and receipt are committed in one function', 'INSERT INTO public.twin_internal_states' in sql and 'INSERT INTO public.lifecycle_intention_receipts' in sql)
check('production backend uses RPC', '.rpc(' in internal and 'commit_twin_life_intention' in internal)
check('backend fails closed if atomic commit is unavailable', 'last_life_intention_atomic_commit_failed' in internal)
check('frontend lifecycle evidence survives process interruption', 'AsyncStorage' in bridge and 'mytwin.lifecycle_evidence.v1' in bridge)
check('frontend removes queued evidence only after acknowledgement', "result === 'accepted' || result === 'discard'" in bridge)
check('frontend uses bounded exponential retry', 'RETRY_MAX_MS' in bridge and 'Math.pow(2' in bridge)

print('PASS: S5.5.2 Atomic Commit static contract')
