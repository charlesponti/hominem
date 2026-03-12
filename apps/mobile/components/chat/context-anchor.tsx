import type { SessionSource } from '@hominem/chat-services/types';
import { StyleSheet, View } from 'react-native';

import { makeStyles, Text } from '~/theme';

export type { SessionSource };

interface ContextAnchorProps {
  source: SessionSource;
}

const TYPE_LABELS: Record<string, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'LIST',
  tracker: 'TRACKER',
};

/**
 * ContextAnchor — shows where a session originated.
 * Required in every SessionView header. Never absent.
 */
export const ContextAnchor = ({ source }: ContextAnchorProps) => {
  const styles = useStyles();

  if (source.kind === 'new') {
    return (
      <Text variant="caption" color="text-secondary" style={styles.italic}>
        New session
      </Text>
    );
  }

  if (source.kind === 'thought') {
    return (
      <View style={styles.pill}>
        <Text variant="caption" color="text-secondary" numberOfLines={1}>
          {source.preview}
        </Text>
      </View>
    );
  }

  // kind === 'artifact'
  return (
    <View style={styles.pill}>
      <Text variant="caption" color="text-secondary">
        {TYPE_LABELS[source.type] ?? source.type}
      </Text>
      <Text variant="caption" color="text-secondary" style={styles.dot}>
        ·
      </Text>
      <Text variant="caption" color="text-secondary" numberOfLines={1} style={styles.title}>
        {source.title}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    italic: {
      fontStyle: 'italic',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs_4,
      paddingHorizontal: t.spacing.sm_8,
      paddingVertical: t.spacing.xs_4,
      borderRadius: t.borderRadii.s_3,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      backgroundColor: t.colors.muted,
      maxWidth: 240,
    },
    dot: {
      opacity: 0.4,
    },
    title: {
      flex: 1,
    },
  }),
);
