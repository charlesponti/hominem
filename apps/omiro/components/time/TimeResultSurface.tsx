import { ScrollView, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';

import { useAppTheme, useStyles } from '~/components/theme';
import { Card } from '~/components/ui';

import type { EditableTimeBlockField, TimeInteractionState, TimeOpening } from './time-types';
import { TimeAvailabilityResult } from './TimeAvailabilityResult';
import { TimeDraftResult } from './TimeDraftResult';
import { TimeEventChoiceResult } from './TimeEventChoiceResult';

type ResultState = Extract<
  TimeInteractionState,
  { kind: 'answer' | 'event-choice' | 'availability' | 'draft' }
>;

interface TimeResultSurfaceProps {
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

export function TimeResultSurface({
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
}: TimeResultSurfaceProps) {
  const reducedMotion = useReducedMotion();
  const theme = useAppTheme();
  const styles = useStyles((appTheme) => ({
    surface: { width: '100%' },
    card: { gap: 8, padding: 12 },
    answer: { ...appTheme.textVariants.body, color: appTheme.colors.foreground },
  }));
  const resultState = isResultState(state) ? state : undefined;

  return (
    <Animated.View
      accessibilityLabel={
        accessibilityLabel ??
        (resultState?.kind === 'draft'
          ? resultState.block.primary_intent === 'add_task'
            ? 'Draft task ready'
            : 'Draft event ready'
          : undefined)
      }
      entering={reducedMotion ? FadeIn.duration(180) : FadeInUp.duration(220)}
      exiting={reducedMotion ? FadeOut.duration(140) : FadeOutDown.duration(180)}
      style={styles.surface}
      testID={testID}
    >
      <Card
        style={[
          styles.card,
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
          style={{ maxHeight: 320 }}
        >
          {resultState ? (
            <TimeResultContent
              isSaving={isSaving}
              onCancel={onCancel}
              onChooseEvent={onChooseEvent}
              onChooseOpening={onChooseOpening}
              onEditField={onEditField}
              onSubmitDraft={onSubmitDraft}
              state={resultState}
              answerStyle={styles.answer}
            />
          ) : (
            children
          )}
        </ScrollView>
      </Card>
    </Animated.View>
  );
}

function TimeResultContent({
  state,
  answerStyle,
  ...actions
}: Omit<TimeResultSurfaceProps, 'accessibilityLabel' | 'children' | 'state' | 'testID'> & {
  answerStyle: object;
  state: ResultState;
}) {
  switch (state.kind) {
    case 'answer':
      return <Text style={answerStyle}>{state.answer}</Text>;
    case 'event-choice':
      return <TimeEventChoiceResult candidates={state.candidates} {...actions} />;
    case 'availability':
      return <TimeAvailabilityResult openings={state.openings} {...actions} />;
    case 'draft':
      return <TimeDraftResult block={state.block} {...actions} />;
  }
}

function isResultState(state: TimeInteractionState | undefined): state is ResultState {
  return state !== undefined && state.kind !== 'idle' && state.kind !== 'parsing';
}
