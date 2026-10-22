import { useEffect, useMemo, useState } from 'react';
import { stateBus } from '../core/StateBus';
export type EnvironmentMode = 'day' | 'night';
/** Read-only device context projection. Hardware sensor subscriptions are intentionally disabled in production. */
export function useDeviceContext() {
  const [batteryLevel, setBatteryLevel] = useState(() => Number(stateBus.getState().batteryLevel ?? 1));
  const [isCharging, setIsCharging] = useState(() => !!stateBus.getState().isCharging);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const read = () => { const s=stateBus.getState(); setBatteryLevel(Number(s.batteryLevel ?? 1)); setIsCharging(!!s.isCharging); };
    read();
    const unsub=stateBus.subscribeKeys(['batteryLevel','isCharging'], read);
    const clock=setInterval(()=>setNow(new Date()),60_000);
    return ()=>{unsub();clearInterval(clock);};
  },[]);
  const environmentMode:EnvironmentMode=useMemo(()=>{const h=now.getHours();return h>=19||h<7?'night':'day';},[now]);
  return { batteryLevel:Number.isFinite(batteryLevel)?Math.max(0,Math.min(1,batteryLevel)):1, isCharging, environmentMode, deviceName:'mobile device', ambientLightAvailable:Number(stateBus.getState().ambientLight)>=0 };
}
export default useDeviceContext;
