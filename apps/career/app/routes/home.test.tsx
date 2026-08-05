import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Route } from './+types/home';
import Home from './home';

function renderHome(authenticated: boolean) {
  render(
    <MemoryRouter>
      <Home
        {...({
          params: {},
          matches: [],
        } as unknown as Route.ComponentProps)}
        loaderData={{
          authenticated,
        }}
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
