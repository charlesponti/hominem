import type { RelativePathString } from 'expo-router';
import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

export default function NotFoundScreen() {
  const router = useRouter();
  const [textSecondary] = useThemeColor(['--color-muted-foreground']) as string[];

  return (
    <>
      <Stack.Screen options={{ title: t.errors.notFound.screenTitle }} />
      <View style={styles.s0}>
        <View style={styles.s1}>
          <AppIcon name="questionmark.circle" size={32} tintColor={textSecondary} />
          <Text style={styles.s2}>{t.errors.notFound.title}</Text>
          <Text style={styles.s3}>{t.errors.notFound.message}</Text>
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
  s0: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  s1: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 12 },
  s2: { ...theme.typography.title1, textAlign: 'center', color: theme.colors.foreground },
  s3: { ...theme.typography.callout, textAlign: 'center', color: theme.colors.mutedForeground },
}));
