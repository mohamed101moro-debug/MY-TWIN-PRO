import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
export type VoiceState = 'silent' | 'calm' | 'engaged' | 'energetic';
function clamp(value: number, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
function stateFromLevel(level: number): VoiceState {
  if (level < 0.12) return 'silent';
  if (level < 0.36) return 'calm';
  if (level < 0.72) return 'engaged';
  return 'energetic';
}
export function useVoicePresence() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const startRecording = useCallback(async () => {
    if (recordingRef.current) return true;
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) { setPermissionDenied(true); return false; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({ ...Audio.RecordingOptionsPresets.LOW_QUALITY, isMeteringEnabled: true });
    recording.setProgressUpdateInterval(80);
    recording.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording) return;
      const metering = typeof status.metering === 'number' ? status.metering : -60;
      const normalized = clamp((metering + 60) / 60);
      setLevel((previous) => previous * 0.68 + normalized * 0.32);
    });
    await recording.startAsync();
    recordingRef.current = recording;
    setPermissionDenied(false);
    setIsRecording(true);
    return true;
  }, []);
  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setLevel(0);
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      return recording.getURI();
    } catch { return null; }
  }, []);
  const toggleRecording = useCallback(() => (isRecording ? stopRecording() : startRecording()), [isRecording, startRecording, stopRecording]);
  useEffect(() => () => { recordingRef.current?.stopAndUnloadAsync().catch(() => undefined); }, []);
  return { isRecording, level, voiceState: stateFromLevel(level), permissionDenied, startRecording, stopRecording, toggleRecording };
}
export default useVoicePresence;
