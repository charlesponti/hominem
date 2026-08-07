import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';

interface ErrorFallbackProps {
  title: string;
  titleSize?: 'title1' | 'title2';
  message: string;
  debugMessage?: string;
  actionLabel: string;
  onAction: () => void;
  buttonVariant?: 'primary' | 'secondary';
}

export function ErrorFallback({
  title,
  titleSize = 'title1',
  message,
  debugMessage,
  actionLabel,
  onAction,
  buttonVariant = 'primary',
}: ErrorFallbackProps) {
  const [destructive] = useCSSVariable(['--color-destructive']) as string[];

  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="w-full max-w-[360px] items-center gap-3">
        <AppIcon name="exclamationmark.triangle.fill" size={32} tintColor={destructive} />
        <Text
          className={`font-bold text-center ${titleSize === 'title1' ? 'text-title1' : 'text-title2'} text-foreground`}
        >
          {title}
        </Text>
        <Text className="text-base leading-[22px] text-center text-muted-foreground">
          {message}
        </Text>

        {__DEV__ && debugMessage ? (
          <Text className="font-mono text-caption1 leading-[18px] text-center text-tertiary">
            {debugMessage}
          </Text>
        ) : null}

        <Button label={actionLabel} onPress={onAction} variant={buttonVariant} />
      </View>
    </View>
  );
}
