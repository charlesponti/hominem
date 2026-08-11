import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ExpandableSearch } from './ExpandableSearch';

function SearchHarness({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <ExpandableSearch
      id="test-search"
      value={value}
      onChange={setValue}
      placeholder="Search records..."
      ariaLabel="Search records"
    />
  );
}

describe('ExpandableSearch', () => {
  it('starts collapsed and removes the hidden input from tab order', () => {
    render(<SearchHarness />);

    expect(screen.getByRole('button', { name: 'Open search records' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(document.getElementById('test-search')).toHaveAttribute('tabindex', '-1');
  });

  it('opens, focuses, and updates the search input', async () => {
    const user = userEvent.setup();
    render(<SearchHarness />);

    await user.click(screen.getByRole('button', { name: 'Open search records' }));

    const input = screen.getByRole('searchbox', { name: 'Search records' });
    expect(screen.getByRole('button', { name: 'Close search records' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('tabindex', '0');

    await user.type(input, 'portfolio');
    expect(input).toHaveValue('portfolio');
  });

  it('closes without clearing the current query', async () => {
    const user = userEvent.setup();
    render(<SearchHarness initialValue="portfolio" />);

    const input = screen.getByRole('searchbox', { name: 'Search records' });
    expect(input).toHaveValue('portfolio');

    await user.click(screen.getByRole('button', { name: 'Close search records' }));

    expect(screen.getByRole('button', { name: 'Open search records' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(input).toHaveValue('portfolio');
    expect(input).toHaveAttribute('tabindex', '-1');
  });
});
