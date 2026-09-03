// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAsk = vi.fn();
const mockSetPrompt = vi.fn();
const mockHandleVoicePress = vi.fn();
let prompt = '';

vi.mock('react-native', () => ({
  ActivityIndicator: () => <div />,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  useReducedMotion: () => true,
}));
vi.mock('~/components/theme', () => ({
  useAppTheme: () => ({ colors: { primary: '' }, shadows: { none: {} } }),
  useStyles: (factory: (theme: { colors: Record<string, string> }) => unknown) =>
    factory({ colors: { border: '' } }),
}));
vi.mock('~/components/ui', () => ({
  Card: ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
    <section data-testid={testID}>{children}</section>
  ),
  IconButton: ({
    children,
    disabled,
    onPress,
    testID,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onPress?: () => void;
    testID: string;
  }) => (
    <button data-testid={testID} disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
  TextField: ({
    onChangeText,
    onSubmitEditing,
    testID,
    value,
  }: {
    onChangeText?: (value: string) => void;
    onSubmitEditing?: () => void;
    testID: string;
    value: string;
  }) => (
    <input
      data-testid={testID}
      value={value}
      onChange={(event) => onChangeText?.(event.target.value)}
      onKeyDown={(event) => event.key === 'Enter' && onSubmitEditing?.()}
    />
  ),
}));
vi.mock('~/components/ui/icon', () => ({ default: () => null }));
vi.mock('~/components/composer/useVoiceComposerInput', () => ({
  useVoiceComposerInput: () => ({
    isBusy: false,
    isRecording: false,
    isRecordingElsewhere: false,
    handleVoicePress: mockHandleVoicePress,
  }),
}));
vi.mock('~/components/voice/VoiceRecordingPanel', () => ({ VoiceRecordingPanel: () => <div /> }));
vi.mock('~/components/time/use-time-composer', () => ({
  useTimeComposer: () => ({
    ask: mockAsk,
    cancelResult: vi.fn(),
    chooseEvent: vi.fn(),
    chooseOpening: vi.fn(),
    interaction: { kind: 'idle' },
    isSaving: false,
    prompt,
    setPrompt: mockSetPrompt,
    submitDraft: vi.fn(),
    updateDraft: vi.fn(),
  }),
}));
vi.mock('~/components/time/TimeResultSurface', () => ({
  TimeResultSurface: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('~/translations', () => ({ default: { timeResult: { fieldLabels: { title: 'Title' } } } }));

const { TimeComposer } = await import('~/components/time/TimeComposer');

describe('TimeComposer', () => {
  beforeEach(() => {
    prompt = 'Plan tomorrow';
    vi.clearAllMocks();
  });

  it('forwards input, submit, and voice actions to its controller hooks', () => {
    const { getByTestId } = render(<TimeComposer onOpenEvent={vi.fn()} />);

    fireEvent.change(getByTestId('time-composer-input'), { target: { value: 'Plan today' } });
    fireEvent.click(getByTestId('time-composer-submit'));
    fireEvent.click(getByTestId('time-composer-mic-button'));

    expect(mockSetPrompt).toHaveBeenCalledWith('Plan today');
    expect(mockAsk).toHaveBeenCalledOnce();
    expect(mockHandleVoicePress).toHaveBeenCalledOnce();
  });
});
