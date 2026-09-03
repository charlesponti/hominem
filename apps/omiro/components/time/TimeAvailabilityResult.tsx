import { Pressable, Text } from 'react-native';

import { useStyles } from '~/components/theme';
import { formatClockTime } from '~/services/date/format-date';

import { formatDateTime } from './time-result-formatters';
import type { TimeOpening } from './time-types';
import { CancelRow } from './TimeResultActions';

interface TimeAvailabilityResultProps {
  onCancel?: () => void;
  onChooseOpening?: (opening: TimeOpening) => void;
  openings: TimeOpening[];
}

export function TimeAvailabilityResult({
  openings,
  onCancel,
  onChooseOpening,
}: TimeAvailabilityResultProps) {
  const styles = useStyles((theme) => ({
    heading: { ...theme.textVariants.headline },
    option: { gap: 4, paddingVertical: 8, minHeight: 44 },
    time: { ...theme.textVariants.body },
    end: { color: theme.colors.mutedForeground },
  }));

  return (
    <>
      <Text style={styles.heading}>Possible times</Text>
      {openings.slice(0, 3).map((opening) => (
        <Pressable
          key={opening.start}
          accessibilityLabel={`Use ${new Date(opening.start).toLocaleString()}`}
          onPress={() => onChooseOpening?.(opening)}
          style={styles.option}
          testID="time-availability-opening"
        >
          <Text style={styles.time}>{formatDateTime(opening.start)}</Text>
          <Text style={styles.end}>until {formatClockTime(opening.end)}</Text>
        </Pressable>
      ))}
      <CancelRow testID="time-availability-cancel" onCancel={onCancel} />
    </>
  );
}
