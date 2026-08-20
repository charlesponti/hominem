import { StyleSheet } from 'react-native';

export const nativeShadows = {
  none: [
    {
      color: 'transparent',
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadDistance: 0,
      inset: false,
    },
  ],
  sm: [
    { color: '#0000001a', offsetX: 0, offsetY: 1, blurRadius: 2, spreadDistance: 0, inset: false },
  ],
  md: [
    { color: '#00000024', offsetX: 0, offsetY: 3, blurRadius: 6, spreadDistance: 0, inset: false },
  ],
} as const;

export const hairline = StyleSheet.hairlineWidth;
