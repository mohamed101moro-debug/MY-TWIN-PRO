import * as Location from 'expo-location';
import { apiPost } from '../../lib/httpClient';
import { sharedPresence } from '../vision/VisionBridge';
/** وعي المكان: موقع ← Reverse Geocode ← حفظ last_perception */
export async function refreshPlace(userId: string): Promise<string> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return sharedPresence.place;
    const pos = await Location.getCurrentPositionAsync({});
    const r: any = await apiPost(`/api/vision/place-aware?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&user_id=${userId}`, {});
    if (r?.place) sharedPresence.place = r.place;
  } catch {}
  return sharedPresence.place;
}
