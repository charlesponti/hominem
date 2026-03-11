import { Pressable, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'

import { Text, theme } from '~/theme'
import { LocalStore } from '~/utils/local-store'
import { FadeIn } from '~/components/animated/fade-in'
import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import { toChatsWithActivity } from '~/utils/services/chat/session-state'

const MAX_SESSION_CARDS = 3

export const useResumableSessions = () => {
  return useQuery<ChatWithActivity[]>({
    queryKey: ['resumableSessions'],
    queryFn: async () => {
      const chats = await LocalStore.listChats()
      const messagesByChatId = Object.fromEntries(
        await Promise.all(
          chats.map(async (chat) => [chat.id, await LocalStore.listMessages(chat.id)] as const),
        ),
      )

      return toChatsWithActivity(chats, messagesByChatId).slice(0, MAX_SESSION_CARDS)
    },
  })
}

interface SessionCardProps {
  chat: ChatWithActivity
  isActive?: boolean
}

export const SessionCard = ({ chat, isActive }: SessionCardProps) => {
  const router = useRouter()

  const handlePress = () => {
    router.push(`/(protected)/(tabs)/sherpa?chatId=${chat.id}` as RelativePathString)
  }

  const label = chat.title ?? 'Untitled session'

  return (
    <FadeIn>
      <Pressable
        style={[styles.card, isActive && styles.activeCard]}
        onPress={handlePress}
        accessibilityLabel={`Resume session: ${label}`}
        accessibilityRole="button"
      >
        {isActive && <View style={styles.activeDot} />}
        <View style={styles.content}>
          <Text variant="body" color="foreground" numberOfLines={1} style={styles.title}>
            {label}
          </Text>
          <Text variant="caption" color="text-secondary">
            {isActive ? 'Active' : formatAge(chat.activityAt)}
          </Text>
        </View>
        <Text variant="caption" color="text-secondary" style={styles.arrow}>→</Text>
      </Pressable>
    </FadeIn>
  )
}

// ─── SessionList ──────────────────────────────────────────────────────────────

export const SessionList = () => {
  const { data: sessions } = useResumableSessions()

  if (!sessions || sessions.length === 0) return null

  return (
    <View style={styles.list}>
      <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
        SESSIONS
      </Text>
      {sessions.map((chat, i) => (
        <SessionCard key={chat.id} chat={chat} isActive={i === 0 && !chat.endedAt} />
      ))}
    </View>
  )
}

function formatAge(activityAt: string): string {
  const diffMs = Date.now() - new Date(activityAt).getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  sectionLabel: {
    letterSpacing: 1,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    backgroundColor: theme.colors.muted,
  },
  activeCard: {
    borderColor: theme.colors.success,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.success,
  },
  content: { flex: 1, gap: 1 },
  title: { fontWeight: '500' },
  arrow: { opacity: 0.4 },
})
