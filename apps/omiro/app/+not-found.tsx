import type { RelativePathString } from 'expo-router';
import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useAppTheme, useStyles } from '~/components/theme';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

export default function NotFoundScreen() {
  const router = useRouter();
  const { mutedForeground: textSecondary } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    content: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 12 },
    title: { ...theme.textVariants.title1, textAlign: 'center', color: theme.colors.foreground },
    message: {
      ...theme.textVariants.callout,
      textAlign: 'center',
      color: theme.colors.mutedForeground,
    },
  }));

  return (
    <>
      <Stack.Screen options={{ title: t.errors.notFound.screenTitle }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <AppIcon name="questionmark.circle" size={32} tintColor={textSecondary} />
          <Text style={styles.title}>{t.errors.notFound.title}</Text>
          <Text style={styles.message}>{t.errors.notFound.message}</Text>
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
