import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import ApplicationCockpitPrototypeRoute from './prototypes.application-cockpit';

function renderPrototype(initialEntry = '/prototypes/application-cockpit') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ApplicationCockpitPrototypeRoute />
    </MemoryRouter>,
  );
}

describe('ApplicationCockpitPrototypeRoute', () => {
  it('shows Ledger by default', () => {
    renderPrototype();

    expect(screen.getByRole('button', { name: 'Ledger' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('A calmer application cockpit')).toBeInTheDocument();
  });

  it('hydrates from the variant query param and responds to keyboard switching', async () => {
    const user = userEvent.setup();
    renderPrototype('/prototypes/application-cockpit?v=2');

    expect(screen.getByRole('button', { name: 'Momentum' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByText('Keep the page pointed at the next move')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('button', { name: 'Signal' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('What could weaken the loop')).toBeInTheDocument();

    await user.keyboard('1');

    expect(screen.getByRole('button', { name: 'Ledger' })).toHaveAttribute('aria-current', 'true');
  });
});
