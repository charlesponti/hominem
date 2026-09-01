// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Message,
  MessageAction,
  MessageActions,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageResponse,
} from './message';

afterEach(cleanup);

describe('Message', () => {
  it('marks user messages as is-user and assistant messages as is-assistant', () => {
    const { container: userContainer } = render(<Message from="user">Hi</Message>);
    expect(userContainer.querySelector('.is-user')).toBeTruthy();
    cleanup();

    const { container: assistantContainer } = render(<Message from="assistant">Hi</Message>);
    expect(assistantContainer.querySelector('.is-assistant')).toBeTruthy();
  });
});

describe('MessageResponse', () => {
  it('renders markdown content', () => {
    render(<MessageResponse>**bold text**</MessageResponse>);
    expect(screen.getByText('bold text').getAttribute('data-streamdown')).toBe('strong');
  });
});

describe('MessageAction', () => {
  it('fires onClick and exposes an accessible label via tooltip', () => {
    const onClick = vi.fn();
    render(
      <MessageAction onClick={onClick} tooltip="Copy message">
        icon
      </MessageAction>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('MessageBranch', () => {
  function Branches() {
    return (
      <MessageBranch>
        <MessageBranchContent>
          <div key="a">Branch A</div>
          <div key="b">Branch B</div>
        </MessageBranchContent>
        <MessageBranchSelector>
          <MessageBranchPrevious />
          <MessageBranchPage />
          <MessageBranchNext />
        </MessageBranchSelector>
      </MessageBranch>
    );
  }

  it('shows only the current branch and reports the page count', () => {
    render(<Branches />);

    expect(screen.getByText('Branch A').closest('div')?.className).not.toContain('hidden');
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('cycles to the next and previous branch', () => {
    render(<Branches />);

    fireEvent.click(screen.getByRole('button', { name: 'Next branch' }));
    expect(screen.getByText('2 of 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous branch' }));
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('hides the selector entirely when there is only one branch', () => {
    render(
      <MessageBranch>
        <MessageBranchContent>
          <div key="only">Only branch</div>
        </MessageBranchContent>
        <MessageBranchSelector data-testid="selector" />
      </MessageBranch>,
    );

    expect(screen.queryByTestId('selector')).toBeNull();
  });
});

describe('MessageActions', () => {
  it('renders its children', () => {
    render(
      <MessageActions>
        <span>action one</span>
      </MessageActions>,
    );
    expect(screen.getByText('action one')).toBeTruthy();
  });
});
