import { useEffect } from 'react';
import { useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
/**
 * useBreathAnimation v2 — طور تنفس مشترك (SharedValue)
 * - يُمرر للطبقات (OrganicMembrane/EnergyCore/EmotionalAura…) فتتنفس بإيقاع واحد ⇒ كيان واحد.
 * - فترة قابلة للضبط + تصفير عند الفك ⇒ لا حركة يتيمة بعد unmount.
 */
export function useBreathAnimation(periodMs = 3000) {
  const breathPhase = useSharedValue(0);
  useEffect(() => {
    breathPhase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(Math.PI * 2, { duration: periodMs, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => { breathPhase.value = 0; };
  }, [periodMs]);
  return breathPhase;
}
export default useBreathAnimation;
