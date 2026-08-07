import type { SFSymbol } from 'expo-symbols';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { Button } from './button';
import AppIcon from './icon';

interface EmptyStateProps {
  action?: { label: string; onPress: () => void };
  imageSource?: ImageSourcePropType;
  sfSymbol?: SFSymbol;
  title: string;
}

function EmptyState({ action, imageSource, sfSymbol, title }: EmptyStateProps) {
  const [textSecondary] = useCSSVariable(['--color-muted-foreground']) as [string];

  return (
    <Reanimated.View entering={FadeIn.duration(280)} className="flex-1 items-center justify-center">
      <View className="w-full max-w-80 items-center gap-3 px-6">
        {imageSource ? (
          <Image
            accessibilityIgnoresInvertColors
            source={imageSource}
            className="h-28 w-28"
            resizeMode="contain"
          />
        ) : sfSymbol ? (
          <AppIcon name={sfSymbol} size={32} tintColor={textSecondary} />
        ) : null}
        <Text className="text-[18px] text-foreground font-semibold text-center">{title}</Text>
        {action ? (
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
