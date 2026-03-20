import type { ArtifactType, ReviewItem } from '@hominem/chat-services/types';
import { StyleSheet, View } from 'react-native';

import { FadeIn } from '~/components/animated/fade-in';
import { Button } from '~/components/Button';
import { Text, makeStyles, theme } from '~/theme';

interface ProposalCardProps {
  item: ReviewItem;
  onReview: (item: ReviewItem) => void;
  onReject: (item: ReviewItem) => void;
}

const TYPE_LABEL: Record<ArtifactType, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'LIST',
  tracker: 'TRACKER',
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    list: { gap: t.spacing.sm_8 },
    sectionLabel: {
      letterSpacing: 1,
      marginBottom: t.spacing.xs_4,
      paddingHorizontal: t.spacing.xs_4,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_12,
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_12,
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: theme.colors['border-default'],
      backgroundColor: theme.colors.muted,
    },
    content: { flex: 1, gap: t.spacing.xs_4 },
    typeLabel: { letterSpacing: 1 },
    title: { fontWeight: '500' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm_8 },
    reviewBtn: {
      minHeight: 30,
    },
    rejectBtn: { minHeight: 28, minWidth: 28 },
  }),
);

export const ProposalCard = ({ item, onReview, onReject }: ProposalCardProps) => {
  const styles = useStyles();
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
  );
};

export const ProposalList = ({
  items,
  onReview,
  onReject,
}: {
  items: ReviewItem[];
  onReview: (item: ReviewItem) => void;
  onReject: (item: ReviewItem) => void;
}) => {
  const styles = useStyles();
  if (items.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
        NEEDS REVIEW
      </Text>
      {items.map((item) => (
        <ProposalCard key={item.id} item={item} onReview={onReview} onReject={onReject} />
      ))}
    </View>
  );
};
