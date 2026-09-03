// @vitest-environment jsdom
import { render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  ScrollView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('react-native-reanimated', () => ({
  default: {
    View: ({ children, testID }: { children: React.ReactNode; testID: string }) => (
      <div data-testid={testID}>{children}</div>
    ),
  },
  FadeIn: { duration: () => ({}) },
  FadeInUp: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  FadeOutDown: { duration: () => ({}) },
  useReducedMotion: () => true,
}));
vi.mock('~/components/theme', () => ({
  useAppTheme: () => ({ shadows: { none: {} } }),
  useStyles: (
    factory: (theme: {
      colors: Record<string, string>;
      textVariants: Record<string, object>;
    }) => unknown,
  ) => factory({ colors: { foreground: '' }, textVariants: { body: {} } }),
}));
vi.mock('~/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock('~/components/time/TimeAvailabilityResult', () => ({
  TimeAvailabilityResult: () => <div data-testid="availability-result" />,
}));
vi.mock('~/components/time/TimeDraftResult', () => ({
  TimeDraftResult: () => <div data-testid="draft-result" />,
}));
vi.mock('~/components/time/TimeEventChoiceResult', () => ({
  TimeEventChoiceResult: () => <div data-testid="event-choice-result" />,
}));

const { TimeResultSurface } = await import('~/components/time/TimeResultSurface');

describe('TimeResultSurface', () => {
  it('renders answer state in its result surface', () => {
    const { getByTestId, getByText } = render(
      <TimeResultSurface state={{ kind: 'answer', answer: 'You are free.' }} testID="result" />,
    );

    expect(getByTestId('result')).toBeDefined();
    expect(getByText('You are free.')).toBeDefined();
  });

  it('renders supplied children for the parsing surface', () => {
    const { getByText } = render(
      <TimeResultSurface testID="parsing">
        <span>Loading</span>
      </TimeResultSurface>,
    );

    expect(getByText('Loading')).toBeDefined();
  });
});
