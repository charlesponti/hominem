import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SourceBadge from './SourceBadge';

describe('SourceBadge', () => {
  it('should render Google Calendar badge', () => {
    render(<SourceBadge source="google_calendar" />);
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('should render Manual badge', () => {
    render(<SourceBadge source="manual" />);
    expect(screen.getByText(/Manual/)).toBeInTheDocument();
  });

  it('should have correct title for Google Calendar', () => {
    render(<SourceBadge source="google_calendar" />);
    const badges = screen.getAllByTitle('Synced from Google Calendar');
    const spanBadge = badges.find((el) => el.tagName === 'SPAN');
    expect(spanBadge).toBeDefined();
    expect(spanBadge).toHaveAttribute('title', 'Synced from Google Calendar');
  });

  it('should have correct title for Manual', () => {
    render(<SourceBadge source="manual" />);
    const badge = screen.getByTitle('Manually created');
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe('SPAN');
  });
});
