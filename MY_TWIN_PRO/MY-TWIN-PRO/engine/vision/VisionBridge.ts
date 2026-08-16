import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { apiPost } from '../../lib/httpClient';
export interface VisionResult { scene: string; place: string; }
/** ✅ سياق حضور مشترك: آخر مكان وآخر مشهد رآه الكيان مع المستخدم */
export const sharedPresence: { place: string; vision_summary: string } = { place: '', vision_summary: '' };
/** الرؤية المشتركة: كاميرا صريحة + موقع → فهم المشهد + ذاكرة مكان نصية */
export async function shareVision(userId: string, lang: string): Promise<VisionResult | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  let b64 = asset.base64 || null;
  if (!b64 && asset.uri) b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  if (!b64) return null;
  let latitude: number | null = null, longitude: number | null = null;
  try {
    const lp = await Location.getCurrentPositionAsync({});
    latitude = lp.coords.latitude; longitude = lp.coords.longitude;
  } catch {}
  try {
    const r: any = await apiPost('/api/vision/describe', { image_base64: b64, user_id: userId, language: lang, latitude, longitude });
    if (r?.scene) {
      if (r.place) sharedPresence.place = r.place;
      sharedPresence.vision_summary = r.scene;
      return { scene: r.scene, place: r.place || '' };
    }
  } catch {}
  return null;
}
