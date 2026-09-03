import { useEffect, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';

import { useVoiceComposerInput } from '~/components/composer/useVoiceComposerInput';
import { getVoiceComposerErrorPresentation } from '~/components/composer/voiceComposerInput.helpers';
import { useAppTheme, useStyles, withAlpha } from '~/components/theme';
import { Card, IconButton, TextField } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';
import { formatClockTime } from '~/services/date/format-date';
import t from '~/translations';

import type { EditableTimeBlockField, TimeInteractionState, TimeOpening } from './time-types';
import { formatDraftDetails } from './time-utils';
import { useTimeComposer } from './use-time-composer';

interface TimeComposerProps {
  onOpenEvent: (event: { id: string }) => void;
}

function useTimeComposerStyles() {
  return useStyles((theme) => ({
    composerCard: { width: '100%', gap: 8, padding: 12 },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
    loadingState: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    resultSurface: { width: '100%' },
    resultCard: { gap: 8, padding: 12 },
    answerText: { ...theme.textVariants.body, color: theme.colors.foreground },
    eventChoiceHeading: { ...theme.textVariants.headline },
    eventChoice: { gap: 4, paddingVertical: 8, minHeight: 44 },
    eventTitle: { ...theme.textVariants.body },
    eventTime: { color: theme.colors.mutedForeground },
    availabilityHeading: { ...theme.textVariants.headline },
    openingOption: { gap: 4, paddingVertical: 8, minHeight: 44 },
    openingTime: { ...theme.textVariants.body },
    openingEnd: { color: theme.colors.mutedForeground },
    intentBadge: {
      alignSelf: 'flex-start',
      backgroundColor: withAlpha(theme.colors.muted, 0.7),
      borderRadius: theme.borderRadii.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    intentLabel: { ...theme.textVariants.caption1, color: theme.colors.mutedForeground },
    fieldEditor: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    textField: {
      borderRadius: 0,
      borderWidth: 0,
      minHeight: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    draftDetails: { ...theme.textVariants.body, color: theme.colors.mutedForeground },
    resultActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
  }));
}

export function TimeComposer({ onOpenEvent }: TimeComposerProps) {
  const [composerError, setComposerError] = useState<string | null>(null);
  const controller = useTimeComposer({ onError: setComposerError, onOpenEvent });
  const {
    ask,
    cancelResult,
    chooseEvent,
    chooseOpening,
    interaction: state,
    isSaving,
    prompt: value,
    setPrompt,
    submitDraft,
    updateDraft,
  } = controller;
  const disabled = state.kind === 'parsing' || isSaving;
  const theme = useAppTheme();
  const { primary: primaryColor } = theme.colors;
  const styles = useTimeComposerStyles();
  const inputRef = useRef<RNTextInput>(null);
  const reducedMotion = useReducedMotion();

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const voice = useVoiceComposerInput({
    getMessage: () => valueRef.current,
    setMessage: setPrompt,
  });

  const canSubmit = value.trim().length > 0;
  const isIdle = state.kind === 'idle';
  const isParsing = state.kind === 'parsing';

  useEffect(() => {
    if (isIdle && value) {
      inputRef.current?.focus();
    }
  }, [isIdle, value]);

  const voiceErrorBanner =
    voice.voiceState === 'failed' && voice.error ? (
      <InlineErrorBanner
        message={getVoiceComposerErrorPresentation(voice.error.code).message}
        onDismiss={voice.clearError}
      />
    ) : undefined;

  return (
    <>
      {!isIdle && !isParsing ? (
        <ResultSurface
          isSaving={isSaving}
          onCancel={cancelResult}
          onChooseEvent={chooseEvent}
          onChooseOpening={chooseOpening}
          onEditField={updateDraft}
          onSubmitDraft={submitDraft}
          state={state}
          testID="time-result"
        />
      ) : null}

      {isIdle ? (
        <Animated.View
          entering={FadeIn.duration(reducedMotion ? 150 : 180)}
          exiting={FadeOut.duration(120)}
        >
          <Card
            style={[
              styles.composerCard,
              {
                borderCurve: 'continuous',
                borderRadius: 24,
                borderWidth: 0,
                boxShadow: theme.shadows.none,
              },
            ]}
            testID="time-composer"
          >
            {voiceErrorBanner}
            {voice.isRecording ? (
              <VoiceRecordingPanel
                startedAt={voice.recordingStartedAt}
                onCancel={() => void voice.cancelVoiceRecording()}
                onDone={() => void voice.handleVoicePress()}
              />
            ) : (
              <View style={styles.fieldEditor}>
                <TextField
                  editable={!disabled}
                  focusBorder={false}
                  ref={inputRef}
                  onChangeText={setPrompt}
                  onSubmitEditing={ask}
                  placeholder="Add or search anything..."
                  returnKeyType="send"
                  submitBehavior="submit"
                  testID="time-composer-input"
                  value={value}
                  multiline
                  numberOfLines={5}
                  style={styles.textField}
                />
              </View>
            )}
            {voice.isRecording ? null : (
              <>
                {composerError ? (
                  <InlineErrorBanner
                    message={composerError}
                    onDismiss={() => setComposerError(null)}
                  />
                ) : null}
                <View style={styles.actionRow}>
                  <IconButton
                    accessibilityLabel="Start voice input"
                    disabled={voice.isRecordingElsewhere}
                    testID="time-composer-mic-button"
                    onPress={() => void voice.handleVoicePress()}
                  >
                    <AppIcon name="mic.fill" size={20} />
                  </IconButton>
                  <IconButton
                    accessibilityLabel={
                      isParsing ? 'Interpreting time request' : 'Interpret time request'
                    }
                    disabled={disabled || !canSubmit || voice.isBusy}
                    testID="time-composer-submit"
                    onPress={ask}
                  >
                    <AppIcon name="arrow.up" size={20} />
                  </IconButton>
                </View>
              </>
            )}
          </Card>
        </Animated.View>
      ) : isParsing ? (
        <ResultSurface accessibilityLabel="Interpreting time request" testID="time-result-parsing">
          <View style={styles.loadingState}>
            <ActivityIndicator color={primaryColor} />
          </View>
        </ResultSurface>
      ) : null}
    </>
  );
}

interface ResultSurfaceProps {
  accessibilityLabel?: string;
  children?: React.ReactNode;
  isSaving?: boolean;
  onCancel?: () => void;
  onChooseEvent?: (id: string) => void;
  onChooseOpening?: (opening: TimeOpening) => void;
  onEditField?: (field: EditableTimeBlockField, value: string) => void;
  onSubmitDraft?: () => void;
  state?: TimeInteractionState;
  testID: string;
}

function ResultSurface({
  accessibilityLabel,
  children,
  isSaving,
  onCancel,
  onChooseEvent,
  onChooseOpening,
  onEditField,
  onSubmitDraft,
  state,
  testID,
}: ResultSurfaceProps) {
  const reducedMotion = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const theme = useAppTheme();
  const styles = useTimeComposerStyles();
  let inner = children;
  if (isResultState(state)) {
    inner = (
      <ResultContent
        isSaving={isSaving}
        onCancel={onCancel}
        onChooseEvent={onChooseEvent}
        onChooseOpening={onChooseOpening}
        onEditField={onEditField}
        onSubmitDraft={onSubmitDraft}
        state={state}
      />
    );
  }

  return (
    <Animated.View
      accessibilityLabel={
        accessibilityLabel ??
        (state && state.kind === 'draft'
          ? state.block.primary_intent === 'add_task'
            ? 'Draft task ready'
            : 'Draft event ready'
          : undefined)
      }
      entering={reducedMotion ? FadeIn.duration(180) : FadeInUp.duration(220)}
      exiting={reducedMotion ? FadeOut.duration(140) : FadeOutDown.duration(180)}
      style={styles.resultSurface}
      testID={testID}
    >
      <Card
        style={[
          styles.resultCard,
          {
            borderCurve: 'continuous',
            borderRadius: 24,
            borderWidth: 0,
            boxShadow: theme.shadows.none,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: screenHeight * 0.4 }}
        >
          {inner}
        </ScrollView>
      </Card>
    </Animated.View>
  );
}

type ResultState = Extract<
  TimeInteractionState,
  { kind: 'answer' | 'event-choice' | 'availability' | 'draft' }
>;

function isResultState(state: TimeInteractionState | undefined): state is ResultState {
  return state !== undefined && state.kind !== 'idle' && state.kind !== 'parsing';
}

type ResultContentProps = Pick<
  ResultSurfaceProps,
  'isSaving' | 'onCancel' | 'onChooseEvent' | 'onChooseOpening' | 'onEditField' | 'onSubmitDraft'
> & {
  state: ResultState;
};

function ResultContent({ state, ...actions }: ResultContentProps) {
  const styles = useTimeComposerStyles();
  switch (state.kind) {
    case 'answer':
      return <Text style={styles.answerText}>{state.answer}</Text>;
    case 'event-choice':
      return <EventChoiceResult candidates={state.candidates} {...actions} />;
    case 'availability':
      return <AvailabilityResult openings={state.openings} {...actions} />;
    case 'draft':
      return <DraftResult block={state.block} {...actions} />;
  }
}

function EventChoiceResult({
  candidates,
  onCancel,
  onChooseEvent,
}: Pick<ResultContentProps, 'onCancel' | 'onChooseEvent'> & {
  candidates: Extract<TimeInteractionState, { kind: 'event-choice' }>['candidates'];
}) {
  const styles = useTimeComposerStyles();
  return (
    <>
      <Text style={styles.eventChoiceHeading}>Which event did you mean?</Text>
      {candidates.map((event) => (
        <Pressable
          key={`${event.id}:${event.startDate}`}
          accessibilityLabel={`${event.title}, ${new Date(event.startDate).toLocaleString()}`}
          onPress={() => onChooseEvent?.(event.id)}
          style={styles.eventChoice}
          testID="time-event-choice"
        >
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventTime}>{formatDateTime(event.startDate)}</Text>
        </Pressable>
      ))}
      <CancelRow testID="time-event-choice-cancel" onCancel={onCancel} />
    </>
  );
}

function AvailabilityResult({
  openings,
  onCancel,
  onChooseOpening,
}: Pick<ResultContentProps, 'onCancel' | 'onChooseOpening'> & {
  openings: TimeOpening[];
}) {
  const styles = useTimeComposerStyles();
  return (
    <>
      <Text style={styles.availabilityHeading}>Possible times</Text>
      {openings.slice(0, 3).map((opening) => (
        <Pressable
          key={opening.start}
          accessibilityLabel={`Use ${new Date(opening.start).toLocaleString()}`}
          onPress={() => onChooseOpening?.(opening)}
          style={styles.openingOption}
          testID="time-availability-opening"
        >
          <Text style={styles.openingTime}>{formatDateTime(opening.start)}</Text>
          <Text style={styles.openingEnd}>until {formatClockTime(opening.end)}</Text>
        </Pressable>
      ))}
      <CancelRow testID="time-availability-cancel" onCancel={onCancel} />
    </>
  );
}

function DraftResult({
  block,
  isSaving,
  onCancel,
  onEditField,
  onSubmitDraft,
}: Pick<ResultContentProps, 'isSaving' | 'onCancel' | 'onEditField' | 'onSubmitDraft'> & {
  block: Extract<TimeInteractionState, { kind: 'draft' }>['block'];
}) {
  const styles = useTimeComposerStyles();
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
      {details ? <Text style={styles.draftDetails}>{details}</Text> : null}
      <View style={styles.resultActions}>
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

function CancelRow({ onCancel, testID }: { onCancel?: () => void; testID: string }) {
  const styles = useTimeComposerStyles();
  return (
    <View style={styles.resultActions}>
      <CancelButton testID={testID} onCancel={onCancel} />
    </View>
  );
}

function CancelButton({ onCancel, testID }: { onCancel?: () => void; testID: string }) {
  return (
    <IconButton accessibilityLabel="Cancel" testID={testID} onPress={onCancel}>
      <AppIcon name="xmark" size={20} />
    </IconButton>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getIntentLabel(
  intent: Extract<ResultState, { kind: 'draft' }>['block']['primary_intent'],
) {
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
