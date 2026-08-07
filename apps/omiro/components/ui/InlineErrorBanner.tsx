import { IconButton, nativeShadows } from '@ponti-studios/ui/native';
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native';

import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface InlineErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function InlineErrorBanner({ message, onDismiss }: InlineErrorBannerProps) {
  return (
    <View
      className="bg-card border border-border rounded-lg flex-row items-center justify-between gap-2 pl-3 pr-1 py-1"
      style={{ borderCurve: 'continuous', boxShadow: nativeShadows.md }}
    >
      <Text className="flex-1 text-destructive text-footnote">{message}</Text>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.dismissErrorHint}
        onPress={onDismiss}
      >
        <AppIcon name="xmark" size={20} />
      </IconButton>
    </View>
  );
}
