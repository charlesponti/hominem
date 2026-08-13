import { transitionDurations } from '@ponti-studios/ui/tokens';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import AppIcon from '~/components/ui/icon';
import { useIsOnline } from '~/hooks/use-network-status';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import t from '~/translations';

// A slim, ambient indicator rather than a dismissible alert -- it should
// appear/disappear on its own as connectivity changes, not require the user
// to acknowledge it (composing/reading still works fully offline; only
// sending fails, which is handled separately by the failed-message retry UI).
export function OfflineBanner() {
  const isOnline = useIsOnline();
  const prefersReducedMotion = useReducedMotion();
  const [tertiary] = useCSSVariable(['--color-tertiary']) as string[];

  if (isOnline) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={prefersReducedMotion ? undefined : FadeIn.duration(transitionDurations[150])}
      exiting={prefersReducedMotion ? undefined : FadeOut.duration(transitionDurations[100])}
      className="bg-muted flex-row items-center justify-center gap-1.5 py-1.5"
    >
      <AppIcon name="wifi.slash" size={13} tintColor={tertiary} />
      <Text style={{ color: tertiary, fontSize: 12 }}>{t.chat.offlineBanner}</Text>
    </Animated.View>
  );
}
