import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { makeStyles, Text, theme } from '~/theme';
import { LocalStore } from '~/utils/local-store';
import type { ChatWithActivity } from '~/utils/services/chat/session-state';
import { toChatsWithActivity } from '~/utils/services/chat/session-state';

import AppIcon from '../ui/icon';

export const useResumableSessions = () => {
  return useQuery<ChatWithActivity[]>({
    queryKey: ['resumableSessions'],
    queryFn: async () => {
      const chats = await LocalStore.listChats();
      const messagesByChatId = Object.fromEntries(
        await Promise.all(
          chats.map(async (chat) => [chat.id, await LocalStore.listMessages(chat.id)] as const),
        ),
      );
      return toChatsWithActivity(chats, messagesByChatId);
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
        <Text numberOfLines={1} style={styles.title}>
          {label}
        </Text>
        <Text style={styles.meta}>
          {isActive ? 'Active' : formatAge(chat.activityAt)}
        </Text>
      </View>
      <AppIcon name="chevron-right" size={12} color={theme.colors['text-tertiary']} />
    </Pressable>
  );
});

SessionCard.displayName = 'SessionCard';

// ─── SessionList ──────────────────────────────────────────────────────────────

const keyExtractor = (item: ChatWithActivity) => item.id;

const ESTIMATED_ITEM_SIZE = 64;

export const SessionList = () => {
  const styles = useStyles();
  const { data: sessions } = useResumableSessions();

  const renderItem = useCallback<ListRenderItem<ChatWithActivity>>(({ item, index }) => {
    return <SessionCard chat={item} isActive={index === 0 && !item.endedAt} />;
  }, []);

  if (!sessions || sessions.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text style={styles.sectionLabel}>RECENT CONVERSATIONS</Text>
      <FlashList
        data={sessions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={ESTIMATED_ITEM_SIZE}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

function formatAge(activityAt: string): string {
  const diffMs = Date.now() - new Date(activityAt).getTime();
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
      fontSize: 11,
      letterSpacing: 1.2,
      color: t.colors['text-tertiary'],
      fontWeight: '500',
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
      gap: 2,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      color: t.colors.foreground,
    },
    meta: {
      fontSize: 12,
      lineHeight: 16,
      color: t.colors['text-tertiary'],
    },
  }),
);
