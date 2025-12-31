import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SyncButton from './SyncButton'

describe('SyncButton', () => {
  it('should render with default text', () => {
    const mockSync = vi.fn()
    render(<SyncButton onSync={mockSync} />)
    expect(screen.getByRole('button', { name: /Sync Google Calendar/ })).toBeInTheDocument()
  })

  it('should call onSync when clicked', async () => {
    const mockSync = vi.fn().mockResolvedValue(undefined)
    render(<SyncButton onSync={mockSync} />)

    const button = screen.getByRole('button', { name: /Sync Google Calendar/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockSync).toHaveBeenCalledTimes(1)
    })
  })

  it('should show syncing state', async () => {
    const mockSync = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)))
    render(<SyncButton onSync={mockSync} />)

    const button = screen.getByRole('button', { name: /Sync Google Calendar/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Syncing\.\.\./ })).toBeInTheDocument()
    })
  })

  it('should be disabled when disabled prop is true', () => {
    const mockSync = vi.fn()
    render(<SyncButton onSync={mockSync} disabled={true} />)

    const button = screen.getByRole('button', { name: /Sync Google Calendar/ })
    expect(button).toBeDisabled()
  })

  it('should not call onSync when disabled', () => {
    const mockSync = vi.fn()
    render(<SyncButton onSync={mockSync} disabled={true} />)

    const button = screen.getByRole('button', { name: /Sync Google Calendar/ })
    fireEvent.click(button)

    expect(mockSync).not.toHaveBeenCalled()
  })
})
