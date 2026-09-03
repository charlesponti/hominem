// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CalendarEvent } from '~/modules/on-device-ai';

vi.mock('react-native', () => ({
  Pressable: ({
    children,
    onPress,
    testID,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    testID: string;
  }) => (
    <button data-testid={testID} onClick={onPress}>
      {children}
    </button>
  ),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('~/components/theme', () => ({
  useStyles: (
    factory: (theme: {
      colors: Record<string, string>;
      textVariants: Record<string, object>;
    }) => unknown,
  ) => factory({ colors: { mutedForeground: '' }, textVariants: { body: {}, headline: {} } }),
}));
vi.mock('~/components/ui', () => ({
  IconButton: ({
    children,
    onPress,
    testID,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    testID: string;
  }) => (
    <button data-testid={testID} onClick={onPress}>
      {children}
    </button>
  ),
}));
vi.mock('~/components/ui/icon', () => ({ default: () => null }));

const { TimeEventChoiceResult } = await import('~/components/time/TimeEventChoiceResult');

const event: CalendarEvent = {
  calendarTitle: null,
  endDate: '2026-09-03T11:00:00.000Z',
  id: 'event-1',
  isAllDay: false,
  isEditable: true,
  location: null,
  notes: null,
  participants: [],
  recurrenceDescription: null,
  startDate: '2026-09-03T10:00:00.000Z',
  title: 'Planning',
};

describe('TimeEventChoiceResult', () => {
  it('chooses the selected event and supports cancellation', () => {
    const onChooseEvent = vi.fn();
    const onCancel = vi.fn();
    const { getAllByTestId, getByTestId } = render(
      <TimeEventChoiceResult
        candidates={[event]}
        onCancel={onCancel}
        onChooseEvent={onChooseEvent}
      />,
    );

    fireEvent.click(getAllByTestId('time-event-choice')[0]);
    fireEvent.click(getByTestId('time-event-choice-cancel'));

    expect(onChooseEvent).toHaveBeenCalledWith('event-1');
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
