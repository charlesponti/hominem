import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { DiscreteSlider } from '~/components/ui/discrete-slider';
import {
  CHAT_RESPONSE_LENGTHS,
  useChatResponseLength,
  setChatResponseLength,
} from '~/hooks/use-chat-response-length';
import t from '~/translations';

interface ChatSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatSettingsSheet({ visible, onClose }: ChatSettingsSheetProps) {
  const insets = useSafeAreaInsets();
  const [borderDefault, background, textPrimary, textSecondary] = useThemeColor([
    '--color-border',
    '--color-background',
    '--color-foreground',
    '--color-muted-foreground',
  ]) as [string, string, string, string];
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['45%'], []);
  const responseLength = useChatResponseLength();
  const selectedIndex = CHAT_RESPONSE_LENGTHS.indexOf(responseLength);
  const selectedOption = t.chat.settings.responseLengthOptions[responseLength];

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSliderChange = useCallback((index: number) => {
    const next = CHAT_RESPONSE_LENGTHS[index];
    if (next) {
      setChatResponseLength(next);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      // The trigger is a Stack.Toolbar.Menu action (native iOS UIMenu). Its
      // dismiss animation is still running when onPress fires, so presenting
      // the bottom sheet synchronously gets silently dropped by UIKit. Defer
      // until the menu has finished closing.
      const timeout = setTimeout(() => {
        modalRef.current?.present();
      }, 100);
      return () => clearTimeout(timeout);
    }

    modalRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: borderDefault, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: background }}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={[styles.s0, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.s1, { color: textPrimary }]}>{t.chat.settings.title}</Text>

        <View style={styles.s2}>
          <Text style={[styles.s3, { color: textPrimary }]}>
            {t.chat.settings.responseLengthLabel}
          </Text>
          <Text style={[styles.s4, { color: textSecondary }]}>
            {t.chat.settings.responseLengthDescription}
          </Text>

          <Animated.View
            key={responseLength}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            style={styles.s5}
          >
            <Text style={styles.s6}>{selectedOption.emoji}</Text>
            <Text style={[styles.s7, { color: textPrimary }]}>{selectedOption.name}</Text>
            <Text style={[styles.s8, { color: textSecondary }]}>{selectedOption.caption}</Text>
          </Animated.View>

          <View style={styles.s9}>
            <DiscreteSlider
              value={Math.max(0, selectedIndex)}
              steps={CHAT_RESPONSE_LENGTHS.length}
              onValueChange={handleSliderChange}
              accessibilityLabel={t.chat.settings.responseLengthLabel}
            />
          </View>

          <View style={styles.s10}>
            {CHAT_RESPONSE_LENGTHS.map((length) => (
              <Text
                key={length}
                style={[styles.s11, { opacity: length === responseLength ? 1 : 0.4 }]}
              >
                {t.chat.settings.responseLengthOptions[length].emoji}
              </Text>
            ))}
          </View>
        </View>

        <Button label={t.chat.settings.done} onPress={handleDismiss} variant="secondary" />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = makeStyles((theme) => ({
  s0: { gap: 24, paddingHorizontal: 24 },
  s1: { ...theme.typography.title2, fontWeight: '700' },
  s2: { gap: 8 },
  s3: { fontWeight: '600' },
  s4: { ...theme.typography.footnote },
  s5: { alignItems: 'center', gap: 2, paddingVertical: 8 },
  s6: { fontSize: 40 },
  s7: { fontWeight: '700' },
  s8: { ...theme.typography.footnote },
  s9: { paddingHorizontal: 8 },
  s10: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  s11: {},
}));
