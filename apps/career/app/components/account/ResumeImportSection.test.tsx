import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AccountDocumentFile } from '~/lib/account/types';

import { ResumeImportSection } from './ResumeImportSection';

const routerState = vi.hoisted(() => ({
  params: new URLSearchParams(),
  revalidate: vi.fn(),
  setSearchParams: vi.fn(
    (update: URLSearchParams | ((params: URLSearchParams) => URLSearchParams)) => {
      routerState.params = typeof update === 'function' ? update(routerState.params) : update;
    },
  ),
}));

vi.mock('react-router', () => ({
  useRevalidator: () => ({ revalidate: routerState.revalidate }),
  useSearchParams: () => [routerState.params, routerState.setSearchParams],
}));

class TestEventSource {
  static instances: TestEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    TestEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(event: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(event) }));
  }
}

const documents: AccountDocumentFile[] = [];

function currentEventSource() {
  const eventSource = TestEventSource.instances[0];
  if (!eventSource) throw new Error('EventSource was not created');
  return eventSource;
}

describe('ResumeImportSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestEventSource.instances = [];
    routerState.params = new URLSearchParams();
    routerState.revalidate.mockReset();
    vi.unstubAllGlobals();
  });

  it('starts analysis from the upload trigger and renders review after SSE completion', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ jobId: 'job-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('EventSource', TestEventSource);

    render(<ResumeImportSection documents={documents} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /upload new resume/i }));

    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('file input not found');
    fireEvent.change(input, {
      target: { files: [new File(['resume'], 'resume.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze resume/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/resume/analyze', expect.anything()),
    );
    await waitFor(() => expect(currentEventSource().url).toBe('/api/resume/jobs/job-1/stream'));

    const diff = {
      portfolioSlugProposed: 'jane-doe',
      scalarChanges: [],
      listChanges: [
        { key: 'work-1', group: 'workExperience', summary: 'Staff Engineer', payload: {} },
      ],
    };
    currentEventSource().emit({
      jobId: 'job-1',
      stage: 'done',
      label: 'Ready to review',
      percent: 100,
      diff,
    });

    expect(await screen.findByText('Review changes')).toBeInTheDocument();
    expect(screen.getByLabelText('Staff Engineer')).toBeChecked();
  });

  it('applies selected changes and discards the review state', async () => {
    routerState.params = new URLSearchParams('resumeJobId=job-1');
    vi.stubGlobal('EventSource', TestEventSource);
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<ResumeImportSection documents={documents} onDelete={vi.fn()} />);
    const diff = {
      portfolioSlugProposed: 'jane-doe',
      scalarChanges: [],
      listChanges: [
        { key: 'work-1', group: 'workExperience', summary: 'Staff Engineer', payload: {} },
      ],
    };
    currentEventSource().emit({
      jobId: 'job-1',
      stage: 'done',
      label: 'Ready to review',
      percent: 100,
      diff,
    });

    await screen.findByText('Review changes');
    fireEvent.click(screen.getByRole('button', { name: /apply selected updates/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/profile', expect.anything()));
    expect(routerState.revalidate).toHaveBeenCalled();
    expect(screen.queryByText('Review changes')).not.toBeInTheDocument();
  });
});
