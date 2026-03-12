import { render, screen } from '../../test-utils';
import { Button } from './button';

describe('Button', () => {
  it('renders the shared primary variant and md size contract', () => {
    render(
      <Button variant="primary" size="md">
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveAttribute('data-size', 'md');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('falls back to the title prop when children are not provided', () => {
    render(<Button title="Continue" />);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});
