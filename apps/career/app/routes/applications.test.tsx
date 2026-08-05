import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { makeApplication } from '~/test/factories/applications';
import { JobApplicationStatus } from '~/types/career';

import type { Route } from './+types/applications';
import Applications from './applications';

describe('Applications route', () => {
  it('renders the applications table with records', () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <Applications
          {...({
            params: {},
            matches: [],
          } as unknown as Route.ComponentProps)}
          loaderData={{
            applications: [
              makeApplication({
                id: 'application-1',
                title: 'Staff Engineer',
                status: JobApplicationStatus.INTERVIEW,
                source: 'linkedin',
                applicationDate: new Date('2024-01-15T00:00:00.000Z').toISOString(),
                responseDate: new Date('2024-01-20T00:00:00.000Z').toISOString(),
                firstInterviewDate: new Date('2024-01-25T00:00:00.000Z').toISOString(),
                company: 'Example Co',
              }),
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Staff Engineer').length).toBeGreaterThan(0);
    expect(screen.getByText('Applications')).toBeInTheDocument();
  });

  it('shows empty state when there are no applications', () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <Applications
          {...({
            params: {},
            matches: [],
          } as unknown as Route.ComponentProps)}
          loaderData={{
            applications: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });
});
