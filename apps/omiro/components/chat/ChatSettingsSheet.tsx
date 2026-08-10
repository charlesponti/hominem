import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

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
  const [borderDefault, background, textPrimary, textSecondary] = useCSSVariable([
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
      handleIndicatorStyle={{ backgroundColor: borderDefault, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: background }}
      onDismiss={handleDismiss}
    >
      <BottomSheetView className="gap-6 px-6" style={{ paddingBottom: insets.bottom + 24 }}>
        <Text className="text-title2 font-bold" style={{ color: textPrimary }}>
          {t.chat.settings.title}
        </Text>

        <View className="gap-2">
          <Text className="text-base font-semibold" style={{ color: textPrimary }}>
            {t.chat.settings.responseLengthLabel}
          </Text>
          <Text className="text-footnote" style={{ color: textSecondary }}>
            {t.chat.settings.responseLengthDescription}
          </Text>

          <Animated.View
            key={responseLength}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            className="items-center gap-0.5 py-2"
          >
            <Text className="text-[40px]">{selectedOption.emoji}</Text>
            <Text className="text-lg font-bold" style={{ color: textPrimary }}>
              {selectedOption.name}
            </Text>
            <Text className="text-footnote" style={{ color: textSecondary }}>
              {selectedOption.caption}
            </Text>
          </Animated.View>

          <View className="px-2">
            <DiscreteSlider
              value={Math.max(0, selectedIndex)}
              steps={CHAT_RESPONSE_LENGTHS.length}
              onValueChange={handleSliderChange}
              accessibilityLabel={t.chat.settings.responseLengthLabel}
            />
          </View>

          <View className="flex-row justify-between px-2">
            {CHAT_RESPONSE_LENGTHS.map((length) => (
              <Text
                key={length}
                className="text-lg"
                style={{ opacity: length === responseLength ? 1 : 0.4 }}
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
