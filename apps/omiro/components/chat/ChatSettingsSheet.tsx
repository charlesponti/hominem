import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { DiscreteSlider } from '~/components/ui/discrete-slider';
import {
  CHAT_RESPONSE_LENGTHS,
  setChatResponseLength,
  useChatResponseLength,
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
      <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.sheetTitle, { color: textPrimary }]}>{t.chat.settings.title}</Text>

        <View style={styles.settingGroup}>
          <Text style={[styles.settingLabel, { color: textPrimary }]}>
            {t.chat.settings.responseLengthLabel}
          </Text>
          <Text style={[styles.settingDescription, { color: textSecondary }]}>
            {t.chat.settings.responseLengthDescription}
          </Text>

          <Animated.View
            key={responseLength}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            style={styles.metric}
          >
            <Text style={styles.metricValue}>{selectedOption.emoji}</Text>
            <Text style={[styles.metricLabel, { color: textPrimary }]}>{selectedOption.name}</Text>
            <Text style={[styles.metricDetail, { color: textSecondary }]}>
              {selectedOption.caption}
            </Text>
          </Animated.View>

          <View style={styles.control}>
            <DiscreteSlider
              value={Math.max(0, selectedIndex)}
              steps={CHAT_RESPONSE_LENGTHS.length}
              onValueChange={handleSliderChange}
              accessibilityLabel={t.chat.settings.responseLengthLabel}
            />
          </View>

          <View style={styles.controlRow}>
            {CHAT_RESPONSE_LENGTHS.map((length) => (
              <Text
                key={length}
                style={[styles.empty, { opacity: length === responseLength ? 1 : 0.4 }]}
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
  sheetContent: { gap: 24, paddingHorizontal: 24 },
  sheetTitle: { ...theme.typography.title2, fontWeight: '700' },
  settingGroup: { gap: 8 },
  settingLabel: { fontWeight: '600' },
  settingDescription: { ...theme.typography.footnote },
  metric: { alignItems: 'center', gap: 2, paddingVertical: 8 },
  metricValue: { fontSize: 40 },
  metricLabel: { fontWeight: '700' },
  metricDetail: { ...theme.typography.footnote },
  control: { paddingHorizontal: 8 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  empty: {},
}));
