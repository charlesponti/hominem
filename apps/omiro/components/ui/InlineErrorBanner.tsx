import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme, useStyles } from '~/components/theme';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface InlineErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function InlineErrorBanner({ message, onDismiss }: InlineErrorBannerProps) {
  const theme = useAppTheme();
  const styles = useStyles((theme) => ({
    banner: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingLeft: 12,
      paddingRight: 4,
      paddingVertical: 4,
    },
    message: { ...theme.textVariants.footnote, flex: 1, color: theme.colors.destructive },
  }));

  return (
    <View style={[styles.banner, { borderCurve: 'continuous', boxShadow: theme.shadows.md }]}>
      <Text style={styles.message}>{message}</Text>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.dismissErrorHint}
        onPress={onDismiss}
      >
        <AppIcon name="xmark" size={20} />
      </IconButton>
    </View>
  );
}
