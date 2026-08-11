import { FONTS } from '../../../engine/colors';
import { TextStyle } from 'react-native';

export { FONTS };

export const TYPO: Record<string, TextStyle> = {
  title: {
    fontFamily: FONTS.arabicBold,
    fontSize: FONTS.sizes.title,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: FONTS.arabicMedium,
    fontSize: FONTS.sizes.subtitle,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  body: {
    fontFamily: FONTS.arabicRegular,
    fontSize: FONTS.sizes.body,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  small: {
    fontFamily: FONTS.arabicRegular,
    fontSize: FONTS.sizes.small,
    fontWeight: '400',
  },
  tiny: {
    fontFamily: FONTS.arabicRegular,
    fontSize: FONTS.sizes.tiny,
    fontWeight: '400',
  },
  ai: {
    fontFamily: FONTS.ai,
    fontSize: FONTS.sizes.body,
    fontWeight: '700',
    letterSpacing: 1,
  },
  greeting: {
    fontFamily: FONTS.arabicRegular,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.arabicRegular,
    fontSize: FONTS.sizes.body,
    fontWeight: '400',
    lineHeight: 24,
  },
};
