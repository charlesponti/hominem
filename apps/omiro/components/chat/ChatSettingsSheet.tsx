import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSizes, makeStyles, Text, useThemeColors } from '~/components/theme';
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

const useStyles = makeStyles((theme) => ({
  sheetBackground: {
    backgroundColor: theme.colors['background'],
  },
  dragHandle: {
    backgroundColor: theme.colors['border-default'],
    width: 40,
    height: 4,
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  title: {
    fontSize: fontSizes.title2,
    fontWeight: '700',
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: fontSizes.footnote,
  },
  selectedOption: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: theme.spacing.sm,
  },
  selectedEmoji: {
    fontSize: 40,
  },
  selectedName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  selectedCaption: {
    fontSize: fontSizes.footnote,
  },
  sliderRow: {
    paddingHorizontal: theme.spacing.sm,
  },
  optionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  optionEmoji: {
    fontSize: 18,
    opacity: 0.4,
  },
  optionEmojiActive: {
    opacity: 1,
  },
}));

export function ChatSettingsSheet({ visible, onClose }: ChatSettingsSheetProps) {
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const styles = useStyles();
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
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={styles.dragHandle}
      backgroundStyle={styles.sheetBackground}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.title, { color: themeColors['text-primary'] }]}>
          {t.chat.settings.title}
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: themeColors['text-primary'] }]}>
            {t.chat.settings.responseLengthLabel}
          </Text>
          <Text style={[styles.sectionDescription, { color: themeColors['text-secondary'] }]}>
            {t.chat.settings.responseLengthDescription}
          </Text>

          <Animated.View
            key={responseLength}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            style={styles.selectedOption}
          >
            <Text style={styles.selectedEmoji}>{selectedOption.emoji}</Text>
            <Text style={[styles.selectedName, { color: themeColors['text-primary'] }]}>
              {selectedOption.name}
            </Text>
            <Text style={[styles.selectedCaption, { color: themeColors['text-secondary'] }]}>
              {selectedOption.caption}
            </Text>
          </Animated.View>

          <View style={styles.sliderRow}>
            <DiscreteSlider
              value={Math.max(0, selectedIndex)}
              steps={CHAT_RESPONSE_LENGTHS.length}
              onValueChange={handleSliderChange}
              accessibilityLabel={t.chat.settings.responseLengthLabel}
            />
          </View>

          <View style={styles.optionLabels}>
            {CHAT_RESPONSE_LENGTHS.map((length) => (
              <Text
                key={length}
                style={[styles.optionEmoji, length === responseLength && styles.optionEmojiActive]}
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
