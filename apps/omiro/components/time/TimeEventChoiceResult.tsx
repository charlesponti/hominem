import { Pressable, Text } from 'react-native';

import { useStyles } from '~/components/theme';

import { formatDateTime } from './time-result-formatters';
import type { TimeInteractionState } from './time-types';
import { CancelRow } from './TimeResultActions';

interface TimeEventChoiceResultProps {
  candidates: Extract<TimeInteractionState, { kind: 'event-choice' }>['candidates'];
  onCancel?: () => void;
  onChooseEvent?: (id: string) => void;
}

export function TimeEventChoiceResult({
  candidates,
  onCancel,
  onChooseEvent,
}: TimeEventChoiceResultProps) {
  const styles = useStyles((theme) => ({
    heading: { ...theme.textVariants.headline },
    choice: { gap: 4, paddingVertical: 8, minHeight: 44 },
    title: { ...theme.textVariants.body },
    time: { color: theme.colors.mutedForeground },
  }));

  return (
    <>
      <Text style={styles.heading}>Which event did you mean?</Text>
      {candidates.map((event) => (
        <Pressable
          key={`${event.id}:${event.startDate}`}
          accessibilityLabel={`${event.title}, ${new Date(event.startDate).toLocaleString()}`}
          onPress={() => onChooseEvent?.(event.id)}
          style={styles.choice}
          testID="time-event-choice"
        >
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.time}>{formatDateTime(event.startDate)}</Text>
        </Pressable>
      ))}
      <CancelRow testID="time-event-choice-cancel" onCancel={onCancel} />
    </>
  );
}
