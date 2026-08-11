import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FilterOption } from '~/lib/career/queries/job-applications';

import { JobApplicationStatusSelect } from './JobApplicationStatusSelect';

let mockOnValueChange: ((value: string) => void) | null = null;

interface MockSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

interface MockItemProps {
  value: string;
  children?: ReactNode;
}

vi.mock('@ponti-studios/ui/forms', () => ({
  Select: ({ value, onValueChange, children }: MockSelectProps) => {
    mockOnValueChange = onValueChange ?? null;
    return (
      <div data-testid="status-select" data-value={value}>
        {children}
      </div>
    );
  },
  SelectTrigger: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: MockItemProps) => (
    <button type="button" data-value={value} onClick={() => mockOnValueChange?.(value)}>
      {children}
    </button>
  ),
}));

function makeOptions(extra: FilterOption[] = []): FilterOption[] {
  return [
    { value: 'APPLIED', label: 'APPLIED (2)' },
    { value: 'REJECTED', label: 'REJECTED (1)' },
    ...extra,
  ];
}

describe('JobApplicationStatusSelect', () => {
  it('renders the provided options', () => {
    render(<JobApplicationStatusSelect options={makeOptions()} value="" onValueChange={vi.fn()} />);

    expect(screen.getByText('APPLIED (2)')).toBeInTheDocument();
    expect(screen.getByText('REJECTED (1)')).toBeInTheDocument();
    expect(screen.getByText('All statuses')).toBeInTheDocument();
  });

  it('renders the value and marks it in the trigger', () => {
    render(
      <JobApplicationStatusSelect
        options={makeOptions()}
        value="APPLIED"
        onValueChange={vi.fn()}
      />,
    );

    const select = screen.getByTestId('status-select');
    expect(select).toHaveAttribute('data-value', 'APPLIED');
  });

  it('reports the selected status through onValueChange', async () => {
    const onValueChange = vi.fn();
    render(
      <JobApplicationStatusSelect options={makeOptions()} value="" onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByText('APPLIED (2)'));

    expect(onValueChange).toHaveBeenCalledWith('APPLIED');
  });
});
