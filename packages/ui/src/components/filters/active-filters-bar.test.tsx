import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { render, screen } from '../../test-utils';
import { type ActiveFilter, ActiveFiltersBar } from './active-filters-bar';

describe('ActiveFiltersBar', () => {
  test('renders multiple filter chips', () => {
    const filters: ActiveFilter[] = [
      { id: '1', label: 'Filter 1', onRemove: vi.fn() },
      { id: '2', label: 'Filter 2', onRemove: vi.fn() },
      { id: '3', label: 'Filter 3', onRemove: vi.fn() },
    ];

    render(<ActiveFiltersBar filters={filters} />);

    expect(screen.getByText('Filter 1')).toBeInTheDocument();
    expect(screen.getByText('Filter 2')).toBeInTheDocument();
    expect(screen.getByText('Filter 3')).toBeInTheDocument();
  });

  test('renders nothing when filters array is empty', () => {
    const { container } = render(<ActiveFiltersBar filters={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('calls onRemove when filter chip remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove1 = vi.fn();
    const onRemove2 = vi.fn();
    const filters: ActiveFilter[] = [
      { id: '1', label: 'Filter 1', onRemove: onRemove1 },
      { id: '2', label: 'Filter 2', onRemove: onRemove2 },
    ];

    render(<ActiveFiltersBar filters={filters} />);

    const removeButton = screen.getByLabelText('Remove filter: Filter 1');
    await user.click(removeButton);

    expect(onRemove1).toHaveBeenCalledTimes(1);
    expect(onRemove2).not.toHaveBeenCalled();
  });

  test('calls onClick when filter chip is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const filters: ActiveFilter[] = [{ id: '1', label: 'Filter 1', onRemove: vi.fn(), onClick }];

    render(<ActiveFiltersBar filters={filters} />);

    const chip = screen.getByText('Filter 1').closest('div');
    if (chip) {
      await user.click(chip);
    }

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('displays label when provided', () => {
    const filters: ActiveFilter[] = [{ id: '1', label: 'Filter 1', onRemove: vi.fn() }];

    render(<ActiveFiltersBar filters={filters} label="Active filters:" />);

    expect(screen.getByText('Active filters:')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const filters: ActiveFilter[] = [{ id: '1', label: 'Filter 1', onRemove: vi.fn() }];

    const { container } = render(<ActiveFiltersBar filters={filters} className="custom-class" />);

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });
});
