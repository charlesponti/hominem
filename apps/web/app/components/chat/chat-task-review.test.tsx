// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatTaskReview } from './chat-task-review';

const tasks = [
  { id: 'task-1', title: 'Send the brief', description: 'Email the project brief.' },
  { id: 'task-2', title: 'Book review' },
];

describe('ChatTaskReview', () => {
  it('accepts selected tasks and supports rejection', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <ChatTaskReview
        isSaving={false}
        onAccept={onAccept}
        onReject={onReject}
        onRetry={() => undefined}
        tasks={tasks}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject Book review' }));
    expect(onReject).toHaveBeenCalledWith('task-2');
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected' }));
    expect(onAccept).toHaveBeenCalledWith(tasks);
  });

  it('exposes retry after an extraction or persistence error', () => {
    const onRetry = vi.fn();
    render(
      <ChatTaskReview
        error="Task extraction failed"
        isSaving={false}
        onAccept={() => undefined}
        onReject={() => undefined}
        onRetry={onRetry}
        tasks={tasks}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
