// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('~/components/theme', () => ({
  useStyles: (factory: (theme: object) => unknown) => factory({}),
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

const { CancelRow } = await import('~/components/time/TimeResultActions');

describe('CancelRow', () => {
  it('invokes its cancel callback', () => {
    const onCancel = vi.fn();
    const { getByTestId } = render(<CancelRow testID="cancel" onCancel={onCancel} />);

    fireEvent.click(getByTestId('cancel'));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
