import type { SFSymbol } from 'expo-symbols';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import {
  componentSizes,
  fontSizes,
  fontWeights,
  makeStyles,
  themeSpacing,
  useThemeColors,
} from '../theme';
import { Button } from './button';
import AppIcon from './icon';

interface EmptyStateProps {
  action?: { label: string; onPress: () => void };
  imageSource?: ImageSourcePropType;
  sfSymbol?: SFSymbol;
  title: string;
}

const useStyles = makeStyles(() => ({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  asset: {
    height: 112,
    resizeMode: 'contain',
    width: 112,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: themeSpacing.md,
    paddingHorizontal: themeSpacing.xl,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  },
}));

function EmptyState({ action, imageSource, sfSymbol, title }: EmptyStateProps) {
  const themeColors = useThemeColors();
  const styles = useStyles();

  return (
    <Reanimated.View entering={FadeIn.duration(280)} style={styles.container}>
      <View style={styles.content}>
        {imageSource ? (
          <Image accessibilityIgnoresInvertColors source={imageSource} style={styles.asset} />
        ) : sfSymbol ? (
          <AppIcon
            name={sfSymbol}
            size={componentSizes.lg}
            tintColor={themeColors['text-secondary']}
          />
        ) : null}
        <Text style={[styles.title, { color: themeColors['text-primary'] }]}>{title}</Text>
        {action ? (
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
