import type { RelativePathString } from 'expo-router';
import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

export default function NotFoundScreen() {
  const router = useRouter();
  const [textSecondary] = useCSSVariable(['--color-muted-foreground']) as string[];

  return (
    <>
      <Stack.Screen options={{ title: t.errors.notFound.screenTitle }} />
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-[360px] items-center gap-3">
          <AppIcon name="questionmark.circle" size={32} tintColor={textSecondary} />
          <Text className="text-title1 text-center text-foreground">{t.errors.notFound.title}</Text>
          <Text className="text-callout text-center text-muted-foreground">
            {t.errors.notFound.message}
          </Text>
          <Button
            label={t.errors.notFound.returnToRoot}
            onPress={() => {
              router.replace('/' as RelativePathString);
            }}
            variant="primary"
          />
        </View>
      </View>
    </>
  );
}
