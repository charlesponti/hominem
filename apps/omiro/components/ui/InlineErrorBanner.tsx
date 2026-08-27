import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/components/theme';
import { IconButton, nativeShadows } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface InlineErrorBannerAction {
  label: string;
  loading?: boolean;
  onPress: () => void;
}

interface InlineErrorBannerProps {
  action?: InlineErrorBannerAction;
  message: string;
  onDismiss: () => void;
}

export function InlineErrorBanner({ action, message, onDismiss }: InlineErrorBannerProps) {
  return (
    <View style={[styles.banner, { borderCurve: 'continuous', boxShadow: nativeShadows.md }]}>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {action ? (
          <Button
            label={action.label}
            loading={action.loading}
            onPress={action.onPress}
            size="sm"
            style={styles.actionButton}
            testID="inline-error-banner-action"
            variant="outline"
          />
        ) : null}
      </View>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.dismissErrorHint}
        onPress={onDismiss}
      >
        <AppIcon name="xmark" size={20} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
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
  content: { flex: 1, gap: 8 },
  message: { ...theme.typography.footnote, color: theme.colors.destructive },
  actionButton: { alignSelf: 'flex-start' },
});
