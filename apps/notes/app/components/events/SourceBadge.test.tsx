import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import SourceBadge from './SourceBadge'

describe('SourceBadge', () => {
  it('should render Google Calendar badge', () => {
    render(<SourceBadge source="google_calendar" />)
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('should render Manual badge', () => {
    render(<SourceBadge source="manual" />)
    expect(screen.getByText(/Manual/)).toBeInTheDocument()
  })

  it('should have correct title for Google Calendar', () => {
    render(<SourceBadge source="google_calendar" />)
    const badge = screen.getByTitle('Synced from Google Calendar')
    expect(badge).toBeInTheDocument()
  })

  it('should have correct title for Manual', () => {
    render(<SourceBadge source="manual" />)
    const badge = screen.getByTitle('Manually created')
    expect(badge).toBeInTheDocument()
  })
})
