import { StyleSheet, View } from 'react-native'
import type { ArtifactType, ReviewItem } from '@hominem/chat-services/types'
import { Button } from '~/components/Button'
import { Text, theme } from '~/theme'
import { FadeIn } from '~/components/animated/fade-in'

interface ProposalCardProps {
  item: ReviewItem
  onReview: (item: ReviewItem) => void
  onReject: (item: ReviewItem) => void
}

const TYPE_LABEL: Record<ArtifactType, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'LIST',
  tracker: 'TRACKER',
}

export const ProposalCard = ({ item, onReview, onReject }: ProposalCardProps) => {
  return (
    <FadeIn>
      <View style={styles.card}>
        <View style={styles.content}>
          <Text variant="caption" color="text-secondary" style={styles.typeLabel}>
            {TYPE_LABEL[item.proposedType]}
          </Text>
          <Text variant="body" color="foreground" numberOfLines={1} style={styles.title}>
            {item.proposedTitle}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            variant="outline"
            size="xs"
            style={styles.reviewBtn}
            onPress={() => onReview(item)}
            accessibilityLabel={`Review proposal: ${item.proposedTitle}`}
          >
            REVIEW →
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            style={styles.rejectBtn}
            onPress={() => onReject(item)}
            accessibilityLabel={`Reject proposal: ${item.proposedTitle}`}
          >
            ✕
          </Button>
        </View>
      </View>
    </FadeIn>
  )
}

/** Renders the review queue. Hides entirely when empty. */
export const ProposalList = ({
  items,
  onReview,
  onReject,
}: {
  items: ReviewItem[]
  onReview: (item: ReviewItem) => void
  onReject: (item: ReviewItem) => void
}) => {
  if (items.length === 0) return null

  return (
    <View style={styles.list}>
      <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
        NEEDS REVIEW
      </Text>
      {items.map((item) => (
        <ProposalCard key={item.id} item={item} onReview={onReview} onReject={onReject} />
      ))}
    </View>
  )
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
  content: { flex: 1, gap: 2 },
  typeLabel: { letterSpacing: 1 },
  title: { fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewBtn: {
    minHeight: 30,
  },
  rejectBtn: { minHeight: 28, minWidth: 28 },
})
