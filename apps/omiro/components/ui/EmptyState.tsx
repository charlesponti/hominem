import type { SFSymbol } from 'expo-symbols';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';

import { Button } from './button';
import AppIcon from './icon';

interface EmptyStateProps {
  action?: { label: string; onPress: () => void };
  description?: string;
  imageSource?: ImageSourcePropType;
  sfSymbol?: SFSymbol;
  title: string;
}

function EmptyState({ action, description, imageSource, sfSymbol, title }: EmptyStateProps) {
  const [textSecondary] = useThemeColor(['--color-muted-foreground']) as [string];

  return (
    <Reanimated.View entering={FadeIn.duration(280)} style={styles.s0}>
      <View style={styles.s1}>
        {imageSource ? (
          <Image
            accessibilityIgnoresInvertColors
            source={imageSource}
            style={styles.s2}
            resizeMode="contain"
          />
        ) : sfSymbol ? (
          <AppIcon name={sfSymbol} size={32} tintColor={textSecondary} />
        ) : null}
        <Text style={styles.s3}>{title}</Text>
        {description ? <Text style={styles.s4}>{description}</Text> : null}
        {action ? (
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export { EmptyState };

const styles = makeStyles((theme) => ({
  s0: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  s1: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  s2: { height: 112, width: 112 },
  s3: { fontSize: 18, color: theme.colors.foreground, fontWeight: '600', textAlign: 'center' },
  s4: { textAlign: 'center', color: theme.colors.mutedForeground },
}));
