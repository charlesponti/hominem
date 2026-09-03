// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TimeBlock } from '~/components/time/time-types';

vi.mock('react-native', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('~/components/theme', () => ({
  useStyles: (
    factory: (theme: {
      borderRadii: Record<string, number>;
      colors: Record<string, string>;
      textVariants: Record<string, object>;
    }) => unknown,
  ) =>
    factory({
      borderRadii: { sm: 4 },
      colors: { border: '', muted: '', mutedForeground: '' },
      textVariants: { body: {}, caption1: {} },
    }),
  withAlpha: (color: string) => color,
}));
vi.mock('~/components/ui', () => ({
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
    testID,
    value,
  }: {
    onChangeText?: (value: string) => void;
    testID: string;
    value: string;
  }) => (
    <input
      data-testid={testID}
      value={value}
      onChange={(event) => onChangeText?.(event.target.value)}
    />
  ),
}));
vi.mock('~/components/ui/icon', () => ({ default: () => null }));

const { TimeDraftResult } = await import('~/components/time/TimeDraftResult');

const block: TimeBlock = {
  deadline_fixed: null,
  duration: null,
  end_time: null,
  location: null,
  participants: null,
  primary_intent: 'add_task',
  recurrence_rule: null,
  scheduling_window_end: null,
  scheduling_window_start: null,
  start_time: null,
  target_title: null,
  title: 'Buy milk',
};

describe('TimeDraftResult', () => {
  it('edits, submits, and cancels a task draft', () => {
    const onEditField = vi.fn();
    const onSubmitDraft = vi.fn();
    const onCancel = vi.fn();
    const { getByTestId } = render(
      <TimeDraftResult
        block={block}
        onCancel={onCancel}
        onEditField={onEditField}
        onSubmitDraft={onSubmitDraft}
      />,
    );

    fireEvent.change(getByTestId('time-draft-edit-title'), { target: { value: 'Buy bread' } });
    fireEvent.click(getByTestId('time-draft-submit'));
    fireEvent.click(getByTestId('time-draft-cancel'));

    expect(onEditField).toHaveBeenCalledWith('title', 'Buy bread');
    expect(onSubmitDraft).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
