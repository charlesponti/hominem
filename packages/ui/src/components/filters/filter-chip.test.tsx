import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '../../test-utils'
import { FilterChip } from './filter-chip'

describe('FilterChip', () => {
  test('renders with label', () => {
    const onRemove = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} />)
    expect(screen.getByText('Test Filter')).toBeInTheDocument()
  })

  test('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} />)

    const removeButton = screen.getByLabelText('Remove filter: Test Filter')
    await user.click(removeButton)

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  test('calls onClick when chip is clicked', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    const onClick = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} onClick={onClick} />)

    const chip = screen.getByText('Test Filter').closest('div')
    if (chip) {
      await user.click(chip)
    }

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onRemove).not.toHaveBeenCalled()
  })

  test('handles keyboard navigation with Enter key', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    const onClick = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} onClick={onClick} />)

    const chip = screen.getByText('Test Filter').closest('div')
    if (chip) {
      chip.focus()
      await user.keyboard('{Enter}')
    }

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('handles keyboard navigation with Space key', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    const onClick = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} onClick={onClick} />)

    const chip = screen.getByText('Test Filter').closest('div')
    if (chip) {
      chip.focus()
      await user.keyboard(' ')
    }

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('has proper accessibility attributes', () => {
    const onRemove = vi.fn()
    const onClick = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} onClick={onClick} />)

    const chip = screen.getByText('Test Filter').closest('div')
    expect(chip).toHaveAttribute('role', 'button')
    expect(chip).toHaveAttribute('tabIndex', '0')
    expect(screen.getByLabelText('Remove filter: Test Filter')).toBeInTheDocument()
  })

  test('does not have button role when onClick is not provided', () => {
    const onRemove = vi.fn()
    render(<FilterChip label="Test Filter" onRemove={onRemove} />)

    const chip = screen.getByText('Test Filter').closest('div')
    expect(chip).not.toHaveAttribute('role', 'button')
  })
})
