import type { RelativePathString } from 'expo-router';
import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

export default function NotFoundScreen() {
  const router = useRouter();
  const [textSecondary] = useThemeColor(['--color-muted-foreground']) as string[];

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

const styles = makeStyles((theme) => ({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 12 },
  title: { ...theme.typography.title1, textAlign: 'center', color: theme.colors.foreground },
  message: {
    ...theme.typography.callout,
    textAlign: 'center',
    color: theme.colors.mutedForeground,
  },
}));
