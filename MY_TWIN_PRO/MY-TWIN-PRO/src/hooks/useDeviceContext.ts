import { useEffect, useMemo, useState } from 'react';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
export type EnvironmentMode = 'day' | 'night';
export function useDeviceContext() {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [isCharging, setIsCharging] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let mounted = true;
    const loadBattery = async () => {
      try {
        const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
        if (mounted) { setBatteryLevel(level); setIsCharging(state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL); }
      } catch {}
    };
    loadBattery();
    const levelSubscription = Battery.addBatteryLevelListener(({ batteryLevel: level }) => setBatteryLevel(level));
    const stateSubscription = Battery.addBatteryStateListener(({ batteryState }) => setIsCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL));
    const clock = setInterval(() => setNow(new Date()), 60_000);
    return () => { mounted = false; levelSubscription.remove(); stateSubscription.remove(); clearInterval(clock); };
  }, []);
  const environmentMode: EnvironmentMode = useMemo(() => { const hour = now.getHours(); return hour >= 19 || hour < 7 ? 'night' : 'day'; }, [now]);
  return { batteryLevel, isCharging, environmentMode, deviceName: Device.modelName || Device.osName || 'mobile device', ambientLightAvailable: false };
}
export default useDeviceContext;
