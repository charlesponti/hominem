import type { SessionSource } from '@hominem/chat-services/types';
import { StyleSheet, View } from 'react-native';

import { makeStyles, Text } from '~/theme';

export type { SessionSource };

interface ContextAnchorProps {
  source: SessionSource;
  showTitle?: boolean;
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
export const ContextAnchor = ({ source, showTitle = true }: ContextAnchorProps) => {
  const styles = useStyles();

  if (source.kind === 'new') {
    return (
      <Text variant="body" color="foreground" numberOfLines={1} style={styles.primaryTitle}>
        New conversation
      </Text>
    );
  }

  if (source.kind === 'thought') {
    if (!showTitle) {
      return (
        <Text variant="caption" color="text-secondary" numberOfLines={1} style={styles.secondaryLabel}>
          Conversation
        </Text>
      );
    }

    return (
      <Text variant="body" color="foreground" numberOfLines={1} style={styles.primaryTitle}>
        {source.preview}
      </Text>
    );
  }

  // kind === 'artifact'
  if (!showTitle) {
    return (
      <Text variant="caption" color="text-secondary" numberOfLines={1} style={styles.secondaryLabel}>
        {TYPE_LABELS[source.type] ?? source.type}
      </Text>
    );
  }

  return (
    <>
      <Text variant="body" color="foreground" numberOfLines={1} style={styles.primaryTitle}>
        {source.title}
      </Text>
      <Text variant="caption" color="text-secondary" numberOfLines={1} style={styles.secondaryLabel}>
        {TYPE_LABELS[source.type] ?? source.type}
      </Text>
    </>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    primaryTitle: {
      maxWidth: 240,
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: -0.2,
      lineHeight: 22,
      textAlign: 'center',
    },
    secondaryLabel: {
      letterSpacing: 0.8,
      opacity: 0.72,
      textTransform: 'uppercase',
    },
  }),
);
