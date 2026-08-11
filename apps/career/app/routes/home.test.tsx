import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Route } from './+types/home';
import Home from './home';

function renderHome(loaderData: unknown) {
  render(
    <MemoryRouter>
      <Home
        {...({
          params: {},
          matches: [],
          loaderData,
        } as unknown as Route.ComponentProps)}
      />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('renders empty prompts when authenticated with no history', () => {
    renderHome({ authenticated: true, engagements: [], projects: [] });

    expect(screen.getByText('Work history')).toBeInTheDocument();
    expect(screen.getByText('No positions yet')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  it('renders a summary of work and project history when authenticated', () => {
    renderHome({
      authenticated: true,
      engagements: [
        {
          id: 'eng-1',
          title: 'Staff Engineer',
          company: 'Acme Corp',
          startDate: '2023-01-01',
          endDate: null,
          isCurrent: true,
        },
      ],
      projects: [
        {
          id: 'proj-1',
          title: 'Career Tracker',
          organization: null,
          shortDescription: 'A private workspace for job seekers.',
          startDate: '2024-01-01',
          endDate: null,
        },
      ],
    });

    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Career Tracker')).toBeInTheDocument();
  });

  it('renders the landing page when unauthenticated', () => {
    renderHome({ authenticated: false });

    expect(screen.getByText('Keep your job search from scattering.')).toBeInTheDocument();
    expect(screen.getByText('Get started')).toBeInTheDocument();
  });
});
