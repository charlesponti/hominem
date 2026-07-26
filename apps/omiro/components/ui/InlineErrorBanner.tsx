import React from 'react';
import { View } from 'react-native';

import { Text, makeStyles } from '~/components/theme';
import { nativeShadows, radii, spacing } from '~/components/theme/tokens';
import { IconButton } from '~/components/ui/icon-button';
import t from '~/translations';

interface InlineErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function InlineErrorBanner({ message, onDismiss }: InlineErrorBannerProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text color="destructive" style={styles.message} variant="footnote">
        {message}
      </Text>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.dismissErrorHint}
        icon="xmark"
        iconSize={13}
        size={26}
        variant="ghost"
        onPress={onDismiss}
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    boxShadow: nativeShadows.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    backgroundColor: theme.colors['surface-panel'],
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingLeft: spacing[3],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
  },
  message: {
    flex: 1,
  },
}));
