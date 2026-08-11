import { useTwinStore } from '../store/useTwinStore';

export function useRTL() {
  const lang = useTwinStore((s: any) => s.lang);
  return {
    isRTL: String(lang) === 'ar',
    flexDirection: (String(lang) === 'ar' ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    textAlign: (String(lang) === 'ar' ? 'right' : 'left') as 'right' | 'left',
    writingDirection: (String(lang) === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}
