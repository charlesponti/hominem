import type { SFSymbol } from 'expo-symbols';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';

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
    <Reanimated.View entering={FadeIn.duration(280)} style={styles.container}>
      <View style={styles.content}>
        {imageSource ? (
          <Image
            accessibilityIgnoresInvertColors
            source={imageSource}
            style={styles.image}
            resizeMode="contain"
          />
        ) : sfSymbol ? (
          <AppIcon name={sfSymbol} size={32} tintColor={textSecondary} />
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {action ? (
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export { EmptyState };

const styles = makeStyles((theme) => ({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  image: { height: 112, width: 112 },
  title: { fontSize: 18, color: theme.colors.foreground, fontWeight: '600', textAlign: 'center' },
  description: { textAlign: 'center', color: theme.colors.mutedForeground },
}));
