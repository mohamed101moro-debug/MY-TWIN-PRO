#!/usr/bin/env python3
"""Regression gate: production UI must not collect microphone/camera/location/motion data."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
bridge = (root / 'src/core/PresenceBridge.ts').read_text()
voice = (root / 'engine/voice/VoiceEngine.ts').read_text()
living_world = (root / 'app/living-world.tsx').read_text()
config = json.loads((root / 'app.json').read_text())['expo']
android_permissions = set(config.get('android', {}).get('permissions', []))
plugins = set(item if isinstance(item, str) else item[0] for item in config.get('plugins', []))

checks = {
    'production bridge does not start sensor adapters': 'PresenceClient' not in bridge and 'SensorBridge' not in bridge,
    'production bridge cannot start microphone recording': 'startListening' not in bridge and 'requestPermissionsAsync' not in bridge,
    'voice engine is output-only': 'Audio.Recording' not in voice and 'requestPermissionsAsync' not in voice and 'startListening' not in voice,
    'microphone button is explicitly paused': 'Cloud voice transcription is paused' in living_world,
    'camera button is explicitly paused': 'Image and location sharing is paused' in living_world,
    'no camera/location/motion/microphone native permissions': not (android_permissions & {'CAMERA', 'RECORD_AUDIO', 'BODY_SENSORS', 'ACTIVITY_RECOGNITION', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'android.permission.RECORD_AUDIO'}),
    'no camera/sensor native plugins': 'expo-camera' not in plugins and 'expo-sensors' not in plugins,
    'iOS declares no sensitive usage descriptions': not (set(config.get('ios', {}).get('infoPlist', {})) & {'NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription', 'NSCameraUsageDescription', 'NSMotionUsageDescription', 'NSLocationWhenInUseUsageDescription'}),
}
for label, ok in checks.items():
    print(('PASS' if ok else 'FAIL') + ': ' + label)
if not all(checks.values()):
    raise SystemExit(1)
print(f'PASS: {len(checks)} privacy lifecycle assertions')
