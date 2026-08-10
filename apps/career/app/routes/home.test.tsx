import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Route } from './+types/home';
import Home from './home';

const emptyStats = {
  totalApplications: 0,
  activeApplications: 0,
  rejectedApplications: 0,
  offerCount: 0,
  offerRate: 0,
  employmentPositions: 0,
  targetRoles: 0,
  statusBreakdown: [],
  sourcePerformance: [],
  topCompanies: [],
  monthlyActivity: [],
  salaryHistory: [],
};

function renderHome(authenticated: boolean) {
  render(
    <MemoryRouter>
      <Home
        {...({
          params: {},
          matches: [],
        } as unknown as Route.ComponentProps)}
        loaderData={
          authenticated
            ? { authenticated: true as const, stats: emptyStats }
            : { authenticated: false as const }
        }
      />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('renders the workspace when authenticated', () => {
    renderHome(true);

    expect(screen.getByText('Your career workspace')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders the landing page when unauthenticated', () => {
    renderHome(false);

    expect(screen.getByText('Keep your job search from scattering.')).toBeInTheDocument();
    expect(screen.getByText('Get started')).toBeInTheDocument();
  });
});
