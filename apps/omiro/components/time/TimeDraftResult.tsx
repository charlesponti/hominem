import { Text, View } from 'react-native';

import { useStyles, withAlpha } from '~/components/theme';
import { IconButton, TextField } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

import type { EditableTimeBlockField, TimeInteractionState } from './time-types';
import { formatDraftDetails } from './time-utils';
import { CancelButton } from './TimeResultActions';

interface TimeDraftResultProps {
  block: Extract<TimeInteractionState, { kind: 'draft' }>['block'];
  isSaving?: boolean;
  onCancel?: () => void;
  onEditField?: (field: EditableTimeBlockField, value: string) => void;
  onSubmitDraft?: () => void;
}

export function TimeDraftResult({
  block,
  isSaving,
  onCancel,
  onEditField,
  onSubmitDraft,
}: TimeDraftResultProps) {
  const styles = useStyles((theme) => ({
    intentBadge: {
      alignSelf: 'flex-start',
      backgroundColor: withAlpha(theme.colors.muted, 0.7),
      borderRadius: theme.borderRadii.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    intentLabel: { ...theme.textVariants.caption1, color: theme.colors.mutedForeground },
    fieldEditor: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    textField: {
      borderRadius: 0,
      borderWidth: 0,
      minHeight: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    details: { ...theme.textVariants.body, color: theme.colors.mutedForeground },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
  }));
  const canSubmit =
    block.primary_intent === 'add_task' ||
    ((block.primary_intent === 'add_event' || block.primary_intent === 'add_recurring_event') &&
      !!block.start_time &&
      !!block.end_time);
  const details = formatDraftDetails(block);

  return (
    <>
      <View style={styles.intentBadge}>
        <Text style={styles.intentLabel}>{getIntentLabel(block.primary_intent)}</Text>
      </View>
      <View style={styles.fieldEditor}>
        <TextField
          accessibilityLabel="Edit title"
          autoFocus
          focusBorder={false}
          onChangeText={(value) => onEditField?.('title', value)}
          placeholder={t.timeResult.fieldLabels.title}
          testID="time-draft-edit-title"
          value={block.title ?? ''}
          style={styles.textField}
        />
      </View>
      {details ? <Text style={styles.details}>{details}</Text> : null}
      <View style={styles.actions}>
        <CancelButton testID="time-draft-cancel" onCancel={onCancel} />
        <IconButton
          accessibilityLabel="Confirm"
          disabled={isSaving || !canSubmit}
          testID="time-draft-submit"
          onPress={onSubmitDraft}
        >
          <AppIcon name="arrow.up" size={20} />
        </IconButton>
      </View>
    </>
  );
}

function getIntentLabel(intent: TimeDraftResultProps['block']['primary_intent']) {
  return {
    add_task: 'Task',
    add_event: 'Event',
    add_recurring_event: 'Recurring event',
    edit_event: 'Edit event',
    cancel_event: 'Cancel event',
    search: 'Search',
    schedule_gap_fill: 'Find time',
  }[intent];
}
