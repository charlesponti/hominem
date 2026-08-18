// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ChatMotionOverlayProvider,
  useChatMotionOverlay,
} from '~/components/chat/chat-motion-overlay';

function Consumer({ id, label }: { id: string; label: string }) {
  const { present, dismiss } = useChatMotionOverlay();

  return (
    <>
      <button onClick={() => present(id, <span data-testid={`flight-${id}`}>{label}</span>)}>
        present-{id}
      </button>
      <button onClick={() => dismiss(id)}>dismiss-{id}</button>
      <button onClick={() => dismiss('never-presented')}>dismiss-unknown</button>
    </>
  );
}

describe('ChatMotionOverlayProvider', () => {
  it('no-ops when useChatMotionOverlay is used outside the provider', () => {
    render(<Consumer id="a" label="A" />);

    expect(() => {
      act(() => {
        screen.getByText('present-a').click();
      });
    }).not.toThrow();
    expect(screen.queryByTestId('flight-a')).toBeNull();
  });

  it('mounts a presented flight node into the overlay', () => {
    render(
      <ChatMotionOverlayProvider>
        <Consumer id="toast" label="Toast" />
      </ChatMotionOverlayProvider>,
    );

    expect(screen.queryByTestId('flight-toast')).toBeNull();

    act(() => {
      screen.getByText('present-toast').click();
    });

    expect(screen.getByTestId('flight-toast').textContent).toBe('Toast');
  });

  it('replaces the node when presenting the same id again', () => {
    render(
      <ChatMotionOverlayProvider>
        <Consumer id="toast" label="First" />
      </ChatMotionOverlayProvider>,
    );

    act(() => {
      screen.getByText('present-toast').click();
    });
    expect(screen.getByTestId('flight-toast').textContent).toBe('First');

    act(() => {
      screen.getByText('present-toast').click();
    });
    expect(screen.getAllByTestId('flight-toast')).toHaveLength(1);
  });

  it('unmounts the flight node on dismiss, and dismissing an unknown id is a no-op', () => {
    render(
      <ChatMotionOverlayProvider>
        <Consumer id="toast" label="Toast" />
      </ChatMotionOverlayProvider>,
    );

    act(() => {
      screen.getByText('present-toast').click();
    });
    expect(screen.queryByTestId('flight-toast')).not.toBeNull();

    act(() => {
      screen.getByText('dismiss-unknown').click();
    });
    expect(screen.queryByTestId('flight-toast')).not.toBeNull();

    act(() => {
      screen.getByText('dismiss-toast').click();
    });
    expect(screen.queryByTestId('flight-toast')).toBeNull();
  });

  it('keeps independent flights isolated by id', () => {
    render(
      <ChatMotionOverlayProvider>
        <Consumer id="a" label="A" />
        <Consumer id="b" label="B" />
      </ChatMotionOverlayProvider>,
    );

    act(() => {
      screen.getByText('present-a').click();
      screen.getByText('present-b').click();
    });
    expect(screen.getByTestId('flight-a').textContent).toBe('A');
    expect(screen.getByTestId('flight-b').textContent).toBe('B');

    act(() => {
      screen.getByText('dismiss-a').click();
    });
    expect(screen.queryByTestId('flight-a')).toBeNull();
    expect(screen.queryByTestId('flight-b')).not.toBeNull();
  });
});
