import { notesTokensNative } from '@hominem/ui/tokens';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import AppIcon from '~/components/ui/icon';
import { Text, makeStyles, theme } from '~/theme';
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';

import type { InboxStreamItem as InboxStreamItemModel } from './inbox-stream-items';

interface InboxStreamItemProps {
  item: InboxStreamItemModel;
}

export const InboxStreamItem = memo(({ item }: InboxStreamItemProps) => {
  const styles = useStyles();
  const router = useRouter();
  const iconColor = item.kind === 'note' ? theme.colors.foreground : theme.colors['text-secondary'];

  const onPress = useCallback(() => {
    router.push(item.route as RelativePathString);
  }, [item.route, router]);

  return (
    <Reanimated.View
      entering={FadeInDown.duration(180).springify().damping(20).stiffness(260)}
      layout={LinearTransition.duration(160)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        <View style={styles.rowInner}>
          <View style={styles.topRow}>
            <View style={styles.leadingRow}>
              <View
                style={[
                  styles.leading,
                  item.kind === 'note' ? styles.noteLeading : styles.chatLeading,
                ]}
              >
                <AppIcon
                  name={item.kind === 'note' ? 'pen-to-square' : 'comment'}
                  size={11}
                  color={iconColor}
                  style={[
                    styles.cornerIcon,
                    item.kind === 'note' ? styles.noteIcon : styles.chatIcon,
                  ]}
                  useSymbol
                />
              </View>
              <Text numberOfLines={1} variant="body" color="foreground" style={styles.title}>
                {item.title}
              </Text>
            </View>
            <Text numberOfLines={1} variant="small" color="text-tertiary" style={styles.metadata}>
              {formatTimestamp(item.updatedAt)}
            </Text>
          </View>
          {item.preview ? (
            <Text numberOfLines={2} variant="small" color="text-secondary" style={styles.preview}>
              {item.preview}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Reanimated.View>
  );
});

InboxStreamItem.displayName = 'InboxStreamItem';

function toDate(value: string): Date {
  return parseInboxTimestamp(value);
}

function formatTimestamp(value: string): string {
  const date = toDate(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((today.getTime() - targetDay.getTime()) / 86400000);

  if (dayDiff === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      backgroundColor: 'transparent',
      borderRadius: notesTokensNative.stream.itemRadius,
      marginHorizontal: t.spacing.xs_4,
    },
    rowInner: {
      gap: t.spacing.xs_4,
      paddingHorizontal: notesTokensNative.stream.itemPaddingX,
      paddingTop: notesTokensNative.stream.itemPaddingY,
      paddingBottom: notesTokensNative.stream.itemPaddingY,
    },
    topRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: t.spacing.xs_4,
      justifyContent: 'space-between',
    },
    leadingRow: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: t.spacing.sm_8,
      minWidth: 0,
    },
    leading: {
      alignItems: 'center',
      borderCurve: 'continuous',
      borderRadius: notesTokensNative.stream.typeIconSize,
      height: notesTokensNative.stream.typeIconSize,
      justifyContent: 'center',
      marginTop: 1,
      width: notesTokensNative.stream.typeIconSize,
    },
    noteLeading: {
      backgroundColor: t.colors.accent,
    },
    chatLeading: {
      backgroundColor: t.colors['text-tertiary'],
      opacity: notesTokensNative.states.chatIndicatorOpacity,
    },
    title: {
      color: t.colors.foreground,
      flex: 1,
      fontWeight: '600',
      fontSize: 15,
      letterSpacing: -0.2,
      lineHeight: 20,
    },
    metadata: {
      color: t.colors['text-tertiary'],
      fontSize: 11,
      lineHeight: 13,
      opacity: notesTokensNative.states.metadataOpacity,
      paddingLeft: t.spacing.xs_4,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    preview: {
      color: t.colors['text-secondary'],
      fontSize: 13,
      lineHeight: 18,
      opacity: notesTokensNative.states.previewOpacity,
      paddingLeft: notesTokensNative.stream.dividerInset,
      paddingRight: t.spacing.ml_24,
      paddingTop: 1,
    },
    cornerIcon: {
      lineHeight: 11,
      textAlign: 'center',
    },
    noteIcon: {
      color: t.colors.accent,
      opacity: notesTokensNative.states.noteIconOpacity,
    },
    chatIcon: {
      color: t.colors['text-tertiary'],
      opacity: notesTokensNative.states.chatIconOpacity,
    },
    pressed: {
      backgroundColor: notesTokensNative.states.rowPressedSurface,
    },
  }),
);
