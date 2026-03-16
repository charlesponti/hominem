import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FadeIn } from '~/components/animated/fade-in';
import { Button } from '~/components/Button';
import { makeStyles, Text } from '~/theme';
import { LocalStore } from '~/utils/local-store';
import type { ChatWithActivity } from '~/utils/services/chat/session-state';
import { toChatsWithActivity } from '~/utils/services/chat/session-state';

const MAX_SESSION_CARDS = 3;

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

      return toChatsWithActivity(chats, messagesByChatId).slice(0, MAX_SESSION_CARDS);
    },
  });
};

interface SessionCardProps {
  chat: ChatWithActivity;
  isActive?: boolean;
}

export const SessionCard = ({ chat, isActive }: SessionCardProps) => {
  const styles = useStyles();
  const router = useRouter();

  const handlePress = () => {
    router.push(`/(protected)/(tabs)/sherpa?chatId=${chat.id}` as RelativePathString);
  };

  const label = chat.title ?? 'Untitled session';

  return (
    <FadeIn>
      <Button
        variant="outline"
        size="sm"
        style={[styles.card, isActive && styles.activeCard]}
        onPress={handlePress}
        accessibilityLabel={`Resume session: ${label}`}
      >
        {isActive && <View style={styles.activeDot} />}
        <View style={styles.content}>
          <Text variant="body" color="foreground" numberOfLines={1} style={styles.title}>
            {label}
          </Text>
          <Text variant="caption" color="text-secondary" style={styles.meta}>
            {isActive ? 'Active conversation' : formatAge(chat.activityAt)}
          </Text>
        </View>
        <Text variant="caption" color="text-secondary" style={styles.resume}>
          Resume
        </Text>
      </Button>
    </FadeIn>
  );
};

// ─── SessionList ──────────────────────────────────────────────────────────────

export const SessionList = () => {
  const styles = useStyles();
  const { data: sessions } = useResumableSessions();

  if (!sessions || sessions.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
        RECENT CONVERSATIONS
      </Text>
      {sessions.map((chat, i) => (
        <SessionCard key={chat.id} chat={chat} isActive={i === 0 && !chat.endedAt} />
      ))}
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
    list: { gap: t.spacing.xs_4 },
    sectionLabel: {
      letterSpacing: 1 /* text kerning */,
      marginBottom: t.spacing.xs_4,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_12,
      borderColor: t.colors['border-default'],
      backgroundColor: t.colors.background,
      justifyContent: 'flex-start',
      borderRadius: t.borderRadii.xl_20,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
    },
    activeCard: {
      borderColor: t.colors['border-focus'],
    },
    activeDot: {
      width: t.spacing.xs_4,
      height: t.spacing.xs_4,
      borderRadius: 999 /* full radius */,
      backgroundColor: t.colors.foreground,
    },
    content: { flex: 1, gap: 1 /* minimal gap */ },
    title: { fontWeight: '500' },
    meta: { letterSpacing: 0.3 },
    resume: { letterSpacing: 0.5 },
  }),
);
