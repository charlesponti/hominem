import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useApiClient } from '@hominem/hono-client/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '~/components/animated/fade-in';
import { makeStyles, Text, theme } from '~/theme';
import type { ChatWithActivity } from '~/utils/services/chat/session-state';
import { getArchivedChatsWithActivity, getInboxChatsWithActivity } from '~/utils/services/chat/session-state';
import { chatKeys } from '~/utils/services/notes/query-keys';
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';

import AppIcon from '../ui/icon';

export const useResumableSessions = () => {
  const client = useApiClient();

  return useQuery<ChatWithActivity[]>({
    queryKey: chatKeys.resumableSessions,
    queryFn: async () => {
      const chats = await client.chats.list({ limit: 50 });
      return getInboxChatsWithActivity(chats);
    },
  });
};

export const useArchivedSessions = () => {
  const client = useApiClient();

  return useQuery<ChatWithActivity[]>({
    queryKey: chatKeys.archivedSessions,
    queryFn: async () => {
      const chats = await client.chats.list({ limit: 100 });
      return getArchivedChatsWithActivity(chats);
    },
  });
};

interface SessionCardProps {
  chat: ChatWithActivity;
  isActive?: boolean;
}

export const SessionCard = memo(({ chat, isActive }: SessionCardProps) => {
  const styles = useStyles();
  const router = useRouter();

  const handlePress = useCallback(() => {
    router.push(`/(protected)/(tabs)/sherpa?chatId=${chat.id}` as RelativePathString);
  }, [router, chat.id]);

  const label = chat.title ?? 'Untitled session';

  return (
    <FadeIn>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, isActive && styles.activeCard, pressed && styles.pressed]}
        accessibilityLabel={`Resume session: ${label}`}
        accessibilityRole="button"
      >
        <View style={[styles.iconWrap, isActive && styles.activeIconWrap]}>
          <AppIcon
            name="comment"
            size={14}
            color={isActive ? theme.colors.background : theme.colors['text-tertiary']}
          />
        </View>
        <View style={styles.content}>
          <Text variant="label" color="foreground" numberOfLines={1}>
            {label}
          </Text>
          <Text variant="small" color="text-tertiary">
            {isActive ? 'Active' : formatAge(chat.activityAt)}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={12} color={theme.colors['text-tertiary']} />
      </Pressable>
    </FadeIn>
  );
});

SessionCard.displayName = 'SessionCard';

// ─── SessionList ──────────────────────────────────────────────────────────────

const keyExtractor = (item: ChatWithActivity) => item.id;

export const SessionList = () => {
  const styles = useStyles();
  const { data: sessions } = useResumableSessions();

  const renderItem = useCallback<ListRenderItem<ChatWithActivity>>(({ item, index }) => {
    return <SessionCard chat={item} isActive={index === 0 && !item.archivedAt} />;
  }, []);

  if (!sessions || sessions.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text variant="small" color="text-tertiary" style={styles.sectionLabel}>RECENT CONVERSATIONS</Text>
      <FlashList
        data={sessions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

function formatAge(activityAt: string): string {
  const parsed = parseInboxTimestamp(activityAt)
  const diffMs = Date.now() - parsed.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    list: {
      gap: t.spacing.sm_8,
    },
    sectionLabel: {
      letterSpacing: 1.2,
      marginBottom: t.spacing.xs_4,
    },
    separator: {
      height: t.spacing.sm_8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_12,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.xl_20,
      backgroundColor: t.colors.background,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
    },
    activeCard: {
      borderColor: t.colors['border-focus'],
    },
    pressed: {
      opacity: 0.7,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      backgroundColor: t.colors['bg-surface'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeIconWrap: {
      backgroundColor: t.colors.foreground,
      borderColor: t.colors.foreground,
    },
    content: {
      flex: 1,
      gap: t.spacing.xs_4,
    },
  }),
);
