import { Pressable, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'

import { Text, theme } from '~/theme'
import { LocalStore } from '~/utils/local-store'
import type { Chat as LocalChat } from '~/utils/local-store/types'
import { FadeIn } from '~/components/animated/fade-in'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const MAX_SESSION_CARDS = 3

// ─── Query ────────────────────────────────────────────────────────────────────

export const useResumableSessions = () => {
  return useQuery<LocalChat[]>({
    queryKey: ['resumableSessions'],
    queryFn: async () => {
      const now = Date.now()
      const chats = await LocalStore.listChats()
      return chats
        .filter((chat) => {
          const age = now - new Date(chat.createdAt).getTime()
          return age <= THIRTY_DAYS_MS
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_SESSION_CARDS)
    },
  })
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

interface SessionCardProps {
  chat: LocalChat
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
          <Text variant="caption" color="secondaryForeground">
            {isActive ? 'Active' : formatAge(chat.createdAt)}
          </Text>
        </View>
        <Text variant="caption" color="secondaryForeground" style={styles.arrow}>→</Text>
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
      <Text variant="caption" color="secondaryForeground" style={styles.sectionLabel}>
        SESSIONS
      </Text>
      {sessions.map((chat, i) => (
        <SessionCard key={chat.id} chat={chat} isActive={i === 0 && !chat.endedAt} />
      ))}
    </View>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
  activeCard: {
    borderColor: theme.colors.green,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.green,
  },
  content: { flex: 1, gap: 1 },
  title: { fontWeight: '500' },
  arrow: { opacity: 0.4 },
})
