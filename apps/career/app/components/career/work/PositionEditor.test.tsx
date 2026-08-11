import '@testing-library/jest-dom';
import type { CareerEngagementRecord } from '@hominem/db';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PositionEditor } from './PositionEditor';

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    Form: ({ children, ...props }: ComponentProps<'form'> & { children?: ReactNode }) => (
      <form {...props}>{children}</form>
    ),
    useNavigation: () => ({ state: 'idle' }),
  };
});

function makePosition(overrides: Partial<CareerEngagementRecord> = {}): CareerEngagementRecord {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    ownerUserid: 'test-user',
    company: 'Hominem',
    title: 'Project',
    address: null,
    description: null,
    location: null,
    startDate: null,
    endDate: null,
    isCurrent: false,
    salaryLow: null,
    salaryHigh: null,
    currency: 'USD',
    kind: 'EMPLOYMENT',
    url: null,
    contactName: null,
    contactPhone: null,
    source: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    reasonForLeaving: null,
    ...overrides,
  };
}

function formData(): FormData {
  const form = document.querySelector('form');
  if (!form) throw new Error('position form not found');
  return new FormData(form);
}

describe('PositionEditor', () => {
  it('calls onCancel without submitting the form', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PositionEditor onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('marks the form as an update when editing an existing position', () => {
    render(<PositionEditor position={makePosition()} />);

    const data = formData();

    expect(data.get('intent')).toBe('update-position');
    expect(data.get('id')).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('does not include update fields when creating a position', () => {
    render(<PositionEditor />);

    const data = formData();

    expect(data.get('intent')).toBeNull();
    expect(data.get('id')).toBeNull();
  });
});
