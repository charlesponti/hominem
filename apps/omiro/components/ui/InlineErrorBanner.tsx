import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { IconButton, nativeShadows } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface InlineErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function InlineErrorBanner({ message, onDismiss }: InlineErrorBannerProps) {
  return (
    <View style={[styles.s0, { borderCurve: 'continuous', boxShadow: nativeShadows.md }]}>
      <Text style={styles.s1}>{message}</Text>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.dismissErrorHint}
        onPress={onDismiss}
      >
        <AppIcon name="xmark" size={20} />
      </IconButton>
    </View>
  );
}

const styles = makeStyles((theme) => ({
  s0: {
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
  s1: { ...theme.typography.footnote, flex: 1, color: theme.colors.destructive },
}));
