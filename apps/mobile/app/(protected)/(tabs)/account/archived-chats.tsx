import { Stack, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useArchivedSessions } from '~/components/chat/session-card';
import AppIcon from '~/components/ui/icon';
import { Text, theme } from '~/theme';
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';

function formatAge(activityAt: string): string {
  const parsed = parseInboxTimestamp(activityAt);
  const diffMs = Date.now() - parsed.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { data: chats = [] } = useArchivedSessions();

  const onPressChat = useCallback(
    (chatId: string) => {
      router.push(`/(protected)/(tabs)/sherpa?chatId=${chatId}` as RelativePathString);
    },
    [router],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Archived chats',
        }}
      />
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          testID="archived-chats-screen"
        >
          <Text variant="caption" color="text-secondary" style={styles.label}>
            Archived chats
          </Text>
          <Text variant="header" color="foreground">
            Revisit past conversations
          </Text>
          <Text variant="body" color="text-secondary">
            Archived chats are hidden from inbox but remain available here.
          </Text>

          {chats.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text variant="bodyLarge" color="foreground">
                No archived chats yet
              </Text>
              <Text variant="body" color="text-secondary">
                Chats you archive will appear here for later reference.
              </Text>
            </View>
          ) : (
            chats.map((chat) => (
              <Pressable
                key={chat.id}
                onPress={() => onPressChat(chat.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open archived chat: ${chat.title ?? 'Untitled session'}`}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.iconWrap}>
                  <AppIcon name="box-archive" size={14} color={theme.colors['text-tertiary']} />
                </View>
                <View style={styles.cardContent}>
                  <Text variant="label" color="foreground" numberOfLines={1}>
                    {chat.title ?? 'Untitled session'}
                  </Text>
                  <Text variant="small" color="text-tertiary">
                    Archived {formatAge(chat.archivedAt ?? chat.activityAt)}
                  </Text>
                </View>
                <AppIcon name="chevron-right" size={12} color={theme.colors['text-tertiary']} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: theme.spacing.sm_12,
    paddingBottom: theme.spacing.xl_48,
    paddingHorizontal: theme.spacing.m_16,
    paddingTop: theme.spacing.m_16,
  },
  label: {
    letterSpacing: 1,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    gap: theme.spacing.sm_8,
    marginTop: theme.spacing.sm_12,
    paddingHorizontal: theme.spacing.m_16,
    paddingVertical: theme.spacing.xl_64,
  },
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm_12,
    paddingHorizontal: theme.spacing.m_16,
    paddingVertical: theme.spacing.sm_12,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors['bg-surface'],
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  cardContent: {
    flex: 1,
    gap: theme.spacing.xs_4,
  },
});
