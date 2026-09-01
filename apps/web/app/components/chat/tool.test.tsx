// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tool, ToolApprovalActions, ToolContent, ToolHeader, ToolInput, ToolPreview } from './tool';

afterEach(cleanup);

describe('ToolHeader', () => {
  it.each([
    ['pending', 'Awaiting Approval'],
    ['completed', 'Completed'],
    ['rejected', 'Denied'],
    ['failed', 'Error'],
  ] as const)('shows "%s" as "%s"', (status, label) => {
    render(
      <Tool>
        <ToolHeader status={status} toolName="delete_note" />
      </Tool>,
    );
    expect(screen.getByRole('img', { name: label })).toBeTruthy();
  });

  it('treats an undefined status as completed', () => {
    render(
      <Tool>
        <ToolHeader status={undefined} toolName="delete_note" />
      </Tool>,
    );
    expect(screen.getByRole('img', { name: 'Completed' })).toBeTruthy();
  });

  it('falls back to the tool name when no title is given', () => {
    render(
      <Tool>
        <ToolHeader status="completed" toolName="delete_note" />
      </Tool>,
    );
    expect(screen.getByText('delete_note')).toBeTruthy();
  });

  it('prefers an explicit title over the tool name', () => {
    render(
      <Tool>
        <ToolHeader status="completed" title="Delete a note" toolName="delete_note" />
      </Tool>,
    );
    expect(screen.getByText('Delete a note')).toBeTruthy();
    expect(screen.queryByText('delete_note')).toBeNull();
  });
});

describe('Tool', () => {
  it('expands and collapses when the header is clicked', () => {
    render(
      <Tool>
        <ToolHeader status="completed" toolName="search_notes" />
        <ToolContent>
          <ToolInput input={{ query: 'quarterly planning' }} />
        </ToolContent>
      </Tool>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger.getAttribute('data-state')).toBe('closed');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('opens by default when defaultOpen is set', () => {
    render(
      <Tool defaultOpen>
        <ToolHeader status="pending" toolName="delete_note" />
        <ToolContent>
          <ToolInput input={{ noteId: 'note-1' }} />
        </ToolContent>
      </Tool>,
    );

    expect(screen.getByRole('button').getAttribute('data-state')).toBe('open');
  });
});

describe('ToolInput', () => {
  it('renders the call arguments as formatted JSON', () => {
    render(<ToolInput input={{ noteId: 'note-1' }} />);
    expect(screen.getByText(/"noteId": "note-1"/)).toBeTruthy();
  });
});

describe('ToolPreview', () => {
  it('formats camelCase keys into readable labels', () => {
    render(<ToolPreview preview={{ wordCount: 240 }} />);
    expect(screen.getByText('Word Count')).toBeTruthy();
    expect(screen.getByText('240')).toBeTruthy();
  });

  it('renders an em dash for empty values', () => {
    render(<ToolPreview preview={{ title: '' }} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});

describe('ToolApprovalActions', () => {
  it('calls onApprove and onReject', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<ToolApprovalActions onApprove={onApprove} onReject={onReject} />);

    fireEvent.click(screen.getByRole('button', { name: 'Approve tool action' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject tool action' }));

    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('disables both buttons when disabled', () => {
    render(<ToolApprovalActions disabled onApprove={vi.fn()} onReject={vi.fn()} />);

    expect(
      (screen.getByRole('button', { name: 'Approve tool action' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Reject tool action' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
