import { render, screen } from '../../test-utils';
import { SelectField } from './select-field';

describe('SelectField', () => {
  it('renders a labelled trigger with helper text', () => {
    render(
      <SelectField
        label="Sort"
        helpText="Choose the display order"
        value="newest"
        options={[
          { label: 'Newest first', value: 'newest' },
          { label: 'Oldest first', value: 'oldest' },
        ]}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Sort' });

    expect(trigger).toHaveAttribute('aria-describedby');
    expect(screen.getByText('Choose the display order')).toBeInTheDocument();
    expect(screen.getByText('Newest first')).toBeInTheDocument();
  });

  it('surfaces errors as alerts and marks the trigger invalid', () => {
    render(
      <SelectField
        label="Sort"
        error="Pick an option"
        value="newest"
        options={[
          { label: 'Newest first', value: 'newest' },
          { label: 'Oldest first', value: 'oldest' },
        ]}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Pick an option');
  });
});
