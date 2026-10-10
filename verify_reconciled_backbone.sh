#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
python -m compileall -q backend/app
python - <<'PY'
from pathlib import Path
world=Path('app/living-world.tsx').read_text()
bridge=Path('src/core/PresenceBridge.ts').read_text()
voice=Path('engine/voice/VoiceEngine.ts').read_text()
presence=Path('engine/presence/PresenceEngine.ts').read_text()
layout=Path('app/_layout.tsx').read_text()
sensor=Path('engine/sensor/SensorContextEngine.ts').read_text()
checks={
 'root layout owns app-scoped bootstrap': "bootstrapCoordinator.bootstrap()" in layout,
 'screen does not stop global presence': 'presenceBridge.stop()' not in world,
 'screen has no reply-length speaking timer': 'replyText.length * 60' not in world and 'presenceBridge.speak(' not in world,
 'bridge projects real voice start': "EventBus.on('VOICE_SPEAKING_START'" in bridge and 'speaking: true' in bridge,
 'bridge projects real voice end': "EventBus.on('VOICE_SPEAKING_END'" in bridge and 'speaking: false' in bridge,
 'no microphone metering path exists in production bridge': 'voiceLevel:' not in bridge and 'requestPermissionsAsync' not in bridge,
 'background lifecycle interrupts output voice safely': 'voiceEngine.stopSpeaking();' in bridge and 'presenceEngine.stop();' in bridge and 'stopListening' not in bridge,
 'bridge timed speak API is inert': 'intentionally inert: no synthetic speech state' in bridge,
 'voice engine has bounded stalled-TTS watchdog': 'speechWatchdog' in voice and '120000' in voice,
 'voice completion is keyed to run id': 'private async _onDone(run: number' in voice and 'if (!this.isCurrentRun(run)) return;' in voice,
 'async TTS path rejects stale run after network': 'if (!this.isCurrentRun(run)) return;' in voice and 'this._speak(text, emotion, run)' in voice,
 'system speech is stopped on completion': 'Speech.stop();' in voice,
 'presence has no emotion TTL fallback': 'AUTHORITATIVE_EMOTION_TTL_MS' not in presence and 'profileFromValence' not in presence,
 'presence tick has no orphaned emotion identifiers': 'authoritativeFresh' not in presence and 'latestEmotionTs' not in presence,
 'presence retains authoritative emotion metadata': 'emotionSource: this.state.emotionSource' in presence and 'emotionUpdatedAt: this.lastAppliedEmotionTs' in presence,
 'sensor evaluation has no implicit memory write': 'storeInMemory' not in sensor and 'unifiedBrainBridge' not in sensor,
 'living-world has no periodic sensor evaluation': 'sensorContextEngine.evaluate()' not in world,
}
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL')+' '+name)
if not all(checks.values()): raise SystemExit(1)
PY
