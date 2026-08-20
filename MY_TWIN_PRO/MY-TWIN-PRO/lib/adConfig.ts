import { Platform } from 'react-native';
/** AdMob — مصدر وحيد للحقيقة لكل وحدات الإعلانات. */
export interface AdMobConfig {
  useTest: boolean;
  androidAppId: string;
  iosAppId: string;
  androidInterstitial: string;
  androidRewarded: string;
  iosInterstitial: string;
  iosRewarded: string;
}
export const ADMOB: AdMobConfig = {
  useTest: true,
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  androidInterstitial: 'ca-app-pub-0000000000000000/0000000000',
  androidRewarded: 'ca-app-pub-0000000000000000/0000000000',
  iosInterstitial: 'ca-app-pub-0000000000000000/0000000000',
  iosRewarded: 'ca-app-pub-0000000000000000/0000000000',
};
export type AdUnitKind = 'rewarded' | 'interstitial' | 'banner';
const TEST_UNITS: Record<AdUnitKind, string> = {
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  banner: 'ca-app-pub-3940256099942544/6300978111',
};
/** يُستخدم من RewardedAdService وأي مستهلك آخر. */
export function getAdUnitId(kind: string = 'rewarded'): string {
  const valid: string[] = ['rewarded', 'interstitial', 'banner'];
  const k: AdUnitKind = (valid.includes(kind) ? kind : 'rewarded') as AdUnitKind;
  if (ADMOB.useTest) return TEST_UNITS[k];
  if (Platform.OS === 'ios') {
    return k === 'rewarded' ? ADMOB.iosRewarded : k === 'interstitial' ? ADMOB.iosInterstitial : ADMOB.iosRewarded;
  }
  return k === 'rewarded' ? ADMOB.androidRewarded : k === 'interstitial' ? ADMOB.androidInterstitial : ADMOB.androidRewarded;
}
export default ADMOB;
