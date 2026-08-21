import { Text, View } from 'react-native';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
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
  const [destructive] = useThemeColor(['--color-destructive']) as string[];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AppIcon name="exclamationmark.triangle.fill" size={32} tintColor={destructive} />
        <Text style={[styles.title, titleSize === 'title1' ? styles.title1 : styles.title2]}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {__DEV__ && debugMessage ? <Text style={styles.debugMessage}>{debugMessage}</Text> : null}

        <Button label={actionLabel} onPress={onAction} variant={buttonVariant} />
      </View>
    </View>
  );
}

const styles = makeStyles((theme) => ({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 12 },
  message: { lineHeight: 22, textAlign: 'center', color: theme.colors.mutedForeground },
  debugMessage: {
    ...theme.typography.caption1,
    fontFamily: 'Menlo',
    lineHeight: 18,
    textAlign: 'center',
    color: theme.colors.tertiary,
  },
  title: { fontWeight: '700', textAlign: 'center', color: theme.colors.foreground },
  title1: theme.typography.title1,
  title2: theme.typography.title2,
}));
