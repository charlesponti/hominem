import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { NO_STATUS_FILTER } from '~/lib/career/queries/job-applications';
import { makeApplication } from '~/test/factories/applications';
import { JobApplicationStatus } from '~/types/career';

import type { Route } from './+types/applications';
import Applications from './applications';

function loaderData(overrides: Partial<Route.ComponentProps['loaderData']> = {}) {
  return {
    applications: [],
    total: 0,
    hasApplications: false,
    statusOptions: [],
    sourceOptions: [],
    ...overrides,
  };
}

describe('Applications route', () => {
  it('renders the applications table with records', () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <Applications
          {...({
            params: {},
            matches: [],
          } as unknown as Route.ComponentProps)}
          loaderData={loaderData({
            applications: [
              makeApplication({
                id: 'application-1',
                title: 'Staff Engineer',
                status: JobApplicationStatus.SCREENING,
                source: 'linkedin',
                applicationDate: new Date('2024-01-15T00:00:00.000Z').toISOString(),
                responseDate: new Date('2024-01-20T00:00:00.000Z').toISOString(),
                firstInterviewDate: new Date('2024-01-25T00:00:00.000Z').toISOString(),
                company: 'Example Co',
                stageCount: 0,
                hasOffer: false,
              }),
            ],
            total: 1,
            hasApplications: true,
            statusOptions: [{ value: JobApplicationStatus.SCREENING, label: 'SCREENING (1)' }],
            sourceOptions: [{ value: 'linkedin', label: 'linkedin (1)' }],
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Staff Engineer').length).toBeGreaterThan(0);
    expect(screen.getByText('Applications')).toBeInTheDocument();
  });

  it('shows the "No applications yet" state when there are no applications', () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <Applications
          {...({
            params: {},
            matches: [],
          } as unknown as Route.ComponentProps)}
          loaderData={loaderData()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });

  it('shows the "No matching applications" state when filters match nothing', () => {
    render(
      <MemoryRouter initialEntries={['/applications?status=OFFER']}>
        <Applications
          {...({
            params: {},
            matches: [],
          } as unknown as Route.ComponentProps)}
          loaderData={loaderData({
            hasApplications: true,
            statusOptions: [
              { value: NO_STATUS_FILTER, label: 'No status (1)' },
              { value: 'OFFER', label: 'OFFER (0)' },
            ],
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No matching applications')).toBeInTheDocument();
  });
});
