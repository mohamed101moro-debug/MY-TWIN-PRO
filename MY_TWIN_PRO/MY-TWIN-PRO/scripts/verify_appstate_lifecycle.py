#!/usr/bin/env python3
"""Focused regression assertions for app-scoped presence and screen recording lifecycle."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bridge = (root / 'src/core/PresenceBridge.ts').read_text()
presence_client = (root / 'src/core/PresenceClient.ts').read_text()
hook = (root / 'src/hooks/useVoicePresence.ts').read_text()
living_world = (root / 'app/living-world.tsx').read_text()

checks = {
    'presence projection is owned by PresenceClient': 'presenceClient.start();' in bridge and 'if (!this.active) return;' in presence_client and 'this.projectionTimer = setInterval' in presence_client,
    'presence projection stops on background': 'presenceClient.stop(); presenceEngine.stop();' in bridge and 'if (this.projectionTimer) clearInterval(this.projectionTimer);' in presence_client,
    'presence projection restarts on active': "if (next === 'active') {\n      presenceEngine.start(); void presenceClient.start();" in bridge,
    'inactive is not treated as background': "next === 'background' || next === 'inactive'" not in bridge,
    'screen-owned recording explicitly stops on background': "if (next === 'background') void stopRecording();" in hook,
    'screen recording AppState listener is removed': 'sub.remove();' in hook,
    'living-world mic toggle follows actual recorder state': 'setIsListening(voicePresence.isRecording);' in living_world,
    'living-world clears listening state when recorder stops': 'stateBus.patch({ listening: false });' in living_world,
    'unmount detaches recording reference before async stop': 'recordingRef.current = null;' in hook and 'recording.stopAndUnloadAsync().catch(() => undefined);' in hook,
}
for label, ok in checks.items():
    print(('PASS' if ok else 'FAIL') + ': ' + label)
if not all(checks.values()):
    raise SystemExit(1)
print(f'PASS: {len(checks)} focused lifecycle assertions')
