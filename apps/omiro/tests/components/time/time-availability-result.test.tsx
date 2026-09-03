// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

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

const { TimeAvailabilityResult } = await import('~/components/time/TimeAvailabilityResult');

describe('TimeAvailabilityResult', () => {
  it('shows the first three openings, selects one, and supports cancellation', () => {
    const onChooseOpening = vi.fn();
    const onCancel = vi.fn();
    const openings = [0, 1, 2, 3].map((hour) => ({
      start: `2026-09-03T${String(9 + hour).padStart(2, '0')}:00:00.000Z`,
      end: `2026-09-03T${String(10 + hour).padStart(2, '0')}:00:00.000Z`,
    }));
    const { getAllByTestId, getByTestId } = render(
      <TimeAvailabilityResult
        openings={openings}
        onCancel={onCancel}
        onChooseOpening={onChooseOpening}
      />,
    );

    expect(getAllByTestId('time-availability-opening')).toHaveLength(3);
    fireEvent.click(getAllByTestId('time-availability-opening')[1]);
    fireEvent.click(getByTestId('time-availability-cancel'));

    expect(onChooseOpening).toHaveBeenCalledWith(openings[1]);
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
