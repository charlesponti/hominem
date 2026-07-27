import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { makeStyles, spacing, Text } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

import type { EditableTimeBlockField, TimeInteractionState, TimeOpening } from './time-types';
import { formatDraftDetails } from './time-utils';

interface TimeResultProps {
  editingField: EditableTimeBlockField | null;
  isSaving: boolean;
  onCancel: () => void;
  onChooseEvent: (id: string) => void;
  onChooseOpening: (opening: TimeOpening) => void;
  onEdit: (field: EditableTimeBlockField) => void;
  onEditValue: (value: string) => void;
  onSubmit: () => void;
  state: TimeInteractionState;
}

const fieldLabel: Record<EditableTimeBlockField, string> = {
  title: 'Title',
  target_title: 'Event',
  participants: 'People',
  location: 'Location',
  duration: 'Duration',
  start_time: 'Start time',
  end_time: 'End time',
  scheduling_window_start: 'Time window',
  scheduling_window_end: 'Time window',
  deadline_fixed: 'Deadline',
  recurrence_rule: 'Repeats',
};

function ResultSurface({
  accessibilityLabel,
  children,
  testID,
}: {
  accessibilityLabel?: string;
  children: ReactNode;
  testID: string;
}) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      entering={reducedMotion ? undefined : FadeInUp.duration(220)}
      style={styles.result}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}

export function TimeResult({
  editingField,
  isSaving,
  onCancel,
  onChooseEvent,
  onChooseOpening,
  onEdit,
  onEditValue,
  onSubmit,
  state,
}: TimeResultProps) {
  const styles = useStyles();
  if (state.kind === 'idle' || state.kind === 'parsing') return null;

  if (state.kind === 'error') {
    return (
      <ResultSurface accessibilityLabel="Time request failed" testID="time-result-error">
        <Text color="destructive">{state.message}</Text>
      </ResultSurface>
    );
  }

  if (state.kind === 'answer') {
    return (
      <ResultSurface accessibilityLabel="Answer ready" testID="time-result-answer">
        <Text variant="body" color="text-primary">
          {state.answer}
        </Text>
      </ResultSurface>
    );
  }

  if (state.kind === 'event-choice') {
    return (
      <ResultSurface testID="time-result-event-choice">
        <Text variant="headline">Which event did you mean?</Text>
        {state.candidates.map((event) => (
          <Pressable
            key={`${event.id}:${event.startDate}`}
            accessibilityLabel={`${event.title}, ${new Date(event.startDate).toLocaleString()}`}
            onPress={() => onChooseEvent(event.id)}
            style={styles.choice}
            testID="time-event-choice"
          >
            <Text variant="body">{event.title}</Text>
            <Text color="text-secondary">
              {new Date(event.startDate).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
        ))}
        <Button label="Cancel" onPress={onCancel} size="sm" variant="ghost" />
      </ResultSurface>
    );
  }

  if (state.kind === 'availability') {
    return (
      <ResultSurface testID="time-result-availability">
        <Text variant="headline">Possible times</Text>
        {state.openings.map((opening) => (
          <Pressable
            key={opening.start}
            accessibilityLabel={`Use ${new Date(opening.start).toLocaleString()}`}
            onPress={() => onChooseOpening(opening)}
            style={styles.choice}
            testID="time-availability-opening"
          >
            <Text variant="body">
              {new Date(opening.start).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            <Text color="text-secondary">
              until{' '}
              {new Date(opening.end).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
        ))}
        <Button label="Cancel" onPress={onCancel} size="sm" variant="ghost" />
      </ResultSurface>
    );
  }

  const { block } = state;
  const canSubmit =
    block.primary_intent === 'add_task' ||
    ((block.primary_intent === 'add_event' || block.primary_intent === 'add_recurring_event') &&
      !!block.start_time &&
      !!block.end_time);
  const actionLabel =
    block.primary_intent === 'add_task'
      ? 'Add task'
      : block.primary_intent === 'add_recurring_event'
        ? 'Add recurring event'
        : 'Add event';
  const title = block.title ?? block.target_title ?? state.submittedPrompt;
  const detail = formatDraftDetails(block);

  return (
    <ResultSurface
      accessibilityLabel={
        block.primary_intent === 'add_task' ? 'Draft task ready' : 'Draft event ready'
      }
      testID="time-result-draft"
    >
      <Pressable
        accessibilityLabel="Edit title"
        onPress={() => onEdit('title')}
        style={styles.detailPressable}
        testID="time-draft-edit-title"
      >
        <Text variant="headline">{title}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Edit time details"
        onPress={() => onEdit(block.duration ? 'duration' : 'location')}
        style={styles.detailPressable}
        testID="time-draft-edit-details"
      >
        <Text variant="subhead" color="text-secondary">
          {detail}
        </Text>
      </Pressable>
      {(block.primary_intent === 'add_event' || block.primary_intent === 'add_recurring_event') &&
      !canSubmit ? (
        <Text color="destructive">Choose a start and end time before adding this event.</Text>
      ) : null}
      {editingField ? (
        <Input
          autoFocus
          accessibilityLabel={`Edit ${fieldLabel[editingField]}`}
          onChangeText={onEditValue}
          placeholder={fieldLabel[editingField]}
          testID="time-draft-edit-input"
          value={String(block[editingField] ?? '')}
        />
      ) : null}
      {canSubmit ? (
        <Button
          label={actionLabel}
          loading={isSaving}
          onPress={onSubmit}
          testID="time-draft-submit"
        />
      ) : null}
      <Button
        label="Cancel"
        onPress={onCancel}
        size="sm"
        testID="time-draft-cancel"
        variant="ghost"
      />
    </ResultSurface>
  );
}

const useStyles = makeStyles((theme) => ({
  choice: {
    gap: spacing[1],
    minHeight: 44,
    paddingVertical: spacing[2],
  },
  detailPressable: { minHeight: 44, justifyContent: 'center' },
  result: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors['border-default'],
    borderRadius: 22,
    borderWidth: 1,
    elevation: 8,
    gap: spacing[2],
    marginHorizontal: spacing[4],
    padding: spacing[4],
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { height: 8, width: 0 },
  },
}));
