import { Platform } from 'react-native';

// BorrowHive Design Tokens — locked to spec
export const Colors = {
  ink: '#16181D',
  muted: '#8A8F98',
  accent: '#F0A93A',
  accentDark: '#B4460D',
  success: '#0E8A5F',
  surface: '#FFFFFF',
  bg: '#FCFCFB',
  border: '#ECECEC',
  pageBg: '#EFEDE7',
  accentLight: '#FBEAD1',
  successLight: '#DFF3EA',
  errorLight: '#FEE2E2',
  error: '#DC2626',
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  card: 10,
  btn: 8,
  pill: 20,
  input: 8,
  avatar: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Typography = {
  // Display / headings use Fraunces (loaded via useFonts)
  display: {
    fontFamily: 'Fraunces_600SemiBold',
    color: Colors.ink,
  },
  // Body uses Inter
  body: {
    fontFamily: 'Inter_400Regular',
    color: Colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: 'Inter_500Medium',
    color: Colors.ink,
    fontSize: 14,
  },
  bodySemiBold: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.ink,
    fontSize: 14,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.muted,
  },
  captionBold: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.accentDark,
  },
  priceLg: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 20,
    color: Colors.accentDark,
  },
};

export const Shadow = {
  card: Platform.OS === 'web'
    ? { boxShadow: '0px 2px 8px rgba(22,24,29,0.06)' }
    : {
        shadowColor: '#16181D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
  btn: Platform.OS === 'web'
    ? { boxShadow: '0px 6px 10px rgba(240,169,58,0.35)' }
    : {
        shadowColor: '#F0A93A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 4,
      },
};

