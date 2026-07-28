import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { makeApplicationWithCompany } from '~/test/factories/applications';
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
            user: {} as Route.ComponentProps['loaderData']['user'],
            allApplications: [
              makeApplicationWithCompany({
                id: 'application-1',
                position: 'Staff Engineer',
                status: JobApplicationStatus.INTERVIEW,
                source: 'linkedin',
                applicationDate: new Date('2024-01-15T00:00:00.000Z').toISOString(),
                responseDate: new Date('2024-01-20T00:00:00.000Z').toISOString(),
                firstInterviewDate: new Date('2024-01-25T00:00:00.000Z').toISOString(),
                company: { name: 'Example Co' },
              }),
            ],
            applications: [
              makeApplicationWithCompany({
                id: 'application-1',
                position: 'Staff Engineer',
                status: JobApplicationStatus.INTERVIEW,
                source: 'linkedin',
                company: { name: 'Example Co' },
              }),
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
            },
            filters: {
              search: undefined,
              status: undefined,
              source: undefined,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Staff Engineer').length).toBeGreaterThan(0);
    expect(screen.getByText('Job Applications')).toBeInTheDocument();
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
            user: {} as Route.ComponentProps['loaderData']['user'],
            allApplications: [],
            applications: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            },
            filters: {
              search: undefined,
              status: undefined,
              source: undefined,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No applications found')).toBeInTheDocument();
  });
});
